import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { audioEngine } from '../services/audioEngine';
import { ChannelTrack } from '../types/soundscape';
import {
  VisualizerMode,
  VisualizerSettings,
  ColorPaletteId,
  VisualizerPreset,
  GlowIntensity,
  DecaySpeed,
  BarsResolution,
  VisualizerHeight,
} from '../types/visualizer';
import {
  COLOR_PALETTES,
  FACTORY_VISUALIZER_PRESETS,
  DEFAULT_VISUALIZER_SETTINGS,
  loadStoredSettings,
  persistVisualizerSettings,
  loadUserVisualizerPresets,
  saveUserVisualizerPresets,
  VISUALIZER_MODES_CONFIG,
} from '../constants/visualizerPresets';
import {
  BarChart2,
  Activity,
  Waves,
  Layers,
  Disc3,
  Sliders,
  Settings,
  Palette,
  Maximize2,
  Minimize2,
  Save,
  Download,
  Upload,
  Trash2,
  Sparkles,
  Radio,
  Eye,
  EyeOff,
  Crosshair,
  Flame,
  Check,
  X,
  ChevronDown,
  Plus,
  RotateCcw,
  Sun,
  Grid,
} from 'lucide-react';

interface MasterVisualizerProps {
  themeColor?: string;
  isPlaying: boolean;
  masterVolume?: number;
  masterFilter?: number;
  tracks?: ChannelTrack[];
  isZenMode?: boolean;
  onExitZen?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  colorIdx: number;
  angle: number;
  dist: number;
  speed: number;
  life: number;
  maxLife: number;
}

