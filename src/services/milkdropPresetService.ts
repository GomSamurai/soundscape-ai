import butterchurnPresets from 'butterchurn-presets';
import butterchurnPresetsExtra from 'butterchurn-presets/lib/butterchurnPresetsExtra.min';
import butterchurnPresetsExtra2 from 'butterchurn-presets/lib/butterchurnPresetsExtra2.min';
import butterchurnPresetsMD1 from 'butterchurn-presets/lib/butterchurnPresetsMD1.min';
import butterchurnPresetsNonMinimal from 'butterchurn-presets/lib/butterchurnPresetsNonMinimal.min';
import communityReactivePresets from '../constants/communityReactivePresets.json';

export type PresetCategory = 'all' | 'reactive' | 'favorites' | 'tunnels' | 'ambient' | 'psychedelic';

export interface PresetMetadata {
  name: string;
  author: string;
  pack: string;
  score: number;
  category: PresetCategory;
  isReactive: boolean;
}

const FAVORITES_STORAGE_KEY = 'soundscape_milkdrop_favorites';
const ONLY_REACTIVE_STORAGE_KEY = 'soundscape_milkdrop_only_reactive';

function extractPresets(mod: any): Record<string, any> {
  if (!mod) return {};
  const m = mod.default || mod;
  if (typeof m.getPresets === 'function') return m.getPresets();
  if (typeof m === 'function') {
    try {
      const res = m();
      if (res && res.getPresets) return res.getPresets();
      return res;
    } catch (e) {}
  }
  return typeof m === 'object' ? m : {};
}

function extractAuthor(name: string): string {
  // Matches common MilkDrop author conventions, e.g. "Geiss - ...", "Rovastar + Flexi - ...", "Martin & Idiot - ..."
  const match = name.match(/^([a-zA-Z0-9_\.\s\+\&]+?)\s*[-–:]/);
  if (match && match[1]) {
    const raw = match[1].replace(/^[\$_\!\s]+/, '').trim();
    if (raw.length > 1 && raw.length < 35 && !/mash\d+/i.test(raw)) {
      return raw;
    }
  }
  if (/geiss/i.test(name)) return 'Geiss';
  if (/rovastar/i.test(name)) return 'Rovastar';
  if (/flexi/i.test(name)) return 'Flexi';
  if (/martin/i.test(name)) return 'Martin';
  if (/unchained/i.test(name)) return 'Unchained';
  if (/idiot/i.test(name)) return 'Idiot';
  if (/aderrasi/i.test(name)) return 'Aderrasi';
  return 'MilkDrop Master';
}

