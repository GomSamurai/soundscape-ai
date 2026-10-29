import { ColorPalette, VisualizerPreset, VisualizerSettings } from '../types/visualizer';

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neón',
    primary: '#06B6D4',
    secondary: '#EC4899',
    accent: '#8B5CF6',
    glow: '#06B6D4',
    gradient: ['#06B6D4', '#EC4899', '#8B5CF6'],
  },
  {
    id: 'synthwave',
    name: 'Synthwave Sunset',
    primary: '#F43F5E',
    secondary: '#FB923C',
    accent: '#FACC15',
    glow: '#F43F5E',
    gradient: ['#F43F5E', '#FB923C', '#FACC15'],
  },
  {
    id: 'aurora',
    name: 'Aurora Boreal',
    primary: '#10B981',
    secondary: '#06B6D4',
    accent: '#6366F1',
    glow: '#10B981',
    gradient: ['#10B981', '#06B6D4', '#6366F1'],
  },
  {
    id: 'matrix',
    name: 'Matrix Verde CRT',
    primary: '#22C55E',
    secondary: '#4ADE80',
    accent: '#86EFAC',
    glow: '#22C55E',
    gradient: ['#15803D', '#22C55E', '#86EFAC'],
  },
  {
    id: 'magma',
    name: 'Magma & Fuego',
    primary: '#EF4444',
    secondary: '#F97316',
    accent: '#FDE047',
    glow: '#EF4444',
    gradient: ['#B91C1C', '#EA580C', '#FDE047'],
  },
  {
    id: 'deepspace',
    name: 'Abismo Cósmico',
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#D946EF',
    glow: '#8B5CF6',
    gradient: ['#1D4ED8', '#7C3AED', '#D946EF'],
  },
  {
    id: 'luxury_gold',
    name: 'Oro de Estudio 24K',
    primary: '#EAB308',
    secondary: '#F59E0B',
    accent: '#FDE047',
    glow: '#EAB308',
    gradient: ['#CA8A04', '#F59E0B', '#FEF08A'],
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave Pastel',
    primary: '#F472B6',
    secondary: '#C084FC',
    accent: '#38BDF8',
    glow: '#F472B6',
    gradient: ['#F472B6', '#C084FC', '#38BDF8'],
  },
  {
    id: 'monochrome',
    name: 'Monocromo Titanio OLED',
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    accent: '#E2E8F0',
    glow: '#FFFFFF',
    gradient: ['#475569', '#94A3B8', '#FFFFFF'],
  },
];

export const DEFAULT_VISUALIZER_SETTINGS: VisualizerSettings = {
  mode: 'spectrum',
  paletteId: 'cyberpunk',
  gain: 0.95,
  smoothing: 0.82,
  decaySpeed: 'studio',
  barsCount: 64,
  peakHold: true,
  glowIntensity: 'intense',
  mirrorMode: false,
  showGrid: true,
  heightMode: 'medium',
};

