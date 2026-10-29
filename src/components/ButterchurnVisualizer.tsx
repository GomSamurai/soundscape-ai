import React, { useEffect, useRef, useState, useMemo } from 'react';
import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import { audioEngine } from '../services/audioEngine';
import { ChannelTrack } from '../types/soundscape';
import {
  Sparkles,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  List,
  Search,
  X,
  Radio,
  Cpu,
  Clock,
  Activity,
  Check,
} from 'lucide-react';

const getButterchurn = () => {
  const mod: any = butterchurn;
  if (mod && typeof mod.createVisualizer === 'function') return mod;
  if (mod?.default && typeof mod.default.createVisualizer === 'function') return mod.default;
  if (typeof (window as any).butterchurn?.createVisualizer === 'function') return (window as any).butterchurn;
  return mod?.default || mod;
};

const getButterchurnPresets = () => {
  const mod: any = butterchurnPresets;
  if (mod && typeof mod.getPresets === 'function') return mod;
  if (mod?.default && typeof mod.default.getPresets === 'function') return mod.default;
  if (typeof (window as any).butterchurnPresets?.getPresets === 'function') return (window as any).butterchurnPresets;
  return mod?.default || mod;
};

interface ButterchurnVisualizerProps {
  isPlaying: boolean;
  masterVolume?: number;
  tracks?: ChannelTrack[];
  isZenMode?: boolean;
  onExitZen?: () => void;
  showInternalHud?: boolean;
}

