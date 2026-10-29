import React, { useState } from 'react';
import { Sparkles, Play, Square, Pause, Key, Timer, Moon, Flame, Share2, Check, Compass } from 'lucide-react';

interface TopBarProps {
  currentView: 'mixer' | 'multi_video' | 'zen';
  videoCount: number;
  isPlaying: boolean;
  activeTimer?: {
    isActive: boolean;
    mode: 'sleep' | 'pomodoro';
    remainingSeconds: number;
    isPomodoroBreak?: boolean;
  } | null;
  onTogglePlay: () => void;
  onGlobalStop: () => void;
  onSetView: (view: 'mixer' | 'multi_video' | 'zen') => void;
  onOpenSearch: () => void;
  onOpenGallery: () => void;
  onOpenAiGenerator: () => void;
  onOpenSleepTimer: () => void;
  onShareMix: () => void;
  onOpenGeminiSettings?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  videoCount,
  isPlaying,
  activeTimer,
  onTogglePlay,
  onGlobalStop,
  onSetView,
  onOpenSearch,
  onOpenGallery,
  onOpenAiGenerator,
  onOpenSleepTimer,
  onShareMix,
  onOpenGeminiSettings,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShareClick = () => {
    onShareMix();
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="flex items-center justify-between gap-4 md:gap-8 px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-rose-400 transition-colors"
        >
          Soundscape AI
        </a>

        {/* Global Master Play / Stop Controller (Always Pinned & Accessible) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
            }`}
            title={isPlaying ? 'Pausar toda la suite' : 'Reproducir toda la suite'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play General</span>
              </>
            )}
          </button>

          <button
            onClick={onGlobalStop}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-slate-800 hover:bg-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Detener toda la suite y reiniciar a 0:00"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        </div>
      </div>

      {/* Zone 2: Concise navigation links */}
      <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-300">
        <button
          onClick={() => onSetView('mixer')}
          className={`hover:text-cyan-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentView === 'mixer' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Consola Mezcladora
        </button>
        <button
          onClick={() => onSetView('multi_video')}
          className={`hover:text-rose-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
            currentView === 'multi_video' ? 'text-rose-400 font-semibold' : ''
          }`}
        >
          <span>Multi-Video</span>
          {videoCount > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/60">
              {videoCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onSetView('zen')}
          className={`hover:text-indigo-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1 ${
            currentView === 'zen' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Modo Zen</span>
        </button>
        <button
          onClick={onOpenSearch}
          className="hover:text-cyan-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Explorador & YouTube
        </button>
        <button
          onClick={onOpenGallery}
          className="hover:text-cyan-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Galería & Nube
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Sleep / Pomodoro Timer Indicator */}
        <button
          onClick={onOpenSleepTimer}
          className={`px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 ${
            activeTimer?.isActive
              ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow-indigo-500/20 shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Configurar temporizador de sueño o pomodoro"
        >
          {activeTimer?.isActive ? (
            activeTimer.mode === 'sleep' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="font-mono text-[11px]">{formatRemaining(activeTimer.remainingSeconds)}</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="font-mono text-[11px]">{formatRemaining(activeTimer.remainingSeconds)}</span>
              </>
            )
          ) : (
            <>
              <Timer className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Timer</span>
            </>
          )}
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareClick}
          title="Compartir enlace directo con esta mezcla exacta"
          className="px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          {copiedShare ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">¡Copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Compartir</span>
            </>
          )}
        </button>

        {onOpenGeminiSettings && (
          <button
            onClick={onOpenGeminiSettings}
            title="Configurar y verificar API Key de Gemini 3.8 Flash"
            className="px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-violet-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Key className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden xl:inline">Gemini 3.8 Flash</span>
          </button>
        )}

        <button
          onClick={onOpenAiGenerator}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Componer con IA</span>
        </button>
      </div>
    </header>
  );
};
