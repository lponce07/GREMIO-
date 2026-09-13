import { Category, ClassificationRule, DocumentRecord, Transaction, SyncSummaryReport } from '../types';
import { BASE_PREDEFINED_CATEGORIES, BASE_CLASSIFICATION_RULES } from '../data/baseCategories';

/**
 * Normaliza strings para deduplicação inteligente de categorias.
 * Exemplo:
 * - "Material Ponte"
 * - "Materiais Ponte"
 * - "material da ponte"
 * - "Material para Ponte"
 * Todos normalizam para o mesmo slug: "material-ponte" e nome canônico "Material Ponte"
 */
export function normalizeCategoryText(text: string): { normalized: string; slug: string; canonicalName: string } {
  if (!text) {
    return { normalized: '', slug: '', canonicalName: '' };
  }

  // Remove acentos
  const noAccents = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Remove pontuações e caracteres especiais
  const cleaned = noAccents.replace(/[^a-z0-9\s]/g, ' ');

  // Lista de stopwords em português a ignorar na normalização do slug
  const stopwords = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'pra', 'com', 'e', 'em', 'no', 'na', 'nos', 'nas', 'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas']);

  // Plurais comuns para singular heurístico
  const singularize = (w: string): string => {
    if (w.endsWith('ões')) return w.slice(0, -3) + 'ao';
    if (w.endsWith('oes')) return w.slice(0, -3) + 'ao';
    if (w.endsWith('ais')) return w.slice(0, -3) + 'al';
    if (w.endsWith('eis')) return w.slice(0, -3) + 'el';
    if (w.endsWith('ens')) return w.slice(0, -3) + 'em';
    if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  };

  const rawTokens = cleaned.split(/\s+/).filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => !stopwords.has(t));
  const singularTokens = meaningfulTokens.map(singularize);

  const slug = singularTokens.join('-');

  // Canonical name capitalizado (ex: "Material Ponte")
  const wordsForTitle = rawTokens.filter((t) => !stopwords.has(t));
  const canonicalName = wordsForTitle.length > 0
    ? wordsForTitle.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : text.trim();

  return {
    normalized: singularTokens.join(' '),
    slug,
    canonicalName,
  };
}

/**
 * Encontra categoria existente compatível para evitar criar duplicadas
 */
export function findMatchingCategory(candidateName: string, existingCategories: Category[]): Category | null {
  const { slug, normalized } = normalizeCategoryText(candidateName);
  if (!slug) return null;

  for (const cat of existingCategories) {
    const catNorm = normalizeCategoryText(cat.name);
    if (cat.slug === slug || catNorm.slug === slug) {
      return cat;
    }
    // Verificação de igualdade normalizada
    if (catNorm.normalized === normalized && normalized.length > 2) {
      return cat;
    }
  }

  return null;
}

/**
 * Padrões de conhecimento militar e contábil do NPOR para categorias comuns
 */
interface SemanticArchetype {
  canonicalName: string;
  keywords: string[];
  suggestedParent?: string;
  color?: string;
  defaultConfidence: number;
}

const COMMON_NPOR_ARCHETYPES: SemanticArchetype[] = [
  {
    canonicalName: 'Material Ponte',
    keywords: ['ponte', 'madeira', 'madeireira', 'prego', 'pregos', 'parafuso', 'parafusos', 'tabua', 'tabuas', 'caibro', 'viga', 'cabo de aco', 'sarrafo'],
    color: '#92400E',
    defaultConfidence: 0.94,
  },
  {
    canonicalName: 'Material de Engenharia',
    keywords: ['engenharia', 'topografia', 'teodolito', 'estaca', 'trena', 'baliza', 'bussola', 'arame', 'ferramenta', 'enxada', 'pa'],
    color: '#0891B2',
    defaultConfidence: 0.92,
  },
  {
    canonicalName: 'Reforma NPOR',
    keywords: ['reforma', 'alojamento', 'pintura', 'tinta', 'cimento', 'argamassa', 'pincel', 'rolo', 'parede', 'reparo', 'fechadura', 'torneira'],
    color: '#D97706',
    defaultConfidence: 0.93,
  },
  {
    canonicalName: 'Material de Limpeza',
    keywords: ['limpeza', 'desinfetante', 'cloro', 'vassoura', 'rodo', 'detergente', 'saco de lixo', 'sabao', 'papel higienico', 'pano de chao', 'mop'],
    color: '#0D9488',
    defaultConfidence: 0.94,
  },
  {
    canonicalName: 'Café e Copa',
    keywords: ['cafe', 'copa', 'acucar', 'filtro', 'termica', 'garrafa termica', 'adocante', 'copo descartavel', 'cha', 'biscoito', 'bolacha'],
    color: '#78350F',
    defaultConfidence: 0.93,
  },
  {
    canonicalName: 'Quadros BJJ',
    keywords: ['quadro', 'bjj', 'jiu jitsu', 'tatame', 'faixa', 'moldura', 'lona', 'artes marciais', 'luta'],
    color: '#475569',
    defaultConfidence: 0.92,
  },
  {
    canonicalName: 'Som e Iluminação',
    keywords: ['som', 'dj', 'iluminacao', 'caixa de som', 'microfone', 'amplificador', 'mesa de som', 'canhao de luz', 'festa julina som'],
    suggestedParent: 'cat-festa-julina',
    color: '#7C3AED',
    defaultConfidence: 0.92,
  },
  {
    canonicalName: 'Transporte e Combustível',
    keywords: ['transporte', 'combustivel', 'gasolina', 'diesel', 'posto', 'abastecimento', 'van', 'onibus', 'pedagio', 'frete'],
    color: '#2563EB',
    defaultConfidence: 0.91,
  },
  {
    canonicalName: 'Alimentação',
    keywords: ['alimentacao', 'marmita', 'lanche', 'refeicao', 'restaurante', 'buffet', 'padaria', 'pao', 'supermercado'],
    color: '#EA580C',
    defaultConfidence: 0.90,
  },
  {
    canonicalName: 'Decoração',
    keywords: ['decoracao', 'ornamentacao', 'balao', 'flores', 'arranjos', 'bandeirola', 'painel', 'toalha'],
    color: '#DB2777',
    defaultConfidence: 0.90,
  },
  {
    canonicalName: 'Equipamentos',
    keywords: ['equipamento', 'projetor', 'tela', 'cabo hdmi', 'adaptador', 'pilha', 'bateria', 'carregador'],
    color: '#4F46E5',
    defaultConfidence: 0.90,
  },
];

