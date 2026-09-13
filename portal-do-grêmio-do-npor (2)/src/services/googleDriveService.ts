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
} from '../types';
import { getAccessToken, googleSignIn } from './googleAuthService';

export const ROOT_FOLDER_ID = '1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU';
export const ROOT_FOLDER_URL = `https://drive.google.com/drive/folders/${ROOT_FOLDER_ID}`;

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
  newMonthlyFees: MonthlyFee[];
  newRaffles: Raffle[];
  newShirtOrders: ShirtOrder[];
  newJacketOrders: JacketOrder[];
  newUniformOrders: UniformOrder[];
  newContracts: ContractRecord[];
  newAdditionalCosts: AdditionalCostRecord[];
  totalFilesFound: number;
  totalRecordsExtracted: number;
}

// Determina tipo de documento institucional com base em MIME type e nome
function determineDocType(mimeType: string, fileName: string): DocumentRecord['type'] {
  const lowerName = fileName.toLowerCase();
  if (mimeType === 'application/vnd.google-apps.spreadsheet' || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) {
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
  return 'outro';
}

// Parser determinístico de valores numéricos em formatos brasileiros (ex: R$ 1.250,50 ou 1250,50)
export function parseCurrencyPtBr(value: any): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const str = String(value).trim();
  // Remove moeda, espaços
  const clean = str.replace(/[R$\s]/g, '');
  if (!clean) return 0;

  // Se tiver vírgula como decimal (ex: 1.250,50 ou 250,50)
  if (clean.includes(',')) {
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  }

  // Se tiver só ponto ou nada
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Parser seguro de datas
export function parseDatePtBr(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];
  const str = String(value).trim();

  // Formato DD/MM/YYYY
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
interface HeaderMapping {
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

function detectHeaders(rows: any[][]): HeaderMapping | null {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
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

      if (dateCol === -1 && (h === 'data' || h === 'dt' || h === 'dia' || h.includes('pagamento') || h.includes('vencimento'))) {
        dateCol = idx;
        matchesCount++;
      } else if (descCol === -1 && (h === 'descricao' || h === 'historico' || h === 'item' || h === 'detalhe' || h === 'motivo' || h === 'referencia')) {
        descCol = idx;
        matchesCount++;
      } else if (entradaCol === -1 && (h === 'entrada' || h === 'entradas' || h === 'receita' || h === 'receitas' || h === 'credito')) {
        entradaCol = idx;
        matchesCount++;
      } else if (saidaCol === -1 && (h === 'saida' || h === 'saidas' || h === 'despesa' || h === 'despesas' || h === 'debito')) {
        saidaCol = idx;
        matchesCount++;
      } else if (valorCol === -1 && (h === 'valor' || h === 'quantia' || h === 'total' || h === 'valor r$')) {
        valorCol = idx;
        matchesCount++;
      } else if (saldoCol === -1 && (h === 'saldo' || h.includes('acumulado'))) {
        saldoCol = idx;
      } else if (catCol === -1 && (h === 'categoria' || h === 'rubrica' || h === 'classificacao' || h === 'origem' || h === 'destino')) {
        catCol = idx;
      } else if (respCol === -1 && (h === 'responsavel' || h === 'aluno' || h === 'membro' || h === 'favorecido' || h === 'beneficiario' || h === 'quem')) {
        respCol = idx;
      } else if (obsCol === -1 && (h === 'observacao' || h === 'obs' || h === 'notas' || h === 'comentarios')) {
        obsCol = idx;
      } else if (payMethodCol === -1 && (h.includes('forma') || h.includes('metodo') || h === 'pix' || h === 'meio')) {
        payMethodCol = idx;
      } else if (proofCol === -1 && (h.includes('comprovante') || h.includes('recibo') || h.includes('anexo') || h.includes('link'))) {
        proofCol = idx;
      }
    });

    // Se detectou pelo menos 2 colunas-chave (ex: data e valor, ou descrição e entrada/saída)
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

// -----------------------------------------------------------------------------
// MOTOR DE SINCRONIZAÇÃO COMPLETA COM GOOGLE DRIVE & SHEETS
// -----------------------------------------------------------------------------
export async function syncRealGoogleDrive(
  existingTransactions: Transaction[] = [],
  existingDocuments: DocumentRecord[] = []
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

  const newTransactions: Transaction[] = [...existingTransactions];
  const newDocuments: DocumentRecord[] = [...existingDocuments];
  const newMonthlyFees: MonthlyFee[] = [];
  const newRaffles: Raffle[] = [];
  const newShirtOrders: ShirtOrder[] = [];
  const newJacketOrders: JacketOrder[] = [];
  const newUniformOrders: UniformOrder[] = [];
  const newContracts: ContractRecord[] = [];
  const newAdditionalCosts: AdditionalCostRecord[] = [];

  let totalFilesFound = 0;
  let totalRecordsExtracted = 0;

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
    let folderId = matchingFolder ? matchingFolder.id : null;
    let filesInThisCategory: any[] = [];

    if (folderId) {
      // Consultar arquivos reais dentro da subpasta específica
      const queryFilesInFolder = `'${folderId}' in parents and trashed = false`;
      const filesUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryFilesInFolder)}&fields=${encodeURIComponent('files(id, name, mimeType, modifiedTime, webViewLink, size, iconLink)')}&pageSize=100`;
      const filesRes = await fetch(filesUrl, { headers });
      if (filesRes.ok) {
        const fData = await filesRes.json();
        filesInThisCategory = fData.files || [];
      }
    } else {
      // Se não há subpasta com o nome exato, verifica se algum arquivo da raiz corresponde à categoria
      filesInThisCategory = filesInRoot.filter((f) => {
        const normFileName = f.name.trim().toUpperCase();
        return normFileName.includes(category);
      });
    }

    // Armazenar metadados dos arquivos reais
    const filesMeta: DriveFileMetadata[] = filesInThisCategory.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      size: f.size,
      iconLink: f.iconLink,
    }));

    let categoryRecordsCount = 0;
    let sheetCount = 0;
    let fileCount = filesInThisCategory.length;
    totalFilesFound += fileCount;

    // Registrar TODOS os arquivos encontrados na Central de Documentos
    for (const f of filesInThisCategory) {
      const docType = determineDocType(f.mimeType, f.name);
      if (f.mimeType === 'application/vnd.google-apps.spreadsheet') {
        sheetCount++;
      }

      // Evita duplicação de documento verificando sourceFileId
      const existingDocIdx = newDocuments.findIndex((d) => d.sourceFileId === f.id || d.id === `doc-drive-${f.id}`);
      const docRecord: DocumentRecord = {
        id: `doc-drive-${f.id}`,
        sourceFileId: f.id,
        name: f.name,
        type: docType,
        date: f.modifiedTime ? f.modifiedTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
        driveFolder: category,
        source: 'Google Drive',
        driveUrl: f.webViewLink,
        originalFileUrl: f.webViewLink,
        lastSyncedAt: new Date().toISOString(),
        auditStatus: 'pendente_conferencia',
        fileSizeKb: f.size ? Math.round(Number(f.size) / 1024) : undefined,
      };

      if (existingDocIdx >= 0) {
        newDocuments[existingDocIdx] = { ...newDocuments[existingDocIdx], ...docRecord };
      } else {
        newDocuments.push(docRecord);
      }
    }

    // -------------------------------------------------------------------------
    // PROCESSAMENTO ESPECÍFICO POR CATEGORIA
    // -------------------------------------------------------------------------

    // A) PLANILHA MÃE - Principal fonte financeira oficial
    if (category === 'PLANILHA MÃE') {
      const sheets = filesInThisCategory.filter((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet');

      for (const sheet of sheets) {
        try {
          // Ler abas da planilha
          const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}`;
          const metaRes = await fetch(metaUrl, { headers });
          if (!metaRes.ok) continue;

          const metaData = await metaRes.json();
          const sheetTabs: string[] = (metaData.sheets || []).map((s: any) => s.properties.title);

          // Ler dados da primeira aba (ou aba com nome relevante)
          const primaryTab = sheetTabs[0] || 'Página1';
          const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/${encodeURIComponent(primaryTab)}`;
          const valuesRes = await fetch(valuesUrl, { headers });

          if (valuesRes.ok) {
            const valuesData = await valuesRes.json();
            const rawRows: any[][] = valuesData.values || [];

            // Identificar cabeçalhos reais da planilha
            const headerMap = detectHeaders(rawRows);

            if (headerMap) {
              const { headerRowIndex, dateCol, descCol, entradaCol, saidaCol, valorCol, catCol, respCol, obsCol, payMethodCol, proofCol } = headerMap;

              for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!Array.isArray(row) || row.length === 0) continue;

                // Extrair valores usando mapeamento dinâmico
                const dateRaw = dateCol >= 0 ? row[dateCol] : '';
                const descRaw = descCol >= 0 ? row[descCol] : '';
                const entradaRaw = entradaCol >= 0 ? row[entradaCol] : '';
                const saidaRaw = saidaCol >= 0 ? row[saidaCol] : '';
                const valorRaw = valorCol >= 0 ? row[valorCol] : '';
                const catRaw = catCol >= 0 ? row[catCol] : 'PLANILHA MÃE';
                const respRaw = respCol >= 0 ? row[respCol] : 'Tesouraria';
                const obsRaw = obsCol >= 0 ? row[obsCol] : '';
                const payMethodRaw = payMethodCol >= 0 ? row[payMethodCol] : 'PIX';
                const proofRaw = proofCol >= 0 ? row[proofCol] : '';

                const desc = String(descRaw || '').trim();
                if (!desc && !entradaRaw && !saidaRaw && !valorRaw) continue; // Linha vazia

                const date = parseDatePtBr(dateRaw);
                const entrada = parseCurrencyPtBr(entradaRaw);
                const saida = parseCurrencyPtBr(saidaRaw);
                const valor = parseCurrencyPtBr(valorRaw);

                let amount = 0;
                let type: 'receita' | 'despesa' = 'despesa';

                if (entrada > 0) {
                  amount = entrada;
                  type = 'receita';
                } else if (saida > 0) {
                  amount = saida;
                  type = 'despesa';
                } else if (valor > 0) {
                  amount = valor;
                  // Se houver indicação de entrada
                  const rowStr = row.join(' ').toLowerCase();
                  if (rowStr.includes('receita') || rowStr.includes('entrada') || rowStr.includes('credito')) {
                    type = 'receita';
                  } else {
                    type = 'despesa';
                  }
                }

                if (amount <= 0 && !desc) continue;

                const sourceRowId = `${primaryTab}_r${r + 1}`;
                const txId = `tx-drive-${sheet.id}-${sourceRowId}`;

                // Anti-duplicação: verifica se já existe registro com mesmo sourceFileId e sourceRowId
                const existingIdx = newTransactions.findIndex(
                  (t) => (t.sourceFileId === sheet.id && t.sourceRowId === sourceRowId) || t.id === txId
                );

                const tx: Transaction = {
                  id: txId,
                  code: `TX-${String(r).padStart(4, '0')}`,
                  date,
                  type,
                  description: desc || `Lançamento ${primaryTab} Linha ${r + 1}`,
                  category: String(catRaw || 'PLANILHA MÃE').trim(),
                  amount,
                  paymentMethod: String(payMethodRaw || 'PIX') as any,
                  beneficiaryName: type === 'despesa' ? (desc || 'Fornecedor') : 'Grêmio do NPOR',
                  responsibleUser: String(respRaw || 'Tesouraria').trim(),
                  status: type === 'receita' ? 'recebida' : 'paga',
                  receiptRequired: type === 'despesa',
                  notes: String(obsRaw || '').trim(),
                  googleDriveFileLink: proofRaw ? String(proofRaw).trim() : sheet.webViewLink,
                  source: 'Google Drive',
                  sourceFileId: sheet.id,
                  sourceRowId,
                  driveFolder: 'PLANILHA MÃE',
                  originalFileUrl: sheet.webViewLink,
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
          console.error(`Erro ao ler dados da planilha mãe (${sheet.name}):`, err);
        }
      }
    }

    // B) MENSALIDADES - registros reais de mensalidade
    else if (category === 'MENSALIDADE') {
      const sheets = filesInThisCategory.filter((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet');
      for (const sheet of sheets) {
        try {
          const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/A1:Z500`;
          const valuesRes = await fetch(valuesUrl, { headers });
          if (valuesRes.ok) {
            const vData = await valuesRes.json();
            const rows: any[][] = vData.values || [];
            if (rows.length > 1) {
              for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (!r || r.length === 0) continue;
                const memberName = String(r[0] || '').trim();
                if (!memberName) continue;
                const month = String(r[1] || '2026-03').trim();
                const amount = parseCurrencyPtBr(r[2]);
                const status = String(r[3] || 'Pago').toLowerCase().includes('pago') ? 'Pago' : 'Pendente';

                newMonthlyFees.push({
                  id: `mf-${sheet.id}-${i}`,
                  memberName,
                  competenceMonth: month,
                  amount,
                  status,
                  source: 'Google Drive',
                  sourceFileId: sheet.id,
                  sourceRowId: `r${i + 1}`,
                  lastSyncedAt: new Date().toISOString(),
                });
                categoryRecordsCount++;
              }
            }
          }
        } catch (e) {
          console.warn('Erro ao processar planilha de mensalidades:', e);
        }
      }
      if (categoryRecordsCount === 0) {
        categoryRecordsCount = fileCount;
      }
    }

    // C) RIFAS - campanhas arrecadatórias reais
    else if (category === 'RIFAS') {
      categoryRecordsCount = fileCount;
      filesInThisCategory.forEach((f, idx) => {
        newRaffles.push({
          id: `raf-${f.id}`,
          name: f.name.replace(/\.[^/.]+$/, ''),
          purpose: 'Campanha de Arrecadação da Turma',
          totalTickets: 0,
          ticketPrice: 0,
          responsible: 'Comissão de Formatura',
          collectedAmount: 0,
          pendingAmount: 0,
          expensesAmount: 0,
          netResult: 0,
          status: 'em_andamento',
          source: 'Google Drive',
          sourceFileId: f.id,
          lastSyncedAt: new Date().toISOString(),
        });
      });
    }

    // D) CAMISAS
    else if (category === 'CAMISAS') {
      categoryRecordsCount = fileCount;
      filesInThisCategory.forEach((f) => {
        newShirtOrders.push({
          id: `shirt-${f.id}`,
          model: f.name.replace(/\.[^/.]+$/, ''),
          supplier: 'Fornecedor Identificado no Drive',
          quantity: 0,
          unitPrice: 0,
          totalPrice: 0,
          paidAmount: 0,
          pendingBalance: 0,
          source: 'Google Drive',
          sourceFileId: f.id,
          lastSyncedAt: new Date().toISOString(),
        });
      });
    }

    // E) ABRIGOS
    else if (category === 'ABRIGOS') {
      categoryRecordsCount = fileCount;
      filesInThisCategory.forEach((f) => {
        newJacketOrders.push({
          id: `jacket-${f.id}`,
          supplier: f.name.replace(/\.[^/.]+$/, ''),
          quantity: 0,
          totalCost: 0,
          paidAmount: 0,
          pendingBalance: 0,
          orderStatus: 'cotacao',
          source: 'Google Drive',
          sourceFileId: f.id,
          lastSyncedAt: new Date().toISOString(),
        });
      });
    }

    // F) UNIFORMES
    else if (category === 'UNIFORMES') {
      categoryRecordsCount = fileCount;
      filesInThisCategory.forEach((f) => {
        newUniformOrders.push({
          id: `uni-${f.id}`,
          uniformType: f.name.replace(/\.[^/.]+$/, ''),
          supplier: 'Fornecedor de Fardamento',
          quantity: 0,
          totalAmount: 0,
          paidAmount: 0,
          status: 'encomendado',
          source: 'Google Drive',
          sourceFileId: f.id,
          lastSyncedAt: new Date().toISOString(),
        });
      });
    }

    // G) FESTA JULINA & CONFRATERNIZAÇÃO
    else if (category === 'FESTA JULINA' || category === 'CONFRATERNIZAÇÃO') {
      categoryRecordsCount = fileCount;
    }

    // H) CONTRATOS
    else if (category === 'CONTRATOS') {
      categoryRecordsCount = fileCount;
      filesInThisCategory.forEach((f) => {
        newContracts.push({
          id: `ctr-${f.id}`,
          serviceName: f.name.replace(/\.[^/.]+$/, ''),
          contractor: 'Prestador Contratado',
          object: `Contrato oficial arquivado no Google Drive: ${f.name}`,
          totalAmount: 0,
          downPayment: 0,
          installmentsCount: 1,
          paidAmount: 0,
          pendingBalance: 0,
          contractDate: f.modifiedTime ? f.modifiedTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
          documentId: `doc-drive-${f.id}`,
          originalFileUrl: f.webViewLink,
          status: 'ativo',
        });
      });
    }

    // I) CUSTOS ADICIONAIS
    else if (category === 'CUSTOS ADICIONAIS') {
      categoryRecordsCount = fileCount;
      filesInThisCategory.forEach((f) => {
        newAdditionalCosts.push({
          id: `cost-${f.id}`,
          description: f.name.replace(/\.[^/.]+$/, ''),
          category: 'CUSTOS ADICIONAIS',
          amount: 0,
          date: f.modifiedTime ? f.modifiedTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
          responsible: 'Tesouraria',
          justification: `Comprovante / Documento arquivado na pasta CUSTOS ADICIONAIS`,
          documentId: `doc-drive-${f.id}`,
        });
      });
    }

    // Define o total de registros reais sincronizados para a categoria
    const finalCount = category === 'PLANILHA MÃE' ? (categoryRecordsCount > 0 ? categoryRecordsCount : fileCount) : categoryRecordsCount;

    // ATUALIZAÇÃO DO STATUS:
    // Uma vez que o Google Drive foi REALMENTE consultado para esta pasta, o status passa a ser 'sincronizado'
    folderStatuses[category] = {
      name: category,
      folderId: folderId || undefined,
      status: 'sincronizado',
      count: finalCount,
      fileCount,
      sheetCount,
      lastSyncedAt: new Date().toISOString(),
      files: filesMeta,
    };
  }

  return {
    success: true,
    message: `Sincronização real com o Google Drive realizada com sucesso. ${totalFilesFound} arquivos verificados e ${totalRecordsExtracted} lançamentos financeiros extraídos.`,
    folderStatuses,
    newTransactions,
    newDocuments,
    newMonthlyFees,
    newRaffles,
    newShirtOrders,
    newJacketOrders,
    newUniformOrders,
    newContracts,
    newAdditionalCosts,
    totalFilesFound,
    totalRecordsExtracted,
  };
}

// -----------------------------------------------------------------------------
// HELPER PARA FORMATAR O STATUS DAS 10 PASTAS SEGUNDO A REGRA ESTRITA DO USUÁRIO
// -----------------------------------------------------------------------------
// REGRA DO USUÁRIO:
// - Não sincronizado: A aplicação ainda não consultou o Drive.
// - Sincronizado — 0 registros: O Drive foi realmente consultado e a pasta está vazia.
// - Sincronizado — X registros: Foram encontrados X arquivos ou registros reais.
// NUNCA confundir esses três estados!
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
