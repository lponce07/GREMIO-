import {
  DocumentRecord,
  Transaction,
  MonthlyFee,
  Raffle,
  ShirtOrder,
  JacketOrder,
  UniformOrder,
  ContractRecord,
  AdditionalCostRecord,
  DriveFolderSyncInfo,
  DriveFileMetadata,
  Member,
  Category,
  ClassificationRule,
  SyncSummaryReport,
} from '../types';
import * as XLSX from 'xlsx';
import { getAccessToken, googleSignIn } from './googleAuthService';
import { classifyAndLinkAllDocuments, extractTextFromPdfBuffer, parseVoucherMetadata } from './categoryClassifier';
import { parsePlanilhaMaeWorkbook, PlanilhaMaeFinancialSummary } from './planilhaMaeParser';
import { robustOcrService } from './ocrService';

// Identificadores Oficiais Confirmados do Google Drive da Turma
export const ROOT_FOLDER_ID = '1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU';
export const ROOT_FOLDER_URL = `https://drive.google.com/drive/folders/${ROOT_FOLDER_ID}`;
export const PLANILHA_MAE_FOLDER_ID = '1n5TUMrb54_psT6Az2TpeYz74bHtnSHor';
export const PLANILHA_MAE_FILE_ID = '1d1eaHUzsLqeKgDcRejyzpB6wbZ67ZejL';
export const PLANILHA_MAE_FILENAME = 'GRÊMIO NPOR (3) (1).xlsx';

export const OFFICIAL_CATEGORIES = [
  'PLANILHA MÃE',
  'FESTA JULINA',
  'CUSTOS ADICIONAIS',
  'CONTRATOS',
  'UNIFORMES',
  'CONFRATERNIZAÇÃO',
  'ABRIGOS',
  'CAMISAS',
  'RIFAS',
  'MENSALIDADE',
] as const;

export type OfficialCategoryName = typeof OFFICIAL_CATEGORIES[number];

export interface DriveSyncResult {
  success: boolean;
  message: string;
  folderStatuses: Record<string, DriveFolderSyncInfo>;
  newTransactions: Transaction[];
  newDocuments: DocumentRecord[];
  newMembers: Member[];
  newMonthlyFees: MonthlyFee[];
  newRaffles: Raffle[];
  newShirtOrders: ShirtOrder[];
  newJacketOrders: JacketOrder[];
  newUniformOrders: UniformOrder[];
  newContracts: ContractRecord[];
  newAdditionalCosts: AdditionalCostRecord[];
  updatedCategories: Category[];
  syncReport: SyncSummaryReport;
  totalFilesFound: number;
  totalRecordsExtracted: number;
  initialBalanceDetected?: number;
  financialSummary?: PlanilhaMaeFinancialSummary;
}

// Determina tipo de documento institucional com base em MIME type e nome
export function determineDocType(mimeType: string, fileName: string): DocumentRecord['type'] {
  const lowerName = fileName.toLowerCase();
  if (
    mimeType === 'application/vnd.google-apps.spreadsheet' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv')
  ) {
    return 'planilha';
  }
  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    if (lowerName.includes('pix')) return 'comprovante_pix';
    if (lowerName.includes('contrato')) return 'contrato';
    if (lowerName.includes('nota') || lowerName.includes('nf')) return 'nota_fiscal';
    if (lowerName.includes('recibo') || lowerName.includes('comprovante')) return 'recibo';
    if (lowerName.includes('orcamento') || lowerName.includes('orçamento') || lowerName.includes('cotacao')) return 'orcamento';
    if (lowerName.includes('boleto')) return 'boleto';
    return 'pdf';
  }
  if (mimeType.startsWith('image/')) {
    return 'imagem';
  }
  if (lowerName.includes('contrato')) return 'contrato';
  if (lowerName.includes('pix')) return 'comprovante_pix';
  if (lowerName.includes('recibo') || lowerName.includes('comprovante')) return 'recibo';
  if (lowerName.includes('nota') || lowerName.includes('nf')) return 'nota_fiscal';
  return 'outro';
}

// Verifica se um arquivo é uma planilha (.xlsx, .xls, .csv ou Google Sheets)
export function isSpreadsheetFile(mimeType: string, fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    mimeType === 'application/vnd.google-apps.spreadsheet' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.csv')
  );
}

// Parser determinístico de valores numéricos em formatos brasileiros
export function parseCurrencyPtBr(value: any): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const str = String(value).trim();
  if (!str) return 0;

  // Trata formato contábil negativo: (1.200,00) ou -1200,00
  const isNegative = str.startsWith('-') || (str.startsWith('(') && str.endsWith(')'));
  const clean = str.replace(/[R$\s()]/g, '');
  if (!clean) return 0;

  // Se tiver vírgula como separador decimal (ex: 1.250,50 ou 250,50)
  if (clean.includes(',')) {
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num)) return 0;
    return isNegative ? -Math.abs(num) : num;
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

// Parser seguro de datas brasileiras e datas seriais do Excel
export function parseDatePtBr(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];

  // Caso seja número serial do Excel (ex: 45338 para uma data de 2024/2026)
  if (typeof value === 'number' && value > 30000 && value < 65000) {
    try {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // fallback
    }
  }

  const str = String(value).trim();

  // Formato DD/MM/YYYY ou DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
    const parts = str.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