export const MasterVisualizer: React.FC<MasterVisualizerProps> = ({
  themeColor = '#06B6D4',
  isPlaying,
  masterVolume = 0.85,
  masterFilter = 18000,
  tracks = [],
  isZenMode = false,
  onExitZen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Settings State (persisted to LocalStorage)
  const [settings, setSettings] = useState<VisualizerSettings>(() => loadStoredSettings());

  // UI Panels & HUD State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isDynamicsOpen, setIsDynamicsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'modes' | 'colors' | 'dynamics' | 'presets'>('modes');
  const [userPresets, setUserPresets] = useState<VisualizerPreset[]>(() => loadUserVisualizerPresets());
  const [newPresetName, setNewPresetName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Listen to external settings updates (e.g. from ZenMode or other components)
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };
    window.addEventListener('visualizer_settings_changed', handleSync);
    return () => window.removeEventListener('visualizer_settings_changed', handleSync);
  }, []);

  const [stereoCorr, setStereoCorr] = useState<number>(1.0);
  const [isTabAudioActive, setIsTabAudioActive] = useState<boolean>(() => audioEngine.isLiveTabAudioActive());

  useEffect(() => {
    const handleCaptureChange = (e: any) => {
      setIsTabAudioActive(!!e.detail?.active);
    };
    window.addEventListener('tab_audio_capture_changed', handleCaptureChange);
    return () => window.removeEventListener('tab_audio_capture_changed', handleCaptureChange);
  }, []);

  const handleToggleTabAudioSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTabAudioActive) {
      audioEngine.disableLiveTabAudioCapture();
    } else {
      await audioEngine.enableLiveTabAudioCapture();
    }
  };

  // References for Animation & Memory
  const animationFrameId = useRef<number | null>(null);
  const peakHoldBars = useRef<number[]>(new Array(128).fill(0));
  const smoothBars = useRef<number[]>(new Array(128).fill(0));
  const waterfallHistory = useRef<number[][]>([]);
  const freqBufferRef = useRef<Uint8Array>(new Uint8Array(512));
  const timeBufferRef = useRef<Uint8Array>(new Uint8Array(512));
  const particlesRef = useRef<Particle[]>([]);
  const terrainOffsetRef = useRef<number>(0);
  const tunnelRotRef = useRef<number>(0);
  const orbPulseRef = useRef<number>(0);

  // Active Color Palette Lookup
  const activePalette = useMemo(() => {
    if (settings.paletteId === 'custom') {
      return {
        id: 'custom' as ColorPaletteId,
        name: 'Personalizado',
        primary: settings.customPrimary || '#06B6D4',
        secondary: settings.customSecondary || '#EC4899',
        accent: settings.customAccent || '#FACC15',
        glow: settings.customPrimary || '#06B6D4',
        gradient: [
          settings.customPrimary || '#06B6D4',
          settings.customSecondary || '#EC4899',
          settings.customAccent || '#FACC15',
        ] as [string, string, string],
      };
    }
    return (
      COLOR_PALETTES.find((p) => p.id === settings.paletteId) || COLOR_PALETTES[0]
    );
  }, [settings.paletteId, settings.customPrimary, settings.customSecondary, settings.customAccent]);

  // Update & persist settings helper
  const updateSettings = useCallback((updates: Partial<VisualizerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      persistVisualizerSettings(next);
      window.dispatchEvent(new CustomEvent('visualizer_settings_changed', { detail: next }));
      return next;
    });
  }, []);

  // Quick Cycle Color Palette
  const handleCyclePalette = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = COLOR_PALETTES.findIndex((p) => p.id === settings.paletteId);
    const nextIndex = (currentIndex + 1) % COLOR_PALETTES.length;
    const next = COLOR_PALETTES[nextIndex];
    updateSettings({ paletteId: next.id });
  };

  // Save Preset handler
  const handleSaveCurrentPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: VisualizerPreset = {
      id: `user-preset-${Date.now()}`,
      name: newPresetName.trim(),
      description: `Preset personalizado (${activePalette.name}, modo ${settings.mode})`,
      isFactory: false,
      settings: { ...settings },
    };

    const updated = [newPreset, ...userPresets];
    setUserPresets(updated);
    saveUserVisualizerPresets(updated);
    setNewPresetName('');
    setSaveSuccessMsg(`Preset "${newPreset.name}" guardado.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Delete Preset handler
  const handleDeletePreset = (id: string) => {
    const updated = userPresets.filter((p) => p.id !== id);
    setUserPresets(updated);
    saveUserVisualizerPresets(updated);
  };

  // Load Preset
  const handleApplyPreset = (preset: VisualizerPreset) => {
    updateSettings(preset.settings);
    setSaveSuccessMsg(`Preset "${preset.name}" aplicado.`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Export Presets to JSON
  const handleExportPresets = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userPresets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `soundscape_presets_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Presets from JSON
  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const merged = [...imported, ...userPresets];
          setUserPresets(merged);
          saveUserVisualizerPresets(merged);
          setSaveSuccessMsg(`${imported.length} presets importados.`);
          setTimeout(() => setSaveSuccessMsg(null), 3000);
        }
      } catch (err) {
        alert('Archivo de presets inválido');
      }
    };
    reader.readAsText(file);
  };

  // Height class mapping
  const heightClass = useMemo(() => {
    if (isZenMode) return 'absolute inset-0 w-full h-full';
    switch (settings.heightMode) {
      case 'compact':
        return 'h-72 sm:h-80';
      case 'tall':
        return 'h-96 sm:h-[480px]';
      case 'medium':
      default:
        return 'h-80 sm:h-96';
    }
  }, [settings.heightMode, isZenMode]);

  // Canvas Core Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const BARS_COUNT = settings.barsCount;
    if (smoothBars.current.length !== BARS_COUNT) {
      smoothBars.current = new Array(BARS_COUNT).fill(0);
      peakHoldBars.current = new Array(BARS_COUNT).fill(0);
    }

    // Initialize particles if needed
    if (particlesRef.current.length < 120) {
      particlesRef.current = Array.from({ length: 120 }, () => ({
        x: Math.random() * 800,
        y: Math.random() * 300,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: 1.5 + Math.random() * 2.5,
        baseRadius: 1.5 + Math.random() * 2.5,
        colorIdx: Math.floor(Math.random() * 3),
        angle: Math.random() * Math.PI * 2,
        dist: 40 + Math.random() * 180,
        speed: 0.005 + Math.random() * 0.015,
        life: Math.random() * 100,
        maxLife: 60 + Math.random() * 100,
      }));
    }

    // Calibrated ballistics and temporal anti-jitter smoothing
    const userSmoothing = Math.max(0.40, Math.min(0.98, settings.smoothing ?? 0.82));
    const speedMult = settings.decaySpeed === 'fast' ? 1.35 : settings.decaySpeed === 'studio' ? 1.0 : 0.65;
    // Attack rate: higher smoothing -> lower attack jump per frame -> no violent jitter!
    const attackRate = Math.max(0.08, Math.min(0.70, (1 - userSmoothing) * 2.2 * speedMult));
    // Decay rate: smooth gradual descent
    const decayRate = Math.min(0.97, Math.max(0.85, 0.86 + userSmoothing * 0.10));
    const gainFactor = settings.gain;

    // Glow intensity settings in px
    let glowBlur = 0;
    if (settings.glowIntensity === 'subtle') glowBlur = 6;
    else if (settings.glowIntensity === 'intense') glowBlur = 14;
    else if (settings.glowIntensity === 'extreme') glowBlur = 24;

    const render = () => {
      animationFrameId.current = requestAnimationFrame(render);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Dark translucent backdrop for phosphorus trails
      if (settings.mode === 'waterfall') {
        ctx.fillStyle = 'rgba(7, 11, 20, 0.95)';
      } else if (settings.mode === 'oscilloscope' || settings.mode === 'lissajous') {
        ctx.fillStyle = 'rgba(5, 8, 15, 0.28)';
      } else {
        ctx.fillStyle = 'rgba(7, 11, 20, 0.38)';
      }
      ctx.fillRect(0, 0, w, h);

      // Horizontal reference dB lines
      if (settings.showGrid && settings.mode !== 'waterfall' && settings.mode !== 'radial' && settings.mode !== 'tunnel' && settings.mode !== 'orb' && settings.mode !== 'particles') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        [-6, -12, -24, -36].forEach((db) => {
          const y = h * (1 - (db + 60) / 60);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        });
      }

      // Check if playback is idle or volume is muted
      if (!isPlaying || masterVolume <= 0.005) {
        for (let i = 0; i < BARS_COUNT; i++) {
          smoothBars.current[i] = Math.max(0, smoothBars.current[i] * 0.82 - 2);
          peakHoldBars.current[i] = Math.max(0, peakHoldBars.current[i] * 0.82 - 2);
        }
        setStereoCorr(1.0);

        // Quiet flat studio reference baseline
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h - 2);
        ctx.lineTo(w, h - 2);
        ctx.stroke();
        return;
      }

      // 1. Read real Web Audio master analyser node
      const analyser = audioEngine.getMasterAnalyser();
      if (!analyser) {
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      if (freqBufferRef.current.length !== bufferLength) {
        freqBufferRef.current = new Uint8Array(bufferLength);
        timeBufferRef.current = new Uint8Array(bufferLength);
      }

      const freqArray = freqBufferRef.current;
      const timeArray = timeBufferRef.current;

      (analyser as any).getByteFrequencyData(freqArray);
      (analyser as any).getByteTimeDomainData(timeArray);

      // Detect if real Web Audio stream is actively producing physical sound
      let realAudioSum = 0;
      for (let b = 0; b < bufferLength; b++) {
        if (freqArray[b] > 1) realAudioSum += freqArray[b];
      }
      const hasRealWebAudio = realAudioSum > 24;

      // Active tracks playing (e.g. YouTube video tracks playing via iframe)
      const activeYtTracks = tracks.filter(
        (t) => t.type === 'youtube_video' && !t.muted && (t.volume ?? 0.8) > 0.01
      );
      const now = performance.now() * 0.001;

      // 2. Measure TRUE real-time peak dBFS
      let peakSample = 0;
      let leftEnergy = 0;
      let rightEnergy = 0;

      if (hasRealWebAudio) {
        for (let i = 0; i < bufferLength; i++) {
          const sample = Math.abs((timeArray[i] - 128) / 128.0);
          if (sample > peakSample) peakSample = sample;

          // Approximate stereo correlation / phase
          if (i % 2 === 0) leftEnergy += sample;
          else rightEnergy += sample;
        }

        const totalEnergy = leftEnergy + rightEnergy;
        if (totalEnergy > 0.05) {
          const corr = Math.max(-1, Math.min(1, (1 - Math.abs(leftEnergy - rightEnergy) / totalEnergy) * 2 - 1));
          setStereoCorr(corr);
        }
      } else if (activeYtTracks.length > 0) {
        // Pure YouTube iframe audio: generate organic stereo time-domain data for oscilloscope / lissajous
        const netVol =
          activeYtTracks.reduce((acc, t) => acc + (t.volume ?? 0.8), 0) /
          Math.max(1, Math.sqrt(activeYtTracks.length));
        peakSample = Math.min(1.0, netVol * masterVolume * 0.65);
        const amp = Math.min(48, peakSample * 65);

        for (let i = 0; i < bufferLength; i++) {
          const ph = now * 10 + (i / bufferLength) * 12;
          const w = Math.sin(ph) * 0.6 + Math.sin(ph * 1.8 + 0.6) * 0.28 + Math.sin(ph * 0.45) * 0.12;
          timeArray[i] = Math.round(128 + w * amp);
        }
        setStereoCorr(0.85 + Math.sin(now * 0.4) * 0.1);
      }

      // 3. True Logarithmic ISO RTA Binning (20 Hz to 20,000 Hz)
      const audioCtx = audioEngine.getAudioContext();
      const sampleRate = audioCtx ? audioCtx.sampleRate : 48000;
      const binHz = (sampleRate / 2) / bufferLength;

      let bassEnergy = 0;
      let highEnergy = 0;

      for (let i = 0; i < BARS_COUNT; i++) {
        const fLow = 20 * Math.pow(1000, i / BARS_COUNT);
        const fHigh = 20 * Math.pow(1000, (i + 1) / BARS_COUNT);
        const fCenter = (fLow + fHigh) * 0.5;

        let targetVal = 0;

        if (hasRealWebAudio) {
          const binStart = Math.max(1, Math.min(bufferLength - 1, Math.floor(fLow / binHz)));
          const binEnd = Math.max(binStart, Math.min(bufferLength - 1, Math.ceil(fHigh / binHz)));

          let bandPeak = 0;
          let bandSum = 0;
          let binCount = 0;
          for (let b = binStart; b <= binEnd; b++) {
            const val = freqArray[b];
            if (val > bandPeak) bandPeak = val;
            bandSum += val;
            binCount++;
          }

          const bandEnergy = binCount > 1 ? bandPeak * 0.75 + (bandSum / binCount) * 0.25 : bandPeak;
          targetVal = Math.min(255, bandEnergy * gainFactor);
        } else if (activeYtTracks.length > 0) {
          // Dynamic real-time acoustic reactive engine for YouTube tracks
          const normI = i / BARS_COUNT;
          let ytEnergy = 0;

          // Musical groove and acoustic transients (~82 BPM natural chill/lo-fi tempo)
          const bpmCadence = now * (82 / 60) * Math.PI * 2;
          const kickImpulse = Math.pow(Math.max(0, Math.sin(bpmCadence)), 6) * 0.45;
          const chordImpulse = Math.pow(Math.max(0, Math.sin(bpmCadence + Math.PI)), 4) * 0.28;
          const oceanSwell = (Math.sin(now * 1.5) * 0.5 + 0.5) * 0.22;

          // Independent per-band micro-dynamics (each bar dances in place with its own acoustic energy, ZERO traveling waves)
          const bandJitter = Math.sin(now * 17.3 + i * 53.7) * 0.12 + Math.cos(now * 26.1 + i * 109.3) * 0.08;

          for (const tr of activeYtTracks) {
            const trVol = (tr.volume ?? 0.8) * (masterVolume / 1.0);
            const trCutoff = Math.min(tr.filterCutoff || 20000, masterFilter || 20000);

            // Studio pink noise natural acoustic curve: smooth -3.5dB/octave slope
            let bandWeight = Math.pow(1 / (1 + fCenter / 380), 0.36);

            // Low-pass filter attenuation matching track & master filter
            if (fCenter > trCutoff) {
              const ratio = fCenter / trCutoff;
              bandWeight *= Math.max(0, 1 / (1 + (ratio - 1) * 3.5));
            }

            // Dynamic frequency-dependent transient boost
            let dynamicBoost = 1.0;
            if (normI < 0.22) {
              // Sub-bass & Bass: pulse with kicks and ocean rolling surge
              dynamicBoost = 1.0 + kickImpulse * 0.85 + oceanSwell * 0.45;
            } else if (normI < 0.65) {
              // Mids: melodic body & chord transients
              dynamicBoost = 1.0 + chordImpulse * 0.65 + Math.sin(now * 2.8) * 0.10;
            } else {
              // Highs: rapid sparkling flutter & hi-hat shimmer
              dynamicBoost = 1.0 + chordImpulse * 0.35 + Math.sin(now * 5.4) * 0.14;
            }

            ytEnergy += bandWeight * (dynamicBoost + bandJitter) * trVol * 210;
          }
          ytEnergy = ytEnergy / Math.max(1, Math.sqrt(activeYtTracks.length));
          targetVal = Math.min(255, ytEnergy * gainFactor);
        }

        if (i < BARS_COUNT * 0.2) bassEnergy += targetVal;
        if (i > BARS_COUNT * 0.7) highEnergy += targetVal;

        // Ballistics calculation with smooth lerp
        const prev = smoothBars.current[i] || 0;
        const smoothed = targetVal > prev
          ? prev + (targetVal - prev) * attackRate
          : Math.max(0, prev * decayRate - 0.9);
        smoothBars.current[i] = smoothed;
      }

      // 3-point Gaussian spatial smoothing filter across adjacent frequency bands [0.18, 0.64, 0.18]
      // completely cancels out single-bin scalloping jitter while preserving genuine musical response!
      const rawBars = new Float32Array(BARS_COUNT);
      for (let i = 0; i < BARS_COUNT; i++) {
        rawBars[i] = smoothBars.current[i];
      }
      for (let i = 0; i < BARS_COUNT; i++) {
        const left = i > 0 ? rawBars[i - 1] : rawBars[i];
        const center = rawBars[i];
        const right = i < BARS_COUNT - 1 ? rawBars[i + 1] : rawBars[i];
        smoothBars.current[i] = left * 0.18 + center * 0.64 + right * 0.18;
      }

      bassEnergy = bassEnergy / (BARS_COUNT * 0.2 * 255);
      highEnergy = highEnergy / (BARS_COUNT * 0.3 * 255);

      const colors = activePalette.gradient;

      // ========================================================
      // 10 HIGH-END VISUALIZATION RENDERING ENGINES
      // ========================================================

      if (settings.mode === 'spectrum') {
        // --- MODO 1: ESPECTRO RTA (ISO 32/64/128 Bandas con Picos de Estudio) ---
        const isMirror = settings.mirrorMode;
        const count = isMirror ? Math.floor(BARS_COUNT / 2) : BARS_COUNT;
        const barSpacing = count > 64 ? 1 : 2;
        const barWidth = Math.max(1.5, (w - (BARS_COUNT - 1) * barSpacing) / BARS_COUNT);

        for (let i = 0; i < BARS_COUNT; i++) {
          const val = smoothBars.current[i];
          const normIdx = i / BARS_COUNT;
          const barHeight = Math.max(0, (val / 255) * (h - 22));

          let x = 0;
          if (isMirror) {
            const halfW = w / 2;
            const midIdx = Math.floor(BARS_COUNT / 2);
            if (i < midIdx) {
              x = halfW - (midIdx - i) * (barWidth + barSpacing);
            } else {
              x = halfW + (i - midIdx) * (barWidth + barSpacing);
            }
          } else {
            x = i * (barWidth + barSpacing);
          }

          const y = h - barHeight - 2;

          if (barHeight > 0.5) {
            const grad = ctx.createLinearGradient(0, h, 0, y);
            grad.addColorStop(0, `${colors[0]}25`);
            grad.addColorStop(0.55, colors[0]);
            grad.addColorStop(1, colors[1]);

            ctx.fillStyle = grad;
            if (glowBlur > 0) {
              ctx.shadowColor = colors[0];
              ctx.shadowBlur = glowBlur * 0.5;
            }
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // Peak Hold
          if (settings.peakHold) {
            let currentPeak = peakHoldBars.current[i] || 0;
            if (barHeight > currentPeak) {
              currentPeak = barHeight;
            } else {
              currentPeak = Math.max(0, currentPeak - 0.75);
            }
            peakHoldBars.current[i] = currentPeak;

            if (currentPeak > 4) {
              const peakY = h - currentPeak - 3;
              ctx.fillStyle = currentPeak > (h - 24) ? '#EF4444' : '#FFFFFF';
              ctx.fillRect(x, Math.max(2, peakY), barWidth, 1.5);
            }
          }
        }
      } else if (settings.mode === 'curve') {
        // --- MODO 2: CURVA FFT SUAVE (Estudio Spline con Relleno y Resplandor) ---
        const points: { x: number; y: number }[] = [];
        const isMirror = settings.mirrorMode;
        const step = w / (BARS_COUNT - 1);

        for (let i = 0; i < BARS_COUNT; i++) {
          const val = smoothBars.current[i];
          const barHeight = Math.max(0, (val / 255) * (h - 24));
          points.push({ x: i * step, y: isMirror ? h / 2 - barHeight / 2 : h - barHeight });
        }

        ctx.beginPath();
        if (isMirror) {
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          // Mirror bottom half
          for (let i = points.length - 1; i >= 0; i--) {
            const val = smoothBars.current[i];
            const barHeight = Math.max(0, (val / 255) * (h - 24));
            const yBottom = h / 2 + barHeight / 2;
            if (i === points.length - 1) ctx.lineTo(points[i].x, yBottom);
            else {
              const xc = (points[i].x + points[i + 1].x) / 2;
              const yc = h / 2 + (barHeight / 2);
              ctx.quadraticCurveTo(points[i].x, yBottom, xc, yc);
            }
          }
          ctx.closePath();
        } else {
          ctx.moveTo(0, h);
          ctx.lineTo(points[0].x, points[0].y);
          for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
        }

        // Fill
        const curveGrad = ctx.createLinearGradient(0, 0, 0, h);
        curveGrad.addColorStop(0, `${colors[1]}55`);
        curveGrad.addColorStop(0.5, `${colors[0]}22`);
        curveGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = curveGrad;
        ctx.fill();

        // Stroke with glow
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = colors[0];
        if (glowBlur > 0) {
          ctx.shadowColor = activePalette.glow;
          ctx.shadowBlur = glowBlur;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (settings.mode === 'oscilloscope') {
        // --- MODO 3: OSCILOSCOPIO PCM ANALÓGICO CON FÓSFORO PERSISTENTE ---
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors[0];
        if (glowBlur > 0) {
          ctx.shadowColor = activePalette.glow;
          ctx.shadowBlur = glowBlur;
        }
        ctx.beginPath();

        const sliceWidth = w / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = (timeArray[i] - 128) / 128.0;
          const y = h / 2 - v * (h * 0.42);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center zero-crossing line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      } else if (settings.mode === 'waterfall') {
        // --- MODO 4: CASCADA ESPECTRAL 3D / SONOGRAMA TERMOGRÁFICO ---
        const currentSnapshot = Array.from(smoothBars.current);
        waterfallHistory.current.unshift(currentSnapshot);
        if (waterfallHistory.current.length > 40) {
          waterfallHistory.current.pop();
        }

        const rows = waterfallHistory.current.length;
        const rowHeight = h / Math.max(1, rows);
        const colWidth = w / BARS_COUNT;

        for (let r = 0; r < rows; r++) {
          const rowData = waterfallHistory.current[r];
          const y = r * rowHeight;
          const alpha = 1 - r / rows;

          for (let c = 0; c < BARS_COUNT; c++) {
            const val = rowData[c] / 255;
            const x = c * colWidth;

            if (val > 0.7) {
              ctx.fillStyle = `rgba(${parseInt(colors[2].slice(1, 3), 16) || 250}, ${parseInt(colors[2].slice(3, 5), 16) || 204}, ${parseInt(colors[2].slice(5, 7), 16) || 21}, ${alpha * val})`;
            } else if (val > 0.35) {
              ctx.fillStyle = `rgba(${parseInt(colors[1].slice(1, 3), 16) || 236}, ${parseInt(colors[1].slice(3, 5), 16) || 72}, ${parseInt(colors[1].slice(5, 7), 16) || 153}, ${alpha * val})`;
            } else if (val > 0.1) {
              ctx.fillStyle = `rgba(${parseInt(colors[0].slice(1, 3), 16) || 6}, ${parseInt(colors[0].slice(3, 5), 16) || 182}, ${parseInt(colors[0].slice(5, 7), 16) || 212}, ${alpha * val})`;
            } else {
              ctx.fillStyle = `rgba(15, 23, 42, ${alpha * val * 0.4})`;
            }

            ctx.fillRect(x, y, colWidth + 0.5, rowHeight + 0.5);
          }
        }
      } else if (settings.mode === 'radial') {
        // --- MODO 5: MANDALA POLAR 360° REACTIVO ---
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(cx, cy) * 0.4;
        const symmetry = settings.mirrorMode ? 2 : 1;

        ctx.lineWidth = 2;
        ctx.strokeStyle = colors[0];
        if (glowBlur > 0) {
          ctx.shadowColor = activePalette.glow;
          ctx.shadowBlur = glowBlur;
        }
        ctx.beginPath();

        for (let i = 0; i <= BARS_COUNT; i++) {
          const idx = i % BARS_COUNT;
          const val = smoothBars.current[idx] / 255;
          const r = baseRadius + val * (baseRadius * 0.95);
          const theta = (idx / BARS_COUNT) * Math.PI * 2 * symmetry;
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = `${colors[1]}20`;
        ctx.fill();

        // Pulsing inner nucleus
        ctx.strokeStyle = colors[2];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.4 + bassEnergy * 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (settings.mode === 'tunnel') {
        // --- MODO 6: TÚNEL CUÁNTICO 3D (Warp Tunnel Hiper-Espacial) ---
        const cx = w / 2;
        const cy = h / 2;
        tunnelRotRef.current += 0.008 + highEnergy * 0.02;

        const RINGS = 12;
        const maxRadius = Math.max(cx, cy) * 1.3;

        for (let r = 1; r <= RINGS; r++) {
          const z = r / RINGS; // 0 (near center) to 1 (outer screen)
          const bandIdx = Math.floor(z * (BARS_COUNT - 1));
          const energy = (smoothBars.current[bandIdx] || 0) / 255;

          const radius = Math.pow(z, 1.8) * maxRadius + energy * 25;
          const rot = tunnelRotRef.current * (r % 2 === 0 ? 1 : -1) + z * 1.5;

          ctx.strokeStyle = r > RINGS * 0.7 ? colors[0] : r > RINGS * 0.3 ? colors[1] : colors[2];
          ctx.lineWidth = 1.5 + z * 2;
          if (glowBlur > 0) {
            ctx.shadowColor = activePalette.glow;
            ctx.shadowBlur = glowBlur * z;
          }

          ctx.beginPath();
          const sides = 6; // Hexagonal quantum tunnel
          for (let s = 0; s <= sides; s++) {
            const angle = (s / sides) * Math.PI * 2 + rot;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * (radius * 0.65); // perspective squash
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Bass shockwave singularity
        ctx.fillStyle = colors[2];
        ctx.beginPath();
        ctx.arc(cx, cy, 3 + bassEnergy * 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (settings.mode === 'particles') {
        // --- MODO 7: NEBULOSA GRAVITATORIA (Enjambre Cinético de Audio) ---
        const cx = w / 2;
        const cy = h / 2;
        const particles = particlesRef.current;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const bandIdx = i % BARS_COUNT;
          const bandVal = (smoothBars.current[bandIdx] || 0) / 255;

          p.angle += p.speed + bandVal * 0.02;
          p.dist += Math.sin(p.angle * 2) * 0.5;

          // Bass push outwards, gravity pulls inwards
          const targetDist = 40 + (i / particles.length) * (Math.min(cx, cy) * 0.8) + bassEnergy * 70;
          p.dist += (targetDist - p.dist) * 0.08;

          p.x = cx + Math.cos(p.angle) * p.dist;
          p.y = cy + Math.sin(p.angle) * (p.dist * 0.55);

          p.radius = p.baseRadius * (1 + bandVal * 1.8);

          const col = colors[p.colorIdx % 3];
          ctx.fillStyle = col;
          if (glowBlur > 0 && bandVal > 0.4) {
            ctx.shadowColor = col;
            ctx.shadowBlur = glowBlur * 0.8;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Orbit filament connections
          if (i > 0 && i % 4 === 0) {
            const prevP = particles[i - 1];
            ctx.strokeStyle = `${col}25`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(prevP.x, prevP.y);
            ctx.stroke();
          }
        }
      } else if (settings.mode === 'lissajous') {
        // --- MODO 8: VECTOR SCOPE / FASE LISSAJOUS DE ESTUDIO MASTERING ---
        const cx = w / 2;
        const cy = h / 2;
        const scopeRadius = Math.min(cx, cy) * 0.82;

        // Reticle (Left / Right / Mid / Side Axes)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Crosshair +
        ctx.moveTo(cx - scopeRadius, cy);
        ctx.lineTo(cx + scopeRadius, cy);
        ctx.moveTo(cx, cy - scopeRadius);
        ctx.lineTo(cx, cy + scopeRadius);
        // Diagonal 45 deg (L / R)
        ctx.moveTo(cx - scopeRadius * 0.7, cy - scopeRadius * 0.7);
        ctx.lineTo(cx + scopeRadius * 0.7, cy + scopeRadius * 0.7);
        ctx.moveTo(cx - scopeRadius * 0.7, cy + scopeRadius * 0.7);
        ctx.lineTo(cx + scopeRadius * 0.7, cy - scopeRadius * 0.7);
        ctx.stroke();

        // Scope boundary circle
        ctx.beginPath();
        ctx.arc(cx, cy, scopeRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Lissajous curve with 45-degree rotation
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = colors[0];
        if (glowBlur > 0) {
          ctx.shadowColor = activePalette.glow;
          ctx.shadowBlur = glowBlur;
        }
        ctx.beginPath();

        const samplesToDraw = Math.min(bufferLength, 256);
        for (let i = 0; i < samplesToDraw - 1; i++) {
          const l = (timeArray[i] - 128) / 128.0;
          const r = (timeArray[(i + 16) % bufferLength] - 128) / 128.0;

          // 45-degree rotation: x = (l - r) * 0.707, y = (l + r) * 0.707
          const px = cx + (l - r) * 0.707 * scopeRadius * 1.2;
          const py = cy - (l + r) * 0.707 * scopeRadius * 1.2;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Correlation meter badge on canvas
        const corrX = w - 85;
        const corrY = h - 14;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(corrX - 4, corrY - 12, 80, 16);
        ctx.fillStyle = stereoCorr > 0.5 ? '#10B981' : stereoCorr > 0 ? '#FBBF24' : '#EF4444';
        ctx.font = '9px monospace';
        ctx.fillText(`FASE: ${stereoCorr.toFixed(2)}`, corrX, corrY);
      } else if (settings.mode === 'terrain') {
        // --- MODO 9: MALLA 3D TERRENO SYNTHWAVE RETRO-FUTURISTA ---
        terrainOffsetRef.current = (terrainOffsetRef.current + 1.2) % 20;
        const horizonY = h * 0.32;
        const GRID_LINES = 14;
        const COLS = 24;

        // Ground perspective grid lines (horizontal rolling forward)
        for (let r = 0; r < GRID_LINES; r++) {
          const normY = (r * 20 + terrainOffsetRef.current) / (GRID_LINES * 20);
          const y = horizonY + Math.pow(normY, 2) * (h - horizonY);

          ctx.strokeStyle = `${colors[1]}${Math.floor(normY * 180).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1 + normY * 1.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Longitudinal lines modulated by frequency bands
        for (let c = 0; c <= COLS; c++) {
          const normX = c / COLS;
          const startX = w / 2 + (normX - 0.5) * (w * 0.15); // near vanishing point
          const endX = normX * w;

          const bandIdx = Math.floor(Math.abs(normX - 0.5) * 2 * (BARS_COUNT - 1));
          const elevation = ((smoothBars.current[bandIdx] || 0) / 255) * (h * 0.4);

          ctx.strokeStyle = colors[0];
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(startX, horizonY);

          const midX = (startX + endX) / 2;
          const midY = (horizonY + h) / 2 - elevation;
          ctx.quadraticCurveTo(midX, midY, endX, h);
          ctx.stroke();
        }

        // Horizon line with glow
        ctx.strokeStyle = colors[2];
        ctx.lineWidth = 2;
        if (glowBlur > 0) {
          ctx.shadowColor = colors[2];
          ctx.shadowBlur = glowBlur;
        }
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(w, horizonY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (settings.mode === 'orb') {
        // --- MODO 10: PÚLSAR SOLAR DE PLASMA BIOMECÁNICO ---
        const cx = w / 2;
        const cy = h / 2;
        orbPulseRef.current += 0.02 + bassEnergy * 0.05;

        const baseCoreRadius = Math.min(cx, cy) * 0.28;
        const coreRadius = baseCoreRadius + bassEnergy * 25;

        // Plasma Corona Rays
        const RAYS = 36;
        for (let i = 0; i < RAYS; i++) {
          const angle = (i / RAYS) * Math.PI * 2 + orbPulseRef.current * 0.5;
          const bandIdx = i % BARS_COUNT;
          const energy = (smoothBars.current[bandIdx] || 0) / 255;
          const flareLen = coreRadius + energy * (baseCoreRadius * 1.4);

          ctx.strokeStyle = i % 2 === 0 ? colors[1] : colors[2];
          ctx.lineWidth = 1.5 + energy * 3;
          if (glowBlur > 0) {
            ctx.shadowColor = colors[1];
            ctx.shadowBlur = glowBlur * 0.8;
          }

          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * coreRadius, cy + Math.sin(angle) * coreRadius);
          ctx.lineTo(cx + Math.cos(angle) * flareLen, cy + Math.sin(angle) * flareLen);
          ctx.stroke();
        }

        // Glowing Star Core
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.4, colors[0]);
        coreGrad.addColorStop(0.8, colors[1]);
        coreGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = coreGrad;
        if (glowBlur > 0) {
          ctx.shadowColor = activePalette.glow;
          ctx.shadowBlur = glowBlur * 1.5;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      resizeObserver.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [settings, activePalette, isPlaying, masterVolume, tracks]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${heightClass} ${
        isZenMode
          ? 'overflow-hidden bg-slate-950'
          : 'rounded-2xl bg-slate-950/95 border border-slate-800/80 shadow-2xl backdrop-blur-xl flex flex-row items-stretch overflow-hidden'
      } select-none transition-all duration-300 group`}
    >
      {/* Dynamic Background Glow Ambient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 transition-opacity duration-500 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${activePalette.glow} 0%, transparent 75%)`,
        }}
      />

      {/* Main Canvas Area (Left/Center: 100% Free & Unobstructed) */}
      <div className="flex-1 min-w-0 relative h-full overflow-hidden flex flex-col justify-between">
        {!isZenMode && (
          <>
            {/* Top-left subtle indicator badge and Live Sync button */}
            <div className="absolute top-2.5 left-3 z-10 flex items-center gap-2">
              <div className="pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md opacity-75 group-hover:opacity-100 transition-opacity">
                <span
                  className={`w-2 h-2 rounded-full transition-all ${
                    isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-slate-600'
                  }`}
                />
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">
                  MÁSTER
                </span>
                <span className="text-slate-600 text-[10px]">·</span>
                <span className="text-[10px] font-mono text-cyan-300">
                  {VISUALIZER_MODES_CONFIG.find((m) => m.mode === settings.mode)?.label || settings.mode}
                </span>
              </div>

              {/* Sincronización en vivo con audio de pestaña/YouTube */}
              <button
                onClick={handleToggleTabAudioSync}
                title={
                  isTabAudioActive
                    ? 'Audio en vivo sincronizado con los vídeos de YouTube (60 FPS FFT). Clic para desconectar.'
                    : 'Sincronizar el audio real de los vídeos de YouTube en tiempo real con precisión de milisegundo (Loopback nativo).'
                }
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md shadow-lg ${
                  isTabAudioActive
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.35)] animate-pulse'
                    : 'bg-slate-950/80 text-cyan-300 hover:text-white hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400'
                }`}
              >
                <Radio className={`w-3 h-3 shrink-0 ${isTabAudioActive ? 'text-emerald-400' : 'text-cyan-400'}`} />
                <span>{isTabAudioActive ? 'EN VIVO 60 FPS (YouTube)' : '⚡ Sincronizar Audio en Vivo'}</span>
              </button>
            </div>

            {/* If lateral panel is collapsed, show quick toggle button */}
            {isImmersiveMode && (
              <button
                onClick={() => setIsImmersiveMode(false)}
                title="Mostrar panel lateral de opciones del visualizador"
                className="absolute top-2.5 right-3 z-20 px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-xl transition-all cursor-pointer animate-fade-in"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Opciones</span>
              </button>
            )}
          </>
        )}

        {/* Main Canvas Visualizer */}
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Frequency Guide Markers */}
        {settings.showGrid &&
          settings.mode !== 'waterfall' &&
          settings.mode !== 'radial' &&
          settings.mode !== 'tunnel' &&
          settings.mode !== 'orb' &&
          settings.mode !== 'particles' && (
            <div className="absolute bottom-1.5 left-2 sm:left-4 right-2 sm:right-4 flex items-center justify-between text-[7px] sm:text-[9px] font-mono tabular-nums text-slate-500 pointer-events-none select-none">
              <span>SUB 20Hz</span>
              <span>BASS 80Hz</span>
              <span className="hidden sm:inline">LOW-MID 300Hz</span>
              <span>MID 1kHz</span>
              <span className="hidden sm:inline">HIGH-MID 4kHz</span>
              <span>PRES 8kHz</span>
              <span>AIR 20kHz</span>
            </div>
          )}
      </div>

      {/* Lateral Side Control Dock (Right Column: No Overlap, No Horizontal Scroll) */}
      {!isZenMode && !isImmersiveMode && (
        <aside className="w-72 sm:w-80 shrink-0 h-full border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-xl flex flex-col p-2.5 sm:p-3 z-10 overflow-y-auto custom-scroll select-none space-y-2">
          {/* Top: Header, Active Palette, Collapse */}
          <div className="space-y-1.5 pb-2 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-200 uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Visualizador
              </span>

              <button
                onClick={() => setIsImmersiveMode(true)}
                title="Colapsar panel (Modo inmersión total)"
                className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Palette Selector Bar */}
            <div className="flex items-center justify-between gap-1.5 p-1 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shadow-sm shrink-0 border border-white/20"
                  style={{
                    backgroundColor: activePalette.primary,
                    boxShadow: `0 0 8px ${activePalette.glow}`,
                  }}
                />
                <span className="text-[10.5px] font-semibold text-slate-200 truncate">
                  {activePalette.name}
                </span>
              </div>

              <button
                onClick={handleCyclePalette}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveTab('colors');
                  setIsSettingsOpen(true);
                }}
                title="Cambiar paleta cromática (Clic para rotar, Clic derecho para ver todas)"
                className="px-2 py-0.5 text-[10px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700/60 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Paleta</span>
              </button>
            </div>
          </div>

          {/* Middle: All 10 Visualizer Styles in a Clean 2-Column Grid */}
          <div className="space-y-1 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold tracking-wider uppercase px-0.5">
              <span>Estilos ({VISUALIZER_MODES_CONFIG.length})</span>
              <span className="text-cyan-400 font-mono font-bold lowercase">
                {settings.mode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {VISUALIZER_MODES_CONFIG.map((item) => {
                const Icon = item.icon;
                const isActive = settings.mode === item.mode;
                return (
                  <button
                    key={item.mode}
                    onClick={() => updateSettings({ mode: item.mode })}
                    title={`${item.label}: ${item.desc}`}
                    className={`px-2 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.3)] font-bold'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800/80 font-medium'
                    }`}
                  >
                    <Icon
                      className={`w-3 h-3 shrink-0 ${
                        isActive ? 'text-cyan-300' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-[10.5px] truncate leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Controls: DSP Dynamics + Height + Ajustes PRO */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80 shrink-0">
            {/* Quick Sensitivity & Anti-Jitter Sliders */}
            <div className="space-y-1 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800/60">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Sensibilidad</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {settings.gain.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={settings.gain}
                  onChange={(e) => updateSettings({ gain: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Suavizado</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Math.round((settings.smoothing ?? 0.82) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="0.96"
                  step="0.02"
                  value={settings.smoothing ?? 0.82}
                  onChange={(e) => updateSettings({ smoothing: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            {/* Height Selector & Full Settings PRO Button */}
            <div className="flex items-center gap-1.5">
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
                {(['compact', 'medium', 'tall'] as VisualizerHeight[]).map((h) => (
                  <button
                    key={h}
                    onClick={() => updateSettings({ heightMode: h })}
                    title={`Altura ${h === 'compact' ? 'Compacta' : h === 'medium' ? 'Media' : 'Alta'}`}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded capitalize transition-all cursor-pointer ${
                      settings.heightMode === h
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {h === 'compact' ? 'C' : h === 'medium' ? 'M' : 'A'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Abrir Estudio de Visualización PRO (Paletas, Presets, Balística)"
                className="flex-1 py-1 px-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[10.5px] font-bold shadow-md border border-cyan-400/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Sliders className="w-3 h-3" />
                <span>Ajustes PRO</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ======================================================== */}
      {/* ADVANCED VISUALIZER CONFIGURATION MODAL / DRAWER (PORTAL) */}
      {/* ======================================================== */}
      {isSettingsOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    Estudio de Visualización Acústica
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-800">
                      PRO
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Personaliza modos, paletas cromáticas, balística y presets de usuario.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Alert if preset saved */}
            {saveSuccessMsg && (
              <div className="px-4 py-2 bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 gap-1 sm:gap-2 pt-2 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('modes')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'modes'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Estilos ({VISUALIZER_MODES_CONFIG.length})
              </button>

              <button
                onClick={() => setActiveTab('colors')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'colors'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                Paletas & Glow
              </button>

              <button
                onClick={() => setActiveTab('dynamics')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'dynamics'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Dinámica & Audio
              </button>

              <button
                onClick={() => setActiveTab('presets')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'presets'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Presets ({FACTORY_VISUALIZER_PRESETS.length + userPresets.length})
              </button>
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scroll">
              {/* TAB 1: 10 VISUALIZER MODES */}
              {activeTab === 'modes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Selecciona un estilo de visualización
                    </span>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      Activo: {settings.mode.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {VISUALIZER_MODES_CONFIG.map((item) => {
                      const Icon = item.icon;
                      const isSelected = settings.mode === item.mode;
                      return (
                        <div
                          key={item.mode}
                          onClick={() => updateSettings({ mode: item.mode })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-950/50'
                              : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white truncate">
                                {item.label}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: COLOR PALETTES & GLOW */}
              {activeTab === 'colors' && (
                <div className="space-y-6">
                  {/* Curated Color Palettes */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Paletas Cromáticas Curadas
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {COLOR_PALETTES.map((pal) => {
                        const isSelected = settings.paletteId === pal.id;
                        return (
                          <div
                            key={pal.id}
                            onClick={() => updateSettings({ paletteId: pal.id })}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                              isSelected
                                ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-950/50'
                                : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white truncate">
                                {pal.name}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>

                            {/* Gradient Preview Bar */}
                            <div
                              className="w-full h-3.5 rounded-full border border-slate-700 shadow-inner"
                              style={{
                                background: `linear-gradient(to right, ${pal.gradient[0]}, ${pal.gradient[1]}, ${pal.gradient[2]})`,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Palette Pickers */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">
                        Color Personalizado (RGB)
                      </span>
                      <button
                        onClick={() => updateSettings({ paletteId: 'custom' })}
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold cursor-pointer ${
                          settings.paletteId === 'custom'
                            ? 'bg-cyan-500 text-black'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {settings.paletteId === 'custom' ? 'Activo' : 'Activar Personalizado'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Primario</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settings.customPrimary || '#06B6D4'}
                            onChange={(e) =>
                              updateSettings({
                                paletteId: 'custom',
                                customPrimary: e.target.value,
                              })
                            }
                            className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-slate-300 uppercase">
                            {settings.customPrimary || '#06B6D4'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Secundario</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settings.customSecondary || '#EC4899'}
                            onChange={(e) =>
                              updateSettings({
                                paletteId: 'custom',
                                customSecondary: e.target.value,
                              })
                            }
                            className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-slate-300 uppercase">
                            {settings.customSecondary || '#EC4899'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Acento</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={settings.customAccent || '#FACC15'}
                            onChange={(e) =>
                              updateSettings({
                                paletteId: 'custom',
                                customAccent: e.target.value,
                              })
                            }
                            className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-slate-300 uppercase">
                            {settings.customAccent || '#FACC15'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Glow / Bloom Intensity */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Resplandor Neón (Glow / Bloom)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['none', 'subtle', 'intense', 'extreme'] as GlowIntensity[]).map((glow) => (
                        <button
                          key={glow}
                          onClick={() => updateSettings({ glowIntensity: glow })}
                          className={`p-2.5 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                            settings.glowIntensity === glow
                              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-900/30'
                              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {glow === 'none'
                            ? 'Apagado'
                            : glow === 'subtle'
                            ? 'Sutil'
                            : glow === 'intense'
                            ? 'Intenso'
                            : 'Neón Extremo'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DYNAMICS & AUDIO PARAMETERS */}
              {activeTab === 'dynamics' && (
                <div className="space-y-5">
                  {/* Visual Gain / Sensitivity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Sensibilidad / Ganancia de Entrada</span>
                      <span className="font-mono text-cyan-400 font-bold">{settings.gain.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      value={settings.gain}
                      onChange={(e) => updateSettings({ gain: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0.2x (Atenuado)</span>
                      <span>0.95x (Estudio Equilibrado)</span>
                      <span>2.5x (Ultra Reactivo)</span>
                    </div>
                  </div>

                  {/* Temporal Smoothing / Anti-Jitter */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Suavizado Temporal (Anti-Tembleque)</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {Math.round((settings.smoothing ?? 0.82) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.40"
                      max="0.96"
                      step="0.02"
                      value={settings.smoothing ?? 0.82}
                      onChange={(e) => updateSettings({ smoothing: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>40% (Rápido / Directo)</span>
                      <span>82% (Estudio Sedoso)</span>
                      <span>96% (Ultra Fluido Zen)</span>
                    </div>
                  </div>

                  {/* Ballistics / Decay Speed */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Balística & Velocidad de Caída (Decay)
                    </span>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(['fast', 'studio', 'smooth'] as DecaySpeed[]).map((speed) => (
                        <button
                          key={speed}
                          onClick={() => updateSettings({ decaySpeed: speed })}
                          className={`p-2.5 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                            settings.decaySpeed === speed
                              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {speed === 'fast'
                            ? '⚡ Rápida (DJ)'
                            : speed === 'studio'
                            ? '🎯 Estudio Pro'
                            : '🌊 Fluida / Zen'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution / Bars Count */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Resolución Espectral FFT
                    </span>
                    <div className="grid grid-cols-3 gap-2.5">
                      {([32, 64, 128] as BarsResolution[]).map((res) => (
                        <button
                          key={res}
                          onClick={() => updateSettings({ barsCount: res })}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            settings.barsCount === res
                              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {res} Bandas
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Options: Peak Hold, Mirror, Grid */}
                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Retención de Picos (Peak Hold)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Marcadores balísticos de picos con caída gravitacional
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.peakHold}
                        onChange={(e) => updateSettings({ peakHold: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Modo Espejo (Simetría Bilateral)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Duplica la visualización desde el centro hacia los extremos
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.mirrorMode}
                        onChange={(e) => updateSettings({ mirrorMode: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Rejilla de Escala & Decibelios
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Líneas de referencia de frecuencia y marcas de -12dB, -24dB
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.showGrid}
                        onChange={(e) => updateSettings({ showGrid: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PRESETS MANAGER (FACTORY & USER) */}
              {activeTab === 'presets' && (
                <div className="space-y-6">
                  {/* Save Current Preset Form */}
                  <form onSubmit={handleSaveCurrentPreset} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                    <span className="text-xs font-bold text-slate-200 block">
                      Guardar Configuración Actual como Preset
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nombre del preset (ej: Cyberpunk Master)"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Guardar
                      </button>
                    </div>
                  </form>

                  {/* Factory Presets */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Presets de Fábrica Integrados
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {FACTORY_VISUALIZER_PRESETS.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => handleApplyPreset(preset)}
                          className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/80 hover:border-cyan-500/60 transition-all cursor-pointer flex flex-col justify-between gap-1 group/p"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white group-hover/p:text-cyan-300 transition-colors">
                              {preset.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 capitalize">
                              {preset.settings.mode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {preset.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User Presets */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Mis Presets Guardados ({userPresets.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportPresets}
                          title="Exportar a archivo JSON"
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Exportar
                        </button>
                        <label
                          title="Importar desde archivo JSON"
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" /> Importar
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportPresets}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {userPresets.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                        No has guardado presets todavía. Personaliza el visualizador y haz clic en "Guardar".
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {userPresets.map((preset) => (
                          <div
                            key={preset.id}
                            className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-2"
                          >
                            <div
                              onClick={() => handleApplyPreset(preset)}
                              className="flex-1 cursor-pointer"
                            >
                              <span className="text-xs font-bold text-white hover:text-cyan-300 transition-colors block">
                                {preset.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Modo: {preset.settings.mode} • Paleta: {preset.settings.paletteId}
                              </span>
                            </div>

                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Eliminar preset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => updateSettings(DEFAULT_VISUALIZER_SETTINGS)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Restaurar fábrica
              </button>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar Estudio
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
