import React, { useEffect, useRef, useState, useMemo } from 'react';
import butterchurn from 'butterchurn';
import { audioEngine } from '../services/audioEngine';
import {
  milkdropPresetService,
  PresetCategory,
  PresetMetadata,
} from '../services/milkdropPresetService';
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
  Check,
  Star,
  Flame,
  Filter,
  Layers,
  Zap,
  Sliders,
  Palette,
  Activity,
  RotateCcw,
} from 'lucide-react';
import {
  MilkdropConfig,
  DEFAULT_MILKDROP_CONFIG,
  loadMilkdropConfig,
  saveMilkdropConfig,
} from '../types/milkdropConfig';
import { MilkdropConfigPanel } from './MilkdropConfigPanel';

const getButterchurn = () => {
  const mod: any = butterchurn;
  if (mod && typeof mod.createVisualizer === 'function') return mod;
  if (mod?.default && typeof mod.default.createVisualizer === 'function') return mod.default;
  if (typeof (window as any).butterchurn?.createVisualizer === 'function') return (window as any).butterchurn;
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

  // Preset & Service State
  const [currentPresetName, setCurrentPresetName] = useState<string>('');
  const [autoCycle, setAutoCycle] = useState<boolean>(true);
  const [onlyReactive, setOnlyReactive] = useState<boolean>(() =>
    milkdropPresetService.getOnlyReactiveMode()
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    milkdropPresetService.getFavorites()
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('all');
  const [packFilter, setPackFilter] = useState<string>('all');
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Tab Audio Sync State (Captures authentic YouTube iframe audio)
  const [isTabAudioActive, setIsTabAudioActive] = useState<boolean>(() =>
    audioEngine.isLiveTabAudioActive()
  );
  const [tabAudioError, setTabAudioError] = useState<string | null>(null);

  // MilkDrop Parameter Customization & Live Physics State
  const [config, setConfig] = useState<MilkdropConfig>(() => loadMilkdropConfig());
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [showQuickBar, setShowQuickBar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('soundscape_milkdrop_quickbar');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  const configRef = useRef<MilkdropConfig>(config);
  const dynamicHueRef = useRef<number>(config.hueRotate);

  const toggleQuickBar = (val?: boolean) => {
    setShowQuickBar((prev) => {
      const next = val !== undefined ? val : !prev;
      try {
        localStorage.setItem('soundscape_milkdrop_quickbar', String(next));
      } catch {}
      return next;
    });
  };

  // Sync configRef & audio sensitivity on change
  useEffect(() => {
    configRef.current = config;
    dynamicHueRef.current = config.hueRotate;
    audioEngine.setVisualizerSensitivity(config.audioGain, config.bassBoost, config.trebleBoost);
    if (canvasRef.current && config.colorCycleSpeed === 0) {
      canvasRef.current.style.filter = `hue-rotate(${config.hueRotate}deg) saturate(${config.saturation}%) contrast(${config.contrast}%) brightness(${config.brightness}%) ${config.invert ? 'invert(1)' : ''}`;
    }
  }, [config]);

  // Listen for config sync & open events across components (Zen mode <-> Normal)
  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail?.config) {
        setConfig(e.detail.config);
      }
    };
    const handleOpenCfg = () => setIsConfigOpen(true);
    const handleToggleBar = (e: any) => {
      toggleQuickBar(e.detail?.show);
    };

    window.addEventListener('butterchurn_config_updated', handleConfigChange);
    window.addEventListener('butterchurn_open_config', handleOpenCfg);
    window.addEventListener('butterchurn_toggle_quickbar', handleToggleBar);

    return () => {
      window.removeEventListener('butterchurn_config_updated', handleConfigChange);
      window.removeEventListener('butterchurn_open_config', handleOpenCfg);
      window.removeEventListener('butterchurn_toggle_quickbar', handleToggleBar);
    };
  }, []);

  // Shortcut keys: 'C' toggles configuration panel, 'F' toggles on-canvas quick physics bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSearchOpen) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'c') {
          setIsConfigOpen((v) => !v);
        } else if (e.key.toLowerCase() === 'f') {
          toggleQuickBar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const presetsMapRef = useRef<Record<string, any>>({});
  const allNamesRef = useRef<string[]>([]);

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

  // Listen for favorites changes & reactive mode changes
  useEffect(() => {
    const handleFavs = (e: any) => {
      setFavorites(e.detail?.favorites || milkdropPresetService.getFavorites());
    };
    const handleReactive = (e: any) => {
      setOnlyReactive(e.detail?.onlyReactive ?? milkdropPresetService.getOnlyReactiveMode());
    };

    window.addEventListener('butterchurn_favorites_changed', handleFavs);
    window.addEventListener('butterchurn_reactive_mode_changed', handleReactive);

    return () => {
      window.removeEventListener('butterchurn_favorites_changed', handleFavs);
      window.removeEventListener('butterchurn_reactive_mode_changed', handleReactive);
    };
  }, []);

  // Load Presets Map from milkdropPresetService (500 presets)
  useEffect(() => {
    try {
      const allPresets = milkdropPresetService.getAllPresetsMap();
      presetsMapRef.current = allPresets;
      const names = Object.keys(allPresets);
      allNamesRef.current = names;

      if (names.length > 0 && !currentPresetName) {
        // Pick a premier ultra-reactive default preset
        const preferred =
          names.find((n) => /Star Nova|Marphets|Altars of Madness|Star Forge|glowsticks/i.test(n)) ||
          names[0];
        setCurrentPresetName(preferred);
      }
    } catch (e) {
      console.warn('Error cargando presets de MilkDrop:', e);
    }
  }, [currentPresetName]);

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

    // High performance GPU Render Loop with Time Dilation & Dynamic Physics Overrides
    let lastRenderTime = performance.now();
    let dynamicHue = configRef.current.hueRotate;

    const renderLoop = () => {
      animIdRef.current = requestAnimationFrame(renderLoop);
      if (visualizerRef.current) {
        try {
          const cfg = configRef.current;
          const now = performance.now();
          const dt = Math.max(0.001, Math.min(0.1, (now - lastRenderTime) / 1000));
          lastRenderTime = now;

          // 1. Dynamic WebGL Canvas Color Grading / Dynamic Prism Rotation
          if (canvasRef.current) {
            if (cfg.colorCycleSpeed > 0) {
              dynamicHue = (dynamicHue + cfg.colorCycleSpeed * dt * 40) % 360;
              canvasRef.current.style.filter = `hue-rotate(${Math.round(dynamicHue)}deg) saturate(${cfg.saturation}%) contrast(${cfg.contrast}%) brightness(${cfg.brightness}%) ${cfg.invert ? 'invert(1)' : ''}`;
            } else {
              canvasRef.current.style.filter = `hue-rotate(${cfg.hueRotate}deg) saturate(${cfg.saturation}%) contrast(${cfg.contrast}%) brightness(${cfg.brightness}%) ${cfg.invert ? 'invert(1)' : ''}`;
            }
          }

          // 2. Dynamic live physics & geometry override into Milkdrop equations
          const activePreset = visualizerRef.current?.renderer?.presetEquationRunner?.preset;
          if (activePreset && activePreset.baseVals) {
            const b = activePreset.baseVals;
            if (activePreset.__origZoom === undefined) {
              activePreset.__origZoom = b.zoom !== undefined ? b.zoom : 1.0;
              activePreset.__origWarp = b.warp !== undefined ? b.warp : 1.0;
              activePreset.__origRot = b.rot !== undefined ? b.rot : 0.0;
              activePreset.__origWaveScale = b.wave_scale !== undefined ? b.wave_scale : 1.0;
              activePreset.__origDecay = b.decay !== undefined ? b.decay : 0.98;
              activePreset.__origWaveMode = b.wave_mode !== undefined ? b.wave_mode : 0;
            }

            b.zoom = activePreset.__origZoom * cfg.zoomMultiplier;
            b.warp = activePreset.__origWarp * cfg.warpMultiplier;
            b.rot = activePreset.__origRot + cfg.rotationSpeed;
            b.wave_scale = activePreset.__origWaveScale * cfg.waveScale;

            if (cfg.useCustomDecay) {
              b.decay = cfg.decay;
            }
            if (cfg.waveModeOverride >= 0) {
              b.wave_mode = cfg.waveModeOverride;
            }
          }

          // 3. Render frame with animation speed time dilation
          visualizerRef.current.render({ elapsedTime: dt * cfg.animationSpeed });

          // 4. Blit live GPU frame to panel preview monitor if open
          const previewCanvas = document.getElementById('milkdrop-preview-canvas') as HTMLCanvasElement;
          if (previewCanvas && canvasRef.current) {
            const pCtx = previewCanvas.getContext('2d');
            if (pCtx) {
              pCtx.drawImage(canvasRef.current, 0, 0, previewCanvas.width, previewCanvas.height);
            }
          }
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
  const selectPreset = (name: string, blend = 2.0) => {
    if (!name || !presetsMapRef.current[name] || !visualizerRef.current) return;
    try {
      visualizerRef.current.loadPreset(presetsMapRef.current[name], blend);
      setCurrentPresetName(name);
      const isFav = milkdropPresetService.isFavorite(name);
      const meta = milkdropPresetService.getMetadata(name);
      window.dispatchEvent(
        new CustomEvent('butterchurn_preset_changed', {
          detail: {
            name,
            autoCycle,
            totalPresets: allNamesRef.current.length,
            isFavorite: isFav,
            onlyReactive,
            metadata: meta,
            presetData: presetsMapRef.current[name],
          },
        })
      );
    } catch (e) {
      console.warn('Error al cargar preset:', e);
    }
  };

  const handleNextPreset = () => {
    const next = milkdropPresetService.getNextPreset(currentPresetName, { onlyReactive });
    if (next && next !== currentPresetName) {
      selectPreset(next, 2.0);
    }
  };

  const handlePrevPreset = () => {
    const prev = milkdropPresetService.getPrevPreset(currentPresetName, { onlyReactive });
    if (prev && prev !== currentPresetName) {
      selectPreset(prev, 2.0);
    }
  };

  const handleRandomPreset = (options?: { onlyFavorites?: boolean }) => {
    const rand = milkdropPresetService.getRandomPreset({
      onlyReactive,
      onlyFavorites: options?.onlyFavorites,
      excludeCurrent: currentPresetName,
    });
    if (rand) {
      selectPreset(rand, 2.4);
    }
  };

  const handleToggleFavorite = (presetName = currentPresetName) => {
    if (!presetName) return;
    milkdropPresetService.toggleFavorite(presetName);
  };

  const handleToggleReactiveMode = () => {
    const next = !onlyReactive;
    setOnlyReactive(next);
    milkdropPresetService.setOnlyReactiveMode(next);
  };

  // Sync preset changes with external listeners (e.g. ZenModeView)
  useEffect(() => {
    const handleNext = () => handleNextPreset();
    const handlePrev = () => handlePrevPreset();
    const handleRandom = (e: any) => handleRandomPreset({ onlyFavorites: e.detail?.onlyFavorites });
    const handleSelect = (e: any) => {
      if (e.detail?.name) selectPreset(e.detail.name, e.detail.blend ?? 2.0);
    };
    const handleToggleAuto = () => setAutoCycle((v) => !v);
    const handleToggleReactive = () => handleToggleReactiveMode();
    const handleToggleFav = (e: any) => handleToggleFavorite(e.detail?.name || currentPresetName);

    window.addEventListener('butterchurn_next_preset', handleNext);
    window.addEventListener('butterchurn_prev_preset', handlePrev);
    window.addEventListener('butterchurn_random_preset', handleRandom);
    window.addEventListener('butterchurn_select_preset', handleSelect);
    window.addEventListener('butterchurn_toggle_autocycle', handleToggleAuto);
    window.addEventListener('butterchurn_toggle_reactive_mode', handleToggleReactive);
    window.addEventListener('butterchurn_toggle_favorite', handleToggleFav);

    return () => {
      window.removeEventListener('butterchurn_next_preset', handleNext);
      window.removeEventListener('butterchurn_prev_preset', handlePrev);
      window.removeEventListener('butterchurn_random_preset', handleRandom);
      window.removeEventListener('butterchurn_select_preset', handleSelect);
      window.removeEventListener('butterchurn_toggle_autocycle', handleToggleAuto);
      window.removeEventListener('butterchurn_toggle_reactive_mode', handleToggleReactive);
      window.removeEventListener('butterchurn_toggle_favorite', handleToggleFav);
    };
  }, [currentPresetName, autoCycle, onlyReactive]);

  // Notify listeners when currentPresetName is initialized
  useEffect(() => {
    if (currentPresetName) {
      const isFav = milkdropPresetService.isFavorite(currentPresetName);
      const meta = milkdropPresetService.getMetadata(currentPresetName);
      window.dispatchEvent(
        new CustomEvent('butterchurn_preset_changed', {
          detail: {
            name: currentPresetName,
            autoCycle,
            totalPresets: allNamesRef.current.length,
            isFavorite: isFav,
            onlyReactive,
            metadata: meta,
            presetData: presetsMapRef.current[currentPresetName],
          },
        })
      );
    }
  }, [currentPresetName, autoCycle, onlyReactive]);

  // Auto-cycle presets every 20s
  useEffect(() => {
    if (!autoCycle || allNamesRef.current.length === 0 || !isPlaying) return;
    const timer = setInterval(() => {
      handleNextPreset();
    }, 20000);
    return () => clearInterval(timer);
  }, [autoCycle, isPlaying, currentPresetName, onlyReactive]);

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

  // Filtered Presets for Explorer modal
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
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full ${
        isZenMode || isFullscreen ? 'h-full min-h-screen' : 'h-80 sm:h-96 md:h-[420px]'
      } rounded-2xl overflow-hidden bg-black select-none group shadow-2xl border border-slate-800/80`}
    >
      {/* WebGL MilkDrop Canvas Rendered by Nvidia GPU */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        onClick={handleNextPreset}
      />

      {/* Internal Dashboard HUD (hidden in Zen mode where ZenModeView has its own full HUD) */}
      {shouldShowHud && (
        <>
          {/* Top Floating HUD Bar */}
          <div
            className={`absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 transition-all duration-300 ${
              showControls
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            {/* Left: Engine & GPU Badge + Preset Info */}
            <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-cyan-500/30 text-xs text-slate-200 shadow-2xl">
              <Cpu className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-cyan-300">
                    Nvidia GPU MilkDrop 2
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-cyan-950/80 text-[10px] text-cyan-400 font-mono border border-cyan-500/30">
                    500 Presets
                  </span>
                  {currentMeta?.isReactive && (
                    <span className="px-1.5 py-0.2 rounded-md bg-orange-950/80 text-[10px] text-orange-400 font-bold border border-orange-500/40 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> {currentMeta.score}% Reactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-slate-300 font-mono text-[10px] max-w-[180px] sm:max-w-xs truncate"
                    title={currentPresetName}
                  >
                    {currentPresetName.replace(/_/g, ' ') || 'Cargando preset...'}
                  </span>
                  <button
                    onClick={() => handleToggleFavorite(currentPresetName)}
                    title={isCurrentFavorite ? 'Quitar de favoritos' : 'Guardar en mis favoritos'}
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

            {/* Center / Right: Live Tab Audio Sync + Beat Lock + Preset Toolbar */}
            <div className="flex items-center gap-2">
              {/* Audio-Reactive Beat Lock Toggle */}
              <button
                onClick={handleToggleReactiveMode}
                title={
                  onlyReactive
                    ? 'Modo Beat Sync ACTIVO: Solo se reproducen presets altamente reactivos a graves y ritmo. Clic para desactivar.'
                    : 'Activar Modo Beat Sync: Filtrar navegación para usar exclusivamente presets hiper-reactivos al sonido.'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xl transition-all cursor-pointer shadow-lg border ${
                  onlyReactive
                    ? 'bg-orange-950/90 border-orange-500 text-orange-300 shadow-orange-500/25 ring-1 ring-orange-500/50'
                    : 'bg-slate-950/85 border-slate-800 text-slate-400 hover:text-orange-300 hover:border-orange-500/40'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${onlyReactive ? 'text-orange-400 fill-orange-400 animate-bounce' : ''}`} />
                <span className="text-[11px] font-bold">
                  {onlyReactive ? 'Beat Sync ON' : 'Beat Sync'}
                </span>
              </button>

              {/* Live Tab Audio Capture (YouTube In-Sync) Button */}
              <button
                onClick={handleToggleTabAudio}
                title={
                  isTabAudioActive
                    ? 'Audio de YouTube sincronizado en vivo (1:1). Clic para desactivar.'
                    : 'Sincronizar el audio real de los videos de YouTube de esta pestaña con 1 clic'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xl transition-all cursor-pointer shadow-lg border ${
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
                <span className="text-[11px]">
                  {isTabAudioActive ? 'YouTube en Vivo' : '⚡ Audio en Vivo'}
                </span>
              </button>

              {/* In-Canvas Live Physics Bar (Zero Windows) Toggle Button */}
              <button
                onClick={() => toggleQuickBar()}
                title="Ajustar físicas, velocidad, zoom, warp y colores directamente sobre la pantalla sin abrir ninguna ventana (Atajo: F)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-xl transition-all cursor-pointer shadow-lg border ${
                  showQuickBar
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-300 text-white shadow-cyan-500/30 ring-2 ring-cyan-400/50'
                    : 'bg-slate-950/85 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/80 hover:border-cyan-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span className="text-[11px] font-bold">
                  {showQuickBar ? '⚡ Físicas en Pantalla (ON)' : '⚡ Físicas en Pantalla (F)'}
                </span>
              </button>

              {/* Dedicated MilkDrop Calibration & Physics Button */}
              <button
                onClick={() => setIsConfigOpen(true)}
                title="Abrir Calibrador de Parámetros: Físicas, Velocidad, Reacción al Sonido, Colores y Código (Atajo: C)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-xl transition-all cursor-pointer shadow-lg border bg-cyan-950/90 border-cyan-400 text-cyan-200 hover:bg-cyan-900 shadow-cyan-500/25 ring-1 ring-cyan-500/50"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="text-[11px] font-bold">
                  🎛️ Ajustes & Físicas (C)
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
                  onClick={() => handleRandomPreset()}
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
                  onClick={() => setIsConfigOpen(true)}
                  title="Calibrar MilkDrop: Físicas, Sonido, Colores, Velocidad y Código (C)"
                  className="p-1.5 hover:bg-slate-800/80 text-cyan-400 hover:text-cyan-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold hidden md:inline">Ajustes</span>
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
                  title="Explorador de Presets (500+ presets, filtros y favoritos)"
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <List className="w-4 h-4" />
                  <span className="text-[10px] font-mono text-cyan-400 hidden sm:inline">500</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Notice if tab audio was dismissed */}
          {tabAudioError && (
            <div className="absolute top-16 right-4 z-40 bg-red-950/90 border border-red-500 text-red-200 text-xs px-3 py-1.5 rounded-xl shadow-xl animate-fade-in flex items-center gap-2">
              <span>{tabAudioError}</span>
              <button
                onClick={() => setTabAudioError(null)}
                className="text-red-400 hover:text-white"
              >
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
            <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/75 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800/80 text-[10px]">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-1" />
              <span>Clic en el lienzo para avanzar • Presiona R para aleatorio</span>
            </div>

            <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 text-[10px] text-slate-400 font-mono">
              <span className="text-orange-400 font-bold flex items-center gap-1">
                <Flame className="w-2.5 h-2.5" /> {reactiveCount} Reactivos
              </span>
              <span>•</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-amber-400" /> {favorites.length} Favs
              </span>
              <span>•</span>
              <span>Total: 500 Presets</span>
            </div>
          </div>

          {/* Preset Explorer / Search Modal (Massive 500+ Presets Library) */}
          {isSearchOpen && (
            <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-4 sm:p-5 flex flex-col animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      Biblioteca MilkDrop 2 & Mega-Packs GPU
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-[10px] text-cyan-300 font-mono border border-cyan-500/40">
                        500 Presets
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Explora shaders reactivos, psicodélicos, túneles 3D y tus presets favoritos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      setIsConfigOpen(true);
                    }}
                    title="Abrir Calibrador de Físicas, Velocidad y Reacción al Sonido (C)"
                    className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500/40"
                  >
                    <Sliders className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>🎛️ Calibrar Físicas & Audio (C)</span>
                  </button>
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto custom-scrollbar shrink-0">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                    activeCategory === 'all'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-orange-300 hover:bg-slate-800'
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
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
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
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-indigo-300 hover:bg-slate-800'
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
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-fuchsia-300 hover:bg-slate-800'
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
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-teal-300 hover:bg-slate-800'
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
                    placeholder="Buscar preset por nombre, autor (Geiss, Rovastar, Flexi, Martin, Idiot)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
                  <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs">
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
                        selectPreset(rand.name, 2.0);
                        setIsSearchOpen(false);
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
                        Haz clic en la estrella ⭐ de cualquier preset para guardarlo aquí.
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
                        onClick={() => {
                          selectPreset(item.name, 2.0);
                          setIsSearchOpen(false);
                        }}
                        className={`p-2.5 rounded-xl text-xs flex flex-col justify-between gap-1.5 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-500/70 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-500/40'
                            : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(item.name);
                            }}
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
          )}
        </>
      )}

      {/* In-Canvas Live Sliders Strip: Zero Windows Needed, Direct On-Screen Tuning at 60 FPS */}
      {showQuickBar && (
        <div className="absolute bottom-3 sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-30 max-w-5xl mx-auto bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 sm:p-4 text-slate-200 shadow-2xl animate-fade-in pointer-events-auto select-none">
          {/* Bar Header: Title, Preset Name & Macro Picks */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                <Zap className="w-3.5 h-3.5 animate-pulse" />
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-100 text-[11px] tracking-wide uppercase">
                    Físicas en Directo (Sin Ventanas)
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-cyan-950/90 text-cyan-300 font-mono text-[9px] border border-cyan-500/30">
                    Live 60 FPS
                  </span>
                </div>
                <span className="text-[10px] text-cyan-300/80 font-mono truncate max-w-[200px] sm:max-w-xs">
                  {currentPresetName.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Quick Macro Profile Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              <span className="text-[10px] uppercase font-bold text-slate-500 hidden sm:inline">
                Macros:
              </span>
              <button
                onClick={() => {
                  const upd: MilkdropConfig = {
                    ...config,
                    animationSpeed: 1.15,
                    audioGain: 2.2,
                    bassBoost: 10,
                    warpMultiplier: 1.35,
                    zoomMultiplier: 1.04,
                  };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                className="px-2 py-0.5 rounded-lg bg-orange-950/80 border border-orange-500/50 text-orange-300 hover:bg-orange-900 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Macro Hiper Club: Graves potentes, alta reactividad y warp"
              >
                <Flame className="w-2.5 h-2.5 text-orange-400" /> Hiper
              </button>

              <button
                onClick={() => {
                  const upd: MilkdropConfig = {
                    ...config,
                    animationSpeed: 0.55,
                    audioGain: 0.9,
                    bassBoost: 0,
                    warpMultiplier: 0.65,
                    zoomMultiplier: 1.015,
                  };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                className="px-2 py-0.5 rounded-lg bg-teal-950/80 border border-teal-500/50 text-teal-300 hover:bg-teal-900 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Macro Zen: Movimiento lento, relajante y fluido"
              >
                <Sparkles className="w-2.5 h-2.5 text-teal-400" /> Zen
              </button>

              <button
                onClick={() => {
                  const upd: MilkdropConfig = {
                    ...config,
                    hueRotate: (config.hueRotate + 90) % 360,
                    saturation: 160,
                    contrast: 120,
                  };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                className="px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-500/50 text-purple-300 hover:bg-purple-900 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Girar tono de color +90° y saturar"
              >
                <Palette className="w-2.5 h-2.5 text-purple-400" /> Neón
              </button>

              <button
                onClick={() => {
                  setConfig(DEFAULT_MILKDROP_CONFIG);
                  saveMilkdropConfig(DEFAULT_MILKDROP_CONFIG);
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Restablecer parámetros originales de fábrica"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </button>

              <span className="w-px h-3.5 bg-slate-800 mx-0.5" />

              <button
                onClick={() => setIsConfigOpen(true)}
                className="px-2 py-0.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Abrir panel lateral con todas las opciones avanzadas (C)"
              >
                <Sliders className="w-2.5 h-2.5" /> Panel (C)
              </button>

              <button
                onClick={() => toggleQuickBar(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar barra de físicas en pantalla (F)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sliders Grid: 6 Real-Time Physics Controllers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 text-xs">
            {/* 1. Velocidad */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-cyan-400" /> Velocidad
                </span>
                <span className="font-mono text-[10px] text-cyan-300 font-bold">
                  {config.animationSpeed.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={config.animationSpeed}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  const upd = { ...config, animationSpeed: v };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>0.2x Lento</span>
                <span>3.0x Hiper</span>
              </div>
            </div>

            {/* 2. Zoom */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                  <Maximize2 className="w-2.5 h-2.5 text-sky-400" /> Zoom
                </span>
                <span className="font-mono text-[10px] text-sky-300 font-bold">
                  {config.zoomMultiplier.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.02"
                value={config.zoomMultiplier}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  const upd = { ...config, zoomMultiplier: v };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>0.6x Out</span>
                <span>1.8x In</span>
              </div>
            </div>

            {/* 3. Deformación / Warp */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-amber-400" /> Warp
                </span>
                <span className="font-mono text-[10px] text-amber-300 font-bold">
                  {config.warpMultiplier.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="3.5"
                step="0.05"
                value={config.warpMultiplier}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  const upd = { ...config, warpMultiplier: v };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>0.0 Plano</span>
                <span>3.5 Vórtice</span>
              </div>
            </div>

            {/* 4. Sensibilidad Audio (Gain) */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-emerald-400" /> Audio Gain
                </span>
                <span className="font-mono text-[10px] text-emerald-300 font-bold">
                  {config.audioGain.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.1"
                value={config.audioGain}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  const upd = { ...config, audioGain: v };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>0.2x Suave</span>
                <span>4.0x Punch</span>
              </div>
            </div>

            {/* 5. Pegada de Bajos (Bass Boost) */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 text-rose-400" /> Graves (Sub)
                </span>
                <span className="font-mono text-[10px] text-rose-300 font-bold">
                  +{config.bassBoost} dB
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="18"
                step="1"
                value={config.bassBoost}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  const upd = { ...config, bassBoost: v };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>0 dB Flat</span>
                <span>+18 dB Bass</span>
              </div>
            </div>

            {/* 6. Tono de Color (Hue Rotate) */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                  <Palette className="w-2.5 h-2.5 text-purple-400" /> Tono Color
                </span>
                <span className="font-mono text-[10px] text-purple-300 font-bold">
                  {config.hueRotate}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={config.hueRotate}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  const upd = { ...config, hueRotate: v };
                  setConfig(upd);
                  saveMilkdropConfig(upd);
                }}
                style={{
                  background:
                    'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                }}
                className="w-full h-1.5 rounded-lg cursor-pointer appearance-none"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>0° Rojo</span>
                <span>180° Cyan</span>
                <span>360°</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MilkDrop Internal Config & Physics Calibration Panel */}
      <MilkdropConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onChangeConfig={(newCfg) => {
          setConfig(newCfg);
          saveMilkdropConfig(newCfg);
        }}
        currentPresetName={currentPresetName}
        presetData={presetsMapRef.current[currentPresetName]}
      />
    </div>
  );
};
