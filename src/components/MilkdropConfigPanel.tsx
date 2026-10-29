import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  Palette,
  Code,
  RotateCcw,
  Sparkles,
  Flame,
  Zap,
  Check,
  X,
  Copy,
  Waves,
  Eye,
  SunMedium,
  Gauge,
  Activity,
  Layers,
} from 'lucide-react';
import {
  MilkdropConfig,
  DEFAULT_MILKDROP_CONFIG,
  MILKDROP_PROFILES,
  MilkdropProfile,
} from '../types/milkdropConfig';

interface MilkdropConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: MilkdropConfig;
  onChangeConfig: (newConfig: MilkdropConfig) => void;
  currentPresetName: string;
  presetData?: any;
}

type TabType = 'physics' | 'audio' | 'colors' | 'presets' | 'code';

export const MilkdropConfigPanel: React.FC<MilkdropConfigPanelProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  currentPresetName,
  presetData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('physics');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleUpdate = <K extends keyof MilkdropConfig>(key: K, value: MilkdropConfig[K]) => {
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  const handleApplyProfile = (profile: MilkdropProfile) => {
    onChangeConfig({
      ...config,
      ...profile.config,
    });
  };

  const handleResetToDefaults = () => {
    onChangeConfig({ ...DEFAULT_MILKDROP_CONFIG });
  };

  const handleCopyCode = () => {
    if (!presetData) return;
    try {
      const codeString = JSON.stringify(
        {
          name: currentPresetName,
          baseVals: presetData.baseVals || {},
          frame_eqs_str: presetData.frame_eqs_str || '',
          pixel_eqs_str: presetData.pixel_eqs_str || '',
          shapes_count: presetData.shapes?.length || 0,
          waves_count: presetData.waves?.length || 0,
        },
        null,
        2
      );
      navigator.clipboard.writeText(codeString);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.warn('Error copiando código:', e);
    }
  };

  const handleCopyConfigJSON = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    } catch (e) {
      console.warn('Error copiando config:', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl p-3 sm:p-6 flex flex-col justify-center items-center animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-4 sm:p-6 flex flex-col shadow-2xl shadow-cyan-950/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
                  Calibrador & Físicas MilkDrop 2
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono">
                  WebGL GPU
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                Preset activo:{' '}
                <span className="text-cyan-300 font-semibold">
                  {currentPresetName.replace(/_/g, ' ') || 'Preset en curso'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefaults}
              title="Restablecer todos los parámetros a valores originales de fábrica"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Calibration Macro Profiles Pills */}
        <div className="py-2.5 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> Macros:
          </span>
          {MILKDROP_PROFILES.map((prof) => (
            <button
              key={prof.id}
              onClick={() => handleApplyProfile(prof)}
              title={prof.description}
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap bg-slate-800/80 hover:bg-cyan-950/70 hover:border-cyan-500/50 hover:text-cyan-200 border border-slate-700/80 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>{prof.name}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-cyan-900/40 text-[9px] text-cyan-300 font-mono">
                {prof.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 pt-3 pb-2 border-b border-slate-800/60 overflow-x-auto custom-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('physics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'physics'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            Físicas & Velocidad
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'audio'
                ? 'bg-orange-500/25 border-orange-500 text-orange-300 shadow-md shadow-orange-500/15'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-orange-300 hover:bg-slate-800'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-orange-400" />
            Reacción al Sonido
          </button>

          <button
            onClick={() => setActiveTab('colors')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'colors'
                ? 'bg-fuchsia-500/25 border-fuchsia-500 text-fuchsia-300 shadow-md shadow-fuchsia-500/15'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-fuchsia-300 hover:bg-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-fuchsia-400" />
            Color & Shaders
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'code'
                ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/15'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            Código MilkDrop & Inspector
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto pr-1 py-3 custom-scrollbar space-y-4">
          {/* TAB 1: FÍSICAS Y VELOCIDAD */}
          {activeTab === 'physics' && (
            <div className="space-y-4 animate-fade-in text-xs">
              {/* Velocidad de la animación */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-bold text-slate-200">
                        Velocidad de Animación del Preset
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Dila o acelera el tiempo interno y las ecuaciones matemáticas del shader
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs">
                    {config.animationSpeed.toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-500">0.2x (Cámara lenta)</span>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={config.animationSpeed}
                    onChange={(e) => handleUpdate('animationSpeed', parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-500">3.0x (Hiper)</span>
                </div>
              </div>

              {/* Físicas: Zoom & Rotación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Zoom */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Factor de Zoom
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-cyan-300 font-bold">
                      {config.zoomMultiplier.toFixed(2)}x
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    {config.zoomMultiplier > 1 ? 'Viaje hacia adelante (Zoom In)' : config.zoomMultiplier < 1 ? 'Alejamiento (Zoom Out)' : 'Neutro (1.00x)'}
                  </p>
                  <input
                    type="range"
                    min="0.75"
                    max="1.35"
                    step="0.01"
                    value={config.zoomMultiplier}
                    onChange={(e) => handleUpdate('zoomMultiplier', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Rotación */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                      Giro Continuo (Rotación)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-indigo-300 font-bold">
                      {config.rotationSpeed > 0 ? `+${config.rotationSpeed.toFixed(3)}` : config.rotationSpeed.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    {config.rotationSpeed > 0 ? 'Rotación horaria' : config.rotationSpeed < 0 ? 'Rotación antihoraria' : 'Giro de fábrica'}
                  </p>
                  <input
                    type="range"
                    min="-0.035"
                    max="0.035"
                    step="0.002"
                    value={config.rotationSpeed}
                    onChange={(e) => handleUpdate('rotationSpeed', parseFloat(e.target.value))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Deformación Warp & Escala de Ondas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Warp */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Deformación Líquida (Warp)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-amber-300 font-bold">
                      {config.warpMultiplier.toFixed(2)}x
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Intensidad del mapa de desplazamiento y vórtice
                  </p>
                  <input
                    type="range"
                    min="0.0"
                    max="3.0"
                    step="0.05"
                    value={config.warpMultiplier}
                    onChange={(e) => handleUpdate('warpMultiplier', parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Escala de ondas */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-cyan-400" />
                      Amplitud de Ondas Sonoras
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-cyan-300 font-bold">
                      {config.waveScale.toFixed(2)}x
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Tamaño y visibilidad del trazado del osciloscopio
                  </p>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={config.waveScale}
                    onChange={(e) => handleUpdate('waveScale', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Decay & Persistencia (Estelas) */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-fuchsia-400" />
                    <div>
                      <span className="font-bold text-slate-200">
                        Persistencia de Estelas (Decay)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        0.999 = Estelas infinitas y feedback hipnótico · 0.88 = Nitidez instantánea
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdate('useCustomDecay', !config.useCustomDecay)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                        config.useCustomDecay
                          ? 'bg-fuchsia-950 border-fuchsia-500 text-fuchsia-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {config.useCustomDecay ? 'Forzado Activo' : 'Auto del Preset'}
                    </button>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-fuchsia-300 font-bold">
                      {config.decay.toFixed(3)}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="0.999"
                  step="0.005"
                  value={config.decay}
                  disabled={!config.useCustomDecay}
                  onChange={(e) => handleUpdate('decay', parseFloat(e.target.value))}
                  className={`w-full accent-fuchsia-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer ${
                    !config.useCustomDecay ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Modo de Onda Forzado */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-cyan-400" />
                    Geometría del Dibujo de Ondas (Wave Mode)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {config.waveModeOverride === -1
                      ? 'Nativo del Preset'
                      : `Modo ${config.waveModeOverride}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { val: -1, label: 'Auto (Original)' },
                    { val: 0, label: '0: Circular' },
                    { val: 1, label: '1: Línea Única' },
                    { val: 2, label: '2: Doble Línea' },
                    { val: 3, label: '3: Puntos Radiales' },
                    { val: 4, label: '4: Espectro Frecuencia' },
                    { val: 5, label: '5: Reflejo Dual' },
                    { val: 6, label: '6: Órbita Doble' },
                  ].map((mode) => (
                    <button
                      key={mode.val}
                      onClick={() => handleUpdate('waveModeOverride', mode.val)}
                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer font-medium ${
                        config.waveModeOverride === mode.val
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REACCIÓN AL SONIDO */}
          {activeTab === 'audio' && (
            <div className="space-y-4 animate-fade-in text-xs">
              {/* Sensibilidad / Ganancia General */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-orange-400" />
                    <div>
                      <span className="font-bold text-slate-200">
                        Nivel de Reacción al Sonido (Sound Reaction Gain)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Multiplicador de señal en tiempo real alimentado a los algoritmos de MilkDrop
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-orange-950 border border-orange-500/40 text-orange-300 font-mono font-bold text-xs">
                    {config.audioGain.toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-500">0.2x (Suave)</span>
                  <input
                    type="range"
                    min="0.2"
                    max="4.0"
                    step="0.1"
                    value={config.audioGain}
                    onChange={(e) => handleUpdate('audioGain', parseFloat(e.target.value))}
                    className="flex-1 accent-orange-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-500">4.0x (Máxima explosión)</span>
                </div>
              </div>

              {/* EQ: Bombos & Graves */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <div>
                      <span className="font-bold text-slate-200">
                        Reactividad de Graves & Bombos (Bass Sensitivity)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Filtro Low-Shelf a 120Hz que dispara zooms, estallidos y sacudidas con los bajos
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 font-mono text-rose-400 font-bold">
                    {config.bassBoost > 0 ? `+${config.bassBoost} dB` : `${config.bassBoost} dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="18"
                  step="1"
                  value={config.bassBoost}
                  onChange={(e) => handleUpdate('bassBoost', parseInt(e.target.value, 10))}
                  className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* EQ: Agudos & Transitorios */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-bold text-slate-200">
                        Respuesta a Agudos & Frecuencias Altas (Treble Response)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Filtro High-Shelf a 4000Hz para captar lluvia, platillos, siseos y transitorios cristalinos
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 font-mono text-cyan-300 font-bold">
                    {config.trebleBoost > 0 ? `+${config.trebleBoost} dB` : `${config.trebleBoost} dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="15"
                  step="1"
                  value={config.trebleBoost}
                  onChange={(e) => handleUpdate('trebleBoost', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Sensibilidad al Ritmo (Beat Drive) */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-slate-200">
                        Multiplicador de Impacto de Beats
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Magnifica los cambios drásticos provocados por transitorios rítmicos fuertes
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 font-mono text-amber-300 font-bold">
                    {config.beatSensitivity.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={config.beatSensitivity}
                  onChange={(e) => handleUpdate('beatSensitivity', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: COLOR & SHADERS */}
          {activeTab === 'colors' && (
            <div className="space-y-4 animate-fade-in text-xs">
              {/* Rotación Cromática (Hue) */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-fuchsia-400" />
                    <div>
                      <span className="font-bold text-slate-200">
                        Tono de Color (Hue Rotation)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Rota el círculo cromático 360° para cambiar toda la paleta de colores
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-fuchsia-950 border border-fuchsia-500/40 text-fuchsia-300 font-mono font-bold text-xs">
                    {config.hueRotate}°
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={config.hueRotate}
                    onChange={(e) => handleUpdate('hueRotate', parseInt(e.target.value, 10))}
                    className="w-full h-2 rounded-lg cursor-pointer appearance-none bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-red-500"
                  />
                </div>
              </div>

              {/* Ciclaje Dinámico Automático (Prisma) */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-bold text-slate-200">
                        Ciclaje Cromático Dinámico en Vivo (Prisma)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Gira automáticamente los colores en tiempo real sin fin
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 font-mono text-cyan-300 font-bold">
                    {config.colorCycleSpeed === 0 ? 'Apagado' : `${config.colorCycleSpeed}x`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={config.colorCycleSpeed}
                  onChange={(e) => handleUpdate('colorCycleSpeed', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Saturación & Contraste */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Saturación */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                      Saturación
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-amber-300 font-bold">
                      {config.saturation}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    {config.saturation === 0 ? 'Blanco y negro puro' : config.saturation > 130 ? 'Colores ultra vívidos' : 'Saturación estándar'}
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="250"
                    step="5"
                    value={config.saturation}
                    onChange={(e) => handleUpdate('saturation', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Contraste */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      Contraste
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-indigo-300 font-bold">
                      {config.contrast}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Profundidad de sombras y brillos WebGL
                  </p>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={config.contrast}
                    onChange={(e) => handleUpdate('contrast', parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Brillo & Modo Inversión Negativo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Brillo */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <SunMedium className="w-3.5 h-3.5 text-yellow-400" />
                      Brillo
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 font-mono text-yellow-300 font-bold">
                      {config.brightness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={config.brightness}
                    onChange={(e) => handleUpdate('brightness', parseInt(e.target.value, 10))}
                    className="w-full accent-yellow-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Invertir Colores */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-fuchsia-400" />
                      Inversión Neón Negativo
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Invertir canales RGB (estilo rayos X cósmico)
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdate('invert', !config.invert)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      config.invert
                        ? 'bg-fuchsia-950 border-fuchsia-500 text-fuchsia-300 shadow-md shadow-fuchsia-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {config.invert ? 'ACTIVADO' : 'DESACTIVADO'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CÓDIGO MILKDROP & INSPECTOR */}
          {activeTab === 'code' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
                <div>
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-emerald-400" />
                    Inspector de Ecuaciones y Parámetros
                  </span>
                  <p className="text-[10px] text-slate-400">
                    MilkDrop compila código procedural C/HLSL en WebGL ejecutado por tu GPU
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyConfigJSON}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedConfig ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>{copiedConfig ? '¡Copiado!' : 'Copiar Config JSON'}</span>
                  </button>

                  <button
                    onClick={handleCopyCode}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{copiedCode ? '¡Copiado!' : 'Copiar Código Preset'}</span>
                  </button>
                </div>
              </div>

              {/* BaseVals Raw Display */}
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3.5 font-mono text-[11px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 text-slate-400">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    baseVals en memoria (GPU Shader Constants)
                  </span>
                  <span className="text-[10px] text-cyan-400">
                    {Object.keys(presetData?.baseVals || {}).length} variables
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 text-slate-300">
                  {presetData?.baseVals ? (
                    Object.entries(presetData.baseVals).map(([k, v]: any) => (
                      <div key={k} className="flex items-center justify-between py-0.5 hover:bg-slate-900 px-1 rounded">
                        <span className="text-cyan-300">{k}:</span>
                        <span className="text-amber-300">{typeof v === 'number' ? v.toFixed(4) : String(v)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">Cargando baseVals del preset...</span>
                  )}
                </div>
              </div>

              {/* Frame Equations Display */}
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3.5 font-mono text-[11px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 text-slate-400">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    frame_eqs_str (Ecuaciones de Frame / Beat)
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto custom-scrollbar text-emerald-300 whitespace-pre-wrap">
                  {presetData?.frame_eqs_str?.trim() || '// Sin ecuaciones personalizadas de frame (utiliza físicas base).'}
                </div>
              </div>

              {/* Pixel Equations Display */}
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3.5 font-mono text-[11px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 text-slate-400">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    pixel_eqs_str (Ecuaciones de Píxel y Malla)
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto custom-scrollbar text-fuchsia-300 whitespace-pre-wrap">
                  {presetData?.pixel_eqs_str?.trim() || '// Sin ecuaciones de píxel en este preset.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
          <span>Tus ajustes se aplican en vivo a 60 FPS acelerados por WebGL.</span>
          <span className="text-cyan-400">Presiona C en el teclado para abrir/cerrar</span>
        </div>
      </div>
    </div>
  );
};