function scoreReactivity(preset: any): number {
  if (!preset) return 0;
  let score = 0;
  const code = (preset.frame_eqs_str || '') + ' ' + (preset.pixel_eqs_str || '');

  const bassMatches = (code.match(/bass/gi) || []).length;
  const midMatches = (code.match(/mid/gi) || []).length;
  const trebMatches = (code.match(/treb/gi) || []).length;
  const volMatches = (code.match(/vol/gi) || []).length;
  const beatMatches = (code.match(/beat/gi) || []).length;

  score += Math.min(bassMatches * 3, 30);
  score += Math.min(midMatches * 2, 15);
  score += Math.min(trebMatches * 2, 15);
  score += Math.min(volMatches * 2, 10);
  score += Math.min(beatMatches * 4, 15);

  const thresholdMatches = (code.match(/above\s*\(\s*a\.(bass|mid|treb|vol)/gi) || []).length;
  score += Math.min(thresholdMatches * 5, 20);

  if (preset.waves && preset.waves.length > 0) score += 10;
  if (preset.shapes && preset.shapes.length > 0) score += 5;

  return Math.min(score, 100);
}

function detectCategory(name: string, score: number): PresetCategory {
  if (score >= 55) return 'reactive';
  if (/tunnel|vortex|spiral|wormhole|warp|space|star|hypno/i.test(name)) return 'tunnels';
  if (/acid|trippy|rainbow|kaleido|neon|cyber|plasma|fractal|matrix|illusion/i.test(name)) return 'psychedelic';
  if (score <= 35 || /ambient|chill|cloud|water|ocean|float|slow|zen|rose|dawn/i.test(name)) return 'ambient';
  return 'reactive';
}

class MilkdropPresetService {
  private presetsMap: Record<string, any> = {};
  private metadatas: PresetMetadata[] = [];
  private metadataMap: Map<string, PresetMetadata> = new Map();
  private favoritesSet: Set<string> = new Set();
  private onlyReactive: boolean = false;
  private isLoaded: boolean = false;

  constructor() {
    this.loadFavoritesFromStorage();
    this.loadOnlyReactiveFromStorage();
  }

  public ensureLoaded(): void {
    if (this.isLoaded) return;

    try {
      const p1 = extractPresets(butterchurnPresets);
      const pExtra = extractPresets(butterchurnPresetsExtra);
      const pExtra2 = extractPresets(butterchurnPresetsExtra2);
      const pMD1 = extractPresets(butterchurnPresetsMD1);
      const pNonMin = extractPresets(butterchurnPresetsNonMinimal);
      const pCommunity: Record<string, any> = communityReactivePresets || {};

      const packConfigs = [
        { name: 'Esenciales MilkDrop 2', presets: p1 },
        { name: 'Extra Pack I', presets: pExtra },
        { name: 'Extra Pack II', presets: pExtra2 },
        { name: 'Retro MD1 Clásicos', presets: pMD1 },
        { name: 'HD Non-Minimal', presets: pNonMin },
        { name: 'Comunidad Ultra-Reactivos', presets: pCommunity },
      ];

      for (const pack of packConfigs) {
        for (const [presetName, presetData] of Object.entries(pack.presets)) {
          if (!this.presetsMap[presetName]) {
            this.presetsMap[presetName] = presetData;
            const score = scoreReactivity(presetData);
            const author = extractAuthor(presetName);
            const isReactive = score >= 50;
            const category = detectCategory(presetName, score);

            const meta: PresetMetadata = {
              name: presetName,
              author,
              pack: pack.name,
              score,
              category,
              isReactive,
            };

            this.metadatas.push(meta);
            this.metadataMap.set(presetName, meta);
          }
        }
      }

      this.isLoaded = true;
    } catch (err) {
      console.error('Error inicializando presets de Milkdrop:', err);
    }
  }

  // Favorites
  private loadFavoritesFromStorage(): void {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          this.favoritesSet = new Set(arr);
        }
      }
    } catch (e) {}
  }

  private saveFavoritesToStorage(): void {
    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(Array.from(this.favoritesSet))
      );
    } catch (e) {}
  }

  public getFavorites(): string[] {
    return Array.from(this.favoritesSet);
  }

  public isFavorite(name: string): boolean {
    return this.favoritesSet.has(name);
  }

  public toggleFavorite(name: string): boolean {
    let nowFavorite = false;
    if (this.favoritesSet.has(name)) {
      this.favoritesSet.delete(name);
      nowFavorite = false;
    } else {
      this.favoritesSet.add(name);
      nowFavorite = true;
    }
    this.saveFavoritesToStorage();
    window.dispatchEvent(
      new CustomEvent('butterchurn_favorites_changed', {
        detail: { favorites: this.getFavorites(), toggled: name, isFavorite: nowFavorite },
      })
    );
    return nowFavorite;
  }

  // Audio-Reactive Mode (Beat Sync Lock)
  private loadOnlyReactiveFromStorage(): void {
    try {
      const stored = localStorage.getItem(ONLY_REACTIVE_STORAGE_KEY);
      if (stored !== null) {
        this.onlyReactive = stored === 'true';
      }
    } catch (e) {}
  }

  public getOnlyReactiveMode(): boolean {
    return this.onlyReactive;
  }

  public setOnlyReactiveMode(enabled: boolean): void {
    this.onlyReactive = enabled;
    try {
      localStorage.setItem(ONLY_REACTIVE_STORAGE_KEY, String(enabled));
    } catch (e) {}
    window.dispatchEvent(
      new CustomEvent('butterchurn_reactive_mode_changed', {
        detail: { onlyReactive: enabled },
      })
    );
  }

  // Data Accessors
  public getAllPresetsMap(): Record<string, any> {
    this.ensureLoaded();
    return this.presetsMap;
  }

  public getPreset(name: string): any {
    this.ensureLoaded();
    return this.presetsMap[name] || null;
  }

  public getAllPresetNames(): string[] {
    this.ensureLoaded();
    return Object.keys(this.presetsMap);
  }

  public getAllMetadatas(): PresetMetadata[] {
    this.ensureLoaded();
    return this.metadatas;
  }

  public getMetadata(name: string): PresetMetadata | undefined {
    this.ensureLoaded();
    return this.metadataMap.get(name);
  }

  public getReactivePresetNames(): string[] {
    this.ensureLoaded();
    return this.metadatas.filter((m) => m.isReactive).map((m) => m.name);
  }

  // Filtered List based on category & search
  public filterPresets(options: {
    category?: PresetCategory;
    searchQuery?: string;
    packFilter?: string;
  }): PresetMetadata[] {
    this.ensureLoaded();
    const { category = 'all', searchQuery = '', packFilter = '' } = options;
    const query = searchQuery.trim().toLowerCase();

    return this.metadatas.filter((item) => {
      // Category filter
      if (category === 'reactive' && !item.isReactive) return false;
      if (category === 'favorites' && !this.favoritesSet.has(item.name)) return false;
      if (category === 'tunnels' && item.category !== 'tunnels') return false;
      if (category === 'ambient' && item.category !== 'ambient') return false;
      if (category === 'psychedelic' && item.category !== 'psychedelic') return false;

      // Pack filter
      if (packFilter && packFilter !== 'all' && item.pack !== packFilter) return false;

      // Search query
      if (query) {
        const inName = item.name.toLowerCase().includes(query);
        const inAuthor = item.author.toLowerCase().includes(query);
        const inPack = item.pack.toLowerCase().includes(query);
        return inName || inAuthor || inPack;
      }

      return true;
    });
  }

  // Smart Navigation (Respects Only-Reactive and Only-Favorites settings)
  public getNextPreset(
    currentName: string,
    options?: { onlyReactive?: boolean; onlyFavorites?: boolean }
  ): string {
    this.ensureLoaded();
    let candidates = this.getCandidates(options);
    if (candidates.length === 0) candidates = this.getAllPresetNames();
    if (candidates.length === 0) return currentName;

    const idx = candidates.indexOf(currentName);
    const nextIdx = (idx + 1) % candidates.length;
    return candidates[nextIdx];
  }

  public getPrevPreset(
    currentName: string,
    options?: { onlyReactive?: boolean; onlyFavorites?: boolean }
  ): string {
    this.ensureLoaded();
    let candidates = this.getCandidates(options);
    if (candidates.length === 0) candidates = this.getAllPresetNames();
    if (candidates.length === 0) return currentName;

    const idx = candidates.indexOf(currentName);
    const prevIdx = (idx - 1 + candidates.length) % candidates.length;
    return candidates[prevIdx];
  }

  public getRandomPreset(options?: {
    onlyReactive?: boolean;
    onlyFavorites?: boolean;
    excludeCurrent?: string;
  }): string {
    this.ensureLoaded();
    let candidates = this.getCandidates(options);
    if (candidates.length === 0) candidates = this.getAllPresetNames();
    if (candidates.length === 0) return '';

    if (options?.excludeCurrent && candidates.length > 1) {
      candidates = candidates.filter((n) => n !== options.excludeCurrent);
    }

    const randIdx = Math.floor(Math.random() * candidates.length);
    return candidates[randIdx];
  }

  private getCandidates(options?: { onlyReactive?: boolean; onlyFavorites?: boolean }): string[] {
    const isOnlyFav = options?.onlyFavorites ?? false;
    const isOnlyReact = options?.onlyReactive !== undefined ? options.onlyReactive : this.onlyReactive;

    if (isOnlyFav && this.favoritesSet.size > 0) {
      const favList = Array.from(this.favoritesSet);
      if (isOnlyReact) {
        const reactiveFavs = favList.filter((n) => this.metadataMap.get(n)?.isReactive);
        if (reactiveFavs.length > 0) return reactiveFavs;
      }
      return favList;
    }

    if (isOnlyReact) {
      return this.getReactivePresetNames();
    }

    return this.getAllPresetNames();
  }
}

export const milkdropPresetService = new MilkdropPresetService();
