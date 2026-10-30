import React, { useState, useEffect } from 'react';
import {
  SoundscapeProject,
  ChannelTrack,
  MidiScale,
  MidiPlayMode,
  MidiSoundPreset,
  DroneRootNote,
  DroneTexture,
  SynthModel,
} from '../types/soundscape';
import {
  X,
  Check,
  Save,
  Copy,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Volume2,
  Sparkles,
  Palette,
  Tags,
  Radio,
  Music,
  Video,
  Activity,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  Wand2,
} from 'lucide-react';

interface SceneEditorModalProps {
  isOpen: boolean;
  project: SoundscapeProject | null;
  onClose: () => void;
  onSave: (updatedProject: SoundscapeProject) => void;
  onSaveAsNew?: (newProject: SoundscapeProject) => void;
  onLoadAndApply?: (project: SoundscapeProject) => void;
}

type TabType = 'info' | 'master' | 'channels';

// Extract YouTube ID from full URL or return sanitized 11-char ID
function extractYouTubeId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  if (!trimmed) return '';
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return trimmed;
}

const CATEGORY_PRESETS = [
  'YouTube Videos',
  'Naturaleza & Lluvia',
  'Binaural & Meditación',
  'Urbano & Lo-Fi',
  'Espacio & Sci-Fi',
  'Música & Teclados',
  'Minimalista',
];