/**
 * Extração básica de texto incorporado em documentos PDF sem renderizador pesado
 */
export function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    let str = '';
    // Varre em blocos para extrair strings legíveis ASCII / UTF-8
    const len = Math.min(bytes.length, 500000); // 500KB cap
    const chars: string[] = [];

    for (let i = 0; i < len; i++) {
      const b = bytes[i];
      // Caracteres imprimíveis
      if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
        chars.push(String.fromCharCode(b));
      } else if (chars.length > 0 && chars[chars.length - 1] !== ' ') {
        chars.push(' ');
      }
    }

    str = chars.join('');

    // Filtra tokens de streams PDF (TJ, Tj, etc.)
    const textPieces: string[] = [];
    const tjRegex = /\(([^\)]+)\)\s*(?:Tj|TJ)/g;
    let m: RegExpExecArray | null;
    while ((m = tjRegex.exec(str)) !== null) {
      if (m[1] && m[1].length > 1) {
        textPieces.push(m[1]);
      }
    }

    if (textPieces.length > 5) {
      return textPieces.join(' ');
    }

    // Se não encontrou blocos Tj estruturados, procura por palavras-chave relevantes
    const rawClean = str.replace(/\s+/g, ' ');
    return rawClean.slice(0, 5000);
  } catch (e) {
    console.warn('Falha na extração de texto PDF:', e);
    return '';
  }
}

export interface VoucherMetadata {
  detectedAmount?: number;
  detectedDate?: string;
  detectedSupplier?: string;
  detectedReceiver?: string;
  detectedPayer?: string;
  detectedCpfCnpj?: string;
  detectedBank?: string;
  detectedControlNumber?: string;
  detectedTransactionType?: string;
  detectedDescription?: string;
  detectedPurpose?: string;
  needsReview?: boolean;
}

/**
 * Extração de dados estruturados (valor, data, fornecedor, tipo de documento) a partir de texto
 */
