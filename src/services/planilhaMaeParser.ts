import * as XLSX from 'xlsx';
import {
  AdditionalCostRecord,
  JacketOrder,
  Member,
  MonthlyFee,
  Raffle,
  ShirtOrder,
  Transaction,
  UniformOrder,
} from '../types';

export interface PlanilhaMaeFinancialSummary {
  currentCashBalance?: number;
  totalRealRevenue?: number;
  totalRealExpenses?: number;
  totalPlannedRevenue?: number;
  totalPlannedExpenses?: number;
  sourceSheet: string;
}

export interface PlanilhaMaeParseResult {
  financialSummary: PlanilhaMaeFinancialSummary;
  transactions: Transaction[];
  members: Member[];
  monthlyFees: MonthlyFee[];
  raffles: Raffle[];
  shirtOrders: ShirtOrder[];
  jacketOrders: JacketOrder[];
  uniformOrders: UniformOrder[];
  additionalCosts: AdditionalCostRecord[];
  recordsExtracted: number;
  processedSheets: string[];
}

const MONTH_TO_NUMBER: Record<string, string> = {
  janeiro: '01', fevereiro: '02', marco: '03', março: '03', abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
};

function norm(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ');
}

function num(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!raw) return 0;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowsOf(workbook: XLSX.WorkBook, sheetName: string): any[][] {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as any[][];
}

function findSheetName(workbook: XLSX.WorkBook, candidate: string): string | undefined {
  const target = norm(candidate);
  return workbook.SheetNames.find((name) => norm(name) === target || norm(name).includes(target));
}

