import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Moon,
  Timer,
  Sparkles,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Search,
  Radio,
  Cpu,
  Check,
  Pin,
} from 'lucide-react';
import { SoundscapeProject } from '../types/soundscape';
import { ButterchurnVisualizer } from './ButterchurnVisualizer';
import { audioEngine } from '../services/audioEngine';
import butterchurnPresets from 'butterchurn-presets';

const getButterchurnPresets = () => {
  const mod: any = butterchurnPresets;
  if (mod && typeof mod.getPresets === 'function') return mod;
  if (mod?.default && typeof mod.default.getPresets === 'function') return mod.default;
  if (typeof (window as any).butterchurnPresets?.getPresets === 'function')
    return (window as any).butterchurnPresets;
  return mod?.default || mod;
};

interface ZenModeViewProps {
  project: SoundscapeProject;
  isPlaying: boolean;
  masterVolume: number;
  activeTimer: {
    isActive: boolean;
    mode: 'sleep' | 'pomodoro';
    remainingSeconds: number;
    totalSeconds: number;
  } | null;
  onTogglePlay: () => void;
  onVolumeChange: (vol: number) => void;
  onOpenTimerModal: () => void;
  onExitZen: () => void;
}

export const ZenModeView: React.FC<ZenModeViewProps> = ({
  project,
  isPlaying,
  masterVolume,
  activeTimer,
  onTogglePlay,
  onVolumeChange,
  onOpenTimerModal,
  onExitZen,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isPinnedControls, setIsPinnedControls] = useState<boolean>(false);
  const hideControlsTimeout = useRef<number | null>(null);

  // Modern GPU Visualizer Preset State
  const [currentPresetName, setCurrentPresetName] = useState<string>('');
  const [presetsList, setPresetsList] = useState<string[]>([]);
  const [autoCycle, setAutoCycle] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live Tab Audio Capture State
  const [isTabAudioActive, setIsTabAudioActive] = useState<boolean>(() =>
    audioEngine.isLiveTabAudioActive()
  );

  // Load Presets List for the Zen Preset Explorer
  useEffect(() => {
    try {
      const presetsEngine = getButterchurnPresets();
      const allPresets = presetsEngine?.getPresets ? presetsEngine.getPresets() : {};
      const names = Object.keys(allPresets);
      setPresetsList(names);
    } catch (e) {
      console.warn('Error cargando presets de MilkDrop en Zen:', e);
    }
  }, []);

  // Listen to preset updates from ButterchurnVisualizer
  useEffect(() => {
    const handlePresetChange = (e: any) => {
      if (e.detail?.name) {
        setCurrentPresetName(e.detail.name);
      }
      if (e.detail?.autoCycle !== undefined) {
        setAutoCycle(e.detail.autoCycle);
      }
    };

    const handleTabAudioChange = (e: any) => {
      setIsTabAudioActive(e.detail?.active ?? audioEngine.isLiveTabAudioActive());
    };

    window.addEventListener('butterchurn_preset_changed', handlePresetChange);
    window.addEventListener('tab_audio_capture_changed', handleTabAudioChange);

    return () => {
      window.removeEventListener('butterchurn_preset_changed', handlePresetChange);
      window.removeEventListener('tab_audio_capture_changed', handleTabAudioChange);
    };
  }, []);

  // Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Idle hide controls after 4.2s of mouse inactivity (unless pinned)
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    if (!isPinnedControls) {
      hideControlsTimeout.current = window.setTimeout(() => {
        if (!isSearchOpen) {
          setShowControls(false);
        }
      }, 4200);
    }
  };

  useEffect(() => {
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    return () => {
      window.removeEventListener('mousemove', resetHideTimer);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, [isSearchOpen, isPinnedControls]);

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Preset Navigation Dispatchers (talk to Butterchurn GPU engine)
  const handleNextPreset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    window.dispatchEvent(new CustomEvent('butterchurn_next_preset'));
  };

  const handlePrevPreset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    window.dispatchEvent(new CustomEvent('butterchurn_prev_preset'));
  };

  const handleRandomPreset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    window.dispatchEvent(new CustomEvent('butterchurn_random_preset'));
  };

  const handleToggleAutoCycle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    window.dispatchEvent(new CustomEvent('butterchurn_toggle_autocycle'));
    setAutoCycle((v) => !v);
  };

  const handleSelectPreset = (name: string) => {
    window.dispatchEvent(
      new CustomEvent('butterchurn_select_preset', { detail: { name, blend: 2.0 } })
    );
    setCurrentPresetName(name);
    setIsSearchOpen(false);
  };

  const handleToggleTabAudio = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isTabAudioActive) {
      audioEngine.disableLiveTabAudioCapture();
    } else {
      await audioEngine.enableLiveTabAudioCapture();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSearchOpen) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'Escape') {
        onExitZen();
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        handleNextPreset();
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
        handlePrevPreset();
      } else if (e.key.toLowerCase() === 'r') {
        handleRandomPreset();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, onTogglePlay, onExitZen]);

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter presets for search modal
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return presetsList.slice(0, 80);
    const q = searchQuery.toLowerCase();
    return presetsList.filter((p) => p.toLowerCase().includes(q)).slice(0, 100);
  }, [presetsList, searchQuery]);

  return (
    <div
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none animate-fade-in"
    >
      {/* Living Master Visualizer GPU Background (Fullscreen & Dynamic WebGL) */}
      <div className="absolute inset-0">
        <ButterchurnVisualizer
          isPlaying={isPlaying}
          masterVolume={masterVolume}
          tracks={project.channels}
          isZenMode={true}
          onExitZen={onExitZen}
          showInternalHud={false}
        />
      </div>

      {/* Top Floating Header Bar */}
      <div
        className={`relative z-20 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 transition-all duration-500 pointer-events-none ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        {/* Left: Sanctuary Brand & GPU MilkDrop Status */}
        <div className="flex items-center gap-2.5 pointer-events-auto bg-slate-950/85 border border-slate-800/80 backdrop-blur-2xl px-3.5 py-2 rounded-2xl shadow-2xl">
          <span className="p-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-100">
                Santuario Zen
              </h1>
              <span className="px-1.5 py-0.2 rounded-md bg-cyan-950/90 text-[10px] text-cyan-300 font-mono border border-cyan-500/40 flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5 text-cyan-400" />
                Nvidia GPU
              </span>
            </div>
            <p
              className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] sm:max-w-xs"
              title={currentPresetName}
            >
              {currentPresetName.replace(/_/g, ' ') || project.name}
            </p>
          </div>
        </div>

        {/* Center: MilkDrop 2 GPU Preset Controls Toolbar */}
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-950/85 border border-slate-800/80 backdrop-blur-2xl px-2 py-1.5 rounded-2xl shadow-2xl">
          <button
            onClick={handlePrevPreset}
            title="Preset anterior (Flecha Izquierda / P)"
            className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleRandomPreset}
            title="Preset aleatorio (R / Shuffle)"
            className="p-1.5 hover:bg-slate-800/80 text-cyan-400 hover:text-cyan-200 rounded-xl transition-colors cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNextPreset}
            title="Siguiente preset (Flecha Derecha / N)"
            className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="w-px h-4 bg-slate-800 mx-1" />
          <button
            onClick={handleToggleAutoCycle}
            title={autoCycle ? 'Auto-cambio activo cada 20s' : 'Auto-cambio desactivado'}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs ${
              autoCycle ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono hidden md:inline">20s</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchOpen(true);
            }}
            title="Explorar biblioteca de presets de MilkDrop"
            className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
          >
            <List className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium hidden sm:inline">Presets</span>
          </button>
        </div>

        {/* Right Tools: Tab Audio Sync, Timer, Fullscreen & Exit */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Live Tab Audio Capture (YouTube In-Sync) Button */}
          <button
            onClick={handleToggleTabAudio}
            title={
              isTabAudioActive
                ? 'Audio de YouTube sincronizado en vivo (1:1). Clic para desactivar.'
                : 'Sincronizar el audio real de los videos de YouTube de esta pestaña con 1 clic'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-2xl transition-all cursor-pointer shadow-lg border ${
              isTabAudioActive
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-500/20 animate-pulse'
                : 'bg-slate-950/85 border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-400'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isTabAudioActive ? 'text-emerald-400 animate-spin' : 'text-cyan-400'
              }`}
            />
            <span className="text-[11px] hidden sm:inline">
              {isTabAudioActive ? 'YouTube 1:1' : '⚡ Audio en Vivo'}
            </span>
          </button>

          {/* Active Timer Pill */}
          {activeTimer?.isActive && (
            <button
              onClick={onOpenTimerModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/85 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-semibold flex items-center gap-2 hover:bg-indigo-900/80 transition-colors cursor-pointer shadow-lg backdrop-blur-2xl"
              title="Ajustar temporizador de apagado o pomodoro"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>{formatRemaining(activeTimer.remainingSeconds)}</span>
            </button>
          )}

          {/* Pin Controls Toggle */}
          <button
            onClick={() => setIsPinnedControls(!isPinnedControls)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shadow-lg backdrop-blur-2xl ${
              isPinnedControls
                ? 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800/80 text-slate-400 hover:text-white'
            }`}
            title={isPinnedControls ? 'Controles fijados (visibles siempre)' : 'Fijar controles en pantalla'}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-lg backdrop-blur-2xl"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit Zen Button */}
          <button
            onClick={onExitZen}
            className="px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-rose-950 border border-slate-800/80 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg backdrop-blur-2xl"
            title="Volver a la consola de mezcla (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Center Minimalist Clock & Project Aura */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 space-y-2 pointer-events-none">
        <div className="text-6xl sm:text-8xl font-extralight tracking-tight font-mono text-white/90 drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
          {currentTime}
        </div>
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-md">
            {project.name}
          </h2>
          <p className="text-xs text-slate-400 font-light max-w-md mx-auto line-clamp-1 drop-shadow">
            {project.tagline || project.description || 'Inmersión acústica viva.'}
          </p>
        </div>

        {activeTimer?.isActive && (
          <div className="pt-2">
            <span className="px-3.5 py-1 rounded-full bg-slate-950/80 border border-indigo-500/40 text-xs text-indigo-300 font-mono shadow-md backdrop-blur-md">
              {activeTimer.mode === 'sleep' ? '🌙 Apagado gradual en ' : '🔥 Ciclo Pomodoro en '}
              {formatRemaining(activeTimer.remainingSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Floating Glassmorphism Bottom Dock */}
      <div
        className={`relative z-20 flex flex-col items-center justify-center p-4 sm:p-6 transition-all duration-500 pointer-events-none ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 rounded-2xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-2xl shadow-2xl pointer-events-auto">
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-slate-950 transition-all cursor-pointer shadow-lg active:scale-95 ${
              isPlaying ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-500 hover:bg-emerald-400'
            }`}
            title={isPlaying ? 'Pausar audio (Espacio)' : 'Reproducir audio (Espacio)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Master Volume Slider & Mute Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onVolumeChange(masterVolume > 0 ? 0 : 0.85)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={masterVolume > 0 ? 'Silenciar master' : 'Restaurar volumen'}
            >
              {masterVolume > 0 ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              title={`Volumen Maestro: ${Math.round(masterVolume * 100)}%`}
            />
            <span className="text-xs font-mono text-slate-400 w-9 text-right tabular-nums">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Quick Random Preset button */}
          <button
            onClick={handleRandomPreset}
            title="Cambiar preset aleatorio (R)"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Sleep / Pomodoro Timer Launcher */}
          <button
            onClick={onOpenTimerModal}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              activeTimer?.isActive
                ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Configurar temporizador de sueño o pomodoro"
          >
            <Timer className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle Micro-hint */}
        <p className="text-[10px] text-slate-500 mt-2 pointer-events-auto">
          Clic en el fondo para cambiar preset · Espacio: Pausa · Esc: Salir
        </p>
      </div>

      {/* Preset Explorer / Search Modal inside Zen Mode */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl p-4 sm:p-8 flex flex-col justify-center items-center animate-fade-in"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[80vh] bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Biblioteca de Presets MilkDrop 2 (GPU)
                </h3>
                <span className="text-xs text-slate-400">({presetsList.length})</span>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative my-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar preset (ej: geiss, cosmic, flexi, wave, plasma, tunnel)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar max-h-[50vh]">
              {filteredPresets.map((name) => {
                const isSelected = name === currentPresetName;
                return (
                  <button
                    key={name}
                    onClick={() => handleSelectPreset(name)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/90 text-cyan-300 font-semibold border border-cyan-500/50'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span className="font-mono truncate">{name.replace(/_/g, ' ')}</span>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