export function parseVoucherMetadata(textToAnalyze: string): VoucherMetadata {
  if (!textToAnalyze) return { needsReview: true };

  const clean = textToAnalyze.replace(/\r?\n/g, ' ');

  // 1. Extração de Valor (R$ 1.250,50 ou R$1250.50)
  let detectedAmount: number | undefined;
  const amountRegexes = [
    /(?:valor[\s\w]*|total[\s\w]*|quantia|pago|recebido|pix)[\s:]*r?\$?\s*([\d\.]+(?:,\d{2}))/i,
    /r\$\s*([\d\.]+(?:,\d{2}))/i,
    /([\d\.]+(?:,\d{2}))\s*(?:reais|brl)/i,
    /r\$\s*(\d+)/i,
  ];

  for (const rx of amountRegexes) {
    const match = clean.match(rx);
    if (match && match[1]) {
      const rawNum = match[1].replace(/\./g, '').replace(',', '.');
      const val = parseFloat(rawNum);
      if (!isNaN(val) && val > 0 && val < 500000) {
        detectedAmount = val;
        break;
      }
    }
  }

  // 2. Extração de Data (dd/mm/aaaa ou aaaa-mm-dd)
  let detectedDate: string | undefined;
  const dateMatch = clean.match(/(?:data|em|dia)?[\s:]*(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/i);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    detectedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 3. Tipo da transação
  let detectedTransactionType = 'outro';
  const normClean = clean.toLowerCase();
  if (/pix|chave pix|transferencia pix|id transacao/.test(normClean)) {
    detectedTransactionType = 'comprovante_pix';
  } else if (/danfe|nota fiscal|nfe|nf-e|chave de acesso/.test(normClean)) {
    detectedTransactionType = 'nota_fiscal';
  } else if (/boleto|codigo de barras|linha digitavel|beneficiario final/.test(normClean)) {
    detectedTransactionType = 'boleto';
  } else if (/recibo|recebemos de|declaramos que recebemos/.test(normClean)) {
    detectedTransactionType = 'recibo';
  } else if (/ted|doc|transferencia entre contas|ted\/doc/.test(normClean)) {
    detectedTransactionType = 'transferencia';
  }

  // 4. Recebedor / Favorecido
  let detectedReceiver: string | undefined;
  const receiverRegexes = [
    /(?:recebedor|favorecido|beneficiario|destino|creditado|pago a|para|destinatario)[\s:]*([A-Za-z0-9\s\.\-]{3,45}?)(?:\s*(?:cpf|cnpj|chave|banco|instituicao|agencia|conta|valor|data|$))/i,
    /(?:razao social|nome fantasia)[\s:]*([A-Za-z0-9\s\.\-]{3,45}?)(?:\s*(?:cnpj|inscricao|endereco|$))/i,
    /(madeireira\s+[A-Za-z0-9\s]+)/i,
    /(posto\s+[A-Za-z0-9\s]+)/i,
    /(grafica\s+[A-Za-z0-9\s]+)/i,
    /(distribuidora\s+[A-Za-z0-9\s]+)/i,
    /(comercio\s+[A-Za-z0-9\s]+)/i,
  ];

  for (const rx of receiverRegexes) {
    const match = clean.match(rx);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length > 2 && !/^(de|da|do|em|para|com|r\$|pix|cpf|cnpj|banco)$/i.test(candidate)) {
        detectedReceiver = candidate;
        break;
      }
    }
  }

  // 5. Pagador / Origem
  let detectedPayer: string | undefined;
  const payerRegexes = [
    /(?:pagador|debitado|origem|remetente|pago por|de)[\s:]*([A-Za-z0-9\s\.\-]{3,45}?)(?:\s*(?:cpf|cnpj|instituicao|agencia|conta|valor|data|$))/i,
  ];
  for (const rx of payerRegexes) {
    const match = clean.match(rx);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length > 2 && !/^(de|da|do|em|para|com|r\$|pix|cpf|cnpj|banco)$/i.test(candidate)) {
        detectedPayer = candidate;
        break;
      }
    }
  }

  // 6. CPF ou CNPJ
  let detectedCpfCnpj: string | undefined;
  const cnpjMatch = clean.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  if (cnpjMatch) {
    detectedCpfCnpj = cnpjMatch[0];
  } else {
    const cpfMatch = clean.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    if (cpfMatch) {
      detectedCpfCnpj = cpfMatch[0];
    } else {
      // CPF mascarado (ex: ***.123.456-**)
      const maskedCpfMatch = clean.match(/\b(?:\*{3}|\d{3})\.?\d{3}\.?\d{3}[-\.]?(?:\*{2}|\d{2})\b/);
      if (maskedCpfMatch) {
        detectedCpfCnpj = maskedCpfMatch[0];
      }
    }
  }

  // 7. Instituição Financeira / Banco
  let detectedBank: string | undefined;
  const bankPatterns: [RegExp, string][] = [
    [/banco do brasil|bb s\.a\.|bb/i, 'Banco do Brasil'],
    [/caixa economica|cef|caixa federal/i, 'Caixa Econômica'],
    [/itau|itaú|itau unibanco/i, 'Itaú'],
    [/bradesco|banco bradesco/i, 'Bradesco'],
    [/santander|banco santander/i, 'Santander'],
    [/nubank|nu pagamentos/i, 'Nubank'],
    [/banco inter|intermedium/i, 'Banco Inter'],
    [/sicredi/i, 'Sicredi'],
    [/sicoob/i, 'Sicoob'],
    [/c6 bank|c6/i, 'C6 Bank'],
    [/mercado pago|mercadopago/i, 'Mercado Pago'],
    [/pagbank|pagseguro/i, 'PagBank'],
  ];
  for (const [pattern, bankName] of bankPatterns) {
    if (pattern.test(normClean)) {
      detectedBank = bankName;
      break;
    }
  }

  // 8. Número de Controle / Autenticação / Protocolo
  let detectedControlNumber: string | undefined;
  const controlRegexes = [
    /(?:autenticacao|controle|id transacao|protocolo|identificador|chave de acesso)[\s:]*([A-Za-z0-9\-\.]{8,50})/i,
    /\b([E|D][0-9]{24,40})\b/, // Padrão de ID PIX de ponta a ponta (inicia com E ou D seguido de data/hora)
  ];
  for (const crx of controlRegexes) {
    const match = clean.match(crx);
    if (match && match[1]) {
      detectedControlNumber = match[1].trim();
      break;
    }
  }

  // 9. Extração de Finalidade / Projeto / Contexto
  let detectedPurpose: string | undefined;
  const purposeRegexes = [
    /(material\s+ponte|materiais\s+ponte|ponte\s+bailey|ponte)/i,
    /(festa\s+julina|arraia)/i,
    /(reforma\s+alojamento|reforma\s+npor|reforma)/i,
    /(material\s+engenharia|engenharia)/i,
    /(quadro\s+bjj|tatame|jiu\s+jitsu)/i,
    /(cafe\s+e\s+copa|copa|cafe)/i,
    /(som\s+e\s+iluminacao|som|iluminacao)/i,
    /(camisa|camisas|camiseta|camisetas)/i,
    /(abrigo|abrigos|agasalho)/i,
    /(uniforme|uniformes|fardamento)/i,
    /(rifa|rifas)/i,
    /(mensalidade|mensalidades)/i,
  ];

  for (const prx of purposeRegexes) {
    const pMatch = clean.match(prx);
    if (pMatch && pMatch[1]) {
      detectedPurpose = pMatch[1].trim();
      break;
    }
  }

  // Se não foi possível identificar o valor ou se faltam evidências determinísticas mínimas,
  // marca como needsReview sem inventar valores!
  const needsReview = !detectedAmount || detectedAmount <= 0;

  return {
    detectedAmount,
    detectedDate,
    detectedSupplier: detectedReceiver,
    detectedReceiver,
    detectedPayer,
    detectedCpfCnpj,
    detectedBank,
    detectedControlNumber,
    detectedTransactionType,
    detectedDescription: detectedPurpose,
    detectedPurpose,
    needsReview,
  };
}

/**
 * Motor Central de Classificação de Comprovantes
 */
export interface ClassificationResult {
  categoryId?: string;
  categoryName?: string;
  isNewCategory: boolean;
  newCategory?: Category;
  confidence: number;
  status: 'classificado' | 'aguardando_confirmacao' | 'aguardando_classificacao';
  reason: string;
  matchedRuleId?: string;
}


