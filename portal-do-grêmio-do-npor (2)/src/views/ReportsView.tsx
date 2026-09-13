import React, { useState } from 'react';
import { AppState, formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import { MilitaryInsignia } from '../components/MilitaryInsignia';
import { UserRole } from '../types';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileText,
} from 'lucide-react';

interface ReportsViewProps {
  appState: AppState;
  userRole: UserRole;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ appState, userRole }) => {
  const { config, transactions, graduationGeneral, graduationServices, alerts } = appState;

  const [reportType, setReportType] = useState<'balancete' | 'prestacao_anual' | 'formatura'>('balancete');
  const [reportPeriod, setReportPeriod] = useState<string>('Exército 2026 - Consolidado');

  // Calculations
  const totalRevenues = transactions
    .filter((t) => t.type === 'receita' && t.status === 'recebida')
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'despesa' && t.status === 'paga')
    .reduce((s, t) => s + t.amount, 0);

  const finalBalance = config.initialBalance + totalRevenues - totalExpenses;

  // Expenses by Category
  const expenseCategories = Array.from(
    new Set(transactions.filter((t) => t.type === 'despesa').map((t) => t.category))
  );

  // Revenue by Category
  const revenueCategories = Array.from(
    new Set(transactions.filter((t) => t.type === 'receita').map((t) => t.category))
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'CODIGO;TIPO;DATA;DESCRICAO;CATEGORIA;VALOR;BENEFICIARIO;STATUS;COMPROVANTE\n';

    transactions.forEach((t) => {
      const row = [
        t.code,
        t.type,
        formatDatePtBr(t.date),
        `"${t.description.replace(/"/g, '""')}"`,
        `"${t.category}"`,
        t.amount.toFixed(2).replace('.', ','),
        `"${(t.beneficiaryName || '').replace(/"/g, '""')}"`,
        t.status,
        t.receiptDocumentId ? 'SIM' : 'NAO',
      ].join(';');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prestacao_contas_gremio_npor_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Controls (Hidden during print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Auditoria & Conformidade Legal
              </span>
              <span className="text-xs text-stone-400">Emissão de Balancetes Oficiais</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 font-institutional flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Relatórios e Prestação de Contas
            </h2>
            <p className="text-xs text-stone-400">
              Balancetes consolidados, demonstrativos de despesas com comprovantes e atas de prestação de contas militares.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition"
              title="Exportar planilha completa em formato CSV compatível com Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Exportar CSV / Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition"
              title="Imprimir ou gerar PDF oficial com cabeçalho militar institucional"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-stone-900 border border-stone-800 p-2 rounded-xl text-xs">
          <button
            onClick={() => setReportType('balancete')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              reportType === 'balancete'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            1. Balancete Geral da Tesouraria
          </button>
          <button
            onClick={() => setReportType('prestacao_anual')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              reportType === 'prestacao_anual'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            2. Parecer e Prestação de Contas Oficial
          </button>
          <button
            onClick={() => setReportType('formatura')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              reportType === 'formatura'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            3. Demonstrativo da Festa de Formatura
          </button>
        </div>
      </div>

      {/* Official Printable Report Document Body */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-10 shadow-lg text-stone-200 text-xs space-y-6 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
        {/* Military Letterhead / Header */}
        <div className="border-b-2 border-amber-600/60 pb-6 text-center space-y-1">
          <div className="flex justify-center mb-2">
            <MilitaryInsignia className="w-16 h-16" />
          </div>
          <h3 className="text-xs uppercase font-bold tracking-widest text-stone-400 print:text-stone-700">
            MINISTÉRIO DA DEFESA • EXÉRCITO BRASILEIRO
          </h3>
          <h4 className="text-sm font-bold uppercase tracking-wider text-white print:text-black">
            NÚCLEO DE PREPARAÇÃO DE OFICIAIS DA RESERVA (NPOR)
          </h4>
          <p className="text-xs font-semibold text-amber-400 print:text-amber-800">
            {config.gremioName} — {config.turmaName}
          </p>
          <p className="text-[10px] text-stone-400 print:text-stone-600">
            {config.unitName} • Exercício Financeiro {config.year}
          </p>
        </div>

        {/* Report Document Title */}
        <div className="text-center space-y-1 py-2">
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white print:text-black font-institutional">
            {reportType === 'balancete' && 'BALANCETE GERAL ANALÍTICO DE RECEITAS E DESPESAS'}
            {reportType === 'prestacao_anual' && 'TERMO DE PRESTAÇÃO DE CONTAS E CONFERÊNCIA FISCAL'}
            {reportType === 'formatura' && 'DEMONSTRATIVO FINANCEIRO DA FESTA DE FORMATURA'}
          </h2>
          <p className="text-[11px] text-stone-400 print:text-stone-600">
            Período de Apuração: {reportPeriod} • Data de Emissão: {formatDatePtBr(new Date().toISOString())}
          </p>
        </div>

        {/* REPORT TYPE 1: Balancete Geral */}
        {reportType === 'balancete' && (
          <div className="space-y-6">
            {/* Summary Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-stone-800 print:border-stone-400 p-4 rounded-xl bg-stone-950/40 print:bg-stone-50">
              <div>
                <span className="text-[10px] uppercase text-stone-400 print:text-stone-600 block">Saldo Anterior</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-white print:text-black">
                  {formatCurrencyPtBr(config.initialBalance)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-stone-400 print:text-stone-600 block">Total Receitas (+)</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400 print:text-emerald-700">
                  {formatCurrencyPtBr(totalRevenues)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-stone-400 print:text-stone-600 block">Total Despesas (-)</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-rose-400 print:text-rose-700">
                  {formatCurrencyPtBr(totalExpenses)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-stone-400 print:text-stone-600 block">Saldo Atual em Conta</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-amber-300 print:text-black">
                  {formatCurrencyPtBr(finalBalance)}
                </span>
              </div>
            </div>

            {/* Categorized Revenues Breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-emerald-400 print:text-emerald-800 border-b border-stone-800 pb-1">
                1. Demostrativo das Receitas por Rubrica
              </h4>
              <table className="w-full text-left text-xs border border-stone-800 print:border-stone-400">
                <thead className="bg-stone-850 print:bg-stone-100 text-stone-400 print:text-stone-700 text-[10px] uppercase">
                  <tr>
                    <th className="p-2">Categoria / Origem</th>
                    <th className="p-2 text-right">Valor Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 print:divide-stone-300">
                  {revenueCategories.map((cat) => {
                    const sum = transactions
                      .filter((t) => t.type === 'receita' && t.status === 'recebida' && t.category === cat)
                      .reduce((acc, t) => acc + t.amount, 0);
                    return (
                      <tr key={cat}>
                        <td className="p-2 text-stone-200 print:text-stone-900">{cat}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-400 print:text-emerald-700">
                          {formatCurrencyPtBr(sum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Categorized Expenses Breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-rose-400 print:text-rose-800 border-b border-stone-800 pb-1">
                2. Demonstrativo das Despesas Liquidadas por Rubrica
              </h4>
              <table className="w-full text-left text-xs border border-stone-800 print:border-stone-400">
                <thead className="bg-stone-850 print:bg-stone-100 text-stone-400 print:text-stone-700 text-[10px] uppercase">
                  <tr>
                    <th className="p-2">Categoria / Destinação</th>
                    <th className="p-2 text-right">Valor Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 print:divide-stone-300">
                  {expenseCategories.map((cat) => {
                    const sum = transactions
                      .filter((t) => t.type === 'despesa' && t.status === 'paga' && t.category === cat)
                      .reduce((acc, t) => acc + t.amount, 0);
                    return (
                      <tr key={cat}>
                        <td className="p-2 text-stone-200 print:text-stone-900">{cat}</td>
                        <td className="p-2 text-right font-mono font-bold text-rose-400 print:text-rose-700">
                          {formatCurrencyPtBr(sum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT TYPE 2: Prestação de Contas Oficial */}
        {reportType === 'prestacao_anual' && (
          <div className="space-y-4 text-xs leading-relaxed text-stone-300 print:text-black">
            <p>
              Aos <strong>{new Date().toLocaleDateString('pt-BR')}</strong>, a Diretoria Executiva do <strong>{config.gremioName}</strong>, turma <strong>{config.turmaName}</strong>, no uso de suas atribuições regimentais, apresenta a presente prestação de contas de todos os valores arrecadados e aplicados durante o exercício.
            </p>
            <p>
              Certificamos que as despesas liquidadas no montante de <strong>{formatCurrencyPtBr(totalExpenses)}</strong> encontram-se lastreadas em documentos fiscais, recibos e notas comprobatórias depositadas na pasta digital do Grêmio. O saldo disponível na conta corrente e aplicações nesta data totaliza <strong>{formatCurrencyPtBr(finalBalance)}</strong>.
            </p>

            <div className="p-4 bg-stone-950/50 print:bg-stone-100 rounded-xl border border-stone-800 print:border-stone-400 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 print:text-amber-800">
                Atestado de Conformidade da Comissão Fiscal
              </span>
              <p className="text-[11px] text-stone-400 print:text-stone-700">
                Os registros foram submetidos à conferência cruzada entre extrato bancário, livro caixa e notas fiscais, restando auditados todos os valores movimentados.
              </p>
            </div>
          </div>
        )}

        {/* REPORT TYPE 3: Demonstrativo da Formatura */}
        {reportType === 'formatura' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-stone-800 p-3 rounded-xl bg-stone-950 print:bg-stone-50">
              <div>
                <span className="text-[10px] uppercase text-stone-400">Orçamento Previsto</span>
                <p className="font-mono font-bold text-white print:text-black">{formatCurrencyPtBr(graduationGeneral.totalBudget)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-stone-400">Total Arrecadado</span>
                <p className="font-mono font-bold text-emerald-400 print:text-emerald-700">{formatCurrencyPtBr(graduationGeneral.totalCollected)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-stone-400">Saldo a Pagar</span>
                <p className="font-mono font-bold text-rose-400 print:text-rose-700">{formatCurrencyPtBr(graduationGeneral.totalPending)}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-stone-800 print:border-stone-400">
              <thead className="bg-stone-850 print:bg-stone-100 text-stone-400 print:text-stone-700 text-[10px] uppercase">
                <tr>
                  <th className="p-2">Categoria</th>
                  <th className="p-2">Fornecedor</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Contratado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 print:divide-stone-300">
                {graduationServices.map((serv) => (
                  <tr key={serv.id}>
                    <td className="p-2 font-medium">{serv.category}</td>
                    <td className="p-2 text-stone-400 print:text-stone-700">{serv.supplierName}</td>
                    <td className="p-2 capitalize">{serv.status.replace('_', ' ')}</td>
                    <td className="p-2 text-right font-mono font-bold text-white print:text-black">
                      {formatCurrencyPtBr(serv.contractedAmount || serv.estimatedAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Military Signatures Section */}
        <div className="pt-12 border-t border-stone-800 print:border-stone-400 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs">
          <div className="space-y-1">
            <div className="border-b border-stone-600 print:border-black w-4/5 mx-auto h-8" />
            <p className="font-bold text-white print:text-black">Aluno Duarte</p>
            <p className="text-[10px] text-stone-400 print:text-stone-600">Presidente do Grêmio do NPOR</p>
          </div>

          <div className="space-y-1">
            <div className="border-b border-stone-600 print:border-black w-4/5 mx-auto h-8" />
            <p className="font-bold text-white print:text-black">Aluno Medeiros</p>
            <p className="text-[10px] text-stone-400 print:text-stone-600">Diretor Financeiro / Tesoureiro</p>
          </div>

          <div className="space-y-1">
            <div className="border-b border-stone-600 print:border-black w-4/5 mx-auto h-8" />
            <p className="font-bold text-white print:text-black">Aluno Siqueira</p>
            <p className="text-[10px] text-stone-400 print:text-stone-600">Presidente da Comissão de Formatura</p>
          </div>
        </div>
      </div>
    </div>
  );
};