export const ButterchurnVisualizer: React.FC<ButterchurnVisualizerProps> = ({
  isPlaying,
  masterVolume = 0.85,
  tracks = [],
  isZenMode = false,
  onExitZen,
  showInternalHud,
}) => {
  const shouldShowHud = showInternalHud !== undefined ? showInternalHud : !isZenMode;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<any>(null);
  const animIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const masterVolumeRef = useRef<number>(masterVolume);

  // Preset State
  const [currentPresetName, setCurrentPresetName] = useState<string>('');
  const [presetsList, setPresetsList] = useState<string[]>([]);
  const [autoCycle, setAutoCycle] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Tab Audio Sync State (Captures authentic YouTube iframe audio)
  const [isTabAudioActive, setIsTabAudioActive] = useState<boolean>(() =>
    audioEngine.isLiveTabAudioActive()
  );
  const [tabAudioError, setTabAudioError] = useState<string | null>(null);

  const presetsMapRef = useRef<Record<string, any>>({});

  // Keep refs updated for animation loop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    masterVolumeRef.current = masterVolume;
  }, [isPlaying, masterVolume]);

  // Sync active tracks acoustics in audioEngine for YouTube channels
  useEffect(() => {
    audioEngine.updateActiveTracksAcoustics(tracks, masterVolume, isPlaying);
  }, [tracks, masterVolume, isPlaying]);

  // Tab Audio Capture Listener
  useEffect(() => {
    const handleTabAudioChange = (e: any) => {
      setIsTabAudioActive(e.detail?.active ?? audioEngine.isLiveTabAudioActive());
    };
    window.addEventListener('tab_audio_capture_changed', handleTabAudioChange);
    return () => {
      window.removeEventListener('tab_audio_capture_changed', handleTabAudioChange);
    };
  }, []);

  // Load Presets Map
  useEffect(() => {
    try {
      const presetsEngine = getButterchurnPresets();
      const allPresets = presetsEngine?.getPresets ? presetsEngine.getPresets() : {};
      presetsMapRef.current = allPresets;
      const names = Object.keys(allPresets);
      setPresetsList(names);

      if (names.length > 0) {
        // Pick an energetic, beautiful default preset
        const preferred = names.find((n) =>
          /flexi|martin|geiss|cosmic|plasma|tunnel|nebula/i.test(n)
        );
        const initial = preferred || names[Math.floor(Math.random() * names.length)];
        setCurrentPresetName(initial);
      }
    } catch (e) {
      console.warn('Error loading Butterchurn presets:', e);
    }
  }, []);

  // Initialize WebGL MilkDrop Visualizer Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audioCtx = audioEngine.getAudioContext();
    const vizNode = audioEngine.getVisualizerNode();

    let viz: any = null;
    try {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(320, Math.floor((rect.width || 800) * dpr));
      const h = Math.max(200, Math.floor((rect.height || 450) * dpr));
      canvas.width = w;
      canvas.height = h;

      const engine = getButterchurn();
      if (!engine || typeof engine.createVisualizer !== 'function') {
        throw new Error('Butterchurn engine not available');
      }

      viz = engine.createVisualizer(audioCtx, canvas, {
        width: w,
        height: h,
        pixelRatio: dpr,
        textureRatio: 1,
      });
      visualizerRef.current = viz;

      if (vizNode) {
        viz.connectAudio(vizNode);
      }

      if (currentPresetName && presetsMapRef.current[currentPresetName]) {
        viz.loadPreset(presetsMapRef.current[currentPresetName], 0.0);
      }
    } catch (err) {
      console.error('Error inicializando WebGL GPU MilkDrop Butterchurn:', err);
      return;
    }

    // High performance GPU Render Loop (always renders procedural shaders, reactive when playing)
    const renderLoop = () => {
      animIdRef.current = requestAnimationFrame(renderLoop);
      if (visualizerRef.current) {
        try {
          visualizerRef.current.render();
        } catch (e) {}
      }
    };

    renderLoop();

    const handleResize = () => {
      if (!canvas || !visualizerRef.current) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width * dpr));
      const h = Math.max(200, Math.floor(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      visualizerRef.current.setRendererSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      if (viz) {
        try {
          if (vizNode) viz.disconnectAudio(vizNode);
        } catch (e) {}
      }
    };
  }, []);

  // Preset Transition Helper
  const selectPreset = (name: string, blend = 2.2) => {
    if (!name || !presetsMapRef.current[name] || !visualizerRef.current) return;
    try {
      visualizerRef.current.loadPreset(presetsMapRef.current[name], blend);
      setCurrentPresetName(name);
      window.dispatchEvent(
        new CustomEvent('butterchurn_preset_changed', {
          detail: { name, autoCycle, totalPresets: presetsList.length },
        })
      );
    } catch (e) {
      console.warn('Error al cargar preset:', e);
    }
  };

  const handleNextPreset = () => {
    if (presetsList.length === 0) return;
    const currIdx = presetsList.indexOf(currentPresetName);
    const nextIdx = (currIdx + 1) % presetsList.length;
    selectPreset(presetsList[nextIdx], 2.0);
  };

  const handlePrevPreset = () => {
    if (presetsList.length === 0) return;
    const currIdx = presetsList.indexOf(currentPresetName);
    const prevIdx = (currIdx - 1 + presetsList.length) % presetsList.length;
    selectPreset(presetsList[prevIdx], 2.0);
  };

  const handleRandomPreset = () => {
    if (presetsList.length === 0) return;
    const rand = presetsList[Math.floor(Math.random() * presetsList.length)];
    selectPreset(rand, 2.5);
  };

  // Sync preset changes with external listeners (e.g. ZenModeView)
  useEffect(() => {
    const handleNext = () => handleNextPreset();
    const handlePrev = () => handlePrevPreset();
    const handleRandom = () => handleRandomPreset();
    const handleSelect = (e: any) => {
      if (e.detail?.name) selectPreset(e.detail.name, e.detail.blend ?? 2.0);
    };
    const handleToggleAuto = () => setAutoCycle((v) => !v);

    window.addEventListener('butterchurn_next_preset', handleNext);
    window.addEventListener('butterchurn_prev_preset', handlePrev);
    window.addEventListener('butterchurn_random_preset', handleRandom);
    window.addEventListener('butterchurn_select_preset', handleSelect);
    window.addEventListener('butterchurn_toggle_autocycle', handleToggleAuto);

    return () => {
      window.removeEventListener('butterchurn_next_preset', handleNext);
      window.removeEventListener('butterchurn_prev_preset', handlePrev);
      window.removeEventListener('butterchurn_random_preset', handleRandom);
      window.removeEventListener('butterchurn_select_preset', handleSelect);
      window.removeEventListener('butterchurn_toggle_autocycle', handleToggleAuto);
    };
  }, [presetsList, currentPresetName, autoCycle]);

  // Notify listeners when currentPresetName is initialized
  useEffect(() => {
    if (currentPresetName) {
      window.dispatchEvent(
        new CustomEvent('butterchurn_preset_changed', {
          detail: { name: currentPresetName, autoCycle, totalPresets: presetsList.length },
        })
      );
    }
  }, [currentPresetName, autoCycle, presetsList.length]);

  // Auto-cycle presets every 20s
  useEffect(() => {
    if (!autoCycle || presetsList.length === 0 || !isPlaying) return;
    const timer = setInterval(() => {
      handleNextPreset();
    }, 20000);
    return () => clearInterval(timer);
  }, [autoCycle, presetsList, isPlaying, currentPresetName]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {}
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Live Tab Audio Toggle
  const handleToggleTabAudio = async () => {
    setTabAudioError(null);
    if (isTabAudioActive) {
      audioEngine.disableLiveTabAudioCapture();
    } else {
      const ok = await audioEngine.enableLiveTabAudioCapture();
      if (!ok) {
        setTabAudioError('No se concedió acceso a la pestaña.');
        setTimeout(() => setTabAudioError(null), 4000);
      }
    }
  };

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  // Filtered presets for search modal
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return presetsList.slice(0, 80);
    const q = searchQuery.toLowerCase();
    return presetsList.filter((p) => p.toLowerCase().includes(q)).slice(0, 100);
  }, [presetsList, searchQuery]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full ${
        isZenMode || isFullscreen ? 'h-full min-h-screen' : 'h-80 sm:h-96 md:h-[420px]'
      } rounded-2xl overflow-hidden bg-black select-none group shadow-2xl border border-slate-800/80`}
    >
      {/* WebGL MilkDrop Canvas Rendered by Nvidia GPU */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" onClick={handleNextPreset} />

      {/* Internal Dashboard HUD (hidden in Zen mode where ZenModeView has its own full HUD) */}
      {shouldShowHud && (
        <>
          {/* Top Floating HUD Bar */}
          <div
            className={`absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 transition-all duration-300 ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            {/* Left: Engine & GPU Badge */}
            <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-cyan-500/30 text-xs text-slate-200 shadow-2xl">
              <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-cyan-300">
                    GPU Nvidia / WebGL
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-cyan-950/80 text-[10px] text-cyan-400 font-mono border border-cyan-500/30">
                    MilkDrop 2
                  </span>
                </div>
                <span
                  className="text-slate-400 font-mono text-[10px] max-w-[200px] sm:max-w-xs truncate"
                  title={currentPresetName}
                >
                  {currentPresetName.replace(/_/g, ' ') || 'Cargando preset...'}
                </span>
              </div>
            </div>

            {/* Center / Right: Live Tab Audio Sync + Preset Toolbar */}
            <div className="flex items-center gap-2">
              {/* Live Tab Audio Capture (YouTube In-Sync) Button */}
              <button
                onClick={handleToggleTabAudio}
                title={
                  isTabAudioActive
                    ? 'Audio de YouTube sincronizado en vivo (1:1). Clic para desactivar.'
                    : 'Sincronizar el audio real de los videos de YouTube de esta pestaña con 1 clic'
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xl transition-all cursor-pointer shadow-lg border ${
                  isTabAudioActive
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-500/20 animate-pulse'
                    : 'bg-slate-950/85 border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-400'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isTabAudioActive ? 'text-emerald-400 animate-spin' : 'text-cyan-400'}`} />
                <span className="text-[11px]">
                  {isTabAudioActive ? 'YouTube en Vivo 1:1' : '⚡ Sincronizar Audio en Vivo'}
                </span>
              </button>

              {/* Preset Controls Group */}
              <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-xl px-2 py-1 rounded-xl border border-slate-800 shadow-2xl">
                <button
                  onClick={handlePrevPreset}
                  title="Preset anterior"
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRandomPreset}
                  title="Preset aleatorio (Shuffle)"
                  className="p-1.5 hover:bg-slate-800/80 text-cyan-400 hover:text-cyan-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextPreset}
                  title="Siguiente preset"
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="w-px h-4 bg-slate-800 mx-0.5" />
                <button
                  onClick={() => setAutoCycle(!autoCycle)}
                  title={autoCycle ? 'Auto-cambio activado (cada 20s)' : 'Auto-cambio desactivado'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    autoCycle ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  title="Explorar presets de MilkDrop"
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Error Notice if tab audio was dismissed */}
          {tabAudioError && (
            <div className="absolute top-16 right-4 z-40 bg-red-950/90 border border-red-500 text-red-200 text-xs px-3 py-1.5 rounded-xl shadow-xl animate-fade-in flex items-center gap-2">
              <span>{tabAudioError}</span>
              <button onClick={() => setTabAudioError(null)} className="text-red-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bottom Minimal HUD info */}
          <div
            className={`absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none transition-all duration-300 ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800/80 text-[10px]">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-1" />
              <span>Haz clic en cualquier parte del visualizador para cambiar de preset</span>
            </div>

            <div className="pointer-events-auto bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 text-[10px] text-slate-400 font-mono">
              <span>Presets: {presetsList.length}</span>
            </div>
          </div>

          {/* Preset Explorer / Search Modal */}
          {isSearchOpen && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 flex flex-col animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">Presets de MilkDrop 2 (GPU)</h3>
                  <span className="text-xs text-slate-400">({presetsList.length} disponibles)</span>
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
                  placeholder="Buscar preset (ej: geiss, flexi, cosmic, wave, tunnel)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredPresets.map((name) => {
                  const isSelected = name === currentPresetName;
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        selectPreset(name, 1.8);
                        setIsSearchOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-500/40'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <span className="font-mono truncate">{name.replace(/_/g, ' ')}</span>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
