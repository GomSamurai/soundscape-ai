import React, { useState, useMemo } from 'react';
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
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  MilkdropConfig,
  DEFAULT_MILKDROP_CONFIG,
  MILKDROP_PROFILES,
  MilkdropProfile,
} from '../types/milkdropConfig';
import { milkdropPresetService } from '../services/milkdropPresetService';

interface MilkdropConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: MilkdropConfig;
  onChangeConfig: (newConfig: MilkdropConfig) => void;
  currentPresetName: string;
  presetData?: any;
}

type TabType = 'physics' | 'audio' | 'colors' | 'code';

// Helper to determine human descriptions, categories, and slider ranges for known Milkdrop variables
function getParamMetadata(key: string, origVal: number): {
  category: string;
  desc?: string;
  min: number;
  max: number;
  step: number;
} {
  const k = key.toLowerCase();

  // Borders
  if (k === 'ib_size' || k === 'ob_size') {
    return { category: 'Borde', desc: 'Grosor de borde', min: 0, max: 0.5, step: 0.005 };
  }
  if (k.startsWith('ib_') || k.startsWith('ob_')) {
    const channel = k.endsWith('_r') ? 'Rojo' : k.endsWith('_g') ? 'Verde' : k.endsWith('_b') ? 'Azul' : 'Alfa';
    return { category: 'Borde', desc: `Color ${channel} borde`, min: 0, max: 1, step: 0.01 };
  }

  // Motion vectors
  if (k === 'mv_x' || k === 'mv_y') {
    return { category: 'Vectores', desc: 'Densidad malla MV', min: 1, max: 64, step: 0.5 };
  }
  if (k === 'mv_dx' || k === 'mv_dy') {
    return { category: 'Vectores', desc: 'Desplazamiento MV', min: -1, max: 1, step: 0.01 };
  }
  if (k === 'mv_l') {
    return { category: 'Vectores', desc: 'Longitud trazo MV', min: 0, max: 5, step: 0.05 };
  }
  if (k.startsWith('mv_')) {
    return { category: 'Vectores', desc: 'Color/Parámetro MV', min: 0, max: 1, step: 0.01 };
  }

  // Zoom & Rotation & Warp
  if (k === 'zoom') {
    return { category: 'Geometría', desc: 'Factor de zoom', min: 0.5, max: 2.5, step: 0.005 };
  }
  if (k === 'zoomexp') {
    return { category: 'Geometría', desc: 'Exponente curva zoom', min: 0.1, max: 5.0, step: 0.05 };
  }
  if (k === 'rot') {
    return { category: 'Geometría', desc: 'Ángulo rotación (rad)', min: -3.1416, max: 3.1416, step: 0.005 };
  }
  if (k === 'warp') {
    return { category: 'Warp', desc: 'Intensidad warp', min: 0, max: 5.0, step: 0.02 };
  }
  if (k === 'warpscale') {
    return { category: 'Warp', desc: 'Escala textura warp', min: 0.1, max: 10.0, step: 0.1 };
  }
  if (k === 'warpanimspeed') {
    return { category: 'Warp', desc: 'Velocidad animación warp', min: 0, max: 5.0, step: 0.05 };
  }
  if (k === 'decay') {
    return { category: 'Persistencia', desc: 'Persistencia estelas', min: 0.8, max: 1.0, step: 0.002 };
  }
  if (k === 'cx' || k === 'cy') {
    return { category: 'Centro', desc: 'Coordenada centro', min: -0.5, max: 1.5, step: 0.01 };
  }
  if (k === 'dx' || k === 'dy') {
    return { category: 'Desplazamiento', desc: 'Desplazamiento X/Y', min: -0.5, max: 0.5, step: 0.005 };
  }
  if (k === 'sx' || k === 'sy') {
    return { category: 'Escala', desc: 'Estiramiento eje', min: 0.2, max: 3.0, step: 0.01 };
  }

  // Wave
  if (k === 'wave_mode') {
    return { category: 'Onda', desc: 'Modo de osciloscopio (0-7)', min: 0, max: 7, step: 1 };
  }
  if (k === 'wave_scale') {
    return { category: 'Onda', desc: 'Escala amplitud onda', min: 0.1, max: 5.0, step: 0.05 };
  }
  if (k === 'wave_x' || k === 'wave_y') {
    return { category: 'Onda', desc: 'Posición trazado onda', min: 0, max: 1, step: 0.01 };
  }
  if (k.startsWith('wave_')) {
    return { category: 'Onda', desc: 'Atributo de onda', min: 0, max: 1, step: 0.01 };
  }

  // Flags booleans
  if (['darken_center', 'additivewave', 'wave_dots', 'wave_thick', 'wrap', 'brighten', 'solarize', 'invert'].includes(k)) {
    return { category: 'Efectos', desc: 'Interruptor ON/OFF', min: 0, max: 1, step: 1 };
  }

  // Smart heuristic based on original value
  if (typeof origVal === 'number') {
    if (origVal >= 0 && origVal <= 1) {
      return { category: 'Variable', min: 0, max: 1, step: 0.01 };
    }
    if (origVal > 1 && origVal <= 10) {
      return { category: 'Variable', min: 0, max: Math.max(10, Math.ceil(origVal * 2)), step: 0.05 };
    }
    if (origVal > 10) {
      return { category: 'Variable', min: 0, max: Math.max(100, Math.ceil(origVal * 2)), step: 0.5 };
    }
    if (origVal < 0) {
      return { category: 'Variable', min: Math.floor(origVal * 2), max: Math.max(1, Math.abs(origVal) * 2), step: 0.01 };
    }
  }

  return { category: 'Variable', min: -2, max: 2, step: 0.01 };
}

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
  const [isSemiTransparent, setIsSemiTransparent] = useState<boolean>(false);
  const [showMiniMonitor, setShowMiniMonitor] = useState<boolean>(true);
  const [paramFilter, setParamFilter] = useState<string>('');
  const [showEquations, setShowEquations] = useState<boolean>(false);

  // Retrieve effective preset data with fallback to service
  const effectivePresetData = useMemo(() => {
    if (presetData && typeof presetData === 'object' && Object.keys(presetData).length > 0) {
      return presetData;
    }
    return milkdropPresetService.getPreset(currentPresetName) || {};
  }, [presetData, currentPresetName]);

  const baseVals: Record<string, number> = useMemo(() => {
    return effectivePresetData?.baseVals || {};
  }, [effectivePresetData]);

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

  // BaseVals Dynamic Handlers
  const handleBaseValChange = (key: string, value: number) => {
    onChangeConfig({
      ...config,
      dynamicBaseVals: {
        ...(config.dynamicBaseVals || {}),
        [key]: value,
      },
    });
  };

  const handleResetBaseVal = (key: string) => {
    if (!config.dynamicBaseVals || !(key in config.dynamicBaseVals)) return;
    const nextDynamic = { ...config.dynamicBaseVals };
    delete nextDynamic[key];
    onChangeConfig({
      ...config,
      dynamicBaseVals: nextDynamic,
    });
  };

  const handleResetAllBaseVals = () => {
    onChangeConfig({
      ...config,
      dynamicBaseVals: {},
    });
  };

  const handleCopyCode = () => {
    try {
      const codeString = JSON.stringify(
        {
          name: currentPresetName,
          baseVals: baseVals,
          frame_eqs_str: effectivePresetData.frame_eqs_str || '',
          pixel_eqs_str: effectivePresetData.pixel_eqs_str || '',
          shapes_count: effectivePresetData.shapes?.length || 0,
          waves_count: effectivePresetData.waves?.length || 0,
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

  // BaseVals Filtering
  const detectedKeys = Object.keys(baseVals);
  const modifiedKeysCount = Object.keys(config.dynamicBaseVals || {}).length;

  const filteredParamEntries = detectedKeys.filter((k) => {
    if (!paramFilter.trim()) return true;
    const q = paramFilter.toLowerCase().trim();
    return k.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none animate-fade-in flex justify-end">
      {/* Clickable transparent overlay to close when clicking outside */}
      <div
        className="fixed inset-0 bg-black/15 pointer-events-auto transition-opacity"
        onClick={onClose}
        title="Clic fuera para cerrar panel (el visualizador permanece visible a la izquierda)"
      />

      {/* Floating Side-Drawer */}
      <div
        className={`relative z-10 w-full sm:w-[560px] md:w-[620px] lg:w-[680px] max-w-[100vw] h-full pointer-events-auto flex flex-col border-l border-cyan-500/40 shadow-2xl transition-all duration-200 p-4 sm:p-5 overflow-x-hidden ${
          isSemiTransparent
            ? 'bg-slate-950/70 backdrop-blur-sm opacity-90'
            : 'bg-slate-950/95 backdrop-blur-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1">
                  Calibrador MilkDrop 2
                </h2>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[9px] font-mono">
                  Live GPU
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[240px] sm:max-w-xs">
                Preset:{' '}
                <span className="text-cyan-300 font-semibold">
                  {currentPresetName.replace(/_/g, ' ') || 'Preset en curso'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowMiniMonitor(!showMiniMonitor)}
              title={showMiniMonitor ? 'Ocultar mini-monitor integrado' : 'Mostrar mini-monitor integrado en este panel'}
              className={`p-1.5 rounded-xl border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                showMiniMonitor
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsSemiTransparent(!isSemiTransparent)}
              title={
                isSemiTransparent
                  ? 'Modo sólido normal'
                  : 'Modo cristal translúcido (para ver el lienzo detrás a través del panel)'
              }
              className={`p-1.5 rounded-xl border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                isSemiTransparent
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetToDefaults}
              title="Restablecer todos los parámetros a valores originales de fábrica"
              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Mini Visualizer Monitor inside the Panel */}
        {showMiniMonitor && (
          <div className="relative my-2.5 rounded-xl overflow-hidden border border-cyan-500/40 bg-black aspect-video max-h-36 shrink-0 shadow-lg group">
            <canvas
              id="milkdrop-preview-canvas"
              width={320}
              height={180}
              className="w-full h-full block object-cover"
            />
            <div className="absolute top-1.5 left-2 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] text-cyan-300 font-mono border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>GPU Feed en Vivo 60 FPS</span>
            </div>
            <div className="absolute bottom-1.5 right-2 text-[9px] text-slate-300 bg-black/60 px-1.5 py-0.5 rounded font-mono">
              {config.animationSpeed.toFixed(2)}x • {config.audioGain.toFixed(1)}x Gain
            </div>
            <button
              onClick={() => setShowMiniMonitor(false)}
              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-slate-400 hover:text-white transition-opacity"
              title="Ocultar mini-monitor"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Quick Calibration Macro Profiles Pills (Clean wrap layout, NO horizontal scroll) */}
        <div className="py-2 border-b border-slate-800/80 flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> Macros:
          </span>
          {MILKDROP_PROFILES.map((prof) => (
            <button
              key={prof.id}
              onClick={() => handleApplyProfile(prof)}
              title={prof.description}
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-800/80 hover:bg-cyan-950/70 hover:border-cyan-500/50 hover:text-cyan-200 border border-slate-700/80 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>{prof.name}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-cyan-900/40 text-[9px] text-cyan-300 font-mono">
                {prof.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Navigation Tabs (4-Column Responsive Grid, ZERO Horizontal Scroll) */}
        <div className="grid grid-cols-4 gap-1.5 p-1 my-2 bg-slate-900/90 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('physics')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 border text-center ${
              activeTab === 'physics'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Físicas</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 border text-center ${
              activeTab === 'audio'
                ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-md shadow-orange-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-orange-300 hover:bg-slate-800/60'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">Audio</span>
          </button>

          <button
            onClick={() => setActiveTab('colors')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 border text-center ${
              activeTab === 'colors'
                ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 shadow-md shadow-fuchsia-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-fuchsia-300 hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
            <span className="truncate">Colores</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 border text-center ${
              activeTab === 'code'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10 font-bold'
                : 'border-transparent text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Variables</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 py-1 custom-scrollbar space-y-3.5">
          {/* TAB 1: FÍSICAS Y VELOCIDAD */}
          {activeTab === 'physics' && (
            <div className="space-y-3 animate-fade-in text-xs">
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
                        Dila o acelera el tiempo interno y las ecuaciones del shader
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {config.animationSpeed !== 1.0 && (
                      <button
                        onClick={() => handleUpdate('animationSpeed', 1.0)}
                        title="Restablecer a velocidad normal (1.00x)"
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 text-cyan-400" />
                      </button>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs">
                      {config.animationSpeed.toFixed(2)}x
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-500">0.2x</span>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={config.animationSpeed}
                    onChange={(e) => handleUpdate('animationSpeed', parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-500">3.0x</span>
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
                    <div className="flex items-center gap-1">
                      {config.zoomMultiplier !== 1.0 && (
                        <button
                          onClick={() => handleUpdate('zoomMultiplier', 1.0)}
                          title="Restablecer a 1.00x"
                          className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5 text-cyan-400" />
                        </button>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-800 font-mono text-cyan-300 font-bold text-[11px]">
                        {config.zoomMultiplier.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    {config.zoomMultiplier > 1 ? 'Viaje hacia adelante (Zoom In)' : config.zoomMultiplier < 1 ? 'Alejamiento (Zoom Out)' : 'Neutro (1.00x)'}
                  </p>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.01"
                    value={config.zoomMultiplier}
                    onChange={(e) => handleUpdate('zoomMultiplier', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Rotación Continua */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                      Giro Continuo en Pantalla
                    </span>
                    <div className="flex items-center gap-1">
                      {config.rotationSpeed !== 0.0 && (
                        <button
                          onClick={() => handleUpdate('rotationSpeed', 0.0)}
                          title="Detener rotación continua (0.000)"
                          className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5 text-indigo-400" />
                        </button>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-800 font-mono text-indigo-300 font-bold text-[11px]">
                        {config.rotationSpeed > 0 ? `+${config.rotationSpeed.toFixed(3)}` : config.rotationSpeed.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    {config.rotationSpeed > 0 ? 'Rotación horaria continua' : config.rotationSpeed < 0 ? 'Rotación antihoraria continua' : 'Giro neutral del preset'}
                  </p>
                  <input
                    type="range"
                    min="-0.04"
                    max="0.04"
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
                    <div className="flex items-center gap-1">
                      {config.warpMultiplier !== 1.0 && (
                        <button
                          onClick={() => handleUpdate('warpMultiplier', 1.0)}
                          title="Restablecer a 1.00x"
                          className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                        </button>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-800 font-mono text-amber-300 font-bold text-[11px]">
                        {config.warpMultiplier.toFixed(2)}x
                      </span>
                    </div>
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
                    <div className="flex items-center gap-1">
                      {config.waveScale !== 1.0 && (
                        <button
                          onClick={() => handleUpdate('waveScale', 1.0)}
                          title="Restablecer a 1.00x"
                          className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5 text-cyan-400" />
                        </button>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-800 font-mono text-cyan-300 font-bold text-[11px]">
                        {config.waveScale.toFixed(2)}x
                      </span>
                    </div>
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
                        0.999 = Estelas infinitas e hipnóticas · 0.88 = Nitidez instantánea
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdate('useCustomDecay', !config.useCustomDecay)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                        config.useCustomDecay
                          ? 'bg-fuchsia-950 border-fuchsia-500 text-fuchsia-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
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
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChangeConfig({
                      ...config,
                      decay: val,
                      useCustomDecay: true,
                    });
                  }}
                  className="w-full accent-fuchsia-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
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
            <div className="space-y-3.5 animate-fade-in text-xs">
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
                  <span className="text-[10px] font-mono text-slate-500">4.0x (Hiper)</span>
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
                        Filtro Low-Shelf a 120Hz que dispara zooms y sacudidas con los bajos
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
                        Respuesta a Agudos & Frecuencias Altas (Treble)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Filtro High-Shelf a 4000Hz para transitorios cristalinos, lluvia y platillos
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
            <div className="space-y-3.5 animate-fade-in text-xs">
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

              {/* Brillo & Modo Inversión */}
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
                      Invertir canales RGB (rayos X)
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

          {/* TAB 4: VARIABLES & INSPECTOR DINÁMICO DE BASEVALS */}
          {activeTab === 'code' && (
            <div className="space-y-3.5 animate-fade-in text-xs">
              {/* Header with Search Filter & Copy Tools */}
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-100 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-emerald-400" />
                      Inspector Dinámico de Parámetros MilkDrop
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Modifica cualquier variable del preset en tiempo real con sliders y campos numéricos
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyConfigJSON}
                      className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
                      title="Copiar configuración en formato JSON"
                    >
                      {copiedConfig ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                      <span>JSON</span>
                    </button>
                    <button
                      onClick={handleCopyCode}
                      className="px-2 py-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
                      title="Copiar código C/HLSL del preset"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-emerald-400" />}
                      <span>Preset</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Reset Bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filtrar variables (ej: zoom, rot, warp, mv_x, wave...)"
                      value={paramFilter}
                      onChange={(e) => setParamFilter(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    {paramFilter && (
                      <button
                        onClick={() => setParamFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {modifiedKeysCount > 0 && (
                    <button
                      onClick={handleResetAllBaseVals}
                      title="Restablecer todas las variables modificadas a los valores originales del preset"
                      className="px-2.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/50 text-red-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-sm shadow-red-950/50"
                    >
                      <RotateCcw className="w-3 h-3 text-red-400" />
                      <span>Reset ({modifiedKeysCount})</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-0.5">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Filter className="w-3 h-3" />
                    {filteredParamEntries.length} de {detectedKeys.length} variables detectadas
                  </span>
                  {modifiedKeysCount > 0 ? (
                    <span className="text-amber-400 font-bold">
                      {modifiedKeysCount} modificadas en vivo
                    </span>
                  ) : (
                    <span className="text-slate-500">Valores de fábrica del preset</span>
                  )}
                </div>
              </div>

              {/* Dynamic BaseVals Parameter Cards List */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-0.5">
                {detectedKeys.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                    Cargando variables del preset activo...
                  </div>
                ) : filteredParamEntries.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                    No se encontraron variables con "{paramFilter}".
                  </div>
                ) : (
                  filteredParamEntries.map((k) => {
                    const origVal = baseVals[k] ?? 0;
                    const isModified = config.dynamicBaseVals && k in config.dynamicBaseVals;
                    const currVal = isModified ? (config.dynamicBaseVals[k] as number) : origVal;
                    const meta = getParamMetadata(k, origVal);

                    return (
                      <div
                        key={k}
                        className={`p-3 rounded-2xl border transition-all ${
                          isModified
                            ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                            : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-cyan-300 text-xs truncate">
                              {k}
                            </span>
                            {meta.desc && (
                              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                · {meta.desc}
                              </span>
                            )}
                            {isModified && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-400 text-cyan-300 text-[9px] font-mono font-bold shrink-0">
                                MODIFICADO
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isModified && (
                              <button
                                onClick={() => handleResetBaseVal(k)}
                                title="Restablecer al valor original del preset"
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3 text-cyan-400" />
                              </button>
                            )}
                            <input
                              type="number"
                              step={meta.step}
                              value={Number(currVal.toFixed(4))}
                              onChange={(e) => {
                                const num = parseFloat(e.target.value);
                                if (!isNaN(num)) handleBaseValChange(k, num);
                              }}
                              className="w-20 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-amber-300 text-right text-xs focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>

                        {/* Interactive Range Slider */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-500 w-9 text-right shrink-0">
                            {meta.min}
                          </span>
                          <input
                            type="range"
                            min={meta.min}
                            max={meta.max}
                            step={meta.step}
                            value={currVal}
                            onChange={(e) => handleBaseValChange(k, parseFloat(e.target.value))}
                            className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <span className="text-[9px] font-mono text-slate-500 w-9 shrink-0">
                            {meta.max}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Collapsible Equations Inspector */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                <button
                  onClick={() => setShowEquations(!showEquations)}
                  className="w-full flex items-center justify-between text-left text-slate-300 hover:text-white cursor-pointer font-semibold"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <Code className="w-3.5 h-3.5 text-cyan-400" />
                    Ecuaciones de Frame & Píxel (HLSL C WebGL)
                  </span>
                  {showEquations ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showEquations && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-slate-800/80 animate-fade-in font-mono text-[11px]">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        frame_eqs_str (Ecuaciones de Frame)
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-emerald-300 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                        {effectivePresetData?.frame_eqs_str?.trim() || '// Sin ecuaciones personalizadas de frame.'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        pixel_eqs_str (Ecuaciones de Píxel y Malla)
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-fuchsia-300 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                        {effectivePresetData?.pixel_eqs_str?.trim() || '// Sin ecuaciones de píxel en este preset.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-2.5 border-t border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
          <span className="text-cyan-300 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Lienzo activo 60 FPS visible a la izquierda
          </span>
          <span className="text-slate-400">Atajo: Tecla C</span>
        </div>
      </div>
    </div>
  );
};
