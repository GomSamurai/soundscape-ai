import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, X, Moon, Timer, Sparkles } from 'lucide-react';
import { SoundscapeProject } from '../types/soundscape';
import { audioEngine } from '../services/audioEngine';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimeout = useRef<number | null>(null);

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

  // Idle hide controls after 3.5 seconds
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  useEffect(() => {
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    return () => {
      window.removeEventListener('mousemove', resetHideTimer);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, []);

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

  // Canvas visualizer with organic breathing fluid ribbons
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    let angle = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Dark background with slow phosphor dissipation
      ctx.fillStyle = 'rgba(3, 7, 18, 0.25)';
      ctx.fillRect(0, 0, w, h);

      const analyser = audioEngine.getMasterAnalyser();
      const data = new Uint8Array(analyser ? analyser.frequencyBinCount : 256);
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(data);
      }

      // Energy calculation
      let energy = 0;
      for (let i = 0; i < 64; i++) energy += data[i];
      const normEnergy = Math.min(1, (energy / 64) / 180) * (isPlaying ? 1 : 0.05);

      angle += 0.008 + normEnergy * 0.015;

      // Central glowing particle nexus
      const centerX = w / 2;
      const centerY = h / 2;
      const baseRadius = Math.min(w, h) * 0.22 + normEnergy * 50;

      // Draw subtle orbital rings
      const themeColors: Record<string, string> = {
        cyan: '6, 182, 212',
        amber: '245, 158, 11',
        emerald: '16, 185, 129',
        violet: '139, 92, 246',
        sky: '2, 132, 199',
        rose: '244, 63, 94',
      };
      const rgb = themeColors[project.visualTheme] || '6, 182, 212';

      for (let ring = 0; ring < 3; ring++) {
        const ringRad = baseRadius * (1 + ring * 0.25);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${rgb}, ${0.12 - ring * 0.03 + normEnergy * 0.15})`;
        ctx.lineWidth = 1.5;

        for (let a = 0; a <= Math.PI * 2; a += 0.04) {
          const waveIdx = Math.floor((a / (Math.PI * 2)) * 64);
          const waveAmp = (data[waveIdx] / 255) * 35 * normEnergy;
          const r = ringRad + Math.sin(a * 4 + angle * (ring % 2 === 0 ? 1 : -1)) * (12 + waveAmp);
          const x = centerX + Math.cos(a) * r;
          const y = centerY + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Ambient glowing center gradient
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        baseRadius * 1.8
      );
      grad.addColorStop(0, `rgba(${rgb}, ${0.15 + normEnergy * 0.2})`);
      grad.addColorStop(0.5, `rgba(${rgb}, ${0.04 + normEnergy * 0.06})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying, project.visualTheme]);

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none animate-fade-in">
      {/* Visualizer Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Top Header Bar */}
      <div
        className={`relative z-10 flex items-center justify-between p-6 transition-opacity duration-500 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-slate-300">
              Modo Zen · Santuario Acústico
            </h1>
            <p className="text-xs text-slate-400">{project.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTimer?.isActive && (
            <button
              onClick={onOpenTimerModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-semibold flex items-center gap-2 hover:bg-indigo-900/80 transition-colors cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>{formatRemaining(activeTimer.remainingSeconds)}</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onExitZen}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-950 border border-slate-800 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Volver a la consola (Esc)"
          >
            <X className="w-4 h-4" />
            <span>Salir de Modo Zen</span>
          </button>
        </div>
      </div>

      {/* Center Aura & Minimal Clock */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 space-y-3 pointer-events-none">
        <div className="text-5xl sm:text-7xl font-extralight tracking-tight font-mono text-white/90 drop-shadow-lg">
          {currentTime}
        </div>
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
            {project.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-light max-w-md mx-auto line-clamp-2">
            {project.tagline || project.description || 'Inmersión acústica viva.'}
          </p>
        </div>

        {activeTimer?.isActive && (
          <div className="pt-2">
            <span className="px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-indigo-300 font-mono">
              {activeTimer.mode === 'sleep' ? '🌙 Apagado gradual en' : '🔥 Ciclo Pomodoro en'}{' '}
              {formatRemaining(activeTimer.remainingSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Floating Glassmorphism Bottom Dock */}
      <div
        className={`relative z-10 flex items-center justify-center p-6 transition-opacity duration-500 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-4 px-6 py-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-slate-950 transition-all cursor-pointer shadow-md ${
              isPlaying ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-500 hover:bg-emerald-400'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Master Volume */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onVolumeChange(masterVolume > 0 ? 0 : 0.85)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {masterVolume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-28 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400 w-8">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Sleep Timer Quick Launch */}
          <button
            onClick={onOpenTimerModal}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              activeTimer?.isActive
                ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
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