function stableIdPart(value: string): string {
  return norm(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function makeTx(args: {
  id: string;
  date: string;
  type: 'receita' | 'despesa';
  description: string;
  category: string;
  amount: number;
  sourceFileId: string;
  sourceFileName: string;
  sourceSheetName: string;
  sourceRowId: string;
  notes?: string;
  receiptRequired?: boolean;
  beneficiaryName?: string;
  fileUrl?: string;
}): Transaction {
  const now = new Date().toISOString();
  return {
    id: args.id,
    code: `DRV-${stableIdPart(args.sourceSheetName)}-${stableIdPart(args.sourceRowId)}`.slice(0, 42).toUpperCase(),
    date: args.date,
    type: args.type,
    description: args.description,
    category: args.category,
    amount: Math.round(args.amount * 100) / 100,
    paymentMethod: 'Outro',
    beneficiaryName: args.beneficiaryName || 'Não informado',
    responsibleUser: 'Tesouraria',
    status: args.type === 'receita' ? 'recebida' : 'paga',
    receiptRequired: args.receiptRequired ?? false,
    notes: args.notes,
    googleDriveFileLink: args.fileUrl,
    source: 'Planilha Importada',
    origin: 'Planilha Importada',
    sourceFileId: args.sourceFileId,
    sourceFileName: args.sourceFileName,
    sourceSheetName: args.sourceSheetName,
    sourceRowId: args.sourceRowId,
    autoCreated: true,
    creationReason: `Lançamento automático a partir da PLANILHA MÃE (${args.sourceSheetName})`,
    driveFolder: 'PLANILHA MÃE',
    driveFolderPath: 'PLANILHA MÃE',
    originalFileUrl: args.fileUrl,
    lastSyncedAt: now,
    syncedAt: now,
    createdAt: now,
  };
}

function parseResumo(
  rows: any[][],
  sourceFileId: string,
  sourceFileName: string,
  fileUrl: string | undefined,
  year: number,
  fallbackDate: string
): { summary: PlanilhaMaeFinancialSummary; transactions: Transaction[] } {
  const transactions: Transaction[] = [];
  const summary: PlanilhaMaeFinancialSummary = { sourceSheet: 'Resumo' };

  let realMonthlyTotal = 0;
  let realRaffleTotal = 0;
  let plannedMonthlyTotal = 0;
  let plannedRaffleTotal = 0;
  let extraRealRevenue = 0;
  let extraPlannedRevenue = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const label = norm(row[c]);
      if (!label) continue;

      if (label === 'arrecadacao real conta gremio') {
        const value = num(row[c + 1]);
        if (value > 0) summary.currentCashBalance = value;
      }
      if (label === 'gastos') {
        const right = num(row[c + 1]);
        if (right > 0) summary.totalRealExpenses = right;
      }
    }
  }

  // Bloco de mensalidades planejadas e reais no Resumo.
  for (let r = 2; r <= 11 && r < rows.length; r++) {
    const plannedMonth = norm(rows[r]?.[0]);
    const realMonth = norm(rows[r]?.[6]);
    const plannedValue = num(rows[r]?.[1]);
    const realValue = num(rows[r]?.[7]);

    if (MONTH_TO_NUMBER[plannedMonth] && plannedValue > 0) plannedMonthlyTotal += plannedValue;
    if (MONTH_TO_NUMBER[realMonth] && realValue > 0) {
      realMonthlyTotal += realValue;
      const mm = MONTH_TO_NUMBER[realMonth];
      transactions.push(makeTx({
        id: `tx-mae-resumo-mensalidade-${year}-${mm}`,
        date: `${year}-${mm}-01`,
        type: 'receita',
        description: `Mensalidades - ${rows[r]?.[6]}`,
        category: 'Mensalidades',
        amount: realValue,
        sourceFileId,
        sourceFileName,
        sourceSheetName: 'Resumo',
        sourceRowId: `resumo-real-mensalidade-r${r + 1}`,
        notes: 'Valor consolidado real da competência. A data representa a competência mensal, não a data individual de cada PIX.',
        beneficiaryName: 'Alunos do NPOR',
        fileUrl,
      }));
    }
  }

  // Bloco de rifas planejadas e reais.
  for (let r = 2; r <= 10 && r < rows.length; r++) {
    const plannedName = String(rows[r]?.[3] ?? '').trim();
    const realName = String(rows[r]?.[9] ?? '').trim();
    const plannedValue = num(rows[r]?.[4]);
    const realValue = num(rows[r]?.[10]);
    if (plannedName && norm(plannedName) !== 'total' && plannedValue > 0) plannedRaffleTotal += plannedValue;
    if (realName && norm(realName) !== 'total' && realValue > 0) {
      realRaffleTotal += realValue;
      transactions.push(makeTx({
        id: `tx-mae-resumo-rifa-${stableIdPart(realName)}`,
        date: fallbackDate,
        type: 'receita',
        description: `Rifa ${realName}`,
        category: 'Rifas',
        amount: realValue,
        sourceFileId,
        sourceFileName,
        sourceSheetName: 'Resumo',
        sourceRowId: `resumo-real-rifa-r${r + 1}`,
        notes: 'Valor real consolidado informado na aba Resumo.',
        beneficiaryName: 'Participantes da rifa',
        fileUrl,
      }));
    }
  }

  // Receitas adicionais consolidadas no lado real: Camisas, Centralização, Agasalho, Gorro, Delta e Festa Junina.
  const extraRealPairs: Array<[number, number]> = [
    [13, 6], [13, 9], [14, 6], [14, 9], [15, 6], [16, 6],
  ];
  for (const [r, c] of extraRealPairs) {
    const labelRaw = rows[r]?.[c];
    const label = String(labelRaw ?? '').trim();
    const value = num(rows[r]?.[c + 1]);
    if (!label || value <= 0) continue;
    extraRealRevenue += value;
    const n = norm(label);
    let category = label;
    if (n.includes('camisa')) category = 'Camisas';
    else if (n.includes('central')) category = 'Uniformes';
    else if (n.includes('agasalho') || n.includes('abrigo')) category = 'Abrigos';
    else if (n.includes('festa')) category = 'Festa Julina';

    transactions.push(makeTx({
      id: `tx-mae-resumo-extra-${stableIdPart(label)}`,
      date: fallbackDate,
      type: 'receita',
      description: label,
      category,
      amount: value,
      sourceFileId,
      sourceFileName,
      sourceSheetName: 'Resumo',
      sourceRowId: `resumo-real-extra-r${r + 1}-c${c + 1}`,
      notes: 'Valor real consolidado informado na aba Resumo; data individual não informada.',
      beneficiaryName: 'Não informado',
      fileUrl,
    }));
  }

  // Receitas adicionais previstas.
  const extraPlannedPairs: Array<[number, number]> = [[13, 0], [13, 3], [14, 0]];
  for (const [r, c] of extraPlannedPairs) {
    const label = String(rows[r]?.[c] ?? '').trim();
    const value = num(rows[r]?.[c + 1]);
    if (label && value > 0) extraPlannedRevenue += value;
  }

  summary.totalRealRevenue = Math.round((realMonthlyTotal + realRaffleTotal + extraRealRevenue) * 100) / 100;
  summary.totalPlannedRevenue = Math.round((plannedMonthlyTotal + plannedRaffleTotal + extraPlannedRevenue) * 100) / 100;
  summary.totalPlannedExpenses = undefined;

  return { summary, transactions };
}

