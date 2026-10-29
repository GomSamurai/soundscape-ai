export type SoundSourceType =
  | 'synthesizer'
  | 'audio_url'
  | 'video_url'
  | 'youtube_video'
  | 'midi_random'
  | 'drone_ambient';

export type SynthModel =
  | 'binaural'
  | 'binaural_alpha'
  | 'binaural_theta'
  | 'isochronic'
  | 'pink_noise'
  | 'brown_noise'
  | 'white_noise'
  | 'rain_synth'
  | 'drone_sub'
  | 'sub_drone'
  | 'singing_bowl'
  | 'wind_stream'
  | 'ocean_synth'
  | 'vinyl_crackle';

export type MidiScale =
  | 'pentatonic_major'
  | 'pentatonic_minor'
  | 'natural_minor'
  | 'dorian'
  | 'lydian'
  | 'hirajoshi';

export type MidiPlayMode = 'chords' | 'arpeggio' | 'random_melody';
export type MidiSoundPreset = 'rhodes' | 'warm_poly' | 'zen_harp';

export type DroneRootNote = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type DroneTexture = 'warm_pad' | 'dark_void' | 'crystal_shimmer' | 'tibetan_om' | 'solar_wind';

export interface AudioBusGroup {
  id: string;
  name: string;
  color?: string;
  volume: number; // 0 to 1
  muted: boolean;
  solo: boolean;
  collapsed?: boolean;
}

export interface ChannelTrack {
  id: string;
  name: string;
  soundKey: string;
  type: SoundSourceType;
  synthType?: SynthModel;
  sourceUrl?: string;
  youtubeVideoId?: string;
  youtubeThumbnail?: string;
  volume: number; // 0 to 1
  pan: number; // -1 (Left) to 1 (Right)
  filterCutoff: number; // 100 to 20000 Hz
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  filterQ: number; // 0.5 to 10
  reverbSend: number; // 0 to 1
  delaySend?: number; // 0 to 1 (Echo / Delay)
  delayTime?: number; // 0.05 to 1.0 seconds
  delayFeedback?: number; // 0 to 0.85
  tapeWarmth?: number; // 0 to 1 (Analog tape saturation & drive)
  chorusSend?: number; // 0 to 1 (Stereo dimension chorus)
  isUnavailable?: boolean; // Flags when YouTube video is unavailable or restricted
  muted: boolean;
  solo: boolean;
  playbackRate: number; // 0.5 to 2.0
  loop: boolean;
  videoMode?: boolean; // When true, shows video element or YouTube iframe preview
  carrierHz?: number; // Carrier frequency in Hz (e.g. 432, 528, 210)
  beatHz?: number; // Beat frequency in Hz (e.g. 6.0 Theta, 10.0 Alpha)
  isLocalFile?: boolean; // When true, loaded from user drag-and-drop
  category: string;
  color: string;
  role?: string;
  busId?: string; // ID del grupo/bus al que pertenece (undefined = Master directo)

  // Configuración del Generador MIDI Random
  midiScale?: MidiScale;
  midiPlayMode?: MidiPlayMode;
  midiSoundPreset?: MidiSoundPreset;
  midiBpm?: number; // 30 a 160 BPM
  midiOctave?: number; // 2, 3, 4
  midiDensity?: number; // 0.1 a 1.0 (probabilidad o espacio)

  // Configuración del Drone Ambient
  droneRootNote?: DroneRootNote;
  droneOctave?: 1 | 2 | 3;
  droneTexture?: DroneTexture;
  droneDetune?: number; // 0 a 1 (apertura estéreo)
  droneMovement?: number; // 0 a 1 (velocidad respiración)
  droneWarmth?: number; // 0 a 1
}

export interface SoundscapeProject {
  id: string;
  name: string;
  tagline: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  category: string;
  tags: string[];
  visualTheme: 'cyan' | 'amber' | 'emerald' | 'violet' | 'sky' | 'rose';
  masterVolume: number; // 0 to 1
  masterReverb: number; // 0 to 1
  masterFilter: number; // 200 to 20000 Hz
  masterDelay?: number; // 0 to 1
  masterDelayTime?: number; // 0.05 to 1.0s
  masterDelayFeedback?: number; // 0 to 0.85
  masterWarmth?: number; // 0 to 1 (Analog tape saturation)
  binauralFreqHz?: number;
  channels: ChannelTrack[];
  buses?: AudioBusGroup[]; // Grupos / buses personalizados de mezcla
  isPreset?: boolean;
  syncedToCloud?: boolean;
}

export interface SoundLibraryItem {
  key: string;
  name: string;
  category: 'YouTube Videos' | 'Naturaleza' | 'Binaural & Drones' | 'Atmosférico' | 'Urbano & Calma' | 'Web Video / Streaming';
  description: string;
  type: SoundSourceType;
  synthType?: SynthModel;
  sourceUrl?: string;
  youtubeVideoId?: string;
  youtubeThumbnail?: string;
  defaultVolume: number;
  defaultPan: number;
  defaultCutoff: number;
  color: string;
  tags: string[];
  duration?: string;
  authorOrAttribution?: string;
  carrierHz?: number;
  beatHz?: number;
}
