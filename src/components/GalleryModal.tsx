import React, { useState, useRef } from 'react';
import { SoundscapeProject } from '../types/soundscape';
import { CloudStorageService } from '../services/cloudStorage';
import { SceneEditorModal } from './SceneEditorModal';
import {
  FolderHeart,
  Cloud,
  Download,
  Upload,
  Play,
  Trash2,
  X,
  Check,
  Save,
  Clock,
  Sparkles,
  Edit3,
} from 'lucide-react';

interface GalleryModalProps {
  isOpen: boolean;
  activeProject: SoundscapeProject;
  onClose: () => void;
  onLoadProject: (project: SoundscapeProject) => void;
  onSaveCurrentAsNew: (name: string, description: string) => void;
  onUpdateActiveProject?: (project: SoundscapeProject) => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  activeProject,
  onClose,
  onLoadProject,
  onSaveCurrentAsNew,
  onUpdateActiveProject,
}) => {
  const [projects, setProjects] = useState<SoundscapeProject[]>(() =>
    CloudStorageService.getSavedProjects()
  );
  const [saveName, setSaveName] = useState(activeProject.name || '');
  const [saveDesc, setSaveDesc] = useState(activeProject.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<SoundscapeProject | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reloadProjects = () => {
    setProjects(CloudStorageService.getSavedProjects());
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    onSaveCurrentAsNew(saveName.trim(), saveDesc.trim());
    reloadProjects();
    setIsSaving(false);
  };

  const handleDelete = (id: string) => {
    const updated = CloudStorageService.deleteProject(id);
    setProjects(updated);
  };

  const handleSaveEditedProject = (updatedProject: SoundscapeProject) => {
    CloudStorageService.updateProject(updatedProject);
    reloadProjects();
    if (onUpdateActiveProject && activeProject.id === updatedProject.id) {
      onUpdateActiveProject(updatedProject);
    }
    setSyncStatus(`Escena "${updatedProject.name}" guardada con éxito.`);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleSaveAsNewFromEditor = (newProject: SoundscapeProject) => {
    CloudStorageService.saveProjectToGallery(newProject);
    reloadProjects();
    setSyncStatus(`Copia creada: "${newProject.name}".`);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleSyncToCloud = async (project: SoundscapeProject) => {
    setSyncStatus('Sincronizando...');
    const result = await CloudStorageService.syncToCloud(project);
    if (result.success) {
      setSyncStatus('¡Sincronizado con éxito en la nube!');
      setTimeout(() => setSyncStatus(null), 3000);
    } else {
      setSyncStatus(`Error: ${result.error || 'Fallo de red'}`);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  const handleExportFull = () => {
    CloudStorageService.exportFullGalleryAsJSON();
  };

  const handleExportSingle = (project: SoundscapeProject) => {
    CloudStorageService.exportProjectAsJSON(project);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = CloudStorageService.parseImportedJSON(content);

      if (parsed.success) {
        if (parsed.projects) {
          parsed.projects.forEach((p) => CloudStorageService.saveProjectToGallery(p));
          reloadProjects();
          setSyncStatus(`Importados ${parsed.projects.length} proyectos con éxito`);
        } else if (parsed.project) {
          CloudStorageService.saveProjectToGallery(parsed.project);
          reloadProjects();
          setSyncStatus(`Importado "${parsed.project.name}" con éxito`);
        }
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        alert(parsed.error || 'Error al importar');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-400">
              <FolderHeart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Galería de Paisajes Sonoros & Nube
              </h2>
              <p className="text-xs text-slate-400">
                Guarda tus mezclas permanentes, sincroniza en la nube e importa/exporta en alta fidelidad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync status banner */}
        {syncStatus && (
          <div className="px-6 py-2 bg-cyan-950/70 border-b border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5 animate-pulse" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Toolbar: Save Current + Import / Export */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setIsSaving(!isSaving)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar Mezcla Actual</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={handleExportFull}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Galería (.json)</span>
            </button>
          </div>
        </div>

        {/* Inline Save Form */}
        {isSaving && (
          <form
            onSubmit={handleSaveCurrent}
            className="p-4 bg-slate-950 border-b border-cyan-500/30 grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
          >
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Nombre de la Composición:
              </label>
              <input
                type="text"
                required
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Ej: Lluvia en Tokio & Vinilo"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Descripción o Notas Sensoriales:
              </label>
              <input
                type="text"
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                placeholder="Ej: Para sesiones de programación nocturna"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Confirmar Guardado
              </button>
              <button
                type="button"
                onClick={() => setIsSaving(false)}
                className="py-2 px-3 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {projects.length === 0 ? (
            <div className="col-span-2 text-center py-16 text-slate-500 text-sm">
              Tu galería está vacía. Guarda tu mezcla actual o genera una nueva con el Arquitecto IA.
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {proj.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {proj.tagline || proj.description}
                      </p>
                    </div>

                    {proj.isPreset ? (
                      <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        Fábrica
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
                        Personalizado
                      </span>
                    )}
                  </div>

                  {/* Metadata unboxed */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
                    <span>{proj.channels?.length || 0} Canales</span>
                    <span aria-hidden="true">·</span>
                    <span>{proj.category || 'General'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{proj.tags?.slice(0, 3).join(', ')}</span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onLoadProject(proj);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Cargar en Suite</span>
                    </button>

                    <button
                      onClick={() => setEditingProject(proj)}
                      title="Editar todos los campos de información, parámetros master y canales de esta escena"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/80 hover:border-cyan-500/50 cursor-pointer shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Editar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSyncToCloud(proj)}
                      title="Sincronizar este proyecto en la nube"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleExportSingle(proj)}
                      title="Exportar archivo JSON de alta fidelidad"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {!proj.isPreset && (
                      <button
                        onClick={() => handleDelete(proj.id)}
                        title="Eliminar de la galería"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dedicated Scene Editor Modal */}
      <SceneEditorModal
        isOpen={editingProject !== null}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onSave={handleSaveEditedProject}
        onSaveAsNew={handleSaveAsNewFromEditor}
        onLoadAndApply={(p) => {
          handleSaveEditedProject(p);
          onLoadProject(p);
          onClose();
        }}
      />
    </div>
  );
};
