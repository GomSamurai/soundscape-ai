import { SoundscapeProject, ChannelTrack } from '../types/soundscape';

export interface ShareDataSummary {
  n: string; // name
  t: string; // theme
  mv: number; // master volume
  mr: number; // master reverb
  mf: number; // master filter
  c: Array<{
    n: string; // name
    ty: string; // type
    k?: string; // soundKey
    st?: string; // synthType
    yt?: string; // youtubeVideoId
    v: number; // volume
    p: number; // pan
    f?: number; // filterCutoff
    r?: number; // reverbSend
    d?: number; // delaySend
    w?: number; // tapeWarmth
    ch?: number; // carrierHz
    bh?: number; // beatHz
    col?: string; // color
  }>;
}

export const ShareService = {
  // Compress active project to URL-safe base64 string
  encodeProjectToHash(project: SoundscapeProject): string {
    try {
      const minified: ShareDataSummary = {
        n: project.name,
        t: project.visualTheme || 'cyan',
        mv: Math.round(project.masterVolume * 100) / 100,
        mr: Math.round(project.masterReverb * 100) / 100,
        mf: Math.round(project.masterFilter),
        c: project.channels.map((ch) => ({
          n: ch.name,
          ty: ch.type,
          k: ch.soundKey,
          st: ch.synthType,
          yt: ch.youtubeVideoId,
          v: Math.round(ch.volume * 100) / 100,
          p: Math.round(ch.pan * 100) / 100,
          f: ch.filterCutoff ? Math.round(ch.filterCutoff) : undefined,
          r: ch.reverbSend ? Math.round(ch.reverbSend * 100) / 100 : undefined,
          d: ch.delaySend ? Math.round(ch.delaySend * 100) / 100 : undefined,
          w: ch.tapeWarmth ? Math.round(ch.tapeWarmth * 100) / 100 : undefined,
          ch: ch.carrierHz,
          bh: ch.beatHz,
          col: ch.color,
        })),
      };

      const jsonStr = JSON.stringify(minified);
      const encoded = btoa(encodeURIComponent(jsonStr));
      return encoded;
    } catch (e) {
      console.error('Error encoding soundscape project:', e);
      return '';
    }
  },

  // Decode project from URL-safe base64 string
  decodeProjectFromHash(hashString: string): SoundscapeProject | null {
    try {
      const cleanHash = hashString.replace(/^#mix=|^mix=/, '').trim();
      if (!cleanHash) return null;

      const jsonStr = decodeURIComponent(atob(cleanHash));
      const data: ShareDataSummary = JSON.parse(jsonStr);

      if (!data || !Array.isArray(data.c)) return null;

      const channels: ChannelTrack[] = data.c.map((ch, idx) => ({
        id: `shared_ch_${Date.now()}_${idx}`,
        name: ch.n || `Pista ${idx + 1}`,
        soundKey: ch.k || (ch.yt ? `yt_${ch.yt}` : 'sound_gen'),
        type: (ch.ty as any) || (ch.yt ? 'youtube_video' : 'synthesizer'),
        synthType: ch.st as any,
        youtubeVideoId: ch.yt,
        youtubeThumbnail: ch.yt ? `https://img.youtube.com/vi/${ch.yt}/hqdefault.jpg` : undefined,
        volume: typeof ch.v === 'number' ? ch.v : 0.65,
        pan: typeof ch.p === 'number' ? ch.p : 0,
        filterCutoff: ch.f || 16000,
        filterType: 'lowpass',
        filterQ: 1.0,
        reverbSend: ch.r ?? 0.2,
        delaySend: ch.d ?? 0.1,
        tapeWarmth: ch.w ?? 0.1,
        carrierHz: ch.ch,
        beatHz: ch.bh,
        color: ch.col || '#06B6D4',
        category: ch.yt ? 'YouTube Videos' : 'Binaural & Drones',
        muted: false,
        solo: false,
        playbackRate: 1.0,
        loop: true,
      }));

      return {
        id: `shared_${Date.now()}`,
        name: data.n ? `${data.n} (Compartido)` : 'Paisaje Sonoro Compartido',
        tagline: 'Composición acústica cargada mediante enlace directo',
        description: 'Paisaje sonoro multicanal importado vía URL compartida.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'Personalizado',
        tags: ['Compartido', 'Deep-Link'],
        visualTheme: (data.t as any) || 'cyan',
        masterVolume: typeof data.mv === 'number' ? data.mv : 0.85,
        masterReverb: typeof data.mr === 'number' ? data.mr : 0.35,
        masterFilter: typeof data.mf === 'number' ? data.mf : 18000,
        channels,
      };
    } catch (e) {
      console.warn('Could not decode soundscape from URL hash:', e);
      return null;
    }
  },

  // Generate complete shareable URL
  generateShareUrl(project: SoundscapeProject): string {
    const hash = this.encodeProjectToHash(project);
    if (!hash) return window.location.href;
    const url = new URL(window.location.href);
    url.hash = `mix=${hash}`;
    return url.toString();
  },

  // Check if current URL contains a shared soundscape
  getSharedProjectFromUrl(): SoundscapeProject | null {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (hash && hash.includes('mix=')) {
      return this.decodeProjectFromHash(hash);
    }
    const params = new URLSearchParams(window.location.search);
    const mixParam = params.get('mix');
    if (mixParam) {
      return this.decodeProjectFromHash(mixParam);
    }
    return null;
  },
};
