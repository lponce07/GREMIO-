import React, { useState, useRef } from 'react';
import { AppState, addAuditLog } from '../services/dataService';
import { GremioConfig, AppThemeConfig, UserRole } from '../types';
import { INITIAL_GREMIO_CONFIG } from '../data/initialDemoData';
import { canCustomizeInterface } from '../utils/permissions';
import { MilitaryInsignia } from '../components/MilitaryInsignia';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  PRIMARY_COLOR_SWATCHES,
  ACCENT_COLOR_SWATCHES,
  applyThemeToDocument,
  compressAndConvertToDataUrl,
} from '../utils/themeManager';
import {
  Palette,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Shield,
  Sliders,
  Type,
  Eye,
  AlertTriangle,
  RotateCcw,
  Check,
  Save,
  Sun,
  Moon,
  Compass,
  FileCheck,
} from 'lucide-react';

interface CustomizationViewProps {
  appState: AppState;
  userRole: UserRole;
  onUpdateAppState: (updater: (prev: AppState) => AppState) => void;
}

export const CustomizationView: React.FC<CustomizationViewProps> = ({
  appState,
  userRole,
  onUpdateAppState,
}) => {
  const isAllowed = canCustomizeInterface(userRole);

  // Inicializa com o tema salvo na config ou padrão
  const initialTheme: AppThemeConfig = {
    ...DEFAULT_THEME,
    ...(appState.config?.theme || {}),
    customLogoUrl: appState.config?.logoUrl || appState.config?.theme?.customLogoUrl || '',
  };

  const [theme, setTheme] = useState<AppThemeConfig>(initialTheme);
  const [activeTab, setActiveTab] = useState<'logo' | 'colors' | 'identity' | 'layout'>('logo');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageUploadInfo, setImageUploadInfo] = useState<{ name: string; sizeKb: number } | null>(null);

  // Textos institucionais locais
  const [gremioName, setGremioName] = useState(appState.config?.gremioName || 'Grêmio do NPOR');
  const [turmaName, setTurmaName] = useState(appState.config?.turmaName || 'Turma NPOR 2026');
  const [unitName, setUnitName] = useState(appState.config?.unitName || 'Núcleo de Preparação de Oficiais da Reserva');
  const [motto, setMotto] = useState(appState.config?.motto || 'Formar o Oficial da Reserva com Honra e Excelência');
  const [year, setYear] = useState(appState.config?.year?.toString() || '2026');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aplica tema dinamicamente na página enquanto o administrador ajusta os controles
  const handleThemeChange = (updates: Partial<AppThemeConfig>) => {
    setTheme((prev) => {
      const next = { ...prev, ...updates };
      applyThemeToDocument(next);
      return next;
    });
    setSaveSuccess(false);
  };

  // Upload de imagem do emblema via arquivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('O arquivo selecionado deve ser uma imagem (PNG, JPG, WEBP ou SVG).');
      return;
    }

    try {
      setIsProcessingImage(true);
      setErrorMessage(null);

      const result = await compressAndConvertToDataUrl(file, 512, 0.88);
      setImageUploadInfo({ name: result.fileName, sizeKb: result.sizeKb });

      handleThemeChange({
        customLogoUrl: result.dataUrl,
        customLogoName: result.fileName,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao processar a imagem do emblema.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Aplicar Preset de Tema com 1 clique
  const handleApplyPreset = (presetTheme: Partial<AppThemeConfig>) => {
    handleThemeChange({
      ...presetTheme,
      customLogoUrl: theme.customLogoUrl, // preserva a imagem
      customLogoName: theme.customLogoName,
    });
  };

  // Restaurar Emblema Padrão NPOR
  const handleResetLogo = () => {
    handleThemeChange({
      customLogoUrl: '',
      customLogoName: 'SIMBOLO_NPOR.jpg',
    });
    setImageUploadInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Restaurar Todos os Padrões Oficiais
  const handleResetAllDefaults = () => {
    if (window.confirm('Deseja restaurar as configurações visuais e cores para o padrão oficial de fábrica do NPOR?')) {
      setTheme(DEFAULT_THEME);
      applyThemeToDocument(DEFAULT_THEME);
      setImageUploadInfo(null);
      setGremioName('Grêmio do NPOR');
      setTurmaName('Turma NPOR 2026');
      setUnitName('Núcleo de Preparação de Oficiais da Reserva');
      setMotto('Formar o Oficial da Reserva com Honra e Excelência');
      setYear('2026');
      setSaveSuccess(false);
    }
  };

  // Salvar e persistir no Firestore e Estado Global
  const handleSaveAndBroadcast = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      const updatedConfig: GremioConfig = {
        ...(appState.config || INITIAL_GREMIO_CONFIG),
        gremioName,
        turmaName,
        unitName,
        motto,
        year,
        logoUrl: theme.customLogoUrl || '',
        theme: {
          ...theme,
          updatedAt: new Date().toISOString(),
          updatedBy: appState.currentUser?.warName || 'ADMINISTRADOR GERAL',
        },
      };

      // Atualiza o estado global e persiste via dataService
      onUpdateAppState((prev) => {
        const nextState = {
          ...prev,
          config: updatedConfig,
        };
        return addAuditLog(
          nextState,
          'config',
          `Personalização da Interface: Identidade visual, cores e emblema atualizados pelo Administrador Geral (${appState.currentUser?.warName || 'ADMIN'})`,
          updatedConfig.gremioName,
          appState.currentUser?.warName || 'ADMIN GERAL'
        );
      });

      applyThemeToDocument(theme);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao persistir configurações de interface.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="bg-white border-2 border-red-200 rounded-sm p-8 text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-700">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-institutional uppercase tracking-wider text-slate-900 mb-2">
          Acesso Restrito ao Administrador Geral
        </h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Apenas o <strong>Administrador Geral</strong> possui autorização militar para modificar
          o emblema da turma, esquema de cores, tipografia e identidade visual do Portal do Grêmio.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-mono rounded-xs border border-slate-300">
          Seu perfil atual: <span className="font-bold uppercase">{userRole}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Top Banner de Identidade Institucional */}
      <div className="bg-[#1A2421] border-b-4 border-[#D4AF37] text-white p-6 shadow-md rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#4B5320] text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest border border-[#D4AF37]/50 rounded-xs">
              Módulo Administrativo
            </span>
            <span className="px-2 py-0.5 bg-white/10 text-slate-300 text-[10px] font-mono tracking-wider">
              Exclusivo Administrador Geral
            </span>
          </div>
          <h1 className="text-2xl font-bold font-institutional tracking-wider text-white flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-[#D4AF37]" />
            Personalização da Interface & Identidade Visual
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Altere o emblema oficial da turma, esquema de cores militar, estilo da barra superior e textos
            institucionais diretamente pelo app. Todas as mudanças refletem em tempo real para todos os membros.
          </p>
        </div>

        {/* Botões de Ação Global */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetAllDefaults}
            type="button"
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xs border border-white/20 transition-all flex items-center gap-1.5"
            title="Restaurar valores de fábrica do NPOR"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Restaurar</span> Padrão
          </button>

          <button
            onClick={handleSaveAndBroadcast}
            disabled={isSaving}
            type="button"
            className="px-5 py-2 bg-[#D4AF37] hover:bg-[#b8952b] text-[#1A2421] text-xs font-bold uppercase tracking-wider rounded-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gravando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar e Aplicar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerta de Sucesso / Erro */}
      {saveSuccess && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-xs text-emerald-900 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Identidade Visual Salva com Sucesso!</p>
              <p className="text-xs text-emerald-700">
                O tema e as alterações visuais foram gravados e sincronizados com o banco de dados.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 uppercase">Sincronizado</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xs text-red-900 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-xs font-bold">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 hover:text-red-900 text-xs font-bold">
            Dispensar
          </button>
        </div>
      )}

      {/* Layout de 2 Colunas: Configurações + Simulador de Pré-visualização */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Principal: Abas de Configuração (7 colunas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navegação entre Abas */}
          <div className="flex border-b border-slate-300 bg-white rounded-t-xs px-2 pt-2 gap-1 overflow-x-auto shadow-xs">
            <button
              onClick={() => setActiveTab('logo')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                activeTab === 'logo'
                  ? 'border-[#4B5320] text-[#4B5320] bg-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              1. Emblema & Imagem
            </button>

            <button
              onClick={() => setActiveTab('colors')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                activeTab === 'colors'
                  ? 'border-[#4B5320] text-[#4B5320] bg-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-4 h-4" />
              2. Cores & Tema
            </button>

            <button
              onClick={() => setActiveTab('identity')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                activeTab === 'identity'
                  ? 'border-[#4B5320] text-[#4B5320] bg-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Type className="w-4 h-4" />
              3. Textos da Turma
            </button>

            <button
              onClick={() => setActiveTab('layout')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                activeTab === 'layout'
                  ? 'border-[#4B5320] text-[#4B5320] bg-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              4. Estilo & Layout
            </button>
          </div>

          {/* Conteúdo da Aba 1: Emblema & Imagem */}
          {activeTab === 'logo' && (
            <div className="bg-white p-6 rounded-b-xs border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold font-institutional uppercase tracking-wider text-slate-900">
                  Emblema e Símbolo Oficial da Turma
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faça upload da imagem oficial ou brasão do seu NPOR. A imagem substituirá o logotipo
                  no topo do aplicativo, na tela de autenticação e no cabeçalho de documentos.
                </p>
              </div>

              {/* Destaque do Emblema Atual */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xs flex flex-col sm:flex-row items-center gap-6">
                <div className="relative p-2 bg-white border-2 border-[#D4AF37] rounded-xs shadow-md shrink-0 flex items-center justify-center">
                  <MilitaryInsignia
                    className="w-24 h-24"
                    customSrc={theme.customLogoUrl || undefined}
                    alt="Prévia do Emblema"
                  />
                  {theme.customLogoUrl && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-[#4B5320] text-white text-[9px] font-bold uppercase rounded-xs">
                      Ativo
                    </span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {theme.customLogoUrl ? 'Emblema Personalizado Carregado' : 'Emblema Oficial Padrão do NPOR'}
                  </div>
                  <p className="text-xs text-slate-500">
                    {theme.customLogoUrl
                      ? `Arquivo ativo: ${theme.customLogoName || 'Imagem personalizada'} (${imageUploadInfo ? `${imageUploadInfo.sizeKb} KB` : 'Armazenado no Firestore'})`
                      : 'Utilizando a insígnia oficial padrão do NPOR com escudo verde-oliva e sabre em prata/ouro.'}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage}
                      className="px-3 py-1.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase rounded-xs transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                      <span>{isProcessingImage ? 'Processando...' : 'Carregar Nova Imagem'}</span>
                    </button>

                    {theme.customLogoUrl && (
                      <button
                        type="button"
                        onClick={handleResetLogo}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase rounded-xs transition-colors"
                      >
                        Restaurar Padrão
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Área de Seleção de Arquivo (Drag and Drop / Input escondido) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#4B5320] bg-slate-50 hover:bg-slate-100 p-6 rounded-xs text-center cursor-pointer transition-colors"
              >
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Clique para selecionar uma imagem do seu computador
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Formatos aceitos: PNG (com transparência recomendado), JPG, WEBP ou SVG.
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  O sistema comprime e otimiza a imagem automaticamente para carga instantânea.
                </p>
              </div>

              {/* Opção Alternativa: URL Direta da Imagem */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>Ou informe uma URL direta de imagem (Web / Drive):</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={theme.customLogoUrl || ''}
                    onChange={(e) => handleThemeChange({ customLogoUrl: e.target.value, customLogoName: 'URL externa' })}
                    placeholder="https://exemplo.com/emblema-turma.png"
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#4B5320] focus:border-[#4B5320] font-mono"
                  />
                  {theme.customLogoUrl && (
                    <button
                      type="button"
                      onClick={() => handleThemeChange({ customLogoUrl: '', customLogoName: 'SIMBOLO_NPOR.jpg' })}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xs border border-slate-300"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Marca D'água Militar no Fundo */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Exibir Marca D'água Institucional no Fundo da Tela
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Projeta uma silhueta sutil do emblema ao fundo do portal para elegância visual militar.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={theme.showBackgroundWatermark ?? true}
                    onChange={(e) => handleThemeChange({ showBackgroundWatermark: e.target.checked })}
                    className="w-4 h-4 text-[#4B5320] rounded-xs border-slate-300 focus:ring-[#4B5320]"
                  />
                </div>

                {theme.showBackgroundWatermark && (
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xs border border-slate-200">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700">
                      <span>Opacidade da Marca D'água:</span>
                      <span className="font-mono">{theme.watermarkOpacity || 4}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={theme.watermarkOpacity || 4}
                      onChange={(e) => handleThemeChange({ watermarkOpacity: Number(e.target.value) })}
                      className="w-full accent-[#4B5320] cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 2: Cores & Tema */}
          {activeTab === 'colors' && (
            <div className="bg-white p-6 rounded-b-xs border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold font-institutional uppercase tracking-wider text-slate-900">
                  Paleta de Cores e Temas do Exército
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Escolha um preset militar pré-configurado com 1 clique ou personalize as cores primária e de destaque.
                </p>
              </div>

              {/* Presets Militares de 1 Clique */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Presets Institucionais Prontos:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected =
                      theme.themePresetName === preset.id ||
                      (theme.primaryColor === preset.theme.primaryColor && theme.accentColor === preset.theme.accentColor);

                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset.theme)}
                        className={`p-3 rounded-xs border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#4B5320]/5 shadow-sm'
                            : 'border-slate-200 hover:border-slate-400 bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                            {isSelected && (
                              <span className="p-0.5 bg-[#4B5320] text-white rounded-full">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">{preset.description}</p>
                        </div>

                        {/* Dupla de cores */}
                        <div className="flex items-center -space-x-1.5 shrink-0 mt-0.5">
                          <div
                            className="w-5 h-5 rounded-full border border-white shadow-xs"
                            style={{ backgroundColor: preset.theme.primaryColor }}
                            title="Cor Primária"
                          />
                          <div
                            className="w-5 h-5 rounded-full border border-white shadow-xs"
                            style={{ backgroundColor: preset.theme.accentColor }}
                            title="Acento Dourado"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ajuste Fino da Cor Primária */}
              <div className="border-t border-slate-200 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Cor Primária Institucional:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.primaryColor || '#4B5320'}
                      onChange={(e) => handleThemeChange({ primaryColor: e.target.value })}
                      className="w-7 h-7 p-0 border border-slate-300 rounded-xs cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor || '#4B5320'}
                      onChange={(e) => handleThemeChange({ primaryColor: e.target.value })}
                      maxLength={7}
                      className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded-xs uppercase"
                    />
                  </div>
                </div>

                {/* Paleta rápida de amostras militares */}
                <div className="flex flex-wrap gap-2">
                  {PRIMARY_COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => handleThemeChange({ primaryColor: swatch.hex })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-xs border transition-all ${
                        theme.primaryColor?.toLowerCase() === swatch.hex.toLowerCase()
                          ? 'border-[#D4AF37] ring-1 ring-[#D4AF37] font-bold bg-slate-100'
                          : 'border-slate-200 hover:border-slate-400 bg-white text-slate-700'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: swatch.hex }} />
                      <span>{swatch.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ajuste Fino da Cor de Destaque / Ouro */}
              <div className="border-t border-slate-200 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Cor de Destaque (Acentos e Ouro):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.accentColor || '#D4AF37'}
                      onChange={(e) => handleThemeChange({ accentColor: e.target.value })}
                      className="w-7 h-7 p-0 border border-slate-300 rounded-xs cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.accentColor || '#D4AF37'}
                      onChange={(e) => handleThemeChange({ accentColor: e.target.value })}
                      maxLength={7}
                      className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded-xs uppercase"
                    />
                  </div>
                </div>

                {/* Paleta rápida de amostras douradas */}
                <div className="flex flex-wrap gap-2">
                  {ACCENT_COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => handleThemeChange({ accentColor: swatch.hex })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-xs border transition-all ${
                        theme.accentColor?.toLowerCase() === swatch.hex.toLowerCase()
                          ? 'border-[#4B5320] ring-1 ring-[#4B5320] font-bold bg-slate-100'
                          : 'border-slate-200 hover:border-slate-400 bg-white text-slate-700'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: swatch.hex }} />
                      <span>{swatch.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo da Interface (Claro / Noturno) */}
              <div className="border-t border-slate-200 pt-5 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Modo de Iluminação da Interface:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleThemeChange({ mode: 'light' })}
                    className={`p-3 rounded-xs border-2 text-center transition-all ${
                      theme.mode === 'light'
                        ? 'border-[#4B5320] bg-slate-50 font-bold text-[#4B5320]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Sun className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <span className="text-xs block uppercase">Claro Institucional</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange({ mode: 'dark' })}
                    className={`p-3 rounded-xs border-2 text-center transition-all ${
                      theme.mode === 'dark'
                        ? 'border-[#D4AF37] bg-slate-900 font-bold text-white'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Moon className="w-5 h-5 mx-auto mb-1 text-[#D4AF37]" />
                    <span className="text-xs block uppercase">Noturno Tático</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange({ mode: 'tactical' })}
                    className={`p-3 rounded-xs border-2 text-center transition-all ${
                      theme.mode === 'tactical'
                        ? 'border-[#D4AF37] bg-[#111815] font-bold text-white'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Compass className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                    <span className="text-xs block uppercase">Camuflado Escuro</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 3: Textos Institucionais da Turma */}
          {activeTab === 'identity' && (
            <div className="bg-white p-6 rounded-b-xs border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold font-institutional uppercase tracking-wider text-slate-900">
                  Identidade e Nomenclatura da Turma
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estes títulos aparecem no cabeçalho superior do portal, no rodapé e em relatórios em PDF.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Nome Oficial do Grêmio:
                  </label>
                  <input
                    type="text"
                    value={gremioName}
                    onChange={(e) => setGremioName(e.target.value)}
                    placeholder="Ex: Grêmio do NPOR"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#4B5320]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Nome da Turma Militar:
                  </label>
                  <input
                    type="text"
                    value={turmaName}
                    onChange={(e) => setTurmaName(e.target.value)}
                    placeholder="Ex: Turma Bicentenário da Independência"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#4B5320]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Unidade Militar / Batalhão:
                    </label>
                    <input
                      type="text"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      placeholder="Ex: NPOR / 28º BIB"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#4B5320]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Ano de Formação:
                    </label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2026"
                      maxLength={4}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#4B5320] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Lema / Divisa Militar da Turma:
                  </label>
                  <input
                    type="text"
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="Ex: Formar o Oficial da Reserva com Honra e Excelência"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xs focus:ring-1 focus:ring-[#4B5320]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 4: Estilo & Layout */}
          {activeTab === 'layout' && (
            <div className="bg-white p-6 rounded-b-xs border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold font-institutional uppercase tracking-wider text-slate-900">
                  Estilo do Cabeçalho e Cantos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Refine o acabamento estético dos botões, cantos dos cartões e aparência do topo.
                </p>
              </div>

              {/* Estilo do Cabeçalho Superior */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Aparência da Barra Superior (Header):
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleThemeChange({ headerStyle: 'light' })}
                    className={`p-3 rounded-xs border-2 text-center transition-all ${
                      theme.headerStyle === 'light'
                        ? 'border-[#4B5320] bg-slate-50 font-bold text-[#4B5320]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-6 h-3 bg-white border border-slate-300 block mx-auto mb-1.5 rounded-xs" />
                    <span className="text-xs block uppercase">Branco Sóbrio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange({ headerStyle: 'dark' })}
                    className={`p-3 rounded-xs border-2 text-center transition-all ${
                      theme.headerStyle === 'dark'
                        ? 'border-[#D4AF37] bg-slate-900 font-bold text-white'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-6 h-3 bg-[#1A2421] border border-white/20 block mx-auto mb-1.5 rounded-xs" />
                    <span className="text-xs block uppercase">Preto Tático</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange({ headerStyle: 'primary' })}
                    className={`p-3 rounded-xs border-2 text-center transition-all ${
                      theme.headerStyle === 'primary'
                        ? 'border-[#D4AF37] text-white font-bold'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                    style={{
                      backgroundColor: theme.headerStyle === 'primary' ? theme.primaryColor : undefined,
                    }}
                  >
                    <span
                      className="w-6 h-3 block mx-auto mb-1.5 rounded-xs border border-white/30"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <span className="text-xs block uppercase">Cor Primária</span>
                  </button>
                </div>
              </div>

              {/* Cantos e Arredondamento */}
              <div className="border-t border-slate-200 pt-5 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cantos dos Elementos (Border Radius):
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleThemeChange({ borderRadius: 'none' })}
                    className={`p-3 border-2 text-center transition-all rounded-none ${
                      theme.borderRadius === 'none'
                        ? 'border-[#4B5320] bg-slate-100 font-bold text-[#4B5320]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-6 h-6 border-2 border-slate-600 block mx-auto mb-1.5 rounded-none" />
                    <span className="text-xs block uppercase">Militar Reto</span>
                    <span className="text-[10px] text-slate-500 block">Sóbrio (0px)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange({ borderRadius: 'sm' })}
                    className={`p-3 border-2 text-center transition-all rounded-xs ${
                      theme.borderRadius === 'sm' || !theme.borderRadius
                        ? 'border-[#4B5320] bg-slate-100 font-bold text-[#4B5320]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-6 h-6 border-2 border-slate-600 block mx-auto mb-1.5 rounded-xs" />
                    <span className="text-xs block uppercase">Suave Tático</span>
                    <span className="text-[10px] text-slate-500 block">Padrão (4px)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleThemeChange({ borderRadius: 'md' })}
                    className={`p-3 border-2 text-center transition-all rounded-md ${
                      theme.borderRadius === 'md'
                        ? 'border-[#4B5320] bg-slate-100 font-bold text-[#4B5320]'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-6 h-6 border-2 border-slate-600 block mx-auto mb-1.5 rounded-md" />
                    <span className="text-xs block uppercase">Arredondado</span>
                    <span className="text-[10px] text-slate-500 block">Moderno (8px)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coluna Lateral: Simulador de Pré-Visualização em Tempo Real (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-xs border border-slate-200 shadow-sm sticky top-20 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#4B5320]" />
                <h3 className="text-xs font-bold font-institutional uppercase tracking-wider text-slate-900">
                  Prévia em Tempo Real
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-xs">
                Simulador Ativo
              </span>
            </div>

            {/* Simulador da Barra Superior (Header) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cabeçalho Superior:
              </span>
              <div
                className={`p-3 rounded-xs border transition-colors flex items-center justify-between ${
                  theme.headerStyle === 'dark'
                    ? 'bg-[#1A2421] text-white border-white/20'
                    : theme.headerStyle === 'primary'
                    ? 'text-white border-white/20'
                    : 'bg-white text-slate-800 border-slate-300'
                }`}
                style={{
                  backgroundColor: theme.headerStyle === 'primary' ? theme.primaryColor : undefined,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MilitaryInsignia
                    className="w-8 h-8 shrink-0"
                    customSrc={theme.customLogoUrl || undefined}
                    alt="Logo"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold font-institutional truncate uppercase tracking-wider">
                      {gremioName}
                    </p>
                    <p className="text-[10px] opacity-75 truncate">{turmaName} • {year}</p>
                  </div>
                </div>

                <div
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs shrink-0"
                  style={{ backgroundColor: theme.accentColor, color: '#1A2421' }}
                >
                  Oficial
                </div>
              </div>
            </div>

            {/* Simulador de Card de Indicador Financeiro */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cartão de Auditoria / Indicador:
              </span>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Saldo Consolidado
                    </span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      R$ 48.520,00
                    </span>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                </div>

                {/* Linha de progresso estilizada com acento */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '68%', backgroundColor: theme.accentColor }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>68% da meta atingida</span>
                  <span style={{ color: theme.primaryColor }} className="font-bold">Auditado</span>
                </div>
              </div>
            </div>

            {/* Simulador de Botões de Ação */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Botões de Ação do Sistema:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="px-3 py-2 text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-opacity shadow-xs"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Ação Primária
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-[#1A2421] text-xs font-bold uppercase tracking-wider rounded-xs transition-opacity shadow-xs"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  Destaque Ouro
                </button>
              </div>
            </div>

            {/* Aviso de Aplicação Instantânea */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-amber-900 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                Sincronização em Tempo Real
              </p>
              <p className="text-amber-800 leading-relaxed text-[10px]">
                Ao clicar em <strong>"Salvar e Aplicar"</strong>, a nova configuração é gravada no
                Firestore na coleção <code>system/config</code> e se propaga automaticamente para todos
                os usuários autenticados.
              </p>
            </div>

            <button
              onClick={handleSaveAndBroadcast}
              disabled={isSaving}
              type="button"
              className="w-full py-2.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase tracking-widest rounded-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>Sincronizando com Firestore...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#D4AF37]" />
                  <span>Salvar e Aplicar a Toda a Turma</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
