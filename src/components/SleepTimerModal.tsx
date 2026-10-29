import React, { useState } from 'react';
import { Timer, Moon, Sparkles, X, Play, Square, Bell, Flame } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

export interface TimerConfig {
  mode: 'sleep' | 'pomodoro';
  durationMinutes: number;
  fadeOutMinutes: number; // For sleep mode
  pomodoroBreakMinutes: number; // For pomodoro mode
  soundAlert: boolean;
}

interface SleepTimerModalProps {
  isOpen: boolean;
  activeTimer: {
    isActive: boolean;
    mode: 'sleep' | 'pomodoro';
    remainingSeconds: number;
    totalSeconds: number;
    isPomodoroBreak?: boolean;
  } | null;
  onClose: () => void;
  onStartTimer: (config: TimerConfig) => void;
  onCancelTimer: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  activeTimer,
  onClose,
  onStartTimer,
  onCancelTimer,
}) => {
  const [activeTab, setActiveTab] = useState<'sleep' | 'pomodoro'>('sleep');
  const [sleepMinutes, setSleepMinutes] = useState<number>(30);
  const [fadeOutMinutes, setFadeOutMinutes] = useState<number>(3);
  const [pomodoroWork, setPomodoroWork] = useState<number>(25);
  const [pomodoroBreak, setPomodoroBreak] = useState<number>(5);
  const [soundAlert, setSoundAlert] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleStartSleep = () => {
    onStartTimer({
      mode: 'sleep',
      durationMinutes: sleepMinutes,
      fadeOutMinutes: Math.min(sleepMinutes, fadeOutMinutes),
      pomodoroBreakMinutes: 5,
      soundAlert: false,
    });
    onClose();
  };

  const handleStartPomodoro = () => {
    onStartTimer({
      mode: 'pomodoro',
      durationMinutes: pomodoroWork,
      fadeOutMinutes: 0,
      pomodoroBreakMinutes: pomodoroBreak,
      soundAlert,
    });
    audioEngine.playGentleChime(528);
    onClose();
  };

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-500/30 text-indigo-400">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Temporizador Inteligente</h2>
              <p className="text-xs text-slate-400">
                Apagado progresivo para dormir o ciclos Pomodoro de máxima concentración
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Timer Banner if Running */}
        {activeTimer?.isActive && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-white">
                  {activeTimer.mode === 'sleep'
                    ? '🌙 Apagado Automático Activo'
                    : activeTimer.isPomodoroBreak
                    ? '☕ Intervalo de Descanso Pomodoro'
                    : '🔥 Bloque de Enfoque Pomodoro'}
                </p>
                <p className="text-[11px] text-indigo-200 font-mono">
                  Tiempo restante: {formatRemaining(activeTimer.remainingSeconds)}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onCancelTimer();
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Cancelar</span>
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-6 pt-5">
          <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('sleep')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'sleep'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Sleep Timer (Apagado Gradual)</span>
            </button>
            <button
              onClick={() => setActiveTab('pomodoro')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'pomodoro'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Pomodoro (Enfoque & Flow)</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {activeTab === 'sleep' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">
                  Duración de la sesión de descanso:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSleepMinutes(mins)}
                      className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        sleepMinutes === mins
                          ? 'bg-indigo-950 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="block text-sm font-bold text-indigo-400">{mins} min</span>
                      <span className="text-[10px] text-slate-500">
                        {mins < 60 ? `${mins} minutos` : `${(mins / 60).toFixed(1)} horas`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fade out selection */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Desvanecimiento Logarítmico (Fade-Out)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Atenúa el volumen de forma casi imperceptible antes de detenerse
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    Últimos {fadeOutMinutes} min
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {[1, 3, 5, 10].map((fMins) => (
                    <button
                      key={fMins}
                      onClick={() => setFadeOutMinutes(fMins)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        fadeOutMinutes === fMins
                          ? 'bg-indigo-900 border-indigo-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fMins} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                <Moon className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>
                  Al expirar el tiempo, la suite se detendrá suavemente y restaurará el volumen nominal para tu próxima sesión.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">
                  Estructura del Ciclo Pomodoro:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setPomodoroWork(25);
                      setPomodoroBreak(5);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      pomodoroWork === 25
                        ? 'bg-rose-950 border-rose-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-rose-400">Estándar 25 / 5</span>
                      <span className="text-[10px] font-mono text-slate-400">Clásico</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      25 min de hiper-enfoque acústico seguido de 5 min de descanso mental.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setPomodoroWork(50);
                      setPomodoroBreak(10);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      pomodoroWork === 50
                        ? 'bg-rose-950 border-rose-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-rose-400">Extendido 50 / 10</span>
                      <span className="text-[10px] font-mono text-slate-400">Deep Work</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      50 min de inmersión profunda continuada para programación o escritura creativa.
                    </p>
                  </button>
                </div>
              </div>

              {/* Sound Alert Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Campana Zen Procedural</span>
                    <span className="text-[11px] text-slate-400">
                      Emite un suave gong armónico tibetano a 528 Hz al completar cada intervalo
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundAlert}
                  onChange={(e) => setSoundAlert(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            onClick={activeTab === 'sleep' ? handleStartSleep : handleStartPomodoro}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer text-white ${
              activeTab === 'sleep'
                ? 'bg-indigo-600 hover:bg-indigo-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {activeTab === 'sleep'
                ? `Iniciar Apagado (${sleepMinutes} min)`
                : `Iniciar Pomodoro (${pomodoroWork} min)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
