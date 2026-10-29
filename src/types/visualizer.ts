export type VisualizerMode =
  | 'spectrum'
  | 'curve'
  | 'oscilloscope'
  | 'waterfall'
  | 'radial'
  | 'tunnel'
  | 'particles'
  | 'lissajous'
  | 'terrain'
  | 'orb';

export type ColorPaletteId =
  | 'cyberpunk'
  | 'synthwave'
  | 'aurora'
  | 'matrix'
  | 'magma'
  | 'deepspace'
  | 'monochrome'
  | 'vaporwave'
  | 'luxury_gold'
  | 'custom';

export interface ColorPalette {
  id: ColorPaletteId;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  gradient: [string, string, string];
}

export type GlowIntensity = 'none' | 'subtle' | 'intense' | 'extreme';
export type DecaySpeed = 'fast' | 'studio' | 'smooth';
export type VisualizerHeight = 'compact' | 'medium' | 'tall';
export type BarsResolution = 32 | 64 | 128;

export interface VisualizerSettings {
  mode: VisualizerMode;
  paletteId: ColorPaletteId;
  customPrimary?: string;
  customSecondary?: string;
  customAccent?: string;
  gain: number; // 0.1 to 3.0 (visual amplification factor / sensitivity)
  smoothing?: number; // 0.40 to 0.98 (anti-jitter temporal smoothing factor)
  decaySpeed: DecaySpeed;
  barsCount: BarsResolution;
  peakHold: boolean;
  glowIntensity: GlowIntensity;
  mirrorMode: boolean;
  showGrid: boolean;
  heightMode: VisualizerHeight;
}

export interface VisualizerPreset {
  id: string;
  name: string;
  description: string;
  isFactory?: boolean;
  settings: VisualizerSettings;
}
