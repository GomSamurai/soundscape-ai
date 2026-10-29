import React, { useState, useEffect } from 'react';
import { RotaryKnob } from './RotaryKnob';
import { Sparkles, Circle, Download, Volume2, VolumeX, Sliders, Timer } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

import { ChannelTrack } from '../types/soundscape';

interface MasterStripProps {
  tracks?: ChannelTrack[];
  masterVolume: number;
  masterReverb: number;
  masterFilter: number;
  isPlaying: boolean;
  isAiBalancing: boolean;
  onVolumeChange: (vol: number) => void;
  onReverbChange: (rev: number) => void;
  onFilterChange: (freq: number) => void;
  onTogglePlay: () => void;
  onGlobalStop: () => void;
  onTriggerAiBalance: () => void;
}

const TOTAL_SEGMENTS = 14;

export const MasterStrip: React.FC<MasterStripProps> = ({
  tracks = [],
  masterVolume,
  masterReverb,
  masterFilter,
  isPlaying,
  isAiBalancing,
  onVolumeChange,
  onReverbChange,
  onFilterChange,
  onTriggerAiBalance,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(masterVolume);
  const [masterVuLeft, setMasterVuLeft] = useState(0);
  const [masterVuRight, setMasterVuRight] = useState(0);
  const [showEqDrawer, setShowEqDrawer] = useState(false);

  // 3-Band Parametric Master EQ state
  const [lowEq, setLowEq] = useState(0);
  const [midEq, setMidEq] = useState(0);
  const [highEq, setHighEq] = useState(0);

  // Master Delay & Warmth state
  const [masterDelay, setMasterDelay] = useState(0);
  const [masterWarmth, setMasterWarmth] = useState(0);

  // Live Stereo Master VU Meter Animation with composite audio metering
  useEffect(() => {
    let animId: number;
    let smoothL = 0;
    let smoothR = 0;

    const updateMasterVU = () => {
      animId = requestAnimationFrame(updateMasterVU);
      if (!isPlaying || isMuted || masterVolume <= 0.01) {
        smoothL = 0;
        smoothR = 0;
        setMasterVuLeft(0);
        setMasterVuRight(0);
        return;
      }

      // Check if any tracks are solo'd
      const hasAnySolo = tracks.some((t) => t.solo);

      // Sum stereo energy from all active channels
      let rawL = 0;
      let rawR = 0;
      let activeTrackCount = 0;

      for (const t of tracks) {
        if (t.muted || (hasAnySolo && !t.solo) || t.isUnavailable || t.volume <= 0.001) continue;
        activeTrackCount++;
        const vol = t.volume;
        // Pan is between -1 (Left) and +1 (Right)
        const p = Math.max(-1, Math.min(1, t.pan || 0));
        // Constant power panning law
        const angle = ((p + 1) * Math.PI) / 4; // 0 to PI/2
        const gainL = Math.cos(angle);
        const gainR = Math.sin(angle);

        rawL += vol * gainL;
        rawR += vol * gainR;
      }

      // Check WebAudio master analyser if synth/audio streams are active
      let webL = 0;
      let webR = 0;
      const analyser = audioEngine.getMasterAnalyser();
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        let sumL = 0;
        let sumR = 0;
        const half = Math.floor(data.length / 2);
        for (let i = 0; i < half; i++) sumL += data[i];
        for (let i = half; i < data.length; i++) sumR += data[i];
        webL = (sumL / half) / 255;
        webR = (sumR / (data.length - half)) / 255;
      }

      // Filter attenuation factor (if master cutoff is lowered)
      const filterFactor = Math.min(1, Math.max(0.35, masterFilter / 14000));

      // Calculate composite acoustic energy (normalized to 0..100)
      const effectiveInputL = Math.max(rawL > 0 ? (rawL / Math.max(1, Math.sqrt(activeTrackCount))) : 0, webL);
      const effectiveInputR = Math.max(rawR > 0 ? (rawR / Math.max(1, Math.sqrt(activeTrackCount))) : 0, webR);

      const targetL = Math.max(
        0,
        Math.min(100, effectiveInputL * (masterVolume / 1.15) * 90 * filterFactor)
      );
      const targetR = Math.max(
        0,
        Math.min(100, effectiveInputR * (masterVolume / 1.15) * 90 * filterFactor)
      );

      // Smooth attack (~15ms) and decay (~150ms)
      smoothL = targetL > smoothL ? smoothL * 0.5 + targetL * 0.5 : smoothL * 0.85 + targetL * 0.15;
      smoothR = targetR > smoothR ? smoothR * 0.5 + targetR * 0.5 : smoothR * 0.85 + targetR * 0.15;

      setMasterVuLeft(Math.round(smoothL));
      setMasterVuRight(Math.round(smoothR));
    };

    updateMasterVU();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isMuted, masterVolume, masterFilter, tracks]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleLowEqChange = (val: number) => {
    setLowEq(val);
    audioEngine.setMasterLowEq(val);
  };

  const handleMidEqChange = (val: number) => {
    setMidEq(val);
    audioEngine.setMasterMidEq(val);
  };

  const handleHighEqChange = (val: number) => {
    setHighEq(val);
    audioEngine.setMasterHighEq(val);
  };

  const handleToggleRecord = async () => {
    if (!isRecording) {
      const started = audioEngine.startRecording();
      if (started) {
        setIsRecording(true);
      }
    } else {
      setIsRecording(false);
      const blob = await audioEngine.stopRecording();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SoundscapeAI_MasterMix_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(prevVolume);
    } else {
      setPrevVolume(masterVolume);
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getDbString = () => {
    if (isMuted) return 'MUTE';
    if (masterVolume <= 0.001) return '-inf';
    const db = (masterVolume - 1) * 20;
    return `${db > 0 ? '+' : ''}${db.toFixed(1)}dB`;
  };

  const activeSegmentsL = isMuted ? 0 : Math.round((masterVuLeft / 100) * TOTAL_SEGMENTS);
  const activeSegmentsR = isMuted ? 0 : Math.round((masterVuRight / 100) * TOTAL_SEGMENTS);

  return (
    <div className="w-full max-w-[280px] sm:w-56 shrink-0 h-[470px] rounded-2xl bg-slate-900/95 border-2 border-cyan-500/40 p-2.5 flex flex-col justify-between shadow-2xl relative">
      {/* Top Cyan Accent Strip */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-90 shadow-sm" />

      {/* 1. Header: Bus Maestro, IA Balance, Mute */}
      <div className="pt-1 border-b border-slate-800/90 pb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Máster
            </h3>
          </div>
          <p className="text-[9px] text-slate-400">Canal Principal & DSP</p>
        </div>

        <div className="flex items-center gap-1">
          {/* AI Balance Trigger */}
          <button
            onClick={onTriggerAiBalance}
            disabled={isAiBalancing}
            title="Optimizar acústica con Ingeniero IA"
            className="p-1 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 hover:text-white hover:bg-cyan-900 transition-all cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiBalancing ? 'animate-spin' : ''}`} />
          </button>

          {/* Master Mute */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Activar sonido master' : 'Silenciar master'}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. 2x2 Master Knobs */}
      <div className="grid grid-cols-2 gap-x-1 gap-y-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80 my-1">
        <RotaryKnob
          label="Rev. Master"
          value={masterReverb}
          min={0}
          max={1}
          step={0.05}
          size={36}
          compact={true}
          displayValue={`${Math.round(masterReverb * 100)}%`}
          color="#06B6D4"
          onChange={onReverbChange}
        />

        <RotaryKnob
          label="Corte Master"
          value={masterFilter}
          min={500}
          max={20000}
          step={100}
          size={36}
          compact={true}
          displayValue={masterFilter >= 1000 ? `${(masterFilter / 1000).toFixed(1)}k` : `${masterFilter}Hz`}
          color="#A855F7"
          onChange={onFilterChange}
        />

        <RotaryKnob
          label="Eco Master"
          value={masterDelay}
          min={0}
          max={1}
          step={0.05}
          size={36}
          compact={true}
          displayValue={`${Math.round(masterDelay * 100)}%`}
          color="#8B5CF6"
          onChange={(val) => {
            setMasterDelay(val);
            audioEngine.setMasterDelay(val);
          }}
        />

        <RotaryKnob
          label="Calidez Cinta"
          value={masterWarmth}
          min={0}
          max={1}
          step={0.05}
          size={36}
          compact={true}
          displayValue={`${Math.round(masterWarmth * 100)}%`}
          color="#EC4899"
          onChange={(val) => {
            setMasterWarmth(val);
            audioEngine.setMasterWarmth(val);
          }}
        />
      </div>

      {/* 3. Master Dual Stereo VU Meter + Precision Master Fader */}
      <div className="bg-slate-950/80 rounded-lg border border-slate-800/80 p-2 flex flex-col shadow-inner">
        {/* Readout */}
        <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mb-1 px-1">
          <span className="uppercase text-cyan-400 font-bold">Master</span>
          <span className={`font-bold tabular-nums ${isMuted ? 'text-rose-400' : 'text-slate-200'}`}>
            {getDbString()} ({Math.round(masterVolume * 100)}%)
          </span>
        </div>

        {/* Fader bay: Scale + Fader + Dual L/R Meters */}
        <div className="relative h-28 flex items-center justify-between gap-1">
          {/* Scale */}
          <div className="flex flex-col justify-between h-full text-[7px] font-mono text-slate-500 select-none py-0.5 w-4 text-right pr-0.5">
            <span>+6</span>
            <span className="text-slate-400 font-bold">0</span>
            <span>-6</span>
            <span>-12</span>
            <span>-24</span>
            <span>-∞</span>
          </div>

          {/* Master Fader Slot */}
          <div className="relative flex-1 h-full flex items-center justify-center">
            <div className="absolute w-2 h-full bg-slate-900 rounded-full border border-slate-800/90 shadow-inner flex items-center justify-center">
              <div className="absolute top-[30%] w-3.5 h-0.5 bg-cyan-600/70 -translate-y-1/2" />
            </div>

            <input
              type="range"
              min="0"
              max="1.2"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20 [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
              title={`Volumen Maestro: ${Math.round(masterVolume * 100)}%`}
            />

            {/* Custom Master Fader Cap */}
            <div
              className="absolute w-9 h-4 rounded-sm bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 border border-cyan-400/80 shadow-md flex items-center justify-center pointer-events-none transition-transform z-10"
              style={{
                bottom: `calc(${Math.min(100, (masterVolume / 1.2) * 100)}% - 8px)`,
              }}
            >
              <div className="w-5 h-0.5 rounded-full bg-cyan-400 shadow-sm" />
            </div>
          </div>

          {/* Dual Stereo LED Ladder (L & R) */}
          <div className="flex items-center gap-[2px] h-full pl-1">
            {/* Left Channel */}
            <div className="flex flex-col-reverse justify-between h-full w-1.5 gap-[2px]">
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
                const isLit = idx < activeSegmentsL;
                let activeColor = '#10B981';
                let inactiveColor = '#064e3b20';
                if (idx >= 12) {
                  activeColor = '#EF4444';
                  inactiveColor = '#7f1d1d20';
                } else if (idx >= 9) {
                  activeColor = '#F59E0B';
                  inactiveColor = '#78350f20';
                }

                return (
                  <div
                    key={idx}
                    className="w-1.5 h-[4px] rounded-[1px] transition-all duration-75"
                    style={{
                      backgroundColor: isLit ? activeColor : inactiveColor,
                      boxShadow: isLit ? `0 0 3px ${activeColor}80` : 'none',
                      opacity: isLit ? 1 : 0.4,
                    }}
                  />
                );
              })}
            </div>

            {/* Right Channel */}
            <div className="flex flex-col-reverse justify-between h-full w-1.5 gap-[2px]">
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
                const isLit = idx < activeSegmentsR;
                let activeColor = '#10B981';
                let inactiveColor = '#064e3b20';
                if (idx >= 12) {
                  activeColor = '#EF4444';
                  inactiveColor = '#7f1d1d20';
                } else if (idx >= 9) {
                  activeColor = '#F59E0B';
                  inactiveColor = '#78350f20';
                }

                return (
                  <div
                    key={idx}
                    className="w-1.5 h-[4px] rounded-[1px] transition-all duration-75"
                    style={{
                      backgroundColor: isLit ? activeColor : inactiveColor,
                      boxShadow: isLit ? `0 0 3px ${activeColor}80` : 'none',
                      opacity: isLit ? 1 : 0.4,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* L / R Indicator */}
        <div className="flex justify-end gap-1.5 text-[7px] font-mono text-slate-500 pr-0.5 mt-0.5">
          <span>L</span>
          <span>R</span>
        </div>
      </div>

      {/* 4. Bottom Utility Drawer */}
      <div className="space-y-1 pt-1 border-t border-slate-800">
        <div className="grid grid-cols-2 gap-1.5">
          {/* Master Record Button */}
          <button
            onClick={handleToggleRecord}
            className={`py-1.5 px-2 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Grabar mezcla maestra en alta fidelidad"
          >
            <Circle className={`w-2.5 h-2.5 ${isRecording ? 'fill-current' : 'text-rose-400 fill-rose-400'}`} />
            <span>{isRecording ? formatSec(recordingSeconds) : 'Grabar Mix'}</span>
          </button>

          {/* EQ Toggle */}
          <button
            onClick={() => setShowEqDrawer(!showEqDrawer)}
            className={`py-1.5 px-2 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              showEqDrawer
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-2.5 h-2.5" />
            <span>EQ 3-Band</span>
          </button>
        </div>

        {/* 3-Band EQ Popover Drawer */}
        {showEqDrawer && (
          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[8px] font-mono animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Graves 100Hz: {lowEq}dB</span>
              <input
                type="range"
                min="-12"
                max="12"
                value={lowEq}
                onChange={(e) => handleLowEqChange(parseInt(e.target.value))}
                className="w-20 h-1 bg-slate-800 accent-cyan-400 rounded cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Medios 1.2k: {midEq}dB</span>
              <input
                type="range"
                min="-12"
                max="12"
                value={midEq}
                onChange={(e) => handleMidEqChange(parseInt(e.target.value))}
                className="w-20 h-1 bg-slate-800 accent-amber-400 rounded cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Agudos 8k: {highEq}dB</span>
              <input
                type="range"
                min="-12"
                max="12"
                value={highEq}
                onChange={(e) => handleHighEqChange(parseInt(e.target.value))}
                className="w-20 h-1 bg-slate-800 accent-purple-400 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