function parseMonthlyFees(
  rows: any[][],
  sourceFileId: string,
  year: number
): { fees: MonthlyFee[]; members: Member[] } {
  const fees: MonthlyFee[] = [];
  const membersMap = new Map<string, Member>();
  if (!rows.length) return { fees, members: [] };

  const headerIndices: number[] = [];
  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    if (norm(rows[r]?.[0]).includes('pagamento dos alunos')) headerIndices.push(r);
  }
  if (!headerIndices.length) return { fees, members: [] };

  const actualHeader = headerIndices[0];
  const plannedHeader = headerIndices.length > 1 ? headerIndices[1] : -1;

  const readBlock = (headerRow: number): Map<string, Record<string, number>> => {
    const map = new Map<string, Record<string, number>>();
    if (headerRow < 0) return map;
    const header = rows[headerRow] || [];
    const months = header.map((v) => norm(v));
    for (let r = headerRow + 1; r < rows.length; r++) {
      const memberRaw = rows[r]?.[0];
      const member = String(memberRaw ?? '').trim();
      const memberNorm = norm(member);
      if (!member || memberNorm === 'total' || memberNorm.startsWith('meses com')) break;
      if (memberNorm === 'previsto') break;
      const rec: Record<string, number> = {};
      for (let c = 1; c < header.length; c++) {
        const monthNorm = months[c];
        if (!MONTH_TO_NUMBER[monthNorm]) continue;
        rec[MONTH_TO_NUMBER[monthNorm]] = num(rows[r]?.[c]);
      }
      map.set(member, rec);
    }
    return map;
  };

  const actual = readBlock(actualHeader);
  const planned = plannedHeader >= 0 ? readBlock(plannedHeader) : new Map<string, Record<string, number>>();
  const memberNames = new Set<string>([...actual.keys(), ...planned.keys()]);

  for (const memberName of memberNames) {
    const memberId = `member-${stableIdPart(memberName)}`;
    membersMap.set(memberId, {
      id: memberId,
      name: memberName,
      warName: memberName,
      militaryId: /^\d+$/.test(memberName) ? memberName : undefined,
      active: true,
    });

    for (const mm of Object.values(MONTH_TO_NUMBER).filter((v, i, arr) => arr.indexOf(v) === i)) {
      const paid = actual.get(memberName)?.[mm] ?? 0;
      const plannedAmount = planned.get(memberName)?.[mm] ?? 0;
      if (paid === 0 && plannedAmount === 0) continue;

      let status: MonthlyFee['status'];
      if (plannedAmount <= 0) status = paid > 0 ? 'Pago' : 'Não aplicável';
      else if (paid >= plannedAmount) status = 'Pago';
      else if (paid > 0) status = 'Parcial';
      else status = 'Pendente';

      fees.push({
        id: `mf-${sourceFileId}-${stableIdPart(memberName)}-${year}-${mm}`,
        memberId,
        memberName,
        competenceMonth: `${year}-${mm}`,
        amount: paid,
        plannedAmount,
        paidAmount: paid,
        difference: Math.round((plannedAmount - paid) * 100) / 100,
        status,
        source: 'Google Drive',
        sourceFileId,
        sourceRowId: `Pagamento mensalidades:${memberName}:${year}-${mm}`,
        notes: 'Importado automaticamente da PLANILHA MÃE; Real e Previsto mantidos separados.',
        lastSyncedAt: new Date().toISOString(),
      });
    }
  }

  return { fees, members: [...membersMap.values()] };
}

