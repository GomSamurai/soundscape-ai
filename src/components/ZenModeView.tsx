import React, { useEffect, useRef, useState } from 'react';
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
  Activity,
  RotateCcw,
} from 'lucide-react';
import { SoundscapeProject } from '../types/soundscape';
import { VisualizerMode, VisualizerSettings } from '../types/visualizer';
import {
  COLOR_PALETTES,
  VISUALIZER_MODES_CONFIG,
  loadStoredSettings,
  persistVisualizerSettings,
} from '../constants/visualizerPresets';
import { MasterVisualizer } from './MasterVisualizer';

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
  const [isDynamicsOpen, setIsDynamicsOpen] = useState<boolean>(false);
  const hideControlsTimeout = useRef<number | null>(null);

  // Synchronized visualizer settings
  const [visualizerSettings, setVisualizerSettings] = useState<VisualizerSettings>(() =>
    loadStoredSettings()
  );

  // Sync settings when modified externally
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail) {
        setVisualizerSettings(e.detail);
      }
    };
    window.addEventListener('visualizer_settings_changed', handleSync);
    return () => window.removeEventListener('visualizer_settings_changed', handleSync);
  }, []);

  const updateVisualizerSettings = (updates: Partial<VisualizerSettings>) => {
    setVisualizerSettings((prev) => {
      const next = { ...prev, ...updates };
      persistVisualizerSettings(next);
      window.dispatchEvent(new CustomEvent('visualizer_settings_changed', { detail: next }));
      return next;
    });
  };

  // Active palette lookup & cycling
  const activePalette =
    COLOR_PALETTES.find((p) => p.id === visualizerSettings.paletteId) || COLOR_PALETTES[0];

  const handleCyclePalette = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = COLOR_PALETTES.findIndex((p) => p.id === visualizerSettings.paletteId);
    const nextIndex = (currentIndex + 1) % COLOR_PALETTES.length;
    updateVisualizerSettings({ paletteId: COLOR_PALETTES[nextIndex].id });
  };

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

  // Idle hide controls after 3.5 seconds of mouse inactivity
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = window.setTimeout(() => {
      // Don't auto-hide if user is actively tweaking dynamics sliders
      if (!isDynamicsOpen) {
        setShowControls(false);
      }
    }, 3800);
  };

  useEffect(() => {
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    return () => {
      window.removeEventListener('mousemove', resetHideTimer);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, [isDynamicsOpen]);

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

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none animate-fade-in">
      {/* Living Master Visualizer Canvas Background (Fullscreen & Dynamic) */}
      <div className="absolute inset-0 pointer-events-none">
        <MasterVisualizer
          isPlaying={isPlaying}
          masterVolume={masterVolume}
          tracks={project.channels}
          isZenMode={true}
          onExitZen={onExitZen}
        />
      </div>

      {/* Top Floating Header Bar */}
      <div
        className={`relative z-20 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 transition-all duration-500 pointer-events-none ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        {/* Left: Sanctuary Brand & Project Name */}
        <div className="flex items-center gap-2.5 pointer-events-auto bg-slate-950/70 border border-slate-800/80 backdrop-blur-xl px-3 py-1.5 rounded-2xl shadow-xl">
          <span className="p-1.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </span>
          <div>
            <h1 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-200">
              Santuario Acústico
            </h1>
            <p className="text-[10px] text-cyan-300 font-medium truncate max-w-[140px] sm:max-w-xs">
              {project.name}
            </p>
          </div>
        </div>

        {/* Center: ALL 10 Visualizer Styles Direct Selector */}
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl p-1 rounded-2xl shadow-2xl overflow-x-auto no-scrollbar max-w-[calc(100vw-32px)] sm:max-w-none">
          {VISUALIZER_MODES_CONFIG.map((item) => {
            const Icon = item.icon;
            const isActive = visualizerSettings.mode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => updateVisualizerSettings({ mode: item.mode })}
                title={`${item.label}: ${item.desc}`}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Right Tools: Palette Cycler, Timer Badge, Fullscreen & Exit */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Palette Cycler Pill */}
          <button
            onClick={handleCyclePalette}
            title={`Paleta de Color: ${activePalette.name} (Clic para cambiar)`}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/50 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg backdrop-blur-xl"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{
                backgroundColor: activePalette.primary,
                boxShadow: `0 0 8px ${activePalette.glow}`,
              }}
            />
            <span className="hidden lg:inline">{activePalette.name}</span>
            <RotateCcw className="w-3 h-3 text-slate-400 hover:text-white" />
          </button>

          {/* Active Timer Pill */}
          {activeTimer?.isActive && (
            <button
              onClick={onOpenTimerModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-semibold flex items-center gap-2 hover:bg-indigo-900/80 transition-colors cursor-pointer shadow-lg backdrop-blur-xl"
              title="Ajustar temporizador de apagado o pomodoro"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>{formatRemaining(activeTimer.remainingSeconds)}</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-lg backdrop-blur-xl"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit Zen Button */}
          <button
            onClick={onExitZen}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-rose-950 border border-slate-800/80 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg backdrop-blur-xl"
            title="Volver a la consola de mezcla (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Center Minimalist Clock & Aura (Unobtrusive) */}
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
            <span className="px-3.5 py-1 rounded-full bg-slate-950/70 border border-indigo-500/40 text-xs text-indigo-300 font-mono shadow-md backdrop-blur-md">
              {activeTimer.mode === 'sleep' ? '🌙 Apagado gradual en ' : '🔥 Ciclo Pomodoro en '}
              {formatRemaining(activeTimer.remainingSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Floating Glassmorphism Bottom Dock */}
      <div
        className={`relative z-20 flex items-center justify-center p-4 sm:p-6 transition-all duration-500 pointer-events-none ${
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
            title={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
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
              {masterVolume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
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

          {/* Quick Visualizer Dynamics Adjuster (Sensibilidad & Suavizado) */}
          <div className="relative">
            <button
              onClick={() => setIsDynamicsOpen((v) => !v)}
              title="Ajustar Sensibilidad y Suavizado del Visualizador"
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                isDynamicsOpen
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono hidden sm:inline">
                {visualizerSettings.gain.toFixed(2)}x
              </span>
            </button>

            {/* Floating Popover with Sliders */}
            {isDynamicsOpen && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-60 p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl z-30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-1.5">
                  <span>Dinámica Visual Zen</span>
                  <button
                    onClick={() => setIsDynamicsOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Sensibilidad</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {visualizerSettings.gain.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={visualizerSettings.gain}
                    onChange={(e) => updateVisualizerSettings({ gain: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Suavizado Anti-Tembleque</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round((visualizerSettings.smoothing ?? 0.82) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="0.96"
                    step="0.02"
                    value={visualizerSettings.smoothing ?? 0.82}
                    onChange={(e) =>
                      updateVisualizerSettings({ smoothing: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

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
      </div>
    </div>
  );
};
