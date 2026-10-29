export interface MilkdropConfig {
  // 1. Velocidad de Animación y Persistencia Temporal
  animationSpeed: number; // 0.2x a 3.0x (1.0 default)
  decay: number; // 0.80 a 0.999 (0.98 default)
  useCustomDecay: boolean;

  // 2. Reacción al Sonido (Dinámica de Audio & Frecuencias)
  audioGain: number; // 0.2x a 4.0x (1.2 default)
  bassBoost: number; // -12 a +18 dB (+4 dB default)
  trebleBoost: number; // -12 a +15 dB (0 dB default)
  beatSensitivity: number; // 0.5x a 2.5x (1.0 default)

  // 3. Físicas y Geometría Espacial
  zoomMultiplier: number; // 0.75x a 1.35x (1.0 default)
  rotationSpeed: number; // -0.04 a +0.04 rad/frame (0.0 default)
  warpMultiplier: number; // 0.0x a 3.0x (1.0 default)
  waveScale: number; // 0.2x a 3.0x (1.0 default)
  waveModeOverride: number; // -1 = Preset Default, 0-7 = Forzado

  // 4. Color & Post-Procesado Visual GPU
  hueRotate: number; // 0° a 360° (0 default)
  saturation: number; // 0% a 250% (100% default)
  contrast: number; // 50% a 200% (100% default)
  brightness: number; // 50% a 150% (100% default)
  invert: boolean; // false default
  colorCycleSpeed: number; // 0 (apagado) a 10 (velocidad de rotación cromática)

  // 5. Parámetros BaseVals dinámicos modificados en el inspector en tiempo real
  dynamicBaseVals: Record<string, number>;
}

export const DEFAULT_MILKDROP_CONFIG: MilkdropConfig = {
  animationSpeed: 1.0,
  decay: 0.98,
  useCustomDecay: false,
  audioGain: 1.2,
  bassBoost: 4,
  trebleBoost: 0,
  beatSensitivity: 1.0,
  zoomMultiplier: 1.0,
  rotationSpeed: 0.0,
  warpMultiplier: 1.0,
  waveScale: 1.0,
  waveModeOverride: -1,
  hueRotate: 0,
  saturation: 100,
  contrast: 100,
  brightness: 100,
  invert: false,
  colorCycleSpeed: 0,
  dynamicBaseVals: {},
};

export interface MilkdropProfile {
  id: string;
  name: string;
  badge: string;
  description: string;
  config: Partial<MilkdropConfig>;
}

export const MILKDROP_PROFILES: MilkdropProfile[] = [
  {
    id: 'club_reactive',
    name: 'Hiper-Reactivo Bass Club',
    badge: '🔥 PUNCH',
    description: 'Reactividad sísmica al bombo y bajos. Graves +10dB, ganancia 2.2x y transitorios directos.',
    config: {
      animationSpeed: 1.15,
      audioGain: 2.2,
      bassBoost: 10,
      trebleBoost: 4,
      beatSensitivity: 1.8,
      warpMultiplier: 1.35,
      zoomMultiplier: 1.04,
      saturation: 135,
      contrast: 115,
    },
  },
  {
    id: 'zen_hypnotic',
    name: 'Zen Hipnótico Fluido',
    badge: '🧘 RELAX',
    description: 'Cámara lenta, estelas infinitas ultra suaves y suave ciclaje prismático.',
    config: {
      animationSpeed: 0.52,
      audioGain: 0.9,
      bassBoost: 0,
      trebleBoost: -2,
      useCustomDecay: true,
      decay: 0.993,
      zoomMultiplier: 1.015,
      rotationSpeed: 0.006,
      warpMultiplier: 0.65,
      colorCycleSpeed: 1.5,
      saturation: 95,
      contrast: 98,
    },
  },
  {
    id: 'psychedelic_neon',
    name: 'Neón Psicodélico Trance',
    badge: '⚡ NEÓN',
    description: 'Explosión de saturación ultra-vívida, rotación continua y deformación warp líquida.',
    config: {
      animationSpeed: 1.1,
      hueRotate: 85,
      saturation: 190,
      contrast: 125,
      brightness: 105,
      warpMultiplier: 1.75,
      waveScale: 1.5,
      rotationSpeed: -0.012,
      audioGain: 1.4,
      bassBoost: 6,
    },
  },
  {
    id: 'cosmic_hole',
    name: 'Agujero Negro Cósmico',
    badge: '🌌 INVERT',
    description: 'Inversión de color neón negativo, alto contraste dinámico y pulso gravitacional.',
    config: {
      animationSpeed: 0.85,
      invert: true,
      contrast: 155,
      brightness: 110,
      saturation: 130,
      zoomMultiplier: 0.94,
      warpMultiplier: 1.25,
      audioGain: 1.6,
      bassBoost: 8,
    },
  },
  {
    id: 'crystal_minimal',
    name: 'Cristal Minimalista',
    badge: '💎 CRISP',
    description: 'Líneas limpias, estelas rápidas sin emborronar y paleta de contrastes nítidos.',
    config: {
      animationSpeed: 0.8,
      waveScale: 0.65,
      useCustomDecay: true,
      decay: 0.94,
      saturation: 75,
      brightness: 108,
      contrast: 112,
      warpMultiplier: 0.35,
      audioGain: 1.0,
      bassBoost: 2,
    },
  },
];

const CONFIG_STORAGE_KEY = 'soundscape_milkdrop_config_v1';

export function loadMilkdropConfig(): MilkdropConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_MILKDROP_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Error cargando configuración de Milkdrop:', e);
  }
  return { ...DEFAULT_MILKDROP_CONFIG };
}

export function saveMilkdropConfig(config: MilkdropConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent('butterchurn_config_updated', {
        detail: { config },
      })
    );
  } catch (e) {
    console.warn('Error guardando configuración de Milkdrop:', e);
  }
}