function parseRaffles(rows: any[][], sourceFileId: string): Raffle[] {
  if (!rows.length) return [];
  const blocks = [
    { name: 'Rifa Páscoa', plannedIdCol: 1, plannedValueCol: 2, realIdCol: 4, realValueCol: 5 },
    { name: 'Rifa Mães', plannedIdCol: 8, plannedValueCol: 9, realIdCol: 11, realValueCol: 12 },
    { name: 'Rifa Namorados', plannedIdCol: 15, plannedValueCol: 16, realIdCol: 18, realValueCol: 19 },
  ];

  return blocks.map((block) => {
    let plannedParticipants = 0;
    let realParticipants = 0;
    let explicitPlannedTotal: number | undefined;
    let explicitRealTotal: number | undefined;

    for (let r = 1; r < rows.length; r++) {
      const plannedId = String(rows[r]?.[block.plannedIdCol] ?? '').trim();
      const realId = String(rows[r]?.[block.realIdCol] ?? '').trim();
      const plannedValue = num(rows[r]?.[block.plannedValueCol]);
      const realValue = num(rows[r]?.[block.realValueCol]);

      // Na planilha real, a linha final de cada bloco contém apenas o total na
      // coluna Valor, sem matrícula/identificador ao lado.
      if (!plannedId && plannedValue > 0) explicitPlannedTotal = plannedValue;
      else if (plannedId && norm(plannedId) !== 'total' && plannedValue >= 0) plannedParticipants += plannedValue;

      if (!realId && realValue > 0) explicitRealTotal = realValue;
      else if (realId && norm(realId) !== 'total' && realValue >= 0) realParticipants += realValue;
    }

    const planned = explicitPlannedTotal ?? plannedParticipants;
    const real = explicitRealTotal ?? realParticipants;

    return {
      id: `raffle-${sourceFileId}-${stableIdPart(block.name)}`,
      name: block.name,
      purpose: block.name,
      totalTickets: 0,
      ticketPrice: 0,
      responsible: 'Não informado',
      collectedAmount: Math.round(real * 100) / 100,
      pendingAmount: Math.max(0, Math.round((planned - real) * 100) / 100),
      expensesAmount: 0,
      netResult: Math.round(real * 100) / 100,
      status: 'encerrada',
      source: 'Google Drive',
      sourceFileId,
      lastSyncedAt: new Date().toISOString(),
    };
  });
}

