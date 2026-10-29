import React, { useRef, useEffect, useState } from 'react';
import { audioEngine } from '../services/audioEngine';
import { ChannelTrack } from '../types/soundscape';
import { BarChart2, Activity, Waves, Layers, Disc3 } from 'lucide-react';

interface MasterVisualizerProps {
  themeColor?: string;
  isPlaying: boolean;
  masterVolume?: number;
  masterFilter?: number;
  tracks?: ChannelTrack[];
}

export type VisualizerMode = 'spectrum' | 'curve' | 'oscilloscope' | 'waterfall' | 'radial';

export const MasterVisualizer: React.FC<MasterVisualizerProps> = ({
  themeColor = '#06B6D4',
  isPlaying,
  masterVolume = 0.85,
  masterFilter = 18000,
  tracks = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<VisualizerMode>('spectrum');
  const [peakDb, setPeakDb] = useState<number>(-60);
  const animationFrameId = useRef<number | null>(null);

  // Ballistics state
  const peakHoldBars = useRef<number[]>(new Array(64).fill(0));
  const smoothBars = useRef<number[]>(new Array(64).fill(0));
  const waterfallHistory = useRef<number[][]>([]);
  const freqBufferRef = useRef<Uint8Array>(new Uint8Array(512));
  const timeBufferRef = useRef<Uint8Array>(new Uint8Array(512));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const BARS_COUNT = 64;

    const render = () => {
      animationFrameId.current = requestAnimationFrame(render);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Dark translucent backdrop with slight phosphor persistence
      ctx.fillStyle = mode === 'waterfall' ? 'rgba(7, 11, 20, 0.95)' : 'rgba(7, 11, 20, 0.35)';
      ctx.fillRect(0, 0, w, h);

      // Horizontal reference dB lines (-12dB, -24dB, -36dB)
      if (mode !== 'waterfall' && mode !== 'radial') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        [-12, -24, -36].forEach((db) => {
          const y = h * (1 - (db + 75) / 75);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        });
      }

      // Check if playback is idle or volume is muted
      if (!isPlaying || masterVolume <= 0.005) {
        // Smoothly decay any lingering bars to zero (no jumping or waving)
        for (let i = 0; i < BARS_COUNT; i++) {
          smoothBars.current[i] = Math.max(0, smoothBars.current[i] * 0.82 - 2);
          peakHoldBars.current[i] = Math.max(0, peakHoldBars.current[i] * 0.82 - 2);
        }
        setPeakDb(-60);

        // Quiet flat studio reference baseline
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
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
        setPeakDb(-60);
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

      // 2. Measure TRUE real-time peak dBFS directly from PCM timeArray
      let peakSample = 0;
      for (let i = 0; i < bufferLength; i++) {
        const sample = Math.abs((timeArray[i] - 128) / 128.0);
        if (sample > peakSample) peakSample = sample;
      }
      const realDb = peakSample > 0.002
        ? Math.min(0, Math.max(-60, Math.round(20 * Math.log10(peakSample))))
        : -60;
      setPeakDb(realDb);

      // 3. True Logarithmic 64-Band RTA Binning (20 Hz to 20,000 Hz)
      const audioCtx = audioEngine.getAudioContext();
      const sampleRate = audioCtx ? audioCtx.sampleRate : 48000;
      const binHz = (sampleRate / 2) / bufferLength; // e.g. ~46.875 Hz per bin

      for (let i = 0; i < BARS_COUNT; i++) {
        // Exact standard ISO logarithmic frequency limits for bar i:
        const fLow = 20 * Math.pow(1000, i / BARS_COUNT);
        const fHigh = 20 * Math.pow(1000, (i + 1) / BARS_COUNT);

        const binStart = Math.max(1, Math.min(bufferLength - 1, Math.floor(fLow / binHz)));
        const binEnd = Math.max(binStart, Math.min(bufferLength - 1, Math.ceil(fHigh / binHz)));

        // Extract real peak energy across this exact frequency window from the hardware FFT
        let bandPeak = 0;
        for (let b = binStart; b <= binEnd; b++) {
          if (freqArray[b] > bandPeak) {
            bandPeak = freqArray[b];
          }
        }

        // Professional meter ballistics: rapid attack (0.75), natural linear/exponential decay
        const prev = smoothBars.current[i] || 0;
        const smoothed = bandPeak > prev
          ? prev * 0.25 + bandPeak * 0.75
          : Math.max(0, prev * 0.88 - 1.5);
        smoothBars.current[i] = smoothed;
      }

      // --- RENDERING MODES ---

      if (mode === 'spectrum') {
        // Mode 1: Espectro RTA (Real-Time Analyzer 64-Bands)
        const barWidth = Math.max(2, (w - (BARS_COUNT - 1) * 2) / BARS_COUNT);

        for (let i = 0; i < BARS_COUNT; i++) {
          const val = smoothBars.current[i];
          const normIdx = i / BARS_COUNT;
          const barHeight = Math.max(0, (val / 255) * (h - 20));
          const x = i * (barWidth + 2);
          const y = h - barHeight - 2;

          if (barHeight > 0.5) {
            // Studio Gradient: Cyan -> Emerald -> Gold/Rose on high energy
            const grad = ctx.createLinearGradient(0, h, 0, y);
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
            grad.addColorStop(0.5, themeColor);
            if (normIdx < 0.25) {
              grad.addColorStop(1, '#38BDF8');
            } else if (normIdx < 0.65) {
              grad.addColorStop(1, '#34D399');
            } else {
              grad.addColorStop(1, '#FBBF24');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();
          }

          // Ballistic Peak-Hold Markers with gravity fall
          let currentPeak = peakHoldBars.current[i] || 0;
          if (barHeight > currentPeak) {
            currentPeak = barHeight;
          } else {
            currentPeak = Math.max(0, currentPeak - 0.75); // gravity decay
          }
          peakHoldBars.current[i] = currentPeak;

          if (currentPeak > 4) {
            const peakY = h - currentPeak - 3;
            ctx.fillStyle = currentPeak > (h - 24) ? '#F87171' : '#FFFFFF';
            ctx.fillRect(x, Math.max(2, peakY), barWidth, 1.5);
          }
        }
      } else if (mode === 'curve') {
        // Mode 2: Curva Suave FFT (Analog Studio Spline with glow)
        ctx.beginPath();
        ctx.moveTo(0, h);

        const points: { x: number; y: number }[] = [];
        const step = w / (BARS_COUNT - 1);

        for (let i = 0; i < BARS_COUNT; i++) {
          const val = smoothBars.current[i];
          const barHeight = Math.max(0, (val / 255) * (h - 22));
          points.push({ x: i * step, y: h - barHeight });
        }

        // Draw smooth Bezier curve through points
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        // Gradient fill
        const curveGrad = ctx.createLinearGradient(0, 0, 0, h);
        curveGrad.addColorStop(0, `${themeColor}66`);
        curveGrad.addColorStop(0.7, `${themeColor}15`);
        curveGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = curveGrad;
        ctx.fill();

        // Stroke line with glow
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'oscilloscope') {
        // Mode 3: Osciloscopio Estéreo (Real-Time PCM Waveform from Master Bus)
        ctx.lineWidth = 2;
        ctx.strokeStyle = themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();

        const sliceWidth = w / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = (timeArray[i] - 128) / 128.0; // -1.0 to 1.0 (authentic PCM sample)
          const y = h / 2 - (v * (h * 0.42));

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'waterfall') {
        // Mode 4: Espectrograma en Cascada (Cascading Sonogram / Heatmap)
        const currentSnapshot = Array.from(smoothBars.current);
        waterfallHistory.current.unshift(currentSnapshot);
        if (waterfallHistory.current.length > 36) {
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

            // Heatmap color: Deep Navy -> Cyan -> Emerald -> Gold
            if (val > 0.7) {
              ctx.fillStyle = `rgba(245, 158, 11, ${alpha * val})`;
            } else if (val > 0.4) {
              ctx.fillStyle = `rgba(16, 185, 129, ${alpha * val})`;
            } else if (val > 0.15) {
              ctx.fillStyle = `rgba(6, 182, 212, ${alpha * val})`;
            } else {
              ctx.fillStyle = `rgba(15, 23, 42, ${alpha * val * 0.5})`;
            }

            ctx.fillRect(x, y, colWidth + 0.5, rowHeight + 0.5);
          }
        }
      } else if (mode === 'radial') {
        // Mode 5: Mandala Polar 360° (Circular Reactive Flux)
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(cx, cy) * 0.45;

        ctx.lineWidth = 2;
        ctx.strokeStyle = themeColor;
        ctx.beginPath();

        for (let i = 0; i <= BARS_COUNT; i++) {
          const idx = i % BARS_COUNT;
          const val = smoothBars.current[idx] / 255;
          const r = baseRadius + val * (baseRadius * 0.8);
          const theta = (idx / BARS_COUNT) * Math.PI * 2;
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = `${themeColor}15`;
        ctx.fill();

        // Inner glowing core
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [mode, themeColor, isPlaying, tracks, masterVolume, masterFilter]);

  return (
    <div className="relative w-full h-24 sm:h-28 rounded-xl bg-slate-950/90 border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-md flex flex-col justify-between select-none">
      {/* Top Header Overlay: Live dBFS & 5 Visualizer Modes */}
      <div className="absolute top-2 left-2 sm:left-3 right-2 sm:right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-slate-600'
              }`}
            />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-300">
              Analizador Máster
            </span>
          </div>

          <span className="text-[9px] sm:text-[10px] font-mono tabular-nums text-cyan-400 font-bold bg-cyan-950/70 px-1.5 sm:px-2 py-0.5 rounded border border-cyan-800/40 shadow-inner">
            {isPlaying ? `${peakDb} dBFS` : 'STANDBY'}
          </span>
        </div>

        {/* 5 Professional Mode Selector Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 bg-slate-900/95 backdrop-blur rounded-lg border border-slate-800 pointer-events-auto shadow-md shrink-0">
          <button
            onClick={() => setMode('spectrum')}
            title="Espectro RTA (64 Bandas con Picos)"
            className={`p-1 sm:px-2 sm:py-1 text-[10px] font-semibold rounded flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
              mode === 'spectrum'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            <span className="hidden md:inline">Espectro</span>
          </button>

          <button
            onClick={() => setMode('curve')}
            title="Curva Suave FFT (Analógica Studio Spline)"
            className={`p-1 sm:px-2 sm:py-1 text-[10px] font-semibold rounded flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
              mode === 'curve'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span className="hidden md:inline">Curva FFT</span>
          </button>

          <button
            onClick={() => setMode('oscilloscope')}
            title="Osciloscopio Estéreo (Forma de Onda PCM)"
            className={`p-1 sm:px-2 sm:py-1 text-[10px] font-semibold rounded flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
              mode === 'oscilloscope'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Waves className="w-3 h-3" />
            <span className="hidden md:inline">Onda</span>
          </button>

          <button
            onClick={() => setMode('waterfall')}
            title="Espectrograma en Cascada (Sonograma Temporal)"
            className={`p-1 sm:px-2 sm:py-1 text-[10px] font-semibold rounded flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
              mode === 'waterfall'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="hidden md:inline">Cascada</span>
          </button>

          <button
            onClick={() => setMode('radial')}
            title="Mandala Polar 360°"
            className={`p-1 sm:px-2 sm:py-1 text-[10px] font-semibold rounded flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
              mode === 'radial'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 className="w-3 h-3" />
            <span className="hidden md:inline">Radial</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Visualizer */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Frequency Guide Markers */}
      {mode !== 'waterfall' && mode !== 'radial' && (
        <div className="absolute bottom-1 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between text-[7px] sm:text-[8px] font-mono tabular-nums text-slate-500 pointer-events-none select-none">
          <span>SUB 20Hz</span>
          <span>BASS 100Hz</span>
          <span className="hidden sm:inline">LOW-MID 500Hz</span>
          <span>MID 1k</span>
          <span className="hidden sm:inline">HIGH-MID 4k</span>
          <span>PRES 10k</span>
          <span>AIR 20k</span>
        </div>
      )}
    </div>
  );
};