const THEME_OPTIONS: Array<{
  id: SoundscapeProject['visualTheme'];
  label: string;
  color: string;
  ring: string;
}> = [
  { id: 'cyan', label: 'Cyan Cósmico', color: 'bg-cyan-500', ring: 'ring-cyan-400' },
  { id: 'amber', label: 'Ámbar Cálido', color: 'bg-amber-500', ring: 'ring-amber-400' },
  { id: 'emerald', label: 'Esmeralda Zen', color: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { id: 'violet', label: 'Violeta Místico', color: 'bg-violet-500', ring: 'ring-violet-400' },
  { id: 'sky', label: 'Cielo Profundo', color: 'bg-sky-500', ring: 'ring-sky-400' },
  { id: 'rose', label: 'Rosa Neón', color: 'bg-rose-500', ring: 'ring-rose-400' },
];

const SUGGESTED_TAGS = [
  'YouTube',
  '4K',
  'Lluvia',
  'Chimenea',
  'Lo-Fi',
  'Acordes',
  'Binaural',
  'Meditación',
  'Naturaleza',
  'Café',
  'Cyberpunk',
  'Cuencos',
  'Ventisca',
];

export const SceneEditorModal: React.FC<SceneEditorModalProps> = ({
  isOpen,
  project,
  onClose,
  onSave,
  onSaveAsNew,
  onLoadAndApply,
}) => {
  const [formData, setFormData] = useState<SoundscapeProject | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (project) {
      // Clone project to allow independent editing
      setFormData(JSON.parse(JSON.stringify(project)));
    }
  }, [project, isOpen]);

  if (!isOpen || !formData) return null;

  const handleFieldChange = <K extends keyof SoundscapeProject>(
    field: K,
    value: SoundscapeProject[K]
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Tag Management
  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || newTagInput).trim();
    if (!tag) return;
    const currentTags = formData.tags || [];
    if (!currentTags.includes(tag)) {
      handleFieldChange('tags', [...currentTags, tag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = formData.tags || [];
    handleFieldChange(
      'tags',
      currentTags.filter((t) => t !== tagToRemove)
    );
  };

  // Channel Management
  const handleUpdateChannel = (channelId: string, partial: Partial<ChannelTrack>) => {
    const nextChannels = formData.channels.map((ch) => {
      if (ch.id === channelId) {
        const updated = { ...ch, ...partial };
        // If youtubeVideoId is updated, update thumbnail as well
        if (partial.youtubeVideoId !== undefined) {
          const extracted = extractYouTubeId(partial.youtubeVideoId);
          updated.youtubeVideoId = extracted;
          if (extracted) {
            updated.youtubeThumbnail = `https://img.youtube.com/vi/${extracted}/hqdefault.jpg`;
          }
        }
        return updated;
      }
      return ch;
    });
    handleFieldChange('channels', nextChannels);
  };

  const handleDeleteChannel = (channelId: string) => {
    if (formData.channels.length <= 1) {
      alert('La escena debe contener al menos 1 canal de audio.');
      return;
    }
    const filtered = formData.channels.filter((ch) => ch.id !== channelId);
    handleFieldChange('channels', filtered);
  };

  const handleMoveChannel = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.channels.length) return;
    const next = [...formData.channels];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    handleFieldChange('channels', next);
  };

  const toggleExpandChannel = (id: string) => {
    setExpandedChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Submission Handlers
  const handleSaveSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert('El nombre de la escena es obligatorio.');
      return;
    }
    const finalProject: SoundscapeProject = {
      ...formData,
      name: formData.name.trim(),
      tagline: formData.tagline?.trim() || '',
      description: formData.description?.trim() || '',
      updatedAt: new Date().toISOString(),
    };
    onSave(finalProject);
    onClose();
  };

  const handleSaveAsNewSubmit = () => {
    if (!formData.name.trim()) return;
    const cloned: SoundscapeProject = {
      ...formData,
      id: `saved_${Date.now()}`,
      name: `${formData.name.trim()} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPreset: false,
    };
    if (onSaveAsNew) {
      onSaveAsNew(cloned);
    } else {
      onSave(cloned);
    }
    onClose();
  };

  const handleLoadAndApplySubmit = () => {
    if (!formData.name.trim()) return;
    const finalProject: SoundscapeProject = {
      ...formData,
      name: formData.name.trim(),
      updatedAt: new Date().toISOString(),
    };
    onSave(finalProject);
    if (onLoadAndApply) {
      onLoadAndApply(finalProject);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/90 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white truncate">
                  Editar Escena: <span className="text-cyan-400">{formData.name || 'Sin título'}</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {formData.channels.length} pistas
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Modifica los datos generales, balance acústico master y configuración de canales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950 border-b border-slate-800 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'info'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Tags className="w-4 h-4 text-cyan-400" />
            <span>Información & Metadatos</span>
          </button>

          <button
            onClick={() => setActiveTab('master')}
            className={`py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'master'
                ? 'bg-orange-950/80 border-orange-500 text-orange-300 shadow-sm shadow-orange-500/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Volume2 className="w-4 h-4 text-orange-400" />
            <span>Master & Acústica Inicial</span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`py-2 px-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === 'channels'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Canales & Pistas ({formData.channels.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-5 text-xs">
          {/* TAB 1: INFORMACIÓN GENERAL & METADATOS */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              {/* Nombre & Lema */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>Nombre de la Escena</span>
                    <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Ej: Cafetería Lo-Fi en París"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200">
                    Lema o Subtítulo Resumido (Tagline)
                  </label>
                  <input
                    type="text"
                    value={formData.tagline || ''}
                    onChange={(e) => handleFieldChange('tagline', e.target.value)}
                    placeholder="Ej: Lluvia en ventanales, leña 4K y calidez acústica"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Descripción Completa */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">
                  Descripción o Notas Sensoriales
                </label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Describe el entorno, sensaciones acústicas, sugerencias de uso o instrumentos generativos presentes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
                />
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <label className="font-bold text-slate-200">Categoría de la Escena</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CATEGORY_PRESETS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleFieldChange('category', cat)}
                      className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-[11px] font-medium ${
                        formData.category === cat
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  placeholder="O escribe una categoría personalizada..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs mt-1"
                />
              </div>

              {/* Etiquetas / Tags */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <label className="font-bold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tags className="w-4 h-4 text-cyan-400" />
                    Etiquetas de la Escena (Tags)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formData.tags?.length || 0} asignadas
                  </span>
                </label>

                {/* Chips actuales */}
                <div className="flex flex-wrap items-center gap-1.5 min-h-7">
                  {(formData.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-medium"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-400 text-cyan-400/80 transition-colors cursor-pointer"
                        title={`Eliminar etiqueta ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(!formData.tags || formData.tags.length === 0) && (
                    <span className="text-slate-500 text-xs italic">Sin etiquetas añadidas.</span>
                  )}
                </div>

                {/* Input para nueva tag */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Escribe una etiqueta y presiona Enter o clic en Añadir..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                {/* Sugerencias de tags */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                    Sugerencias rápidas:
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {SUGGESTED_TAGS.filter((t) => !(formData.tags || []).includes(t)).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleAddTag(st)}
                        className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-cyan-300 border border-slate-800 cursor-pointer transition-colors"
                      >
                        + {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tema Visual */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-fuchsia-400" />
                  Color Neón & Tema Visual de la Escena
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {THEME_OPTIONS.map((thm) => (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => handleFieldChange('visualTheme', thm.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        formData.visualTheme === thm.id
                          ? 'bg-slate-900 border-white/60 shadow-lg ring-2 ' + thm.ring
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full ${thm.color} shadow-sm`} />
                      <span className="text-[11px] font-semibold text-slate-200 text-center">
                        {thm.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MASTER & ACÚSTICA INICIAL */}
          {activeTab === 'master' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-slate-100">Controles de Mezcla General (Master)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Se aplicarán cada vez que se cargue la escena
                  </span>
                </div>

                {/* Volumen Master */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Volumen General (Master Gain)</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 font-mono text-cyan-300 font-bold">
                      {Math.round((formData.masterVolume ?? 0.85) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.masterVolume ?? 0.85}
                    onChange={(e) => handleFieldChange('masterVolume', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Reverb Espacial Master */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">Reverberación Espacial Master</span>
                      <p className="text-[10px] text-slate-400">
                        Cámara de convolución para profundidad y dimensión acústica
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 font-mono text-fuchsia-300 font-bold">
                      {Math.round((formData.masterReverb ?? 0.3) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.masterReverb ?? 0.3}
                    onChange={(e) => handleFieldChange('masterReverb', parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Filtro Cutoff Master */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">Filtro de Frecuencia Master (Cutoff)</span>
                      <p className="text-[10px] text-slate-400">
                        Corte de frecuencias altas (de oscuridad envolvente a nitidez cristalina)
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 font-mono text-amber-300 font-bold">
                      {Math.round(formData.masterFilter ?? 20000)} Hz
                    </span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="20000"
                    step="100"
                    value={formData.masterFilter ?? 20000}
                    onChange={(e) => handleFieldChange('masterFilter', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Eco / Delay Master */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">Envío de Delay Master</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 font-mono text-cyan-300 font-bold">
                        {Math.round((formData.masterDelay ?? 0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={formData.masterDelay ?? 0}
                      onChange={(e) => handleFieldChange('masterDelay', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">Calidez Analógica Cinta</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 font-mono text-rose-300 font-bold">
                        {Math.round((formData.masterWarmth ?? 0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={formData.masterWarmth ?? 0}
                      onChange={(e) => handleFieldChange('masterWarmth', parseFloat(e.target.value))}
                      className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Frecuencia Binaural Portadora */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200">Frecuencia Base Portadora (Binaural Carrier)</span>
                      <p className="text-[10px] text-slate-400">
                        Tono fundamental para ondas alfa, theta o solfeggio
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[432, 528, 210, 136.1].map((hz) => (
                        <button
                          key={hz}
                          type="button"
                          onClick={() => handleFieldChange('binauralFreqHz', hz)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 text-[10px] font-mono cursor-pointer"
                        >
                          {hz} Hz
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    value={formData.binauralFreqHz || ''}
                    onChange={(e) => handleFieldChange('binauralFreqHz', parseFloat(e.target.value) || undefined)}
                    placeholder="432"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CANALES & PISTAS DE LA ESCENA */}
          {activeTab === 'channels' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between px-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Pistas y Fuentes Acústicas ({formData.channels.length})
                </span>
                <span className="text-[10px] text-slate-500">
                  Usa las flechas para reordenar o edita nombres, videos y volúmenes individuales
                </span>
              </div>

              <div className="space-y-3">
                {formData.channels.map((ch, idx) => {
                  const isExpanded = expandedChannels[ch.id] ?? true;

                  return (
                    <div
                      key={ch.id}
                      className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-sm transition-all"
                    >
                      {/* Channel Card Header */}
                      <div className="p-3 bg-slate-900/90 flex items-center justify-between gap-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                            {idx + 1}
                          </span>

                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: ch.color || '#06B6D4' }}
                          />

                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs truncate block">
                              {ch.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {ch.type === 'youtube_video'
                                ? 'YouTube Video'
                                : ch.type === 'midi_random'
                                ? 'Instrumento MIDI'
                                : ch.type === 'drone_ambient'
                                ? 'Drone Sintetizador'
                                : 'Generador Audio'}
                              {ch.role ? ` · ${ch.role}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveChannel(idx, 'up')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Subir posición"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === formData.channels.length - 1}
                            onClick={() => handleMoveChannel(idx, 'down')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Bajar posición"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleExpandChannel(ch.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer ml-1"
                            title={isExpanded ? 'Contraer' : 'Expandir'}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteChannel(ch.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer ml-1 transition-colors"
                            title="Eliminar canal de esta escena"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Channel Form */}
                      {isExpanded && (
                        <div className="p-4 space-y-3.5 bg-slate-950/40">
                          {/* Nombre & Rol */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-400">
                                Nombre de la Pista
                              </label>
                              <input
                                type="text"
                                value={ch.name}
                                onChange={(e) => handleUpdateChannel(ch.id, { name: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400 font-medium"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-400">
                                Rol Acústico
                              </label>
                              <input
                                type="text"
                                value={ch.role || ''}
                                onChange={(e) => handleUpdateChannel(ch.id, { role: e.target.value })}
                                placeholder="Atmósfera / Textura"
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
                              />
                            </div>
                          </div>

                          {/* YouTube Video Config */}
                          {ch.type === 'youtube_video' && (
                            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                              <label className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5" />
                                Video de YouTube (Enlace o ID de 11 caracteres)
                              </label>
                              <div className="flex items-center gap-3">
                                {ch.youtubeThumbnail && (
                                  <img
                                    src={ch.youtubeThumbnail}
                                    alt="Miniatura"
                                    className="w-20 h-12 object-cover rounded-lg border border-slate-700 shrink-0"
                                    onError={(e) => {
                                      // Fallback placeholder if image 404
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={ch.youtubeVideoId || ''}
                                    onChange={(e) => handleUpdateChannel(ch.id, { youtubeVideoId: e.target.value })}
                                    placeholder="Pega enlace de YouTube (ej: https://www.youtube.com/watch?v=...) o ID"
                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-rose-400"
                                  />
                                  <span className="text-[10px] text-slate-500 font-mono block">
                                    ID activo: {ch.youtubeVideoId || 'No asignado'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* MIDI Random Config */}
                          {ch.type === 'midi_random' && (
                            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                                  Preset de Sonido
                                </label>
                                <select
                                  value={ch.midiSoundPreset || 'rhodes'}
                                  onChange={(e) => handleUpdateChannel(ch.id, { midiSoundPreset: e.target.value as MidiSoundPreset })}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                                >
                                  <option value="rhodes">Rhodes Eléctrico</option>
                                  <option value="warm_poly">Polifónico Cálido</option>
                                  <option value="zen_harp">Arpa Zen Japonesa</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                                  Escala Armónica
                                </label>
                                <select
                                  value={ch.midiScale || 'pentatonic_minor'}
                                  onChange={(e) => handleUpdateChannel(ch.id, { midiScale: e.target.value as MidiScale })}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                                >
                                  <option value="pentatonic_minor">Pentatónica Menor</option>
                                  <option value="pentatonic_major">Pentatónica Mayor</option>
                                  <option value="dorian">Dórica</option>
                                  <option value="lydian">Lidia</option>
                                  <option value="hirajoshi">Hirajoshi</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                                  Tempo (BPM: {ch.midiBpm || 72})
                                </label>
                                <input
                                  type="range"
                                  min="40"
                                  max="140"
                                  step="1"
                                  value={ch.midiBpm || 72}
                                  onChange={(e) => handleUpdateChannel(ch.id, { midiBpm: parseInt(e.target.value, 10) })}
                                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer mt-2"
                                />
                              </div>
                            </div>
                          )}

                          {/* Drone Ambient Config */}
                          {ch.type === 'drone_ambient' && (
                            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[10px] uppercase font-bold text-cyan-400 block mb-1">
                                  Nota Raíz
                                </label>
                                <select
                                  value={ch.droneRootNote || 'D'}
                                  onChange={(e) => handleUpdateChannel(ch.id, { droneRootNote: e.target.value as DroneRootNote })}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                                >
                                  {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold text-cyan-400 block mb-1">
                                  Textura Armónica
                                </label>
                                <select
                                  value={ch.droneTexture || 'warm_pad'}
                                  onChange={(e) => handleUpdateChannel(ch.id, { droneTexture: e.target.value as DroneTexture })}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                                >
                                  <option value="warm_pad">Pad Cálido Analógico</option>
                                  <option value="dark_void">Vacío Profundo Cósmico</option>
                                  <option value="crystal_shimmer">Brillo Cristalino Shimmer</option>
                                  <option value="tibetan_om">Om Tibetano 432 Hz</option>
                                  <option value="solar_wind">Viento Solar Etéreo</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Volumen y Paneo Sliders */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-300">Volumen Pista</span>
                                <span className="font-mono text-cyan-300 font-bold text-[11px]">
                                  {Math.round(ch.volume * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={ch.volume}
                                onChange={(e) => handleUpdateChannel(ch.id, { volume: parseFloat(e.target.value) })}
                                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-300">Paneo Estéreo</span>
                                <span className="font-mono text-indigo-300 font-bold text-[11px]">
                                  {ch.pan === 0
                                    ? 'Centro'
                                    : ch.pan < 0
                                    ? `${Math.round(Math.abs(ch.pan) * 100)}% Izq`
                                    : `${Math.round(ch.pan * 100)}% Der`}
                                </span>
                              </div>
                              <input
                                type="range"
                                min="-1"
                                max="1"
                                step="0.05"
                                value={ch.pan}
                                onChange={(e) => handleUpdateChannel(ch.id, { pan: parseFloat(e.target.value) })}
                                className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {onSaveAsNew && (
              <button
                type="button"
                onClick={handleSaveAsNewSubmit}
                title="Crea un clon de esta escena con tus cambios guardados con un nuevo ID"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Guardar como Copia Nueva</span>
              </button>
            )}

            {onLoadAndApply && (
              <button
                type="button"
                onClick={handleLoadAndApplySubmit}
                title="Guarda los cambios y carga inmediatamente este paisaje sonoro en el reproductor"
                className="px-3.5 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Cargar y Aplicar a la Suite</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSaveSubmit()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
