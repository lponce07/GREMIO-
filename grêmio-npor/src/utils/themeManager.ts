import { AppThemeConfig } from '../types';

export const DEFAULT_THEME: AppThemeConfig = {
  mode: 'light',
  primaryColor: '#4B5320', // Verde-Oliva Militar Padrão
  accentColor: '#D4AF37',  // Ouro Institucional NPOR
  headerStyle: 'light',
  sidebarStyle: 'dark',
  customLogoUrl: '',
  customLogoName: 'SIMBOLO_NPOR.jpg',
  fontStyle: 'institutional',
  borderRadius: 'sm',
  showBackgroundWatermark: true,
  watermarkOpacity: 4,
  themePresetName: 'npor_oficial',
};

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: Partial<AppThemeConfig>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'npor_oficial',
    name: 'Verde-Oliva NPOR (Oficial)',
    description: 'Padrão institucional do Exército Brasileiro com fundo claro suave e detalhes dourados.',
    theme: {
      mode: 'light',
      primaryColor: '#4B5320',
      accentColor: '#D4AF37',
      headerStyle: 'light',
      sidebarStyle: 'dark',
      fontStyle: 'institutional',
      borderRadius: 'sm',
      themePresetName: 'npor_oficial',
    },
  },
  {
    id: 'tatico_noturno',
    name: 'Tático Noturno (Dark Mode)',
    description: 'Fundo escuro grafite militar com alto contraste para conferência noturna.',
    theme: {
      mode: 'dark',
      primaryColor: '#3D4C38',
      accentColor: '#E5C158',
      headerStyle: 'dark',
      sidebarStyle: 'dark',
      fontStyle: 'institutional',
      borderRadius: 'sm',
      themePresetName: 'tatico_noturno',
    },
  },
  {
    id: 'exercito_classico',
    name: 'Exército Brasileiro Clássico',
    description: 'Barra superior verde-oliva profunda com acentos em ouro velho e brasões tradicionais.',
    theme: {
      mode: 'light',
      primaryColor: '#2D3B29',
      accentColor: '#C5A059',
      headerStyle: 'primary',
      sidebarStyle: 'dark',
      fontStyle: 'institutional',
      borderRadius: 'none',
      themePresetName: 'exercito_classico',
    },
  },
  {
    id: 'preto_ouro',
    name: 'Preto Tático & Ouro Nobre',
    description: 'Design de gala militar contemporâneo com contraste tático preto e ouro.',
    theme: {
      mode: 'tactical',
      primaryColor: '#181A19',
      accentColor: '#D4AF37',
      headerStyle: 'dark',
      sidebarStyle: 'dark',
      fontStyle: 'institutional',
      borderRadius: 'sm',
      themePresetName: 'preto_ouro',
    },
  },
  {
    id: 'garanca_infantaria',
    name: 'Garança & Tradição Militar',
    description: 'Tom bordô/garança com ouro brilhante, remetendo às tradições das escolas militares.',
    theme: {
      mode: 'light',
      primaryColor: '#5C1D24',
      accentColor: '#D4AF37',
      headerStyle: 'primary',
      sidebarStyle: 'dark',
      fontStyle: 'institutional',
      borderRadius: 'sm',
      themePresetName: 'garanca_infantaria',
    },
  },
  {
    id: 'forcas_armadas',
    name: 'Forças Armadas (Azul Marinho)',
    description: 'Azul marinho sóbrio com detalhes dourados de alta dignidade institucional.',
    theme: {
      mode: 'light',
      primaryColor: '#1A2E40',
      accentColor: '#D4AF37',
      headerStyle: 'light',
      sidebarStyle: 'dark',
      fontStyle: 'institutional',
      borderRadius: 'sm',
      themePresetName: 'forcas_armadas',
    },
  },
];

