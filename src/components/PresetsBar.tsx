import React from 'react';
import { FACTORY_PRESETS } from '../services/soundLibrary';
import { SoundscapeProject } from '../types/soundscape';
import { Sparkles, Radio } from 'lucide-react';

interface PresetsBarProps {
  activeProjectId: string;
  onSelectPreset: (preset: SoundscapeProject) => void;
  onOpenAiGenerator: () => void;
}

export const PresetsBar: React.FC<PresetsBarProps> = ({
  activeProjectId,
  onSelectPreset,
  onOpenAiGenerator,
}) => {
  return (
    <div className="w-full flex items-center justify-between gap-4 overflow-x-auto pb-1 select-none">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0">
          Presets de Fábrica:
        </span>

        <div className="flex items-center gap-1.5">
          {FACTORY_PRESETS.map((preset) => {
            const isActive = activeProjectId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
                title={preset.description}
              >
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onOpenAiGenerator}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/60 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Diseñar Nuevo Paisaje IA</span>
      </button>
    </div>
  );
};