/**
 * Usa a estrutura real de pastas do Drive como evidência determinística.
 * Ex.: CUSTOS ADICIONAIS / MATERIAL PONTE BAILEY / SAIDA -> Material Ponte Bailey.
 */
function getCategoryCandidateFromDrivePath(doc: DocumentRecord): string | null {
  const rawPath = (doc.driveFolderPath || doc.driveFolder || '').trim();
  if (!rawPath) return null;

  const ignored = new Set([
    'PLANILHA MAE', 'PLANILHA MÃE', 'CUSTOS ADICIONAIS', 'SAIDA', 'SAÍDA', 'ENTRADA',
    'COMPROVANTES', 'COMPROVANTE', 'DOCUMENTOS', 'DOCUMENTO', 'ARQUIVOS', 'ARQUIVO',
    'PAGAMENTOS', 'PAGAMENTO', 'RECEITAS', 'RECEITA', 'DESPESAS', 'DESPESA'
  ]);

  const segments = rawPath
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  // A criação DINÂMICA pela estrutura de pastas é propositalmente restrita a
  // CUSTOS ADICIONAIS. Nas demais pastas oficiais (Mensalidade, Rifas, Camisas,
  // Contratos etc.) as subpastas normalmente representam mês, fornecedor ou
  // organização interna e NÃO devem virar novas categorias por acidente.
  const custosIdx = segments.findIndex((seg) => normalizeCategoryText(seg).slug === 'custo-adicional');
  if (custosIdx >= 0) {
    // Prefere a primeira subpasta substantiva após CUSTOS ADICIONAIS. Assim:
    // CUSTOS ADICIONAIS / MATERIAL PONTE BAILEY / SAIDA -> Material Ponte Bailey
    for (let i = custosIdx + 1; i < segments.length; i++) {
      const seg = segments[i];
      const normUpper = seg.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (!ignored.has(normUpper) && seg.length >= 3) return seg;
    }
  }

  return null;
}

