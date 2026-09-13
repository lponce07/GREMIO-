import React, { useState } from 'react';
import { GremioConfig, GraduationGeneralInfo, User } from '../types';
import { AppState, formatCurrencyPtBr } from '../services/dataService';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Settings,
  Shield,
  Users,
  Landmark,
  Calendar,
  GraduationCap,
  Cloud,
  Sliders,
  Database,
  UploadCloud,
  FileCheck,
} from 'lucide-react';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onSaveConfig: (updatedState: Partial<AppState>) => void;
  onResetData: (toDemo: boolean) => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  appState,
  onSaveConfig,
  onResetData,
}) => {
  const [step, setStep] = useState(1);

  // Local form state initialized from appState
  const [config, setConfig] = useState<GremioConfig>({ ...appState.config });
  const [gradGeneral, setGradGeneral] = useState<GraduationGeneralInfo>({
    ...appState.graduationGeneral,
  });
  const [useDemo, setUseDemo] = useState(appState.config.isDemoMode);
  const [initialBalanceInput, setInitialBalanceInput] = useState(
    appState.config.initialBalance.toString()
  );

  if (!isOpen) return null;

  const totalSteps = 11;

  const stepTitles = [
    'Identificação do Grêmio',
    'Diretoria e Comissões',
    'Saldos Iniciais',
    'Fontes de Receita',
    'Calendário do Ano',
    'Estrutura da Formatura',
    'Pastas Google & E-mail',
    'Regras de Fiscalização',
    'Modo de Operação',
    'Importação de Arquivos',
    'Revisão e Conclusão',
  ];

  const handleFinish = () => {
    const balanceNum = parseFloat(initialBalanceInput.replace(/\./g, '').replace(',', '.')) || 0;
    const updatedConfig: GremioConfig = {
      ...config,
      initialBalance: balanceNum,
      isDemoMode: useDemo,
    };

    onSaveConfig({
      config: updatedConfig,
      graduationGeneral: gradGeneral,
    });

    if (useDemo !== appState.config.isDemoMode) {
      onResetData(useDemo);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-3xl bg-white border border-slate-300 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Wizard Header */}
        <div className="p-4 border-b border-slate-200 bg-[#1A2421] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#25332e] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-institutional">
                Assistente de Configuração Oficial do Grêmio
              </h2>
              <p className="text-[11px] text-[#D4AF37]/90">
                Passo {step} de {totalSteps}: {stepTitles[step - 1]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-200 h-1.5">
          <div
            className="bg-[#4B5320] h-1.5 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Wizard Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700 bg-white">
          {/* Step 1: Identificação do Grêmio */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">
                  Identificação Institucional da Unidade
                </p>
                <p className="text-stone-400 text-xs mt-1">
                  Defina os nomes e lemas oficiais que constarão em todos os relatórios, atas e balancetes do NPOR.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Nome do Grêmio</label>
                  <input
                    type="text"
                    value={config.gremioName}
                    onChange={(e) => setConfig({ ...config, gremioName: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Nome da Turma</label>
                  <input
                    type="text"
                    value={config.turmaName}
                    onChange={(e) => setConfig({ ...config, turmaName: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Ano de Formação</label>
                  <input
                    type="number"
                    value={config.year}
                    onChange={(e) => setConfig({ ...config, year: parseInt(e.target.value) || 2026 })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Unidade Militar Sede</label>
                  <input
                    type="text"
                    value={config.unitName}
                    onChange={(e) => setConfig({ ...config, unitName: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Lema / Divisa da Turma</label>
                <input
                  type="text"
                  value={config.motto}
                  onChange={(e) => setConfig({ ...config, motto: e.target.value })}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Diretoria e Comissões */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Diretoria Executiva e Comissões</p>
                <p className="text-stone-400 text-xs mt-1">
                  Responsáveis oficiais pela gestão dos recursos e emissão de prestações de contas.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">Presidente do Grêmio:</span> Aluno Duarte
                    <p className="text-stone-400 text-[11px]">duarte.npor2026@eb.mil.br • Matrícula 2026-001</p>
                  </div>
                  <span className="text-[10px] bg-red-900/60 text-red-200 border border-red-700 px-2 py-0.5 rounded">
                    Admin
                  </span>
                </div>

                <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">Diretor Financeiro (Tesoureiro):</span> Aluno Medeiros
                    <p className="text-stone-400 text-[11px]">medeiros.tesouraria@eb.mil.br • Matrícula 2026-002</p>
                  </div>
                  <span className="text-[10px] bg-emerald-900/60 text-emerald-200 border border-emerald-700 px-2 py-0.5 rounded">
                    Tesouraria
                  </span>
                </div>

                <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">Diretor Social e Eventos:</span> Aluno Queiroz
                    <p className="text-stone-400 text-[11px]">queiroz.eventos@eb.mil.br • Matrícula 2026-003</p>
                  </div>
                  <span className="text-[10px] bg-blue-900/60 text-blue-200 border border-blue-700 px-2 py-0.5 rounded">
                    Eventos
                  </span>
                </div>

                <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">Presidente da Comissão de Formatura:</span> Aluno Siqueira
                    <p className="text-stone-400 text-[11px]">siqueira.formatura@eb.mil.br • Matrícula 2026-004</p>
                  </div>
                  <span className="text-[10px] bg-amber-900/60 text-amber-200 border border-amber-700 px-2 py-0.5 rounded">
                    Formatura
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Saldos Iniciais */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Saldos Iniciais do Exercício</p>
                <p className="text-stone-400 text-xs mt-1">
                  Informe o saldo em conta corrente e caixinha recebido no início do ano letivo do NPOR.
                </p>
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">
                  Saldo Inicial da Conta Corrente (R$)
                </label>
                <input
                  type="text"
                  value={initialBalanceInput}
                  onChange={(e) => setInitialBalanceInput(e.target.value)}
                  placeholder="Ex: 5.000,00"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white font-mono text-base focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Este saldo compõe a linha de abertura do Balancete Geral da Tesouraria.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Fontes de Receita */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Fontes de Receita Previstas</p>
                <p className="text-stone-400 text-xs mt-1">
                  Categorias padrão de arrecadação ativas para o Grêmio do NPOR.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  'Cotas da Formatura (Mensalidades)',
                  'Mensalidade Geral do Grêmio',
                  'Venda de Camisas e Agasalhos',
                  'Rifas e Ações Beneficentes',
                  'Patrocínios e Doações de Ex-Alunos',
                  'Ingressos e Inscrições em Torneios',
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-800/60 border border-stone-700 rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-stone-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Calendário do Ano */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Principais Marcos do Ano</p>
                <p className="text-stone-400 text-xs mt-1">
                  Atividades estruturadas com cronograma e orçamento alocado.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 bg-stone-800 rounded-lg border border-stone-700 flex justify-between items-center">
                  <span>Feijoada de Integração dos Alunos</span>
                  <span className="text-stone-400">18/03/2026 • Realizada</span>
                </div>
                <div className="p-2.5 bg-stone-800 rounded-lg border border-stone-700 flex justify-between items-center">
                  <span>Torneio Esportivo Duque de Caxias</span>
                  <span className="text-stone-400">22/08/2026 • Em Andamento</span>
                </div>
                <div className="p-2.5 bg-stone-800 rounded-lg border border-stone-700 flex justify-between items-center">
                  <span>Baile de Gala da Formatura (Espadas)</span>
                  <span className="text-amber-400 font-semibold">05/12/2026 • Previsto</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Estrutura da Formatura */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Planejamento da Festa de Formatura</p>
                <p className="text-stone-400 text-xs mt-1">
                  Definição da cota individual e meta orçamentária geral para a formatura.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Data do Baile</label>
                  <input
                    type="date"
                    value={gradGeneral.eventDate}
                    onChange={(e) => setGradGeneral({ ...gradGeneral, eventDate: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Local Previsto</label>
                  <input
                    type="text"
                    value={gradGeneral.venueName}
                    onChange={(e) => setGradGeneral({ ...gradGeneral, venueName: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Número de Alunos Formandos</label>
                  <input
                    type="number"
                    value={gradGeneral.targetGraduates}
                    onChange={(e) =>
                      setGradGeneral({ ...gradGeneral, targetGraduates: parseInt(e.target.value) || 45 })
                    }
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Valor da Cota por Aluno (R$)</label>
                  <input
                    type="number"
                    value={gradGeneral.individualQuotaAmount}
                    onChange={(e) =>
                      setGradGeneral({
                        ...gradGeneral,
                        individualQuotaAmount: parseFloat(e.target.value) || 3200,
                      })
                    }
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Configuração de Pastas Google & E-mail */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Integração com Google Drive e Gmail</p>
                <p className="text-stone-400 text-xs mt-1">
                  Pastas institucionais para onde os comprovantes e notas fiscais recebidos são sincronizados.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-stone-300 font-medium mb-1">E-mail Oficial do Grêmio</label>
                  <input
                    type="text"
                    value={config.emailAccount}
                    onChange={(e) => setConfig({ ...config, emailAccount: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-medium mb-1">Pasta Google Drive - Comprovantes</label>
                  <input
                    type="text"
                    value={config.googleDriveFolderId}
                    onChange={(e) => setConfig({ ...config, googleDriveFolderId: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Ativação de Regras de Fiscalização */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Regras Automáticas de Fiscalização</p>
                <p className="text-stone-400 text-xs mt-1">
                  Parâmetros que o motor de auditoria analisa a cada lançamento e comprovante.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-stone-800 rounded-lg border border-stone-700 cursor-pointer">
                  <div>
                    <p className="font-semibold text-white">Exigência Obrigatória de Comprovante</p>
                    <p className="text-[11px] text-stone-400">
                      Gera alerta crítico vermelho para qualquer pagamento efetuado sem comprovante ou NF anexada.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.requireProofForExpense}
                    onChange={(e) => setConfig({ ...config, requireProofForExpense: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-stone-800 rounded-lg border border-stone-700 cursor-pointer">
                  <div>
                    <p className="font-semibold text-white">Bloqueio de Exibição de Dados Pessoais (LGPD)</p>
                    <p className="text-[11px] text-stone-400">
                      Oculta CPF, telefone e contas bancárias de relatórios e acessos públicos.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.maskSensitiveData}
                    onChange={(e) => setConfig({ ...config, maskSensitiveData: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Step 9: Escolha do Modo de Operação */}
          {step === 9 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Escolha do Banco de Dados</p>
                <p className="text-stone-400 text-xs mt-1">
                  Selecione como deseja inicializar o portal neste momento.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setUseDemo(true)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    useDemo
                      ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                      : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  <p className="font-bold text-base text-white">Modo Demonstração</p>
                  <p className="text-xs mt-1 text-stone-300">
                    Carrega lançamentos fictícios realistas, contratos de exemplo, comprovantes e alertas de divergência para testes e homologação.
                  </p>
                  <div className="mt-3 text-[11px] font-semibold text-amber-400">
                    Recomendado para apresentação e testes
                  </div>
                </div>

                <div
                  onClick={() => setUseDemo(false)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    !useDemo
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200'
                      : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  <p className="font-bold text-base text-white">Base Real Limpa</p>
                  <p className="text-xs mt-1 text-stone-300">
                    Inicia com os registros em branco, pronto para a tesouraria cadastrar os dados reais da turma desde o primeiro dia.
                  </p>
                  <div className="mt-3 text-[11px] font-semibold text-emerald-400">
                    Recomendado para início de mandato real
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Importação de Planilha ou Extrato */}
          {step === 10 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700">
                <p className="font-semibold text-white text-sm">Importação Inicial de Dados (Opcional)</p>
                <p className="text-stone-400 text-xs mt-1">
                  Você pode importar extratos bancários em PDF/OFX ou planilhas de pagamentos.
                </p>
              </div>

              <div className="border-2 border-dashed border-stone-700 rounded-xl p-8 text-center bg-stone-800/30 hover:border-emerald-500 transition">
                <UploadCloud className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <p className="font-semibold text-white">Arraste e solte o extrato bancário ou planilha CSV</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Suporta arquivos CSV, Excel (.xlsx), extratos em PDF ou comprovantes individuais.
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-600 text-xs font-medium transition"
                >
                  Selecionar Arquivo no Computador
                </button>
              </div>
            </div>
          )}

          {/* Step 11: Resumo e Conclusão */}
          {step === 11 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 rounded-xl flex items-center gap-3">
                <FileCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">Configuração Pronta para Homologação</p>
                  <p className="text-stone-300 text-xs">
                    Todos os parâmetros institucionais, regras de fiscalização e saldos foram validados.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-stone-800 rounded-xl border border-stone-700 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-700">
                  <span className="text-stone-400">Grêmio / Turma:</span>
                  <span className="font-semibold text-white">{config.gremioName} - {config.turmaName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-700">
                  <span className="text-stone-400">Saldo Inicial Registrado:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrencyPtBr(parseFloat(initialBalanceInput.replace(/\./g, '').replace(',', '.')) || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-700">
                  <span className="text-stone-400">Modo de Operação:</span>
                  <span className="font-semibold text-amber-300">
                    {useDemo ? 'Demonstração (Dados Fictícios)' : 'Base Real de Dados'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-400">Exigência de Comprovante:</span>
                  <span className="text-white font-medium">
                    {config.requireProofForExpense ? 'Ativada (Rigorosa)' : 'Flexível'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-xs border border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ArrowLeft className="w-4 h-4" /> Anterior
          </button>

          <div className="text-[11px] text-slate-500 font-medium">
            Passo {step} de {totalSteps}
          </div>

          {step < totalSteps ? (
            <button
              onClick={() => setStep((prev) => Math.min(totalSteps, prev + 1))}
              className="flex items-center gap-2 px-5 py-2 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold uppercase text-xs tracking-wider transition shadow-xs"
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold uppercase text-xs tracking-wider transition shadow-md"
            >
              <CheckCircle className="w-4 h-4 text-[#D4AF37]" /> Concluir e Iniciar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