// Normaliza string para comparação de cabeçalhos sem acentos e minúsculo
function normalizeHeader(header: any): string {
  if (!header) return '';
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Mapeamento dinâmico e real dos cabeçalhos da planilha
export interface HeaderMapping {
  headerRowIndex: number;
  dateCol: number;
  descCol: number;
  entradaCol: number;
  saidaCol: number;
  valorCol: number;
  saldoCol: number;
  catCol: number;
  respCol: number;
  obsCol: number;
  payMethodCol: number;
  proofCol: number;
}

export function detectHeaders(rows: any[][]): HeaderMapping | null {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let dateCol = -1;
    let descCol = -1;
    let entradaCol = -1;
    let saidaCol = -1;
    let valorCol = -1;
    let saldoCol = -1;
    let catCol = -1;
    let respCol = -1;
    let obsCol = -1;
    let payMethodCol = -1;
    let proofCol = -1;

    let matchesCount = 0;

    row.forEach((cell, idx) => {
      const h = normalizeHeader(cell);
      if (!h) return;

      if (dateCol === -1 && (h === 'data' || h === 'dt' || h === 'dia' || h.includes('pagamento') || h.includes('vencimento') || h === 'data pgto')) {
        dateCol = idx;
        matchesCount++;
      } else if (descCol === -1 && (h === 'descricao' || h === 'historico' || h === 'item' || h === 'detalhe' || h === 'motivo' || h === 'referencia' || h === 'especificacao')) {
        descCol = idx;
        matchesCount++;
      } else if (entradaCol === -1 && (h === 'entrada' || h === 'entradas' || h === 'receita' || h === 'receitas' || h === 'credito' || h === 'creditos' || h.includes('entrada'))) {
        entradaCol = idx;
        matchesCount++;
      } else if (saidaCol === -1 && (h === 'saida' || h === 'saidas' || h === 'despesa' || h === 'despesas' || h === 'debito' || h === 'debitos' || h.includes('saida'))) {
        saidaCol = idx;
        matchesCount++;
      } else if (valorCol === -1 && (h === 'valor' || h === 'quantia' || h === 'total' || h === 'valor r$' || h.includes('valor'))) {
        valorCol = idx;
        matchesCount++;
      } else if (saldoCol === -1 && (h === 'saldo' || h.includes('acumulado') || h === 'saldo atual')) {
        saldoCol = idx;
      } else if (catCol === -1 && (h === 'categoria' || h === 'rubrica' || h === 'classificacao' || h === 'origem' || h === 'destino' || h === 'evento')) {
        catCol = idx;
      } else if (respCol === -1 && (h === 'responsavel' || h === 'aluno' || h === 'membro' || h === 'favorecido' || h === 'beneficiario' || h === 'quem' || h === 'fornecedor')) {
        respCol = idx;
      } else if (obsCol === -1 && (h === 'observacao' || h === 'obs' || h === 'notas' || h === 'comentarios')) {
        obsCol = idx;
      } else if (payMethodCol === -1 && (h.includes('forma') || h.includes('metodo') || h === 'pix' || h === 'meio' || h.includes('pagamento'))) {
        payMethodCol = idx;
      } else if (proofCol === -1 && (h.includes('comprovante') || h.includes('recibo') || h.includes('anexo') || h.includes('link') || h.includes('documento'))) {
        proofCol = idx;
      }
    });

    // Se detectou pelo menos 2 colunas essenciais
    if (matchesCount >= 2 || (descCol !== -1 && (entradaCol !== -1 || saidaCol !== -1 || valorCol !== -1))) {
      return {
        headerRowIndex: r,
        dateCol,
        descCol,
        entradaCol,
        saidaCol,
        valorCol,
        saldoCol,
        catCol,
        respCol,
        obsCol,
        payMethodCol,
        proofCol,
      };
    }
  }

  return null;
}

// Download determinístico de arquivo no Google Drive
export async function downloadDriveFileAsArrayBuffer(
  fileId: string,
  mimeType: string,
  token: string
): Promise<ArrayBuffer | null> {
  const headers = { Authorization: `Bearer ${token}` };

  // Se for Google Sheets nativo, exporta diretamente para XLSX
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    const res = await fetch(exportUrl, { headers });
    if (res.ok) {
      return await res.arrayBuffer();
    }
  }

  // Para arquivos Excel (.xlsx / .xls), CSV ou binários normais do Drive
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, { headers });
  if (res.ok) {
    return await res.arrayBuffer();
  }

  console.warn(`Não foi possível baixar conteúdo do arquivo ${fileId} (${res.status}): ${res.statusText}`);
  return null;
}

// Varredura recursiva de arquivos dentro de uma pasta do Google Drive, preservando o caminho real
export async function fetchFolderFilesRecursively(
  folderId: string,
  token: string,
  depth = 0,
  maxDepth = 6,
  pathSegments: string[] = [],
  parentFolderName?: string
): Promise<DriveFileMetadata[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const collected: DriveFileMetadata[] = [];

  try {
    const query = `'${folderId}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(
      'files(id, name, mimeType, modifiedTime, webViewLink, size, iconLink, thumbnailLink, parents)'
    )}&pageSize=1000`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`Falha ao listar pasta ${folderId}: ${res.status} ${res.statusText}`);
      return collected;
    }

    const data = await res.json();
    const items: any[] = data.files || [];

    for (const item of items) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        if (depth < maxDepth) {
          const subFiles = await fetchFolderFilesRecursively(
            item.id,
            token,
            depth + 1,
            maxDepth,
            [...pathSegments, item.name],
            item.name
          );
          collected.push(...subFiles);
        }
      } else {
        collected.push({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          modifiedTime: item.modifiedTime,
          webViewLink: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
          size: item.size,
          iconLink: item.iconLink,
          thumbnailLink: item.thumbnailLink,
          parentFolderId: folderId,
          parentFolderName,
          driveFolderPath: pathSegments.join(' / '),
          pathSegments: [...pathSegments],
        });
      }
    }
  } catch (err) {
    console.warn(`Erro ao consultar pasta ${folderId}:`, err);
  }

  return collected;
}

