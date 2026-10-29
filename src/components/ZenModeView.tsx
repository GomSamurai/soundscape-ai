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
  Star,
  Flame,
  Layers,
  Zap,
  Filter,
} from 'lucide-react';
import { SoundscapeProject } from '../types/soundscape';
import { ButterchurnVisualizer } from './ButterchurnVisualizer';
import { audioEngine } from '../services/audioEngine';
import {
  milkdropPresetService,
  PresetCategory,
  PresetMetadata,
} from '../services/milkdropPresetService';

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
  const [autoCycle, setAutoCycle] = useState<boolean>(true);
  const [onlyReactive, setOnlyReactive] = useState<boolean>(() =>
    milkdropPresetService.getOnlyReactiveMode()
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    milkdropPresetService.getFavorites()
  );
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('all');
  const [packFilter, setPackFilter] = useState<string>('all');

  // Live Tab Audio Capture State
  const [isTabAudioActive, setIsTabAudioActive] = useState<boolean>(() =>
    audioEngine.isLiveTabAudioActive()
  );

  // Listen to preset updates & favorites from ButterchurnVisualizer & Service
  useEffect(() => {
    const handlePresetChange = (e: any) => {
      if (e.detail?.name) {
        setCurrentPresetName(e.detail.name);
      }
      if (e.detail?.autoCycle !== undefined) {
        setAutoCycle(e.detail.autoCycle);
      }
      if (e.detail?.onlyReactive !== undefined) {
        setOnlyReactive(e.detail.onlyReactive);
      }
    };

    const handleTabAudioChange = (e: any) => {
      setIsTabAudioActive(e.detail?.active ?? audioEngine.isLiveTabAudioActive());
    };

    const handleFavsChange = (e: any) => {
      setFavorites(e.detail?.favorites || milkdropPresetService.getFavorites());
    };

    const handleReactiveChange = (e: any) => {
      setOnlyReactive(e.detail?.onlyReactive ?? milkdropPresetService.getOnlyReactiveMode());
    };

    window.addEventListener('butterchurn_preset_changed', handlePresetChange);
    window.addEventListener('tab_audio_capture_changed', handleTabAudioChange);
    window.addEventListener('butterchurn_favorites_changed', handleFavsChange);
    window.addEventListener('butterchurn_reactive_mode_changed', handleReactiveChange);

    return () => {
      window.removeEventListener('butterchurn_preset_changed', handlePresetChange);
      window.removeEventListener('tab_audio_capture_changed', handleTabAudioChange);
      window.removeEventListener('butterchurn_favorites_changed', handleFavsChange);
      window.removeEventListener('butterchurn_reactive_mode_changed', handleReactiveChange);
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

  const handleToggleReactiveMode = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !onlyReactive;
    setOnlyReactive(next);
    milkdropPresetService.setOnlyReactiveMode(next);
  };

  const handleToggleFavorite = (name = currentPresetName, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!name) return;
    milkdropPresetService.toggleFavorite(name);
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
      } else if (e.key.toLowerCase() === 'b') {
        handleToggleReactiveMode();
      } else if (e.key.toLowerCase() === 's' || e.key === '*') {
        handleToggleFavorite();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, onTogglePlay, onExitZen, currentPresetName, onlyReactive]);

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered presets for modal using milkdropPresetService
  const filteredMetas = useMemo(() => {
    return milkdropPresetService.filterPresets({
      category: activeCategory,
      searchQuery,
      packFilter,
    });
  }, [activeCategory, searchQuery, packFilter, favorites]);

  const currentMeta = useMemo(() => {
    return milkdropPresetService.getMetadata(currentPresetName);
  }, [currentPresetName]);

  const isCurrentFavorite = useMemo(() => {
    return favorites.includes(currentPresetName);
  }, [favorites, currentPresetName]);

  const reactiveCount = useMemo(() => {
    return milkdropPresetService.getReactivePresetNames().length;
  }, []);

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
        {/* Left: Sanctuary Brand & GPU MilkDrop Status + Preset Info */}
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
              {currentMeta?.isReactive && (
                <span className="px-1.5 py-0.2 rounded-md bg-orange-950/90 text-[10px] text-orange-400 font-bold border border-orange-500/40 flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5" /> {currentMeta.score}% Reactivo
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <p
                className="text-[10px] text-slate-300 font-mono truncate max-w-[140px] sm:max-w-xs"
                title={currentPresetName}
              >
                {currentPresetName.replace(/_/g, ' ') || project.name}
              </p>
              <button
                onClick={(e) => handleToggleFavorite(currentPresetName, e)}
                title={isCurrentFavorite ? 'Quitar de favoritos (S)' : 'Guardar en mis favoritos (S)'}
                className={`p-0.5 rounded transition-transform cursor-pointer ${
                  isCurrentFavorite
                    ? 'text-amber-400 hover:scale-125'
                    : 'text-slate-500 hover:text-amber-300 hover:scale-110'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${isCurrentFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Center: MilkDrop 2 GPU Preset Controls Toolbar + Beat Sync Mode */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/85 border border-slate-800/80 backdrop-blur-2xl px-2.5 py-1.5 rounded-2xl shadow-2xl">
          {/* Audio-Reactive Beat Sync Toggle */}
          <button
            onClick={handleToggleReactiveMode}
            title={
              onlyReactive
                ? 'Modo Beat Sync ACTIVO: Solo se reproducen presets reactivos al ritmo y graves. Clic o letra B para desactivar.'
                : 'Activar Modo Beat Sync: Restringir a presets altamente reactivos al sonido (letra B).'
            }
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              onlyReactive
                ? 'bg-orange-950/90 border-orange-500 text-orange-300 shadow-md shadow-orange-500/25 ring-1 ring-orange-500/40'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-orange-300 hover:bg-slate-800'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${onlyReactive ? 'text-orange-400 fill-orange-400 animate-bounce' : ''}`} />
            <span className="text-[10px] font-bold hidden sm:inline">
              {onlyReactive ? 'Beat Sync ON' : 'Beat Sync'}
            </span>
          </button>

          <span className="w-px h-4 bg-slate-800 mx-0.5" />

          {/* Prev / Random / Next Navigation */}
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

          <span className="w-px h-4 bg-slate-800 mx-0.5" />

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
            title="Explorar biblioteca de presets de MilkDrop (500 disponibles)"
            className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
          >
            <List className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium hidden sm:inline">Presets (500)</span>
          </button>
        </div>

        {/* Right Tools: Tab Audio Sync, Timer, Pin, Fullscreen & Exit */}
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
            title={
              isPinnedControls ? 'Controles fijados (visibles siempre)' : 'Fijar controles en pantalla'
            }
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

          {/* Quick Favorite current preset toggle */}
          <button
            onClick={() => handleToggleFavorite(currentPresetName)}
            title={isCurrentFavorite ? 'Quitar de favoritos (S)' : 'Guardar en favoritos (S)'}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isCurrentFavorite
                ? 'bg-amber-950/90 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300'
            }`}
          >
            <Star className={`w-4 h-4 ${isCurrentFavorite ? 'fill-amber-400' : ''}`} />
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
          Clic en el fondo: siguiente preset · B: Modo Beat Sync · S: Favorito · Espacio: Pausa · Esc: Salir
        </p>
      </div>

      {/* Preset Explorer Modal inside Zen Mode (500+ presets, categories, search, packs) */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl p-3 sm:p-6 flex flex-col justify-center items-center animate-fade-in"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[88vh] bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Colección MilkDrop 2 GPU & Shaders
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-[10px] text-cyan-300 font-mono border border-cyan-500/40">
                      500 Presets
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecciona shaders con sincronización rítmica, geometría 3D o guarda tus favoritos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto custom-scrollbar shrink-0">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activeCategory === 'all'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Todos (500)
              </button>

              <button
                onClick={() => setActiveCategory('reactive')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activeCategory === 'reactive'
                    ? 'bg-orange-500/25 border-orange-500 text-orange-300 shadow-md shadow-orange-500/15'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-orange-300 hover:bg-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                🔥 Ultra-Reactivos ({reactiveCount})
              </button>

              <button
                onClick={() => setActiveCategory('favorites')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activeCategory === 'favorites'
                    ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-md shadow-amber-500/15'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Mis Favoritos ({favorites.length})
              </button>

              <button
                onClick={() => setActiveCategory('tunnels')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activeCategory === 'tunnels'
                    ? 'bg-indigo-500/25 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-indigo-300 hover:bg-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Túneles & 3D
              </button>

              <button
                onClick={() => setActiveCategory('psychedelic')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activeCategory === 'psychedelic'
                    ? 'bg-fuchsia-500/25 border-fuchsia-500 text-fuchsia-300'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-fuchsia-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Psicodélicos
              </button>

              <button
                onClick={() => setActiveCategory('ambient')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activeCategory === 'ambient'
                    ? 'bg-teal-500/25 border-teal-500 text-teal-300'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-teal-300 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Ambiental
              </button>
            </div>

            {/* Search & Pack Filters Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 my-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, autor (Geiss, Rovastar, Flexi, Martin, Idiot)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={packFilter}
                    onChange={(e) => setPackFilter(e.target.value)}
                    className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos los Packs</option>
                    <option value="Esenciales MilkDrop 2">Esenciales MilkDrop 2 (100)</option>
                    <option value="Comunidad Ultra-Reactivos">Comunidad Ultra-Reactivos (105)</option>
                    <option value="Extra Pack I">Extra Pack I (146)</option>
                    <option value="Extra Pack II">Extra Pack II (122)</option>
                    <option value="Retro MD1 Clásicos">Retro MD1 Clásicos (87)</option>
                    <option value="HD Non-Minimal">HD Non-Minimal (71)</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    if (filteredMetas.length > 0) {
                      const rand =
                        filteredMetas[Math.floor(Math.random() * filteredMetas.length)];
                      handleSelectPreset(rand.name);
                    }
                  }}
                  title="Cargar un preset aleatorio dentro de este filtro"
                  className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Azar en Filtro</span>
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 custom-scrollbar my-1">
              {filteredMetas.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Layers className="w-8 h-8 text-slate-700" />
                  <span>No se encontraron presets para los filtros seleccionados.</span>
                  {activeCategory === 'favorites' && (
                    <span className="text-[11px] text-amber-400/80">
                      Haz clic en la estrella ⭐ de cualquier preset para añadirlo a tus favoritos.
                    </span>
                  )}
                </div>
              ) : (
                filteredMetas.map((item) => {
                  const isSelected = item.name === currentPresetName;
                  const isFav = favorites.includes(item.name);

                  return (
                    <div
                      key={item.name}
                      onClick={() => handleSelectPreset(item.name)}
                      className={`p-2.5 rounded-xl text-xs flex flex-col justify-between gap-1.5 transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-cyan-950/90 border-cyan-500/70 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500/40'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`font-mono text-[11px] font-semibold leading-tight line-clamp-2 ${
                            isSelected ? 'text-cyan-300' : 'text-slate-200'
                          }`}
                          title={item.name}
                        >
                          {item.name.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={(e) => handleToggleFavorite(item.name, e)}
                          title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                          className={`p-1 rounded-lg transition-transform hover:scale-125 cursor-pointer shrink-0 ${
                            isFav
                              ? 'text-amber-400'
                              : 'text-slate-600 hover:text-amber-300'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/50">
                        <span className="truncate max-w-[120px] text-slate-400 font-mono">
                          {item.author}
                        </span>

                        <div className="flex items-center gap-1">
                          {item.isReactive ? (
                            <span className="px-1.5 py-0.2 rounded bg-orange-950/80 border border-orange-500/40 text-orange-400 font-bold flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" /> {item.score}%
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-400">
                              {item.score}%
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 ml-1" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