export const FACTORY_VISUALIZER_PRESETS: VisualizerPreset[] = [
  {
    id: 'factory-cyber-tunnel',
    name: 'Túnel Cuántico 2077',
    description: 'Túnel warp hiper-espacial 3D que reacciona con ondas expansivas al subgrave y agudos.',
    isFactory: true,
    settings: {
      mode: 'tunnel',
      paletteId: 'cyberpunk',
      gain: 1.3,
      decaySpeed: 'studio',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'extreme',
      mirrorMode: false,
      showGrid: false,
      heightMode: 'tall',
    },
  },
  {
    id: 'factory-studio-master',
    name: 'Mastering RTA 64B Pro',
    description: 'Analizador en tiempo real calibrado en decibelios con retención balística de picos de estudio.',
    isFactory: true,
    settings: {
      mode: 'spectrum',
      paletteId: 'luxury_gold',
      gain: 1.0,
      decaySpeed: 'studio',
      barsCount: 64,
      peakHold: true,
      glowIntensity: 'subtle',
      mirrorMode: false,
      showGrid: true,
      heightMode: 'medium',
    },
  },
  {
    id: 'factory-synthwave-terrain',
    name: 'Malla 3D Terreno Synthwave',
    description: 'Perspectiva topográfica retro-futurista con cordilleras de audio fluyendo hacia el horizonte.',
    isFactory: true,
    settings: {
      mode: 'terrain',
      paletteId: 'synthwave',
      gain: 1.25,
      decaySpeed: 'fast',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'intense',
      mirrorMode: false,
      showGrid: true,
      heightMode: 'tall',
    },
  },
  {
    id: 'factory-aurora-curve',
    name: 'Ondas Polares Aurora',
    description: 'Curvas analógicas con spline suave, simetría bilateral y resplandor etéreo ártico.',
    isFactory: true,
    settings: {
      mode: 'curve',
      paletteId: 'aurora',
      gain: 1.2,
      decaySpeed: 'smooth',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'intense',
      mirrorMode: true,
      showGrid: false,
      heightMode: 'medium',
    },
  },
  {
    id: 'factory-particle-nebula',
    name: 'Nebulosa Gravitatoria',
    description: 'Enjambre cinético de partículas atraídas por vórtices de energía sonora y pulsos de graves.',
    isFactory: true,
    settings: {
      mode: 'particles',
      paletteId: 'deepspace',
      gain: 1.4,
      decaySpeed: 'studio',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'extreme',
      mirrorMode: false,
      showGrid: false,
      heightMode: 'tall',
    },
  },
  {
    id: 'factory-matrix-crt',
    name: 'Osciloscopio CRT Fósforo',
    description: 'Onda PCM analógica de alta velocidad con fósforo verde estilo pantalla vectorial militar.',
    isFactory: true,
    settings: {
      mode: 'oscilloscope',
      paletteId: 'matrix',
      gain: 1.1,
      decaySpeed: 'fast',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'intense',
      mirrorMode: false,
      showGrid: true,
      heightMode: 'medium',
    },
  },
  {
    id: 'factory-lissajous-scope',
    name: 'Vector Scope Lissajous',
    description: 'Diagrama de fase X/Y para análisis de campo estéreo y compatibilidad mono profesional.',
    isFactory: true,
    settings: {
      mode: 'lissajous',
      paletteId: 'luxury_gold',
      gain: 1.3,
      decaySpeed: 'studio',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'subtle',
      mirrorMode: false,
      showGrid: true,
      heightMode: 'medium',
    },
  },
  {
    id: 'factory-plasma-orb',
    name: 'Púlsar Solar de Plasma',
    description: 'Orbe estelar biomecánico con corona de plasma y llamaradas magnéticas al ritmo de la música.',
    isFactory: true,
    settings: {
      mode: 'orb',
      paletteId: 'magma',
      gain: 1.35,
      decaySpeed: 'studio',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'extreme',
      mirrorMode: false,
      showGrid: false,
      heightMode: 'tall',
    },
  },
  {
    id: 'factory-waterfall-heatmap',
    name: 'Cascada Espectral 3D',
    description: 'Sonograma termográfico que registra el mapa histórico de densidades armónicas continuas.',
    isFactory: true,
    settings: {
      mode: 'waterfall',
      paletteId: 'cyberpunk',
      gain: 1.1,
      decaySpeed: 'studio',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'none',
      mirrorMode: false,
      showGrid: false,
      heightMode: 'medium',
    },
  },
  {
    id: 'factory-mandala-polar',
    name: 'Mandala Polar 360°',
    description: 'Resonancia circular zen con pétalos armónicos que florecen con la dinámica acústica.',
    isFactory: true,
    settings: {
      mode: 'radial',
      paletteId: 'vaporwave',
      gain: 1.25,
      decaySpeed: 'smooth',
      barsCount: 64,
      peakHold: false,
      glowIntensity: 'intense',
      mirrorMode: true,
      showGrid: false,
      heightMode: 'medium',
    },
  },
];

export const VISUALIZER_USER_PRESETS_KEY = 'soundscape_visualizer_user_presets';
export const VISUALIZER_SETTINGS_KEY = 'soundscape_visualizer_current_settings';

export const loadStoredSettings = (): VisualizerSettings => {
  try {
    const raw = localStorage.getItem(VISUALIZER_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_VISUALIZER_SETTINGS,
        ...parsed,
        smoothing: typeof parsed.smoothing === 'number' ? parsed.smoothing : 0.82,
        gain: typeof parsed.gain === 'number' ? Math.min(parsed.gain, 1.8) : 0.95,
      };
    }
  } catch (e) {
    console.warn('Error loading stored visualizer settings:', e);
  }
  return DEFAULT_VISUALIZER_SETTINGS;
};

export const persistVisualizerSettings = (settings: VisualizerSettings) => {
  try {
    localStorage.setItem(VISUALIZER_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving visualizer settings:', e);
  }
};

export const loadUserVisualizerPresets = (): VisualizerPreset[] => {
  try {
    const raw = localStorage.getItem(VISUALIZER_USER_PRESETS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error loading user visualizer presets:', e);
  }
  return [];
};

export const saveUserVisualizerPresets = (presets: VisualizerPreset[]) => {
  try {
    localStorage.setItem(VISUALIZER_USER_PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Error saving user visualizer presets:', e);
  }
};