function inferDocumentFinancialDirection(doc: DocumentRecord): 'entrada' | 'saida' {
  if (doc.financialDirection) return doc.financialDirection;
  const corpus = `${doc.driveFolderPath || ''} ${doc.driveFolder || ''} ${doc.name || ''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/(^|[\s/\-_])entrada([\s/\-_]|$)|recebimento|recebido/.test(corpus)) return 'entrada';
  return 'saida';
}

export function classifyDocument(
  doc: DocumentRecord,
  categories: Category[],
  rules: ClassificationRule[],
  contextTransactions: Transaction[] = []
): ClassificationResult {
  // Constrói texto unificado de análise (nome do arquivo + pasta + texto OCR + fornecedor detectado)
  const unifiedCorpus = [
    doc.name || '',
    doc.driveFolder || '',
    doc.driveFolderPath || '',
    doc.detectedPersonOrCompany || '',
    doc.detectedSupplier || '',
    doc.detectedPurpose || '',
    doc.fileContentOrOcrText || '',
    doc.extractedText || '',
  ]
    .join(' ')
    .toLowerCase();

  // 0. REGRA MAIS FORTE: caminho real do Google Drive.
  const pathCandidate = getCategoryCandidateFromDrivePath(doc);
  if (pathCandidate) {
    const existingFromPath = findMatchingCategory(pathCandidate, categories);
    if (existingFromPath) {
      return {
        categoryId: existingFromPath.id,
        categoryName: existingFromPath.name,
        isNewCategory: false,
        confidence: 1,
        status: 'classificado',
        reason: `Categoria determinada pela subpasta real do Google Drive: ${pathCandidate}`,
      };
    }

    const { slug, canonicalName } = normalizeCategoryText(pathCandidate);
    if (slug && canonicalName) {
      const newCat: Category = {
        id: `cat-dyn-${slug}`,
        name: canonicalName,
        slug,
        source: 'automatic',
        isDynamic: true,
        createdAt: new Date().toISOString(),
        description: `Categoria criada automaticamente a partir da estrutura real de pastas do Google Drive (${doc.driveFolderPath || pathCandidate}).`,
        color: '#4B5320',
        keywords: [canonicalName.toLowerCase()],
        totalSpent: 0,
        transactionsCount: 0,
        documentsCount: 0,
      };
      return {
        categoryId: newCat.id,
        categoryName: newCat.name,
        isNewCategory: true,
        newCategory: newCat,
        confidence: 1,
        status: 'classificado',
        reason: `Nova categoria determinada pela subpasta real do Google Drive: ${pathCandidate}`,
      };
    }
  }

  // 1. REGRA PRIORITÁRIA: Regras aprendidas do usuário ou regras oficiais
  // Ordenadas por prioridade decrescente
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    let matches = false;

    // Regra por fornecedor
    if (rule.supplier && (doc.detectedPersonOrCompany || doc.detectedSupplier)) {
      const sup = (doc.detectedPersonOrCompany || doc.detectedSupplier || '').toLowerCase();
      if (sup.includes(rule.supplier.toLowerCase()) || rule.supplier.toLowerCase().includes(sup)) {
        matches = true;
      }
    }

    // Regra por pasta
    if (!matches && rule.folder && (doc.driveFolder || doc.driveFolderPath)) {
      const folderCorpus = `${doc.driveFolder || ''} / ${doc.driveFolderPath || ''}`
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const ruleFolder = rule.folder.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (folderCorpus.split('/').map((v) => v.trim()).includes(ruleFolder) || folderCorpus.includes(ruleFolder)) {
        matches = true;
      }
    }

    // Regra por palavra-chave
    if (!matches && rule.keyword) {
      const kw = rule.keyword.toLowerCase();
      if (unifiedCorpus.includes(kw)) {
        matches = true;
      }
    }

    if (matches) {
      const targetCat = categories.find((c) => c.id === rule.targetCategoryId) ||
        categories.find((c) => c.name.toLowerCase() === rule.categoryName.toLowerCase());

      const confidence = rule.confidence || (rule.isUserConfirmed ? 1.0 : 0.95);
      const isAuto = confidence >= 0.90;

      return {
        categoryId: targetCat ? targetCat.id : undefined,
        categoryName: targetCat ? targetCat.name : rule.categoryName,
        isNewCategory: false,
        confidence,
        status: isAuto ? 'classificado' : 'aguardando_confirmacao',
        reason: rule.isUserConfirmed
          ? `Regra de classificação confirmada pelo usuário (${rule.keyword || rule.supplier || rule.folder})`
          : `Regra cadastrada para ${rule.keyword || rule.supplier || rule.folder}`,
        matchedRuleId: rule.id,
      };
    }
  }

  // 2. REGRA SEMÂNTICA: Arquétipos Comuns do NPOR (Material Ponte, Reforma NPOR, Limpeza, etc.)
  for (const archetype of COMMON_NPOR_ARCHETYPES) {
    let matchCount = 0;
    for (const kw of archetype.keywords) {
      if (unifiedCorpus.includes(kw.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Confiança escala com quantidade de palavras-chave coincidentes
      const score = Math.min(
        0.98,
        matchCount >= 2 ? archetype.defaultConfidence : archetype.defaultConfidence - 0.12
      );

      // Verifica se a categoria já existe
      const existing = findMatchingCategory(archetype.canonicalName, categories);

      if (existing) {
        return {
          categoryId: existing.id,
          categoryName: existing.name,
          isNewCategory: false,
          confidence: score,
          status: score >= 0.90 ? 'classificado' : 'aguardando_confirmacao',
          reason: `Identificado padrão relacionado a ${existing.name} (${matchCount} palavras-chave)`,
        };
      }

      // Se a categoria ainda não existe e a confiança é alta, cria dinamicamente
      const { slug, canonicalName } = normalizeCategoryText(archetype.canonicalName);
      const newCat: Category = {
        id: `cat-dyn-${slug}-${Date.now()}`,
        name: canonicalName,
        slug,
        parentCategoryId: archetype.suggestedParent,
        source: 'automatic',
        isDynamic: true,
        createdAt: new Date().toISOString(),
        description: `Categoria dinâmica identificada automaticamente a partir de comprovantes e despesas de ${canonicalName}.`,
        color: archetype.color || '#4B5320',
        keywords: archetype.keywords,
        totalSpent: 0,
        transactionsCount: 0,
      };

      return {
        categoryId: score >= 0.90 ? newCat.id : undefined,
        categoryName: newCat.name,
        isNewCategory: true,
        newCategory: newCat,
        confidence: score,
        status: score >= 0.90 ? 'classificado' : 'aguardando_confirmacao',
        reason: `Nova categoria sugerida a partir do conteúdo do comprovante: ${canonicalName}`,
      };
    }
  }

  // 3. Verificação de vínculo contextual com descrição de transações já existentes
  if (contextTransactions.length > 0) {
    for (const tx of contextTransactions) {
      if (tx.category && tx.category !== 'Custos adicionais' && tx.category !== 'Geral') {
        const txWords = tx.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        let txMatches = 0;
        for (const w of txWords) {
          if (unifiedCorpus.includes(w)) txMatches++;
        }

        if (txMatches >= 2) {
          const cat = categories.find((c) => c.name.toLowerCase() === tx.category.toLowerCase());
          if (cat) {
            return {
              categoryId: cat.id,
              categoryName: cat.name,
              isNewCategory: false,
              confidence: 0.88, // < 0.90 -> solicita confirmação do usuário
              status: 'aguardando_confirmacao',
              reason: `Contexto similar ao lançamento "${tx.description}" (${tx.category})`,
            };
          }
        }
      }
    }
  }

  // 4. Sem evidência clara: Documento aguardando classificação
  return {
    confidence: 0,
    status: 'aguardando_classificacao',
    isNewCategory: false,
    reason: 'Nenhuma evidência documental ou regra suficiente para determinar a categoria.',
  };
}

/**
 * Motor de Vínculo com Transações (Matching Financeiro Determinístico)
 */
export interface TransactionLinkResult {
  matchedTransaction?: Transaction;
  confidence: number;
  status: 'vinculado' | 'aguardando_confirmacao' | 'sem_vinculo';
  reason: string;
}

export function matchTransactionForDocument(
  doc: DocumentRecord,
  transactions: Transaction[]
): TransactionLinkResult {
  const pathCorpus = `${doc.driveFolderPath || ''} ${doc.driveFolder || ''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const financialFolderEvidence = /(^|[\s/])saida([\s/]|$)|(^|[\s/])entrada([\s/]|$)/.test(pathCorpus);
  const isVoucher = doc.type === 'comprovante_pix' || doc.type === 'recibo' || doc.type === 'nota_fiscal' || doc.type === 'boleto' || doc.type === 'transferencia' || financialFolderEvidence;
  if (!isVoucher) {
    return { confidence: 0, status: 'sem_vinculo', reason: 'Documento não possui evidência financeira suficiente para conciliação automática' };
  }

  let bestMatch: Transaction | null = null;
  let highestScore = 0;
  let matchReason = '';

  for (const tx of transactions) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Link direto pré-existente
    if (tx.receiptDocumentId === doc.id || (tx.documentIds && tx.documentIds.includes(doc.id))) {
      return {
        matchedTransaction: tx,
        confidence: 1.0,
        status: 'vinculado',
        reason: 'Documento já explicitamente vinculado ao lançamento contábil',
      };
    }

    if (tx.googleDriveFileLink && doc.sourceFileId && tx.googleDriveFileLink.includes(doc.sourceFileId)) {
      return {
        matchedTransaction: tx,
        confidence: 1.0,
        status: 'vinculado',
        reason: 'Link direto do arquivo registrado na planilha mãe',
      };
    }

    // 2. Comparação de Valor
    const docAmount = typeof doc.detectedAmount === 'number' ? doc.detectedAmount : 0;
    if (docAmount > 0 && tx.amount > 0) {
      const diff = Math.abs(tx.amount - docAmount);
      if (diff < 0.01) {
        score += 45;
        reasons.push('Valor idêntico');
      } else if (diff <= 0.05) {
        score += 40;
        reasons.push('Valor correspondente (diferença de centavos)');
      }
    }

    // 3. Comparação de Data (+/- 3 dias de tolerância bancária)
    if (doc.date && tx.date) {
      if (doc.date === tx.date) {
        score += 30;
        reasons.push('Data exata');
      } else {
        const d1 = new Date(doc.date).getTime();
        const d2 = new Date(tx.date).getTime();
        const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
        if (diffDays <= 1) {
          score += 25;
          reasons.push('Data coincidente (+/- 1 dia)');
        } else if (diffDays <= 3) {
          score += 15;
          reasons.push('Data próxima (+/- 3 dias)');
        }
      }
    }

    // 4. Fornecedor / Favorecido
    const sup = (doc.detectedReceiver || doc.detectedPersonOrCompany || doc.detectedSupplier || '').toLowerCase();
    const ben = (tx.beneficiaryName || '').toLowerCase();
    const txDescLow = (tx.description || '').toLowerCase();
    if (sup && sup.length > 2) {
      if (ben && ben.length > 2 && (sup.includes(ben) || ben.includes(sup))) {
        score += 25;
        reasons.push('Favorecido correspondente');
      } else if (txDescLow.includes(sup) || sup.includes(txDescLow)) {
        score += 20;
        reasons.push('Favorecido citado na descrição da despesa');
      }
    }

    if (doc.detectedPayer && doc.detectedPayer.length > 2 && ben && (doc.detectedPayer.toLowerCase().includes(ben) || ben.includes(doc.detectedPayer.toLowerCase()))) {
      score += 20;
      reasons.push('Pagador/Origem correspondente');
    }

    // 5. Descrição / Código no nome do arquivo
    const docName = (doc.name || '').toLowerCase();
    if (tx.code && docName.includes(tx.code.toLowerCase())) {
      score += 20;
      reasons.push(`Código ${tx.code} no arquivo`);
    }

    const descWords = (tx.description || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    let wordMatches = 0;
    for (const w of descWords) {
      if (docName.includes(w)) wordMatches++;
    }
    if (wordMatches >= 2) {
      score += 15;
      reasons.push('Palavras-chave da despesa no nome do comprovante');
    }

    // 6. Categoria ou Finalidade idêntica (ex: Material Ponte <-> Material Ponte)
    const docCat = (doc.categoryName || '').toLowerCase();
    const docPurpose = (doc.detectedPurpose || '').toLowerCase();
    const txCat = (tx.category || '').toLowerCase();
    const txDesc = (tx.description || '').toLowerCase();

    if (docCat && txCat && (docCat.includes(txCat) || txCat.includes(docCat) || normalizeCategoryText(docCat).slug === normalizeCategoryText(txCat).slug)) {
      score += 25;
      reasons.push(`Categoria correspondente (${doc.categoryName})`);
    } else if (docPurpose && (txCat.includes(docPurpose) || txDesc.includes(docPurpose))) {
      score += 20;
      reasons.push(`Finalidade identificada (${doc.detectedPurpose})`);
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = tx;
      matchReason = reasons.join(', ');
    }
  }

  const confidence = Math.min(1.0, highestScore / 100);

  if (confidence >= 0.85 && bestMatch) {
    return {
      matchedTransaction: bestMatch,
      confidence,
      status: 'vinculado',
      reason: `Vínculo inequívoco (${matchReason})`,
    };
  } else if (confidence >= 0.50 && bestMatch) {
    return {
      matchedTransaction: bestMatch,
      confidence,
      status: 'aguardando_confirmacao',
      reason: `Possível vínculo encontrado (${matchReason})`,
    };
  }

  return {
    confidence: 0,
    status: 'sem_vinculo',
    reason: 'Nenhuma despesa correspondente encontrada',
  };
}

/**
 * Processamento completo em lote de classificação e vinculação de documentos
 */
export function classifyAndLinkAllDocuments(
  documents: DocumentRecord[],
  transactions: Transaction[],
  existingCategories: Category[],
  existingRules: ClassificationRule[]
): {
  updatedDocuments: DocumentRecord[];
  updatedTransactions: Transaction[];
  updatedCategories: Category[];
  syncReport: SyncSummaryReport;
} {
  const currentCategories = [...existingCategories];
  const updatedTransactions = [...transactions];
  const newCategoriesCreated: string[] = [];
  const newCategoriesSuggested: string[] = [];
  const existingCategoriesUsedSet = new Set<string>();

  let automaticLinks = 0;
  let linksPendingConfirmation = 0;
  let documentsIdentified = 0;
  let documentsUnidentified = 0;

  const updatedDocuments = documents.map((doc) => {
    // 1. Extração preliminar de metadados se não existirem
    const metadata = parseVoucherMetadata(
      `${doc.name || ''} ${doc.fileContentOrOcrText || ''} ${doc.extractedText || ''}`
    );

    const docWithMeta: DocumentRecord = {
      ...doc,
      detectedAmount: doc.detectedAmount || metadata.detectedAmount,
      detectedDate: doc.detectedDate || metadata.detectedDate,
      detectedSupplier: doc.detectedSupplier || metadata.detectedSupplier,
      detectedPersonOrCompany: doc.detectedReceiver || doc.detectedPersonOrCompany || metadata.detectedSupplier,
      detectedReceiver: doc.detectedReceiver || metadata.detectedReceiver || metadata.detectedSupplier,
      detectedPayer: doc.detectedPayer || metadata.detectedPayer,
      detectedCpfCnpj: doc.detectedCpfCnpj || metadata.detectedCpfCnpj,
      detectedBank: doc.detectedBank || metadata.detectedBank,
      detectedControlNumber: doc.detectedControlNumber || metadata.detectedControlNumber,
      detectedTransactionType: doc.detectedTransactionType || metadata.detectedTransactionType,
      detectedPurpose: doc.detectedPurpose || metadata.detectedPurpose,
    };

    // 2. Classificação
    const classResult = classifyDocument(docWithMeta, currentCategories, existingRules, updatedTransactions);

    let finalCatId = docWithMeta.categoryId;
    let finalCatName = docWithMeta.categoryName;
    let finalStatus = docWithMeta.classificationStatus || classResult.status;

    if (classResult.status === 'classificado') {
      documentsIdentified++;
      if (classResult.isNewCategory && classResult.newCategory) {
        // Criar categoria dinamicamente
        currentCategories.push(classResult.newCategory);
        newCategoriesCreated.push(classResult.newCategory.name);
        finalCatId = classResult.newCategory.id;
        finalCatName = classResult.newCategory.name;
      } else if (classResult.categoryId) {
        finalCatId = classResult.categoryId;
        finalCatName = classResult.categoryName;
        if (classResult.categoryName) existingCategoriesUsedSet.add(classResult.categoryName);
      }
    } else if (classResult.status === 'aguardando_confirmacao') {
      documentsIdentified++;
      if (classResult.categoryName) {
        newCategoriesSuggested.push(classResult.categoryName);
      }
    } else {
      documentsUnidentified++;
    }

    // 3. Vínculo com Transações
    const linkResult = matchTransactionForDocument(docWithMeta, updatedTransactions);

    let relatedTxId = docWithMeta.relatedTransactionId;
    let linkStatus = docWithMeta.transactionLinkStatus || linkResult.status;
    let suggestedTxId = docWithMeta.suggestedTransactionId;

    if (linkResult.status === 'vinculado' && linkResult.matchedTransaction) {
      automaticLinks++;
      relatedTxId = linkResult.matchedTransaction.id;
      linkStatus = 'vinculado';

      // Atualiza a transação para vincular o documento
      const txIndex = updatedTransactions.findIndex((t) => t.id === linkResult.matchedTransaction!.id);
      if (txIndex >= 0) {
        const tx = updatedTransactions[txIndex];
        const docIds = Array.isArray(tx.documentIds) ? [...tx.documentIds] : [];
        if (!docIds.includes(doc.id)) docIds.push(doc.id);
        const detectedSup = doc.detectedSupplier || docWithMeta.detectedSupplier;
        const finalBeneficiary = (detectedSup && detectedSup.length > 2)
          ? detectedSup
          : (tx.beneficiaryName || 'Não especificado');

        const resolvedCategoryName = (finalCatName && finalCatName !== 'Custos adicionais' && finalCatName !== 'Geral')
          ? finalCatName
          : tx.category;

        updatedTransactions[txIndex] = {
          ...tx,
          receiptDocumentId: tx.receiptDocumentId || doc.id,
          documentIds: docIds,
          beneficiaryName: finalBeneficiary,
          categoryId: tx.categoryId || finalCatId,
          category: resolvedCategoryName,
          status: tx.type === 'despesa' ? 'paga' : tx.status,
          sourceFileName: tx.sourceFileName || doc.name,
          creationReason: tx.creationReason || `Lançamento conciliado automaticamente com comprovante (${doc.name})`,
        };
      }
    } else if (linkResult.status === 'aguardando_confirmacao' && linkResult.matchedTransaction) {
      linksPendingConfirmation++;
      suggestedTxId = linkResult.matchedTransaction.id;
      linkStatus = 'aguardando_confirmacao';
    }

    // 4. Criação automática de movimentação para comprovantes com evidência financeira inequívoca
    // (Apenas se não foi vinculado a nenhuma transação existente da planilha, possui valor > 0 e tipo financeiro real)
    const pathCorpus = `${doc.driveFolderPath || ''} ${doc.driveFolder || ''}`
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const financialFolderEvidence = /(^|[\s/])saida([\s/]|$)|(^|[\s/])entrada([\s/]|$)/.test(pathCorpus);
    const isFinancialProof = doc.type === 'comprovante_pix' || doc.type === 'recibo' || doc.type === 'nota_fiscal' || doc.type === 'transferencia' || financialFolderEvidence;
    if (!relatedTxId && isFinancialProof && typeof docWithMeta.detectedAmount === 'number' && docWithMeta.detectedAmount > 0) {
      const newTxId = `tx-voucher-${doc.sourceFileId || doc.id}`;
      const alreadyHasTx = updatedTransactions.some((t) => t.id === newTxId || (t.sourceFileId === doc.sourceFileId && doc.sourceFileId));
      if (!alreadyHasTx) {
        const detectedSup = docWithMeta.detectedSupplier || docWithMeta.detectedPersonOrCompany || 'Não informado';
        const financialDirection = inferDocumentFinancialDirection(docWithMeta);
        const autoTx: Transaction = {
          id: newTxId,
          code: `TX-${String(updatedTransactions.length + 1).padStart(4, '0')}`,
          date: docWithMeta.detectedDate || doc.date,
          type: financialDirection === 'entrada' ? 'receita' : 'despesa',
          description: doc.name.replace(/\.[^/.]+$/, '') || docWithMeta.detectedPurpose || 'Documento financeiro',
          category: finalCatName || 'Despesas Gerais',
          categoryId: finalCatId,
          amount: docWithMeta.detectedAmount,
          paymentMethod: (doc.type === 'comprovante_pix' ? 'pix' : (doc.type === 'transferencia' ? 'ted' : 'pix')) as any,
          beneficiaryName: detectedSup,
          responsibleUser: 'Tesouraria',
          status: financialDirection === 'entrada' ? 'recebida' : 'paga',
          receiptRequired: financialDirection === 'saida',
          receiptDocumentId: doc.id,
          documentIds: [doc.id],
          googleDriveFileLink: doc.originalFileUrl || doc.driveUrl,
          source: 'Google Drive',
          origin: 'Google Drive',
          sourceFileId: doc.sourceFileId,
          sourceFileName: doc.name,
          driveFolder: doc.driveFolder,
          driveFolderPath: doc.driveFolderPath,
          autoCreated: true,
          creationReason: `Criado automaticamente a partir de comprovante financeiro identificado (${doc.name})`,
          lastSyncedAt: new Date().toISOString(),
          syncedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        updatedTransactions.push(autoTx);
        relatedTxId = newTxId;
        linkStatus = 'vinculado';
        automaticLinks++;
      }
    }

    const finalAuditStatus: DocumentRecord['auditStatus'] = (relatedTxId || doc.type === 'planilha' || doc.type === 'contrato')
      ? 'conferido'
      : ((doc.auditStatus as DocumentRecord['auditStatus']) || 'sem_vinculo');

    const resultDoc: DocumentRecord = {
      ...docWithMeta,
      categoryId: finalCatId,
      categoryName: finalCatName,
      suggestedCategoryId: classResult.categoryId,
      suggestedCategoryName: classResult.categoryName,
      classificationConfidence: classResult.confidence,
      classificationStatus: finalStatus,
      relatedTransactionId: relatedTxId,
      suggestedTransactionId: suggestedTxId,
      transactionLinkConfidence: linkResult.confidence,
      transactionLinkStatus: linkStatus,
      auditStatus: finalAuditStatus,
    };

    return resultDoc;
  });

  // 5. NOVA CATEGORIA AUTOMÁTICA: Detecta qualquer categoria citada em transações ou documentos que ainda não exista
  const allReferencedCategories = new Set<string>();
  updatedTransactions.forEach((t) => { if (t.category && t.category.trim()) allReferencedCategories.add(t.category.trim()); });
  updatedDocuments.forEach((d) => { if (d.categoryName && d.categoryName.trim()) allReferencedCategories.add(d.categoryName.trim()); });

  allReferencedCategories.forEach((catName) => {
    const existing = findMatchingCategory(catName, currentCategories);
    if (!existing) {
      const { slug, canonicalName } = normalizeCategoryText(catName);
      if (slug && slug.length > 1) {
        const newDynamicCategory: Category = {
          id: `cat-dyn-${slug}`,
          name: canonicalName,
          slug,
          isDynamic: true,
          source: 'automatic',
          createdAt: new Date().toISOString(),
          description: `Categoria criada dinamicamente a partir de registros do Google Drive`,
          color: '#0284C7',
          totalSpent: 0,
          transactionsCount: 0,
          documentsCount: 0,
        };
        currentCategories.push(newDynamicCategory);
        newCategoriesCreated.push(canonicalName);
      }
    }
  });

  // Vincula IDs das categorias normalizadas nas transações e documentos
  for (let i = 0; i < updatedTransactions.length; i++) {
    const tx = updatedTransactions[i];
    if (tx.category) {
      const matchingCat = findMatchingCategory(tx.category, currentCategories);
      if (matchingCat) {
        updatedTransactions[i] = {
          ...tx,
          categoryId: matchingCat.id,
          category: matchingCat.name,
        };
      }
    }
  }

  for (let i = 0; i < updatedDocuments.length; i++) {
    const d = updatedDocuments[i];
    if (d.categoryName) {
      const matchingCat = findMatchingCategory(d.categoryName, currentCategories);
      if (matchingCat) {
        updatedDocuments[i] = {
          ...d,
          categoryId: matchingCat.id,
          categoryName: matchingCat.name,
        };
      }
    }
  }

  // Atualiza totais gastos e contagens nas categorias
  const finalCategories = currentCategories.map((cat) => {
    const catTxs = updatedTransactions.filter((t) => t.categoryId === cat.id || t.category.toLowerCase() === cat.name.toLowerCase());
    const catDocs = updatedDocuments.filter((d) => d.categoryId === cat.id);
    const totalSpent = catTxs.filter((t) => t.type === 'despesa').reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      ...cat,
      totalSpent,
      transactionsCount: catTxs.length,
      documentsCount: catDocs.length,
      updatedAt: new Date().toISOString(),
    };
  });

  const syncReport: SyncSummaryReport = {
    documentsFound: documents.length,
    documentsIdentified,
    documentsUnidentified,
    automaticLinks,
    linksPendingConfirmation,
    existingCategoriesUsed: Array.from(existingCategoriesUsedSet),
    newCategoriesSuggested: Array.from(new Set(newCategoriesSuggested)),
    newCategoriesCreated: Array.from(new Set(newCategoriesCreated)),
    timestamp: new Date().toISOString(),
  };

  return {
    updatedDocuments,
    updatedTransactions,
    updatedCategories: finalCategories,
    syncReport,
  };
}
