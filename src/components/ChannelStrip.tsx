import React, { useState, useEffect, useRef } from 'react';
import {
  ChannelTrack,
  AudioBusGroup,
  MidiScale,
  MidiPlayMode,
  MidiSoundPreset,
  DroneRootNote,
  DroneTexture,
} from '../types/soundscape';
import { RotaryKnob } from './RotaryKnob';
import { StudioFader } from './StudioFader';
import { audioEngine } from '../services/audioEngine';
import { YouTubePlayerEmbed } from './YouTubePlayerEmbed';
import { VerifiedVideoLibrary } from '../services/verifiedVideoLibrary';
import {
  Trash2,
  Video,
  Youtube,
  RefreshCw,
  AlertTriangle,
  Search,
  ChevronDown,
  Sparkles,
  Radio,
  Music,
  Disc,
  Folder,
  Play,
  Sliders,
} from 'lucide-react';

interface ChannelStripProps {
  track: ChannelTrack;
  trackIndex?: number;
  masterVolume: number;
  hasAnySolo: boolean;
  isPlaying: boolean;
  buses?: AudioBusGroup[];
  onUpdate: (updated: Partial<ChannelTrack>) => void;
  onRemove: () => void;
  onOpenReplace?: (trackId: string, trackName: string) => void;
}

interface QuickOption {
  label: string;
  icon: string;
  type: 'youtube_video' | 'synthesizer' | 'midi_random' | 'drone_ambient';
  videoId?: string;
  synthType?: 'brown_noise' | 'pink_noise' | 'binaural_alpha' | 'binaural_theta' | 'sub_drone' | 'vinyl_crackle';
  category: string;
  midiSoundPreset?: MidiSoundPreset;
  midiScale?: MidiScale;
  midiPlayMode?: MidiPlayMode;
  droneRootNote?: DroneRootNote;
  droneTexture?: DroneTexture;
}

const QUICK_REPLACEMENTS: QuickOption[] = [
  {
    label: 'Lluvia Torrencial 4K',
    icon: '🌧️',
    type: 'youtube_video',
    videoId: 'mPZkdNFkNps',
    category: 'Lluvia',
  },
  {
    label: 'Chimenea Acogedora',
    icon: '🔥',
    type: 'youtube_video',
    videoId: 'L_LUpnjgPso',
    category: 'Fuego',
  },
  {
    label: 'Cafetería Lofi Chill',
    icon: '☕',
    type: 'youtube_video',
    videoId: 'jfKfPfyJRdk',
    category: 'Música / Relax',
  },
  {
    label: 'Bosque & Pájaros',
    icon: '🌲',
    type: 'youtube_video',
    videoId: 'xNN7iTA57jM',
    category: 'Naturaleza',
  },
  {
    label: 'Olas de Océano HD',
    icon: '🌊',
    type: 'youtube_video',
    videoId: 'WHPEKLQID4U',
    category: 'Agua',
  },
  {
    label: 'Cuencos Tibetanos 432Hz',
    icon: '🧘',
    type: 'youtube_video',
    videoId: 'By6zerfldXE',
    category: 'Meditación',
  },
  {
    label: 'Teclado Rhodes Generativo',
    icon: '🎹',
    type: 'midi_random',
    midiSoundPreset: 'rhodes',
    midiScale: 'pentatonic_minor',
    midiPlayMode: 'chords',
    category: 'Instrumento MIDI',
  },
  {
    label: 'Arpa Zen & Campanas',
    icon: '✨',
    type: 'midi_random',
    midiSoundPreset: 'zen_harp',
    midiScale: 'hirajoshi',
    midiPlayMode: 'arpeggio',
    category: 'Instrumento MIDI',
  },
  {
    label: 'Drone Pad Cálido Analógico',
    icon: '🪐',
    type: 'drone_ambient',
    droneRootNote: 'D',
    droneTexture: 'warm_pad',
    category: 'Drone Armónico',
  },
  {
    label: 'Drone Shimmer Cristalino',
    icon: '💎',
    type: 'drone_ambient',
    droneRootNote: 'A',
    droneTexture: 'crystal_shimmer',
    category: 'Drone Armónico',
  },
  {
    label: 'Ruido Marrón Estudio',
    icon: '🌌',
    type: 'synthesizer',
    synthType: 'brown_noise',
    category: 'Generador',
  },
  {
    label: 'Ondas Alfa 10Hz',
    icon: '🧠',
    type: 'synthesizer',
    synthType: 'binaural_alpha',
    category: 'Binaural',
  },
];