function parseOrdersFromSummary(summary: PlanilhaMaeFinancialSummary, resumoRows: any[][], sourceFileId: string): {
  shirtOrders: ShirtOrder[];
  jacketOrders: JacketOrder[];
  uniformOrders: UniformOrder[];
} {
  let shirts = 0;
  let jackets = 0;
  let uniforms = 0;
  // A aba Resumo possui Previsto à esquerda e Real à direita. Para pedidos,
  // considerar APENAS o bloco real (colunas a partir da 7ª coluna / índice 6).
  for (const row of resumoRows) {
    for (let c = 6; c < row.length - 1; c++) {
      const label = norm(row[c]);
      const value = num(row[c + 1]);
      if (value <= 0) continue;
      if (label === 'camisas') shirts = value;
      if (label === 'agasalho' || label === 'abrigo') jackets = value;
      if (label.includes('centralizacao') || label.includes('centalizacao')) uniforms = value;
    }
  }

  return {
    shirtOrders: shirts > 0 ? [{
      id: `shirt-summary-${sourceFileId}`,
      model: 'Camisas',
      supplier: 'Não informado',
      quantity: 0,
      unitPrice: 0,
      totalPrice: shirts,
      paidAmount: shirts,
      pendingBalance: 0,
      source: 'Google Drive',
      sourceFileId,
      lastSyncedAt: new Date().toISOString(),
    }] : [],
    jacketOrders: jackets > 0 ? [{
      id: `jacket-summary-${sourceFileId}`,
      supplier: 'Não informado',
      quantity: 0,
      totalCost: jackets,
      paidAmount: jackets,
      pendingBalance: 0,
      orderStatus: 'entregue',
      source: 'Google Drive',
      sourceFileId,
      lastSyncedAt: new Date().toISOString(),
    }] : [],
    uniformOrders: uniforms > 0 ? [{
      id: `uniform-summary-${sourceFileId}`,
      uniformType: 'Centralização Farda e Coturno',
      supplier: 'Não informado',
      quantity: 0,
      totalAmount: uniforms,
      paidAmount: uniforms,
      status: 'pago',
      source: 'Google Drive',
      sourceFileId,
      lastSyncedAt: new Date().toISOString(),
    }] : [],
  };
}

/**
 * Parser específico e determinístico da PLANILHA MÃE real do Grêmio NPOR.
 * Não usa IA e mantém Previsto separado de Real.
 */
export function parsePlanilhaMaeWorkbook(args: {
  workbook: XLSX.WorkBook;
  sourceFileId: string;
  sourceFileName: string;
  fileUrl?: string;
  modifiedTime?: string;
  year?: number;
}): PlanilhaMaeParseResult {
  const { workbook, sourceFileId, sourceFileName, fileUrl } = args;
  const year = args.year || 2026;
  const fallbackDate = args.modifiedTime?.slice(0, 10) || `${year}-09-01`;
  const processedSheets: string[] = [];

  const resumoName = findSheetName(workbook, 'Resumo');
  const mensalName = findSheetName(workbook, 'Pagamento mensalidades');
  const rifasName = findSheetName(workbook, 'Rifas');

  const resumoRows = resumoName ? rowsOf(workbook, resumoName) : [];
  const resumoResult = parseResumo(resumoRows, sourceFileId, sourceFileName, fileUrl, year, fallbackDate);
  if (resumoName) processedSheets.push(resumoName);

  const monthlyResult = mensalName ? parseMonthlyFees(rowsOf(workbook, mensalName), sourceFileId, year) : { fees: [], members: [] };
  if (mensalName) processedSheets.push(mensalName);

  const raffles = rifasName ? parseRaffles(rowsOf(workbook, rifasName), sourceFileId) : [];
  if (rifasName) processedSheets.push(rifasName);

  // Marca as outras abas reconhecidas para o relatório, mesmo quando seus totais consolidados vêm do Resumo.
  for (const expected of ['Centralização Farda e Coturno', 'Camisas', 'Gastos', 'Confras', 'Delta', 'Gorro ferro', 'Festa Junina']) {
    const found = findSheetName(workbook, expected);
    if (found && !processedSheets.includes(found)) processedSheets.push(found);
  }

  const orders = parseOrdersFromSummary(resumoResult.summary, resumoRows, sourceFileId);

  // O total de gastos do Resumo é usado diretamente nos KPIs por financialSummary.
  // NÃO criamos uma despesa consolidada de R$ 58 mil no livro-caixa porque os
  // comprovantes individuais são transformados em despesas detalhadas durante a
  // sincronização; manter os dois lançamentos produziria duplicidade visual/contábil.
  const transactions = [...resumoResult.transactions];

  return {
    financialSummary: resumoResult.summary,
    transactions,
    members: monthlyResult.members,
    monthlyFees: monthlyResult.fees,
    raffles,
    shirtOrders: orders.shirtOrders,
    jacketOrders: orders.jacketOrders,
    uniformOrders: orders.uniformOrders,
    additionalCosts: [],
    recordsExtracted: transactions.length + monthlyResult.fees.length + raffles.length,
    processedSheets,
  };
}