// Meses do ano em português para detecção de matrizes de mensalidades
const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'
];


function normalizeLoose(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferFinancialDirectionFromFile(file: DriveFileMetadata, text = ''): 'entrada' | 'saida' {
  const corpus = normalizeLoose(`${file.driveFolderPath || ''} ${file.name || ''} ${text}`);
  if (/(^|[\s/\-_])entrada([\s/\-_]|$)|recebimento|recebido|credito recebido/.test(corpus)) return 'entrada';
  return 'saida';
}

function determineDocTypeFromContent(
  mimeType: string,
  fileName: string,
  extractedText: string,
  initialType: DocumentRecord['type']
): DocumentRecord['type'] {
  if (isSpreadsheetFile(mimeType, fileName)) return 'planilha';
  const corpus = normalizeLoose(`${fileName} ${extractedText}`);
  if (/transferencia pix|comprovante.*pix|pix realizado|pix enviado|pix recebido/.test(corpus)) return 'comprovante_pix';
  if (/nota fiscal|nf-e|nfe|danfe/.test(corpus)) return 'nota_fiscal';
  if (/boleto|linha digitavel|codigo de barras/.test(corpus)) return 'boleto';
  if (/recibo|recebi de/.test(corpus)) return 'recibo';
  if (/contrato|contratante|contratado|clausula/.test(corpus)) return 'contrato';
  if (/orcamento|cotacao|proposta comercial/.test(corpus)) return 'orcamento';
  if (/comprovante de transacao bancaria|comprovante de pagamento|transferencia bancaria/.test(corpus)) return 'transferencia';
  return initialType;
}

function textLooksUseful(text: string): boolean {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length < 30) return false;
  const alpha = (clean.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  if (alpha / Math.max(clean.length, 1) < 0.12) return false;
  return /r\$|valor|pix|pagamento|transferencia|recibo|nota|contrato|cpf|cnpj|data|banco|caixa|bradesco|itau|santander|nubank/i.test(clean);
}

async function extractDriveDocumentText(
  file: DriveFileMetadata,
  token: string
): Promise<{ text: string; ocrProcessed: boolean; ocrStatus?: DocumentRecord['ocrStatus']; technicalError?: string }> {
  const mime = file.mimeType || '';
  const lowerName = (file.name || '').toLowerCase();
  const normalizedPath = normalizeLoose(file.driveFolderPath || '');

  // Nunca OCRiza fotos claramente institucionais do pelotão.
  if (normalizedPath.includes('foto pelotao')) {
    return { text: '', ocrProcessed: false, ocrStatus: 'success' };
  }

  // Baixa o buffer real do arquivo (nunca apenas thumbnail de baixa qualidade)
  const buffer = await downloadDriveFileAsArrayBuffer(file.id, mime, token);
  if (!buffer) {
    return {
      text: '',
      ocrProcessed: false,
      ocrStatus: 'failed',
      technicalError: 'Não foi possível baixar o conteúdo do arquivo no Google Drive',
    };
  }

  try {
    const ocrResult = await robustOcrService.processDocument({
      buffer,
      mimeType: mime,
      fileName: file.name,
    });

    return {
      text: ocrResult.text,
      ocrProcessed: ocrResult.status === 'success' || ocrResult.status === 'needs_review',
      ocrStatus: ocrResult.status,
      technicalError: ocrResult.technicalError,
    };
  } catch (err: any) {
    return {
      text: '',
      ocrProcessed: false,
      ocrStatus: 'failed',
      technicalError: err?.message || 'Erro inesperado no OCR',
    };
  }
}

// -----------------------------------------------------------------------------
// MOTOR DE SINCRONIZAÇÃO COMPLETO COM DADOS REAIS DO GOOGLE DRIVE & EXCEL (.XLSX)
// -----------------------------------------------------------------------------
export async function syncRealGoogleDrive(
  existingTransactions: Transaction[] = [],
  existingDocuments: DocumentRecord[] = [],
  existingCategories: Category[] = [],
  existingRules: ClassificationRule[] = []
): Promise<DriveSyncResult> {
  let token = await getAccessToken();

  // Se ainda não houver token, tenta obter via popup oficial do Google
  if (!token) {
    const authResult = await googleSignIn();
    if (!authResult || !authResult.accessToken) {
      throw new Error('Autenticação com Google Drive não realizada. Operação cancelada pelo usuário.');
    }
    token = authResult.accessToken;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // Inicializa mapa das 10 pastas com estado Não sincronizado
  const folderStatuses: Record<string, DriveFolderSyncInfo> = {};
  OFFICIAL_CATEGORIES.forEach((cat) => {
    folderStatuses[cat] = {
      name: cat,
      status: 'nao_sincronizado',
      count: 0,
      fileCount: 0,
      sheetCount: 0,
      files: [],
    };
  });

  // Remove lançamentos automáticos antigos da PLANILHA MÃE para reconstruí-los com o parser atual,
  // preservando integralmente lançamentos manuais e comprovantes já conciliados.
  const newTransactions: Transaction[] = existingTransactions.filter((t) => {
    const fromMaster = t.sourceFileId === PLANILHA_MAE_FILE_ID || t.id?.startsWith('tx-mae-') || t.id?.startsWith(`tx-drive-${PLANILHA_MAE_FILE_ID}`);
    return !(fromMaster && t.autoCreated !== false);
  });
  const newDocuments: DocumentRecord[] = [...existingDocuments];
  const newMembers: Member[] = [];
  const newMonthlyFees: MonthlyFee[] = [];
  const newRaffles: Raffle[] = [];
  const newShirtOrders: ShirtOrder[] = [];
  const newJacketOrders: JacketOrder[] = [];
  const newUniformOrders: UniformOrder[] = [];
  const newContracts: ContractRecord[] = [];
  const newAdditionalCosts: AdditionalCostRecord[] = [];

  let totalFilesFound = 0;
  let totalRecordsExtracted = 0;
  let detectedInitialBalance: number | undefined = undefined;
  let financialSummary: PlanilhaMaeFinancialSummary | undefined = undefined;

  // 1. Consultar subpastas reais existentes dentro da pasta raiz autorizada
  const queryFolders = `'${ROOT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const folderUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryFolders)}&fields=${encodeURIComponent('files(id, name, mimeType, modifiedTime, webViewLink)')}&pageSize=100`;

  const folderRes = await fetch(folderUrl, { headers });
  if (!folderRes.ok) {
    const errText = await folderRes.text();
    throw new Error(`Erro ao acessar pasta raiz do Google Drive (${folderRes.status}): ${errText}`);
  }

  const folderData = await folderRes.json();
  const driveSubfolders: Array<{ id: string; name: string; webViewLink: string }> = folderData.files || [];

  // Mapear subpastas encontradas por nome normalizado
  const subfolderByName: Record<string, { id: string; name: string; webViewLink: string }> = {};
  driveSubfolders.forEach((f) => {
    const norm = f.name.trim().toUpperCase();
    subfolderByName[norm] = f;
  });

  // Também consultar se há arquivos colocados diretamente na raiz
  const queryRootFiles = `'${ROOT_FOLDER_ID}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
  const rootFilesUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryRootFiles)}&fields=${encodeURIComponent('files(id, name, mimeType, modifiedTime, webViewLink, size, iconLink)')}&pageSize=100`;
  const rootFilesRes = await fetch(rootFilesUrl, { headers });
  const rootFilesData = rootFilesRes.ok ? await rootFilesRes.json() : { files: [] };
  const filesInRoot: any[] = rootFilesData.files || [];

  // 2. Para cada uma das 10 pastas oficiais, realizar a leitura real e precisa
  for (const category of OFFICIAL_CATEGORIES) {
    const matchingFolder = subfolderByName[category];
    let folderId: string | null = matchingFolder ? matchingFolder.id : null;

    // Se for PLANILHA MÃE e não encontrou pelo nome exato, usar o ID conhecido confirmado
    if (category === 'PLANILHA MÃE' && !folderId) {
      folderId = PLANILHA_MAE_FOLDER_ID;
    }

    let filesInThisCategory: DriveFileMetadata[] = [];

    if (folderId) {
      // Busca recursiva de arquivos dentro da subpasta oficial
      filesInThisCategory = await fetchFolderFilesRecursively(folderId, token, 0, 6, [category], category);
    } else {
      // Se não há subpasta com o nome exato, verifica se algum arquivo da raiz corresponde à categoria
      filesInThisCategory = filesInRoot
        .filter((f) => {
          const normFileName = f.name.trim().toUpperCase();
          return normFileName.includes(category);
        })
        .map((f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
          webViewLink: f.webViewLink,
          size: f.size,
          iconLink: f.iconLink,
          driveFolderPath: category,
          pathSegments: [category],
          parentFolderName: category,
        }));
    }

    // GARANTIA PLANILHA MÃE: Se estamos na categoria PLANILHA MÃE e o arquivo GRÊMIO NPOR (3) (1).xlsx
    // ainda não foi incluído, consultar explicitamente pelo seu File ID oficial
    if (category === 'PLANILHA MÃE') {
      const alreadyHasMae = filesInThisCategory.some(
        (f) => f.id === PLANILHA_MAE_FILE_ID || f.name.toLowerCase().includes('grêmio npor') || f.name.toLowerCase().includes('gremio npor')
      );
      if (!alreadyHasMae) {
        try {
          const directFileUrl = `https://www.googleapis.com/drive/v3/files/${PLANILHA_MAE_FILE_ID}?fields=${encodeURIComponent(
            'id, name, mimeType, modifiedTime, webViewLink, size, iconLink, thumbnailLink'
          )}`;
          const directFileRes = await fetch(directFileUrl, { headers });
          if (directFileRes.ok) {
            const directFileData = await directFileRes.json();
            filesInThisCategory.unshift({
              id: directFileData.id,
              name: directFileData.name || PLANILHA_MAE_FILENAME,
              mimeType: directFileData.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              modifiedTime: directFileData.modifiedTime || new Date().toISOString(),
              webViewLink: directFileData.webViewLink || `https://docs.google.com/spreadsheets/d/${PLANILHA_MAE_FILE_ID}`,
              size: directFileData.size,
              iconLink: directFileData.iconLink,
              thumbnailLink: directFileData.thumbnailLink,
              driveFolderPath: 'PLANILHA MÃE',
              pathSegments: ['PLANILHA MÃE'],
              parentFolderName: 'PLANILHA MÃE',
            });
          }
        } catch (e) {
          console.warn('Falha na consulta direta da Planilha Mãe por ID:', e);
        }
      }
    }

    let categoryRecordsCount = 0;
    let sheetCount = 0;
    const fileCount = filesInThisCategory.length;
    totalFilesFound += fileCount;

    // Registrar TODOS os arquivos encontrados na Central de Documentos e interpretar comprovantes automaticamente.
    for (const f of filesInThisCategory) {
      let docType = determineDocType(f.mimeType, f.name);
      if (isSpreadsheetFile(f.mimeType, f.name)) sheetCount++;

      const existingDocIdx = newDocuments.findIndex((d) => d.sourceFileId === f.id || d.id === `doc-drive-${f.id}`);
      const existingDoc = existingDocIdx >= 0 ? newDocuments[existingDocIdx] : undefined;

      let extractedText = existingDoc?.extractedText || existingDoc?.fileContentOrOcrText || '';
      let ocrProcessed = !!existingDoc?.ocrProcessed;
      let ocrStatus: DocumentRecord['ocrStatus'] = existingDoc?.ocrStatus || (extractedText ? 'success' : 'pending');
      let technicalError = existingDoc?.technicalError;

      // Só reprocessa conteúdo se o arquivo mudou ou ainda não houver texto extraído.
      if (!isSpreadsheetFile(f.mimeType, f.name) && (!extractedText || existingDoc?.modifiedTime !== f.modifiedTime)) {
        try {
          const extracted = await extractDriveDocumentText(f, token);
          extractedText = extracted.text || extractedText;
          ocrProcessed = extracted.ocrProcessed || ocrProcessed;
          ocrStatus = extracted.ocrStatus || (extractedText ? 'success' : 'failed');
          technicalError = extracted.technicalError;
        } catch (err: any) {
          console.warn(`Falha ao interpretar documento ${f.name}:`, err);
          ocrStatus = 'failed';
          technicalError = err?.message || 'Falha ao interpretar documento';
        }
      }

      docType = determineDocTypeFromContent(f.mimeType, f.name, extractedText, docType);
      const metadata = parseVoucherMetadata(`${f.name} ${f.driveFolderPath || ''} ${extractedText}`);
      const financialDirection = inferFinancialDirectionFromFile(f, extractedText);
      const normalizedPath = normalizeLoose(f.driveFolderPath || '');
      const financialPath = /(^|[\s/])saida([\s/]|$)|(^|[\s/])entrada([\s/]|$)/.test(normalizedPath);
      const isVoucher = ['comprovante_pix', 'recibo', 'nota_fiscal', 'boleto', 'transferencia'].includes(docType) || financialPath;

      const docRecord: DocumentRecord = {
        id: `doc-drive-${f.id}`,
        sourceFileId: f.id,
        fileId: f.id,
        name: f.name,
        type: docType,
        mimeType: f.mimeType,
        date: metadata.detectedDate || (f.modifiedTime ? f.modifiedTime.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        detectedDate: metadata.detectedDate,
        detectedAmount: metadata.detectedAmount,
        detectedSupplier: metadata.detectedSupplier || metadata.detectedReceiver,
        detectedPersonOrCompany: metadata.detectedSupplier || metadata.detectedReceiver,
        detectedReceiver: metadata.detectedReceiver,
        detectedPayer: metadata.detectedPayer,
        detectedCpfCnpj: metadata.detectedCpfCnpj,
        detectedBank: metadata.detectedBank,
        detectedControlNumber: metadata.detectedControlNumber,
        detectedTransactionType: metadata.detectedTransactionType,
        detectedDescription: metadata.detectedDescription,
        detectedPurpose: metadata.detectedPurpose,
        modifiedTime: f.modifiedTime,
        driveFolder: category,
        driveFolderPath: f.driveFolderPath || category,
        financialDirection,
        source: 'Google Drive',
        driveUrl: f.webViewLink,
        originalFileUrl: f.webViewLink,
        lastSyncedAt: new Date().toISOString(),
        auditStatus: isVoucher ? 'pendente_conferencia' : 'conferido',
        fileSizeKb: f.size ? Math.round(Number(f.size) / 1024) : undefined,
        extractedText,
        fileContentOrOcrText: extractedText,
        ocrProcessed,
        ocrStatus,
        technicalError,
      };

      if (existingDocIdx >= 0) {
        // Preserva vínculos/classificações existentes quando o arquivo não os invalidou.
        newDocuments[existingDocIdx] = {
          ...existingDoc,
          ...docRecord,
          relatedTransactionId: existingDoc?.relatedTransactionId,
          categoryId: existingDoc?.categoryId,
          categoryName: existingDoc?.categoryName,
          classificationStatus: existingDoc?.classificationStatus,
          transactionLinkStatus: existingDoc?.transactionLinkStatus,
        };
      } else {
        newDocuments.push(docRecord);
      }
    }

    // -------------------------------------------------------------------------
    // PROCESSAMENTO DETERMINÍSTICO DE PLANILHAS (.XLSX, .XLS, .CSV, SHEETS)
    // -------------------------------------------------------------------------
    const spreadsheetFiles = filesInThisCategory.filter((f) => isSpreadsheetFile(f.mimeType, f.name));

    for (const sheetFile of spreadsheetFiles) {
      try {
        const arrayBuffer = await downloadDriveFileAsArrayBuffer(sheetFile.id, sheetFile.mimeType, token);
        if (!arrayBuffer) continue;

        // Leitura determinística do arquivo Excel / Planilha com a biblioteca XLSX
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) continue;

        const isPlanilhaMae = category === 'PLANILHA MÃE' && (
          sheetFile.id === PLANILHA_MAE_FILE_ID ||
          normalizeHeader(sheetFile.name).includes('gremio npor') ||
          normalizeHeader(sheetFile.name).includes('grêmio npor')
        );

        if (isPlanilhaMae) {
          const parsedMae = parsePlanilhaMaeWorkbook({
            workbook,
            sourceFileId: sheetFile.id,
            sourceFileName: sheetFile.name,
            fileUrl: sheetFile.webViewLink,
            modifiedTime: sheetFile.modifiedTime,
            year: 2026,
          });

          financialSummary = parsedMae.financialSummary;
          detectedInitialBalance = parsedMae.financialSummary.currentCashBalance;

          for (const tx of parsedMae.transactions) {
            const idx = newTransactions.findIndex((t) => t.id === tx.id || (t.sourceFileId === tx.sourceFileId && t.sourceRowId === tx.sourceRowId));
            if (idx >= 0) newTransactions[idx] = { ...newTransactions[idx], ...tx };
            else newTransactions.push(tx);
          }

          newMembers.splice(0, newMembers.length, ...parsedMae.members);
          newMonthlyFees.splice(0, newMonthlyFees.length, ...parsedMae.monthlyFees);
          newRaffles.splice(0, newRaffles.length, ...parsedMae.raffles);
          newShirtOrders.splice(0, newShirtOrders.length, ...parsedMae.shirtOrders);
          newJacketOrders.splice(0, newJacketOrders.length, ...parsedMae.jacketOrders);
          newUniformOrders.splice(0, newUniformOrders.length, ...parsedMae.uniformOrders);
          newAdditionalCosts.splice(0, newAdditionalCosts.length, ...parsedMae.additionalCosts);

          categoryRecordsCount += parsedMae.recordsExtracted;
          totalRecordsExtracted += parsedMae.recordsExtracted;
          continue;
        }

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!rawRows || rawRows.length === 0) continue;

          const normSheetName = normalizeHeader(sheetName);

          // -------------------------------------------------------------------
          // A) Detecção de Mensalidades (Matriz de alunos ou Lista)
          // -------------------------------------------------------------------
          if (normSheetName.includes('mensal') || normSheetName.includes('aluno') || normSheetName.includes('contribu')) {
            // Verificar se há uma linha de cabeçalho contendo nomes de meses
            let monthHeaderRow = -1;
            let monthColIndices: { month: string; colIdx: number }[] = [];
            let nameColIdx = -1;

            for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
              const row = rawRows[r];
              if (!Array.isArray(row)) continue;
              const foundMonths: { month: string; colIdx: number }[] = [];

              row.forEach((cell, idx) => {
                const norm = normalizeHeader(cell);
                if (MONTH_NAMES.includes(norm)) {
                  foundMonths.push({ month: norm, colIdx: idx });
                }
                if (nameColIdx === -1 && (norm === 'aluno' || norm === 'nome' || norm === 'membro' || norm.includes('guerra'))) {
                  nameColIdx = idx;
                }
              });

              if (foundMonths.length >= 2) {
                monthHeaderRow = r;
                monthColIndices = foundMonths;
                if (nameColIdx === -1) nameColIdx = 0; // Padrão primeira coluna
                break;
              }
            }

            // Matriz de Mensalidades identificada
            if (monthHeaderRow >= 0 && monthColIndices.length > 0) {
              for (let r = monthHeaderRow + 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!Array.isArray(row) || row.length === 0) continue;

                const memberNameRaw = row[nameColIdx];
                const memberName = String(memberNameRaw || '').trim();
                if (!memberName || memberName.length < 2) continue;
                if (normalizeHeader(memberName) === 'total' || normalizeHeader(memberName).includes('soma')) continue;

                // Cadastra aluno na lista de membros se não existir
                const cleanWarName = memberName.replace(/^Al\.\s*/i, '').trim();
                if (!newMembers.some((m) => m.name.toLowerCase() === memberName.toLowerCase() || m.warName.toLowerCase() === cleanWarName.toLowerCase())) {
                  newMembers.push({
                    id: `mbr-${newMembers.length + 1}`,
                    name: memberName,
                    warName: cleanWarName,
                    active: true,
                  });
                }

                // Extrai mensalidades para cada mês
                monthColIndices.forEach(({ month, colIdx }) => {
                  const cellVal = row[colIdx];
                  const cellStr = String(cellVal || '').trim().toLowerCase();
                  if (!cellStr && cellVal !== 0) return;

                  let status: MonthlyFee['status'] = 'Pendente';
                  let amt = 0; // Nunca inventar valor quando a planilha usa apenas marcador de status

                  if (cellStr === 'pago' || cellStr === 'pg' || cellStr === 'ok' || cellStr === 'sim' || cellStr === 'x') {
                    status = 'Pago';
                  } else if (cellStr === 'isento' || cellStr === 'dispensado' || cellStr === 'disp') {
                    status = 'Isento';
                    amt = 0;
                  } else {
                    const num = parseCurrencyPtBr(cellVal);
                    if (num > 0) {
                      amt = num;
                      status = 'Pago';
                    }
                  }

                  const mfId = `mf-${sheetFile.id}-${sheetName}-r${r + 1}-c${colIdx + 1}`;
                  newMonthlyFees.push({
                    id: mfId,
                    memberName,
                    competenceMonth: `2026-${month.slice(0, 3)}`,
                    amount: amt,
                    status,
                    source: 'Google Drive',
                    sourceFileId: sheetFile.id,
                    sourceRowId: `${sheetName}_r${r + 1}_c${colIdx + 1}`,
                    lastSyncedAt: new Date().toISOString(),
                  });
                  categoryRecordsCount++;
                });
              }
              continue; // Aba processada com sucesso
            }
          }

          // -------------------------------------------------------------------
          // B) Detecção de Rifas
          // -------------------------------------------------------------------
          if (normSheetName.includes('rifa')) {
            for (let r = 1; r < rawRows.length; r++) {
              const row = rawRows[r];
              if (!Array.isArray(row) || row.length === 0) continue;
              const name = String(row[0] || row[1] || '').trim();
              if (!name || normalizeHeader(name) === 'total') continue;

              const totalTickets = parseInt(String(row[1] || row[2] || '0'), 10) || 0;
              const ticketPrice = parseCurrencyPtBr(row[2] || row[3]) || 0;
              const collectedAmount = parseCurrencyPtBr(row[3] || row[4]) || totalTickets * ticketPrice;
              const expensesAmount = parseCurrencyPtBr(row[4] || row[5]) || 0;

              newRaffles.push({
                id: `raf-${sheetFile.id}-r${r + 1}`,
                name,
                purpose: name,
                totalTickets,
                ticketPrice,
                responsible: 'Não informado',
                collectedAmount,
                pendingAmount: 0,
                expensesAmount,
                netResult: collectedAmount - expensesAmount,
                status: 'em_andamento',
                source: 'Google Drive',
                sourceFileId: sheetFile.id,
                lastSyncedAt: new Date().toISOString(),
              });
              categoryRecordsCount++;
            }
            continue;
          }

          // -------------------------------------------------------------------
          // C) Detecção de Lançamentos Financeiros (Livro Caixa / Geral / Entradas e Saídas)
          // -------------------------------------------------------------------
          const headerMap = detectHeaders(rawRows);
          if (headerMap) {
            const { headerRowIndex, dateCol, descCol, entradaCol, saidaCol, valorCol, catCol, respCol, obsCol, payMethodCol, proofCol } = headerMap;

            for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
              const row = rawRows[r];
              if (!Array.isArray(row) || row.length === 0) continue;

              const dateRaw = dateCol >= 0 ? row[dateCol] : '';
              const descRaw = descCol >= 0 ? row[descCol] : '';
              const entradaRaw = entradaCol >= 0 ? row[entradaCol] : '';
              const saidaRaw = saidaCol >= 0 ? row[saidaCol] : '';
              const valorRaw = valorCol >= 0 ? row[valorCol] : '';
              const catRaw = catCol >= 0 ? row[catCol] : (category !== 'PLANILHA MÃE' ? category : sheetName);
              const respRaw = respCol >= 0 ? row[respCol] : 'Tesouraria';
              const obsRaw = obsCol >= 0 ? row[obsCol] : '';
              const payMethodRaw = payMethodCol >= 0 ? row[payMethodCol] : 'PIX';
              const proofRaw = proofCol >= 0 ? row[proofCol] : '';

              const desc = String(descRaw || '').trim();
              if (!desc && !entradaRaw && !saidaRaw && !valorRaw) continue; // Linha vazia

              // Ignorar linhas de totalização
              const normDesc = normalizeHeader(desc);
              if (normDesc === 'total' || normDesc === 'totais' || normDesc.startsWith('total geral')) continue;

              const date = parseDatePtBr(dateRaw);
              const entrada = parseCurrencyPtBr(entradaRaw);
              const saida = parseCurrencyPtBr(saidaRaw);
              const valor = parseCurrencyPtBr(valorRaw);

              // Detecção de Saldo Inicial registrado na planilha
              if (normDesc.includes('saldo inicial') || normDesc.includes('saldo anterior')) {
                const bal = entrada > 0 ? entrada : valor > 0 ? valor : 0;
                if (bal > 0 && detectedInitialBalance === undefined) {
                  detectedInitialBalance = bal;
                }
              }

              let amount = 0;
              let type: 'receita' | 'despesa' = 'despesa';

              if (entrada > 0) {
                amount = entrada;
                type = 'receita';
              } else if (saida > 0) {
                amount = saida;
                type = 'despesa';
              } else if (valor !== 0) {
                if (valor < 0) {
                  amount = Math.abs(valor);
                  type = 'despesa';
                } else {
                  amount = valor;
                  const rowStr = row.join(' ').toLowerCase();
                  if (
                    rowStr.includes('receita') ||
                    rowStr.includes('entrada') ||
                    rowStr.includes('credito') ||
                    rowStr.includes('mensalidade') ||
                    rowStr.includes('rifa') ||
                    normDesc.includes('receita') ||
                    normDesc.includes('mensalidade')
                  ) {
                    type = 'receita';
                  } else {
                    type = 'despesa';
                  }
                }
              }

              if (amount <= 0 && !desc) continue;

              const sourceRowId = `${sheetName}_r${r + 1}`;
              const txId = `tx-drive-${sheetFile.id}-${sourceRowId}`;

              // Deduplicação determinística: verifica se já existe registro com mesmo sourceFileId e sourceRowId
              const existingIdx = newTransactions.findIndex(
                (t) => (t.sourceFileId === sheetFile.id && t.sourceRowId === sourceRowId) || t.id === txId
              );

              const tx: Transaction = {
                id: txId,
                code: `TX-${String(newTransactions.length + 1).padStart(4, '0')}`,
                date,
                type,
                description: desc || `Lançamento ${sheetName} Linha ${r + 1}`,
                category: String(catRaw || category).trim(),
                amount,
                paymentMethod: (String(payMethodRaw || 'PIX') as any),
                beneficiaryName: type === 'despesa' ? (desc || 'Não informado') : 'Não informado',
                responsibleUser: String(respRaw || 'Tesouraria').trim(),
                status: type === 'receita' ? 'recebida' : 'paga',
                receiptRequired: type === 'despesa',
                notes: String(obsRaw || '').trim(),
                googleDriveFileLink: proofRaw ? String(proofRaw).trim() : sheetFile.webViewLink,
                source: 'Google Drive',
                origin: 'Google Drive',
                sourceFileId: sheetFile.id,
                sourceFileName: sheetFile.name,
                sourceSheetName: sheetName,
                sourceRowId,
                autoCreated: true,
                creationReason: `Lançamento estruturado da PLANILHA MÃE (${sheetName}, linha ${r + 1})`,
                driveFolder: category,
                originalFileUrl: sheetFile.webViewLink,
                syncedAt: new Date().toISOString(),
                lastSyncedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              };

              if (existingIdx >= 0) {
                newTransactions[existingIdx] = { ...newTransactions[existingIdx], ...tx };
              } else {
                newTransactions.push(tx);
              }

              categoryRecordsCount++;
              totalRecordsExtracted++;
            }
          }
        }
      } catch (err) {
        console.error(`Erro ao processar arquivo de planilha (${sheetFile.name}):`, err);
      }
    }

    // Não cria registros financeiros fictícios apenas porque um arquivo existe.
    // Pastas sem planilha estruturada continuam visíveis na Central de Documentos;
    // comprovantes reais serão transformados em lançamentos pelo classificador após OCR/texto.
    if (categoryRecordsCount === 0) categoryRecordsCount = fileCount;

    const finalCount = category === 'PLANILHA MÃE'
      ? (categoryRecordsCount > 0 ? categoryRecordsCount : fileCount)
      : (categoryRecordsCount > 0 ? categoryRecordsCount : fileCount);

    // Registro do status da pasta
    folderStatuses[category] = {
      name: category,
      folderId: folderId || undefined,
      status: 'sincronizado',
      count: finalCount,
      fileCount,
      sheetCount,
      lastSyncedAt: new Date().toISOString(),
      files: filesInThisCategory,
    };
  }

  // ---------------------------------------------------------------------------
  // CLASSIFICAÇÃO AUTOMÁTICA DE COMPROVANTES E VINCULAÇÃO DETERMINÍSTICA A TRANSAÇÕES
  // ---------------------------------------------------------------------------
  const {
    updatedDocuments,
    updatedTransactions,
    updatedCategories,
    syncReport,
  } = classifyAndLinkAllDocuments(newDocuments, newTransactions, existingCategories, existingRules);

  return {
    success: true,
    message: `Sincronização real com o Google Drive concluída. ${totalFilesFound} arquivos verificados, ${totalRecordsExtracted} lançamentos financeiros extraídos da Planilha Mãe, ${syncReport.documentsIdentified} comprovantes identificados e ${syncReport.automaticLinks} vínculos automáticos realizados.`,
    folderStatuses,
    newTransactions: updatedTransactions,
    newDocuments: updatedDocuments,
    newMembers,
    newMonthlyFees,
    newRaffles,
    newShirtOrders,
    newJacketOrders,
    newUniformOrders,
    newContracts,
    newAdditionalCosts,
    updatedCategories,
    syncReport,
    totalFilesFound,
    totalRecordsExtracted,
    initialBalanceDetected: detectedInitialBalance,
    financialSummary,
  };
}

// -----------------------------------------------------------------------------
// HELPER PARA FORMATAR O STATUS DAS 10 PASTAS SEGUNDO A REGRA ESTRITA DO USUÁRIO
// -----------------------------------------------------------------------------
export function getFolderDisplayStatus(statusInfo: DriveFolderSyncInfo | undefined): {
  label: string;
  badgeClass: string;
  isSynced: boolean;
  count: number;
} {
  if (!statusInfo || statusInfo.status !== 'sincronizado') {
    return {
      label: 'Não sincronizado',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-300',
      isSynced: false,
      count: 0,
    };
  }

  if (statusInfo.count === 0) {
    return {
      label: 'Sincronizado — 0 registros',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      isSynced: true,
      count: 0,
    };
  }

  return {
    label: `Sincronizado — ${statusInfo.count} registro${statusInfo.count === 1 ? '' : 's'}`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-300',
    isSynced: true,
    count: statusInfo.count,
  };
}