export const PRIMARY_COLOR_SWATCHES = [
  { name: 'Verde-Oliva NPOR', hex: '#4B5320' },
  { name: 'Verde Selva Tático', hex: '#1B4332' },
  { name: 'Verde Camuflado', hex: '#2D3A29' },
  { name: 'Preto Tático', hex: '#181A19' },
  { name: 'Azul Forças Armadas', hex: '#1A2E40' },
  { name: 'Garança Militar', hex: '#5C1D24' },
  { name: 'Cinza Artilharia', hex: '#334155' },
  { name: 'Grafite Blindados', hex: '#262626' },
];

export const ACCENT_COLOR_SWATCHES = [
  { name: 'Ouro NPOR Oficial', hex: '#D4AF37' },
  { name: 'Dourado Nobre', hex: '#C5A059' },
  { name: 'Âmbar Operacional', hex: '#D97706' },
  { name: 'Esmeralda Militar', hex: '#059669' },
  { name: 'Bronze de Honra', hex: '#B45309' },
  { name: 'Rubi Tático', hex: '#B91C1C' },
  { name: 'Prata Nobre', hex: '#94A3B8' },
  { name: 'Amarelo Ouro', hex: '#EAB308' },
];

const LOCAL_STORAGE_THEME_KEY = 'gremio_npor_v2_active_theme';

export function getStoredTheme(): AppThemeConfig {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (saved) {
      return { ...DEFAULT_THEME, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('[Theme] Erro ao carregar tema local:', err);
  }
  return DEFAULT_THEME;
}

export function saveStoredTheme(theme: AppThemeConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, JSON.stringify(theme));
  } catch (err) {
    console.warn('[Theme] Erro ao salvar tema local:', err);
  }
}

export function applyThemeToDocument(theme: AppThemeConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Aplica as variáveis CSS essenciais
  root.style.setProperty('--military-primary', theme.primaryColor || '#4B5320');
  root.style.setProperty('--military-accent', theme.accentColor || '#D4AF37');

  const radiusMap: Record<string, string> = {
    none: '0px',
    sm: '4px',
    md: '8px',
  };
  root.style.setProperty('--military-radius', radiusMap[theme.borderRadius || 'sm'] || '4px');

  // Ajusta o background e classes do modo
  root.setAttribute('data-theme', theme.mode || 'light');
  root.setAttribute('data-header-style', theme.headerStyle || 'light');

  if (theme.mode === 'dark' || theme.mode === 'tactical') {
    root.classList.add('dark');
    root.style.setProperty('--military-canvas', theme.mode === 'tactical' ? '#0F1311' : '#141A17');
    root.style.setProperty('--military-card-bg', '#1B2420');
    root.style.setProperty('--military-card-border', '#2B3B34');
    root.style.setProperty('--military-text', '#F1F5F9');
    root.style.setProperty('--military-muted', '#94A3B8');
  } else {
    root.classList.remove('dark');
    root.style.setProperty('--military-canvas', '#F0F2F0');
    root.style.setProperty('--military-card-bg', '#FFFFFF');
    root.style.setProperty('--military-card-border', '#E2E8F0');
    root.style.setProperty('--military-text', '#1E293B');
    root.style.setProperty('--military-muted', '#64748B');
  }

  saveStoredTheme(theme);
}

/**
 * Comprime e converte uma imagem carregada pelo usuário em Base64 Data URL otimizado
 * para armazenamento direto seguro no Firestore (<100KB) e renderização instantânea.
 */
export async function compressAndConvertToDataUrl(
  file: File,
  maxDimension = 512,
  quality = 0.85
): Promise<{ dataUrl: string; fileName: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem selecionado'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('O arquivo carregado não é uma imagem válida'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({
            dataUrl: reader.result as string,
            fileName: file.name,
            sizeKb: Math.round(file.size / 1024),
          });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Gera PNG ou JPEG com compressão otimizada
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMime, quality);
        const approxSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        resolve({
          dataUrl,
          fileName: file.name,
          sizeKb: approxSizeKb,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
