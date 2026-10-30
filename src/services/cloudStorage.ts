import { SoundscapeProject } from '../types/soundscape';
import { FACTORY_PRESETS } from './soundLibrary';

const STORAGE_KEY_GALLERY = 'aura_soundscape_gallery_v1';
const STORAGE_KEY_ACTIVE = 'aura_soundscape_active_v1';

export class CloudStorageService {
  // Get all projects saved locally (including factory presets if gallery is empty)
  public static getSavedProjects(): SoundscapeProject[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_GALLERY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(FACTORY_PRESETS));
        return FACTORY_PRESETS;
      }
      let parsed: SoundscapeProject[] = JSON.parse(data);

      // Auto-upgrade gallery: if user has old gallery with only 4 presets or legacy cabin, merge new presets
      const existingIds = new Set(parsed.map((p) => p.id));
      const missingPresets = FACTORY_PRESETS.filter((p) => !existingIds.has(p.id));
      if (missingPresets.length > 0) {
        // Remove legacy annoying preset if present
        parsed = parsed.filter((p) => p.id !== 'preset_youtube_cabin_rain');
        parsed = [...FACTORY_PRESETS, ...parsed.filter((p) => !FACTORY_PRESETS.some((fp) => fp.id === p.id))];
        localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(parsed));
      }

      // Auto-heal: replace legacy 404 video IDs with verified 200 OK video IDs
      const healed = parsed.map((proj) => {
        const updatedChannels = proj.channels.map((ch) => {
          if (ch.type === 'youtube_video') {
            if (ch.youtubeVideoId === 'bJ9Rmk3J6TU') {
              return { ...ch, youtubeVideoId: 'mPZkdNFkNps', youtubeThumbnail: 'https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg' };
            }
            if (ch.youtubeVideoId === 'sioZcOzfH-E') {
              return { ...ch, youtubeVideoId: '7BrIJrjxVxA', youtubeThumbnail: 'https://img.youtube.com/vi/7BrIJrjxVxA/hqdefault.jpg' };
            }
            if (ch.youtubeVideoId === 'mXw-K9Lh-0A') {
              return { ...ch, youtubeVideoId: 'd00VwBAoiF0', youtubeThumbnail: 'https://img.youtube.com/vi/d00VwBAoiF0/hqdefault.jpg' };
            }
            if (ch.youtubeVideoId === '9g81E6Oqf8E') {
              return { ...ch, youtubeVideoId: 'By6zerfldXE', youtubeThumbnail: 'https://img.youtube.com/vi/By6zerfldXE/hqdefault.jpg' };
            }
            if (ch.youtubeVideoId === 'DWcJFNfaw9c') {
              return { ...ch, youtubeVideoId: 'DWcJFNfaw9c', youtubeThumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg' };
            }
          }
          return ch;
        });
        return { ...proj, channels: updatedChannels };
      });

      return healed;
    } catch (err) {
      console.error('Error reading gallery from storage:', err);
      return FACTORY_PRESETS;
    }
  }

  // Save project to local gallery
  public static saveProjectToGallery(project: SoundscapeProject): SoundscapeProject[] {
    return this.updateProject(project);
  }

  // Update an existing project in the gallery
  public static updateProject(project: SoundscapeProject): SoundscapeProject[] {
    const gallery = this.getSavedProjects();
    const index = gallery.findIndex((p) => p.id === project.id);
    const updatedProject: SoundscapeProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      isPreset: false,
    };

    if (index >= 0) {
      gallery[index] = updatedProject;
    } else {
      gallery.unshift(updatedProject);
    }

    localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(gallery));
    return gallery;
  }

  // Delete project from local gallery
  public static deleteProject(projectId: string): SoundscapeProject[] {
    const gallery = this.getSavedProjects();
    const filtered = gallery.filter((p) => p.id !== projectId);
    localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(filtered));
    return filtered;
  }

  // Save currently active soundscape project so user returns right where they left off
  public static saveActiveProject(project: SoundscapeProject) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(project));
    } catch (e) {}
  }

  // Retrieve last active project with auto-heal
  public static getActiveProject(): SoundscapeProject | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (data) {
        const proj: SoundscapeProject = JSON.parse(data);

        // Auto-heal: If user had the legacy preset with the annoying 210Hz sine wave tone, upgrade to the new default
        if (
          proj.id === 'preset_youtube_cabin_rain' ||
          proj.channels.some((c) => c.soundKey === 'binaural_theta' || c.name.includes('Theta (6 Hz)'))
        ) {
          localStorage.removeItem(STORAGE_KEY_ACTIVE);
          return FACTORY_PRESETS[0];
        }

        const updatedChannels = proj.channels.map((ch) => {
          if (ch.type === 'youtube_video') {
            if (ch.youtubeVideoId === 'bJ9Rmk3J6TU') {
              return { ...ch, youtubeVideoId: 'mPZkdNFkNps', youtubeThumbnail: 'https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg' };
            }
            if (ch.youtubeVideoId === 'sioZcOzfH-E') {
              return { ...ch, youtubeVideoId: '7BrIJrjxVxA', youtubeThumbnail: 'https://img.youtube.com/vi/7BrIJrjxVxA/hqdefault.jpg' };
            }
            if (ch.youtubeVideoId === 'mXw-K9Lh-0A') {
              return { ...ch, youtubeVideoId: 'd00VwBAoiF0', youtubeThumbnail: 'https://img.youtube.com/vi/d00VwBAoiF0/hqdefault.jpg' };
            }
            if (ch.youtubeVideoId === '9g81E6Oqf8E') {
              return { ...ch, youtubeVideoId: 'By6zerfldXE', youtubeThumbnail: 'https://img.youtube.com/vi/By6zerfldXE/hqdefault.jpg' };
            }
            if (ch.youtubeVideoId === 'DWcJFNfaw9c') {
              return { ...ch, youtubeVideoId: 'DWcJFNfaw9c', youtubeThumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg' };
            }
          }
          return ch;
        });
        return { ...proj, channels: updatedChannels };
      }
    } catch (e) {}
    return null;
  }

  // Synchronize with Cloud API
  public static async syncToCloud(project: SoundscapeProject): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/cloud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo de sincronización');
      return { success: true };
    } catch (err: any) {
      console.warn('Cloud sync offline or error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Fetch all synced projects from cloud
  public static async fetchCloudGallery(): Promise<SoundscapeProject[]> {
    try {
      const res = await fetch('/api/cloud/sync');
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        return data.projects;
      }
    } catch (err) {
      console.warn('Unable to reach cloud sync endpoint:', err);
    }
    return [];
  }

  // High-fidelity JSON export
  public static exportProjectAsJSON(project: SoundscapeProject) {
    const bundle = {
      schema: 'aura-soundscape-v1',
      exportedAt: new Date().toISOString(),
      project,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AURA_${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export full user gallery
  public static exportFullGalleryAsJSON() {
    const gallery = this.getSavedProjects();
    const bundle = {
      schema: 'aura-soundscape-gallery-v1',
      exportedAt: new Date().toISOString(),
      projectsCount: gallery.length,
      gallery,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AURA_soundscape_gallery_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Parse and validate imported JSON
  public static parseImportedJSON(jsonString: string): { success: boolean; projects?: SoundscapeProject[]; project?: SoundscapeProject; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (data.gallery && Array.isArray(data.gallery)) {
        return { success: true, projects: data.gallery };
      }
      if (data.project && data.project.channels) {
        return { success: true, project: data.project };
      }
      if (data.channels && Array.isArray(data.channels)) {
        return { success: true, project: data as SoundscapeProject };
      }
      return { success: false, error: 'Formato de archivo inválido. No contiene canales de audio reconocibles.' };
    } catch (err: any) {
      return { success: false, error: 'Archivo JSON no válido: ' + err.message };
    }
  }
}