export const ChannelStrip: React.FC<ChannelStripProps> = ({
  track,
  trackIndex = 1,
  masterVolume,
  hasAnySolo,
  isPlaying,
  buses = [],
  onUpdate,
  onRemove,
  onOpenReplace,
}) => {
  const [vuLevel, setVuLevel] = useState<number>(0);
  const [hasVideoError, setHasVideoError] = useState(Boolean(track.isUnavailable));

  useEffect(() => {
    setHasVideoError(Boolean(track.isUnavailable));
  }, [track.isUnavailable]);

  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isReplaceMenuOpen, setIsReplaceMenuOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const animRef = useRef<number | null>(null);

  // Bus calculation
  const assignedBus = buses.find((b) => b.id === track.busId);
  const isBusMuted = assignedBus?.muted || false;
  const hasAnyBusSolo = buses.some((b) => b.solo);
  const isBusSoloBlocked = hasAnyBusSolo && !assignedBus?.solo && !track.solo;
  const isTrackSoloBlocked = hasAnySolo && !track.solo;

  const isEffectivelyMuted = track.muted || isBusMuted;
  const isEffectivelySoloBlocked = isTrackSoloBlocked || isBusSoloBlocked;

  // Monitor live VU levels from this channel with realistic ballistics
  useEffect(() => {
    let smoothVu = 0;
    const updateVU = () => {
      animRef.current = requestAnimationFrame(updateVU);
      if (
        !isPlaying ||
        isEffectivelyMuted ||
        isEffectivelySoloBlocked ||
        track.volume <= 0.001 ||
        track.isUnavailable
      ) {
        smoothVu = 0;
        setVuLevel(0);
        return;
      }

      const busVolumeMult = assignedBus ? assignedBus.volume : 1.0;
      const effectiveVol = track.volume * busVolumeMult;

      if (track.type === 'youtube_video') {
        const normalizedTarget = Math.max(0, Math.min(100, (effectiveVol / 1.2) * 100));
        smoothVu = smoothVu * 0.75 + normalizedTarget * 0.25;
        setVuLevel(Math.round(smoothVu));
      } else {
        const analyser = audioEngine.getChannelAnalyser(track.id);
        if (analyser) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            sum += data[i];
          }
          const avg = sum / data.length;
          const energy = (avg / 255) * 100 * (effectiveVol / 1.0);
          smoothVu = smoothVu * 0.7 + energy * 0.3;
          setVuLevel(Math.min(100, Math.round(smoothVu)));
        } else {
          const norm = (effectiveVol / 1.2) * 100;
          smoothVu = smoothVu * 0.8 + norm * 0.2;
          setVuLevel(Math.round(smoothVu));
        }
      }
    };

    updateVU();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [
    track.id,
    track.volume,
    track.muted,
    track.solo,
    track.type,
    track.isUnavailable,
    isPlaying,
    isEffectivelyMuted,
    isEffectivelySoloBlocked,
    assignedBus,
  ]);

  // Clean title without emoji spam
  const cleanTitle = track.name
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    )
    .trim();

  // Handle Automatic replacement of unavailable YouTube videos
  const handleAutoReplace = async () => {
    setIsAutoFixing(true);
    try {
      const cleanName = track.name.replace(/\(.*?\)/g, '').trim();
      let newVideoId = '';
      let newTitle = '';
      let newThumb = '';

      try {
        const res = await fetch(
          `/api/youtube/find-replacement?query=${encodeURIComponent(cleanName)}&category=${encodeURIComponent(
            track.category || ''
          )}&currentId=${encodeURIComponent(track.youtubeVideoId || '')}`
        );
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.replacement && data.replacement.videoId && data.replacement.videoId !== track.youtubeVideoId) {
            newVideoId = data.replacement.videoId;
            newTitle = data.replacement.title;
            newThumb = data.replacement.thumbnail;
          }
        }
      } catch (networkErr) {
        console.warn('Backend find-replacement unreachable, using verified catalog:', networkErr);
      }

      // If backend didn't supply a different working video, use local verified rotation library
      if (!newVideoId) {
        const fallback = VerifiedVideoLibrary.getNextWorkingVideo(
          track.youtubeVideoId,
          cleanName,
          track.category
        );
        newVideoId = fallback.videoId;
        newTitle = fallback.title;
        newThumb = fallback.thumbnail;
      }

      if (newVideoId) {
        onUpdate({
          type: 'youtube_video',
          youtubeVideoId: newVideoId,
          youtubeThumbnail: newThumb || `https://img.youtube.com/vi/${newVideoId}/hqdefault.jpg`,
          name: `${newTitle.slice(0, 26)}`,
          isUnavailable: false,
        });
        setHasVideoError(false);
        setIsReplaceMenuOpen(false);
      }
    } catch (err) {
      console.error('Error auto-replacing YouTube video:', err);
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleSelectQuickOption = (opt: QuickOption) => {
    if (opt.type === 'youtube_video' && opt.videoId) {
      onUpdate({
        type: 'youtube_video',
        youtubeVideoId: opt.videoId,
        name: opt.label,
        category: opt.category,
        isUnavailable: false,
      });
    } else if (opt.type === 'midi_random') {
      onUpdate({
        type: 'midi_random',
        name: opt.label,
        category: opt.category,
        midiSoundPreset: opt.midiSoundPreset || 'rhodes',
        midiScale: opt.midiScale || 'pentatonic_minor',
        midiPlayMode: opt.midiPlayMode || 'chords',
        isUnavailable: false,
      });
    } else if (opt.type === 'drone_ambient') {
      onUpdate({
        type: 'drone_ambient',
        name: opt.label,
        category: opt.category,
        droneRootNote: opt.droneRootNote || 'D',
        droneTexture: opt.droneTexture || 'warm_pad',
        droneOctave: 2,
        isUnavailable: false,
      });
    } else if (opt.type === 'synthesizer' && opt.synthType) {
      onUpdate({
        type: 'synthesizer',
        synthType: opt.synthType,
        name: opt.label,
        category: opt.category,
        isUnavailable: false,
      });
    }
    setHasVideoError(false);
    setIsReplaceMenuOpen(false);
  };

  // Format pan readout: L50, C, R50
  const formatPan = (val: number) => {
    if (Math.abs(val) < 0.05) return 'C';
    if (val < 0) return `L${Math.round(Math.abs(val) * 100)}`;
    return `R${Math.round(val * 100)}`;
  };

  // Format filter cutoff readout
  const formatCutoff = (freq: number) => {
    if (freq >= 1000) return `${(freq / 1000).toFixed(1)}k`;
    return `${Math.round(freq)}Hz`;
  };

  const trackNumStr = String(trackIndex).padStart(2, '0');

  // Trigger manual MIDI chord test
  const handleTriggerChord = () => {
    audioEngine.triggerMidiChord(track.id);
  };

  return (
    <div className="relative w-56 sm:w-60 md:w-64 shrink-0 h-auto rounded-2xl bg-slate-900/95 border border-slate-800/90 p-2.5 flex flex-col justify-between shadow-2xl hover:border-slate-700/80 transition-all backdrop-blur-md">
      {/* Top Track Color Accent Strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-90 shadow-sm"
        style={{ backgroundColor: assignedBus?.color || track.color || '#06B6D4' }}
      />

      {/* 1. Track Header: Number, Clean Title, Delete, Solo & Mute */}
      <div className="pt-1 border-b border-slate-800/80 pb-2 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0">
            {trackNumStr}
          </span>
          <h4
            className="text-xs font-bold text-slate-100 truncate flex-1 text-center leading-tight"
            title={cleanTitle}
          >
            {cleanTitle}
          </h4>
          <button
            onClick={onRemove}
            title="Eliminar pista"
            className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Subtitle & Backlit Solo/Mute Buttons */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] text-slate-400 truncate flex-1 leading-none uppercase tracking-wider font-medium">
            {track.role || track.category || 'Pista'}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onUpdate({ solo: !track.solo })}
              className={`w-5 h-5 rounded-[4px] text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                track.solo
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_#FBBF24] ring-1 ring-amber-300'
                  : 'bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-700 border border-slate-700/60'
              }`}
              title="Solo (Escuchar solo este canal)"
            >
              S
            </button>

            <button
              onClick={() => onUpdate({ muted: !track.muted })}
              className={`w-5 h-5 rounded-[4px] text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                track.muted
                  ? 'bg-rose-500 text-white shadow-[0_0_8px_#F43F5E] ring-1 ring-rose-400'
                  : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700 border border-slate-700/60'
              }`}
              title="Mute (Silenciar canal)"
            >
              M
            </button>
          </div>
        </div>

        {/* Bus Assignment Dropdown (Routing to Custom Groups/Buses or Direct to Master) */}
        <div className="flex items-center justify-between gap-1 text-[9px] px-1.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-1 text-slate-400 shrink-0">
            <Folder className="w-2.5 h-2.5 text-cyan-400" />
            <span className="font-mono text-[8px] uppercase tracking-wider">Bus:</span>
          </div>

          <select
            value={track.busId || ''}
            onChange={(e) => onUpdate({ busId: e.target.value || undefined })}
            className="bg-transparent text-slate-200 font-semibold cursor-pointer focus:outline-none flex-1 truncate text-right hover:text-cyan-300"
          >
            <option value="" className="bg-slate-900 text-slate-300">
              Máster (Directo)
            </option>
            {buses.map((bus) => (
              <option key={bus.id} value={bus.id} className="bg-slate-900 text-slate-100">
                📁 {bus.name}
              </option>
            ))}
          </select>

          {assignedBus && (
            <span
              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: assignedBus.color }}
              title={`Asignado a: ${assignedBus.name} (Vol: ${Math.round(assignedBus.volume * 100)}%)`}
            />
          )}
        </div>
      </div>

      {/* 2. Source Bar & Dynamic Replace Trigger */}
      <div className="relative my-1">
        <div className="flex items-center justify-between gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {track.type === 'youtube_video' ? (
              <Youtube className="w-3 h-3 text-rose-500 shrink-0" />
            ) : track.type === 'midi_random' ? (
              <Music className="w-3 h-3 text-amber-400 shrink-0" />
            ) : track.type === 'drone_ambient' ? (
              <Disc className="w-3 h-3 text-indigo-400 shrink-0" />
            ) : track.type === 'synthesizer' ? (
              <Radio className="w-3 h-3 text-cyan-400 shrink-0" />
            ) : (
              <Video className="w-3 h-3 text-emerald-400 shrink-0" />
            )}
            <span
              className="text-[9px] font-mono text-slate-300 truncate"
              title={track.youtubeVideoId || track.name}
            >
              {track.type === 'youtube_video'
                ? hasVideoError
                  ? 'Error YT'
                  : `YT: ${track.youtubeVideoId?.slice(0, 6)}`
                : track.type === 'midi_random'
                ? `MIDI: ${track.midiSoundPreset || 'Rhodes'}`
                : track.type === 'drone_ambient'
                ? `Drone: ${track.droneRootNote || 'D'}${track.droneOctave || 2}`
                : 'Sintetizador'}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {(track.type === 'midi_random' || track.type === 'drone_ambient' || track.type === 'synthesizer') && (
              <button
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className={`p-1 rounded text-[9px] transition-all cursor-pointer ${
                  isConfigOpen
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={isConfigOpen ? 'Ocultar parámetros' : 'Ajustar parámetros del instrumento'}
              >
                <Sliders className="w-2.5 h-2.5" />
              </button>
            )}

            <button
              onClick={() => setIsReplaceMenuOpen(!isReplaceMenuOpen)}
              className={`py-0.5 px-1.5 rounded text-[9px] font-medium flex items-center gap-0.5 transition-all cursor-pointer shrink-0 ${
                isReplaceMenuOpen
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Cambiar fuente de audio o instrumento"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <ChevronDown className="w-2 h-2 opacity-70" />
            </button>
          </div>
        </div>

        {/* Unavailable Warning Pill */}
        {hasVideoError && track.type === 'youtube_video' && (
          <button
            onClick={handleAutoReplace}
            disabled={isAutoFixing}
            className="w-full mt-1 py-0.5 px-1.5 rounded bg-rose-950/90 border border-rose-500/60 text-rose-300 text-[8px] font-bold flex items-center justify-center gap-1 hover:bg-rose-900 cursor-pointer transition-colors"
          >
            <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
            <span>{isAutoFixing ? 'Reparando...' : 'Auto-reparar video'}</span>
          </button>
        )}

        {/* Dynamic Replacement Menu Popover */}
        {isReplaceMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsReplaceMenuOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 animate-fade-in text-left max-h-64 overflow-y-auto w-56 -left-2">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold px-1.5 py-0.5 flex items-center justify-between">
                <span>Cambiar Fuente</span>
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
              </div>

              {hasVideoError && (
                <button
                  onClick={handleAutoReplace}
                  disabled={isAutoFixing}
                  className="w-full text-left p-1.5 my-1 rounded bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[9px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 text-rose-400 ${isAutoFixing ? 'animate-spin' : ''}`} />
                  <span>{isAutoFixing ? 'Buscando...' : '⚡ Reparar con IA'}</span>
                </button>
              )}

              {onOpenReplace && (
                <button
                  onClick={() => {
                    setIsReplaceMenuOpen(false);
                    onOpenReplace(track.id, track.name);
                  }}
                  className="w-full text-left p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[9px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors mb-1"
                >
                  <Search className="w-3 h-3 text-cyan-400" />
                  <span>Buscar en YouTube o pegar URL...</span>
                </button>
              )}

              <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold px-1 pt-1 border-t border-slate-800 mb-0.5">
                Instrumentos & Sonidos
              </div>

              <div className="space-y-0.5">
                {QUICK_REPLACEMENTS.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectQuickOption(opt)}
                    className="w-full text-left px-1.5 py-1 rounded hover:bg-slate-800 text-[9px] text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span className="text-[10px]">{opt.icon}</span>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    <span className="text-[7px] font-mono text-slate-500 shrink-0">
                      {opt.type === 'youtube_video'
                        ? 'YT'
                        : opt.type === 'midi_random'
                        ? 'MIDI'
                        : opt.type === 'drone_ambient'
                        ? 'DRONE'
                        : 'SINT'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2B. Dedicated Instrument Editors for MIDI, Drone & Synthesizer (Collapsible) */}
      {isConfigOpen && (
        <>
          {track.type === 'midi_random' && (
            <div className="my-1 p-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[9px] space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Music className="w-2.5 h-2.5" /> Teclado / MIDI
                </span>
                <button
                  onClick={handleTriggerChord}
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[8px] flex items-center gap-1 cursor-pointer shadow-sm transition-transform active:scale-95"
                  title="Tocar acorde ahora"
                >
                  <Play className="w-2 h-2 fill-current" />
                  <span>Tocar Acorde</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[8px]">
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-semibold">Timbre:</span>
                  <select
                    value={track.midiSoundPreset || 'rhodes'}
                    onChange={(e) => onUpdate({ midiSoundPreset: e.target.value as MidiSoundPreset })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-200 cursor-pointer focus:outline-none focus:border-amber-400"
                  >
                    <option value="rhodes">Rhodes EP</option>
                    <option value="juno_poly">Juno Poly</option>
                    <option value="zen_harp">Arpa Zen</option>
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-semibold">Modo:</span>
                  <select
                    value={track.midiPlayMode || 'chords'}
                    onChange={(e) => onUpdate({ midiPlayMode: e.target.value as MidiPlayMode })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-200 cursor-pointer focus:outline-none focus:border-amber-400"
                  >
                    <option value="chords">Acordes</option>
                    <option value="arpeggio">Arpegio</option>
                    <option value="melody">Melodía</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[7px] uppercase font-semibold">Escala Musical:</span>
                <select
                  value={track.midiScale || 'pentatonic_minor'}
                  onChange={(e) => onUpdate({ midiScale: e.target.value as MidiScale })}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-200 cursor-pointer focus:outline-none focus:border-amber-400"
                >
                  <option value="pentatonic_minor">Pentatónica Menor</option>
                  <option value="pentatonic_major">Pentatónica Mayor</option>
                  <option value="natural_minor">Menor Natural</option>
                  <option value="dorian">Dórica Mística</option>
                  <option value="lydian">Lidia Etérea</option>
                  <option value="hirajoshi">Hirajoshi Japonesa</option>
                </select>
              </div>

              {/* Tempo BPM Slider */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex items-center justify-between text-[7px] font-mono text-slate-400">
                  <span className="uppercase">Tempo BPM:</span>
                  <span className="font-bold text-amber-300">{track.midiBpm || 72} BPM</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="140"
                  step="1"
                  value={track.midiBpm || 72}
                  onChange={(e) => onUpdate({ midiBpm: parseInt(e.target.value, 10) })}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>
          )}

          {track.type === 'drone_ambient' && (
            <div className="my-1 p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-[9px] space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center gap-1">
                  <Disc className="w-2.5 h-2.5" /> Drone Armónico
                </span>
                <span className="font-mono text-[8px] font-bold text-indigo-300 px-1 py-0.5 rounded bg-indigo-900/60 border border-indigo-700/50">
                  {track.droneRootNote || 'D'}{track.droneOctave || 2}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[8px]">
                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-semibold">Tono Raíz:</span>
                  <select
                    value={track.droneRootNote || 'D'}
                    onChange={(e) => onUpdate({ droneRootNote: e.target.value as DroneRootNote })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-indigo-200 cursor-pointer font-bold focus:outline-none focus:border-indigo-400"
                  >
                    {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((note) => (
                      <option key={note} value={note}>
                        {note}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block text-[7px] uppercase font-semibold">Octava:</span>
                  <select
                    value={track.droneOctave || 2}
                    onChange={(e) => onUpdate({ droneOctave: Number(e.target.value) as 1 | 2 | 3 })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-indigo-200 cursor-pointer focus:outline-none focus:border-indigo-400"
                  >
                    <option value={1}>Sub (1)</option>
                    <option value={2}>Media (2)</option>
                    <option value={3}>Alta (3)</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[7px] uppercase font-semibold">Textura Sonora:</span>
                <select
                  value={track.droneTexture || 'warm_pad'}
                  onChange={(e) => onUpdate({ droneTexture: e.target.value as DroneTexture })}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-indigo-200 cursor-pointer focus:outline-none focus:border-indigo-400"
                >
                  <option value="warm_pad">Pad Cálido Analógico</option>
                  <option value="crystal_shimmer">Shimmer Cristalino</option>
                  <option value="dark_void">Vacío Profundo (Dark Void)</option>
                  <option value="tibetan_om">Om Tibetano 108Hz</option>
                  <option value="solar_wind">Viento Solar Etéreo</option>
                </select>
              </div>

              {/* Detune Cents Slider */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex items-center justify-between text-[7px] font-mono text-slate-400">
                  <span className="uppercase">Espaciado Detune:</span>
                  <span className="font-bold text-indigo-300">{track.droneDetune || 7} cents</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={track.droneDetune || 7}
                  onChange={(e) => onUpdate({ droneDetune: parseInt(e.target.value, 10) })}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                />
              </div>
            </div>
          )}

          {track.type === 'synthesizer' && (
            <div className="my-1 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-[9px] space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5" /> Sintetizador Procedural
                </span>
                <span className="font-mono text-[7px] text-cyan-400 uppercase font-semibold">DSP</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[7px] uppercase font-semibold">Tipo de Generador:</span>
                <select
                  value={track.synthType || 'brown_noise'}
                  onChange={(e) =>
                    onUpdate({
                      synthType: e.target.value as any,
                      name:
                        e.target.value === 'brown_noise'
                          ? 'Ruido Marrón'
                          : e.target.value === 'pink_noise'
                          ? 'Ruido Rosa'
                          : e.target.value === 'binaural_alpha'
                          ? 'Ondas Alfa 10Hz'
                          : e.target.value === 'binaural_theta'
                          ? 'Ondas Theta 6Hz'
                          : e.target.value === 'sub_drone'
                          ? 'Sub Drone 55Hz'
                          : 'Crepitar Vinilo',
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-cyan-200 cursor-pointer focus:outline-none focus:border-cyan-400"
                >
                  <option value="brown_noise">Ruido Marrón (Brownian)</option>
                  <option value="pink_noise">Ruido Rosa (Pink)</option>
                  <option value="binaural_alpha">Ondas Alfa 10Hz (Enfoque)</option>
                  <option value="binaural_theta">Ondas Theta 6Hz (Meditación)</option>
                  <option value="sub_drone">Sub Drone 55Hz (Tierra)</option>
                  <option value="vinyl_crackle">Crepitar Vinilo Vintage</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {/* 3. Ergonomic Side-by-side DSP Knobs (Left) & Studio Volume Fader (Right) */}
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800/80 my-1">
        {/* Left: 2x2 Rotary DSP Knobs */}
        <div className="grid grid-cols-2 gap-x-1 gap-y-1 flex-1">
          <RotaryKnob
            label="Pan"
            value={track.pan}
            min={-1}
            max={1}
            defaultValue={0}
            step={0.02}
            size={30}
            compact={true}
            displayValue={formatPan(track.pan)}
            color={assignedBus?.color || track.color || '#06B6D4'}
            onChange={(pan) => onUpdate({ pan })}
          />

          <RotaryKnob
            label="Filtro"
            value={track.filterCutoff}
            min={200}
            max={20000}
            defaultValue={20000}
            step={100}
            size={30}
            compact={true}
            displayValue={formatCutoff(track.filterCutoff)}
            color="#F59E0B"
            onChange={(filterCutoff) => onUpdate({ filterCutoff })}
          />

          <RotaryKnob
            label="Reverb"
            value={track.reverbSend ?? 0.2}
            min={0}
            max={1}
            defaultValue={0.2}
            step={0.05}
            size={30}
            compact={true}
            displayValue={`${Math.round((track.reverbSend ?? 0.2) * 100)}%`}
            color="#10B981"
            onChange={(reverbSend) => onUpdate({ reverbSend })}
          />

          <RotaryKnob
            label="Delay"
            value={track.delaySend || 0}
            min={0}
            max={1}
            defaultValue={0}
            step={0.05}
            size={30}
            compact={true}
            displayValue={`${Math.round((track.delaySend || 0) * 100)}%`}
            color="#8B5CF6"
            onChange={(delaySend) => onUpdate({ delaySend })}
          />
        </div>

        {/* Vertical Separator */}
        <div className="w-[1px] self-stretch bg-slate-800/90 my-0.5" />

        {/* Right: Studio Precision Volume Fader & VU Meter */}
        <div className="w-16 shrink-0 flex flex-col items-center">
          <StudioFader
            volume={track.volume}
            vuLevel={vuLevel}
            muted={isEffectivelyMuted}
            isSoloBlocked={isEffectivelySoloBlocked}
            color={assignedBus?.color || track.color || '#06B6D4'}
            onChange={(volume) => onUpdate({ volume })}
            compact={true}
          />
        </div>
      </div>
    </div>
  );
};
