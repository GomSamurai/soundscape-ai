import React, { useState } from 'react';
import { ChannelTrack } from '../types/soundscape';
import { Brain, X, Plus, Sparkles, Waves, Headphones, Radio } from 'lucide-react';

interface BinauralTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (track: ChannelTrack) => void;
}

interface BrainwaveBand {
  name: string;
  hzRange: string;
  defaultHz: number;
  description: string;
  color: string;
}

const BRAINWAVE_BANDS: BrainwaveBand[] = [
  {
    name: 'Delta',
    hzRange: '0.5 – 4 Hz',
    defaultHz: 2.5,
    description: 'Sueño profundo reparador, descanso físico somático y desconexión consciente.',
    color: '#6366F1',
  },
  {
    name: 'Theta',
    hzRange: '4 – 8 Hz',
    defaultHz: 6.0,
    description: 'Meditación profunda, memoria episódica, creatividad introspectiva y calma mental.',
    color: '#8B5CF6',
  },
  {
    name: 'Alpha',
    hzRange: '8 – 13 Hz',
    defaultHz: 10.0,
    description: 'Estado de flujo (flow state), relajación lúcida, aprendizaje acelerado y serenidad activa.',
    color: '#06B6D4',
  },
  {
    name: 'Beta',
    hzRange: '13 – 30 Hz',
    defaultHz: 18.0,
    description: 'Enfoque analítico agudo, resolución de problemas lógicos y estado de vigilia.',
    color: '#F59E0B',
  },
  {
    name: 'Gamma',
    hzRange: '30 – 50 Hz',
    defaultHz: 40.0,
    description: 'Procesamiento de información de alta velocidad, integración cognitiva y lucidez extrema.',
    color: '#EC4899',
  },
];

const CARRIER_FREQUENCIES = [
  { name: '432 Hz', hz: 432, desc: 'Afinación Natural Pitagórica' },
  { name: '528 Hz', hz: 528, desc: 'Frecuencia Solfeggio de Transformación' },
  { name: '210 Hz', hz: 210, desc: 'Frecuencia de Resonancia Sinodal' },
  { name: '174 Hz', hz: 174, desc: 'Alivio y Estabilidad Somática' },
];

export const BinauralTunerModal: React.FC<BinauralTunerModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
}) => {
  const [selectedBand, setSelectedBand] = useState<BrainwaveBand>(BRAINWAVE_BANDS[1]); // Theta default
  const [mode, setMode] = useState<'binaural' | 'isochronic'>('binaural');
  const [beatHz, setBeatHz] = useState<number>(6.0);
  const [carrierHz, setCarrierHz] = useState<number>(432);

  const handleBandSelect = (band: BrainwaveBand) => {
    setSelectedBand(band);
    setBeatHz(band.defaultHz);
  };

  const handleAddBinauralTrack = () => {
    const isIso = mode === 'isochronic';
    const newTrack: ChannelTrack = {
      id: `ch_${isIso ? 'iso' : 'binaural'}_${Date.now()}`,
      name: `${isIso ? 'Isocrónico' : 'Binaural'} ${selectedBand.name} (${beatHz.toFixed(1)} Hz / ${carrierHz} Hz)`,
      soundKey: `${isIso ? 'isochronic' : 'binaural'}_${beatHz.toFixed(1)}`,
      type: 'synthesizer',
      synthType: isIso ? 'isochronic' : 'binaural',
      carrierHz,
      beatHz,
      volume: 0.45,
      pan: 0,
      filterCutoff: 16000,
      filterType: 'lowpass',
      filterQ: 1.0,
      reverbSend: isIso ? 0.25 : 0.2,
      muted: false,
      solo: false,
      playbackRate: 1.0,
      loop: true,
      category: 'Binaural & Drones',
      color: selectedBand.color,
      role: isIso ? 'pulso cerebral (altavoces)' : 'entrenamiento cerebral (auriculares)',
    };

    onAddTrack(newTrack);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-950 border border-violet-500/30 text-violet-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Sintonizador Neuro-Acústico Binaural
              </h2>
              <p className="text-xs text-slate-400">
                Calibra frecuencias cerebrales exactas (Delta, Theta, Alpha, Beta, Gamma)
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

        {/* Brainwave Bands Selection */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Mode Switch: Binaural vs Isochronic */}
          <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setMode('binaural')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'binaural'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Ondas Binaurales (Auriculares)</span>
            </button>
            <button
              onClick={() => setMode('isochronic')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'isochronic'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Tonos Isocrónicos (Altavoces)</span>
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">
              Selecciona el estado mental deseado:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BRAINWAVE_BANDS.map((band) => (
                <button
                  key={band.name}
                  onClick={() => handleBandSelect(band)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedBand.name === band.name
                      ? 'bg-slate-800 border-violet-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-bold text-sm"
                      style={{ color: band.color }}
                    >
                      {band.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {band.hzRange}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                    {band.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Hz Fine Tuning Slider */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Frecuencia Binaural Diferencial:
              </span>
              <span className="text-base font-mono font-bold text-cyan-400">
                {beatHz.toFixed(1)} Hz
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max="45"
              step="0.1"
              value={beatHz}
              onChange={(e) => setBeatHz(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>0.5 Hz (Delta)</span>
              <span>8.0 Hz (Theta/Alpha)</span>
              <span>45.0 Hz (Gamma)</span>
            </div>
          </div>

          {/* Carrier Tone Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">
              Tono Portador Base (Afinación Armónica):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CARRIER_FREQUENCIES.map((carrier) => (
                <button
                  key={carrier.hz}
                  onClick={() => setCarrierHz(carrier.hz)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    carrierHz === carrier.hz
                      ? 'bg-slate-800 border-cyan-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">
                      {carrier.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {carrier.hz} Hz
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                    {carrier.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Acoustic calculation summary */}
          <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs text-violet-200 flex items-center justify-between font-mono">
            {mode === 'binaural' ? (
              <>
                <span>Oído Izquierdo: {carrierHz} Hz</span>
                <Waves className="w-4 h-4 text-violet-400 animate-pulse" />
                <span>Oído Derecho: {(carrierHz + beatHz).toFixed(1)} Hz</span>
              </>
            ) : (
              <>
                <span>Tono Portador: {carrierHz} Hz</span>
                <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Pulsos Isocrónicos: {beatHz.toFixed(1)} pulsos/segundo</span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleAddBinauralTrack}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Inyectar Onda en la Mezcla</span>
          </button>
        </div>
      </div>
    </div>
  );
};
