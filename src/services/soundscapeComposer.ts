import { VerifiedVideoLibrary, VERIFIED_VIDEO_CATALOG } from './verifiedVideoLibrary';

export interface AISoundscapeChannelConfig {
  customTitle: string;
  soundKey: string;
  type: 'youtube_video' | 'synthesizer' | 'midi_random' | 'drone_ambient';
  youtubeVideoId?: string;
  youtubeThumbnail?: string;
  role: string;
  volume: number;
  pan: number;
  reverbSend: number;
  delaySend: number;
  tapeWarmth?: number;
  filterCutoff?: number;
}

export interface AISoundscapeResponse {
  name: string;
  tagline: string;
  concept: string;
  visualTheme: 'cyan' | 'amber' | 'violet' | 'emerald' | 'rose';
  binauralFreqHz: number;
  masterReverb: number;
  masterDelay: number;
  masterWarmth: number;
  category: string;
  tags: string[];
  channels: AISoundscapeChannelConfig[];
}

/**
 * Intelligent Semantic Soundscape Composer
 * Orchestrates multi-channel soundscapes dynamically based on natural language prompts.
 * Used as a zero-latency fallback or direct generator for any prompt.
 */
export function composeSemanticSoundscape(prompt: string): AISoundscapeResponse {
  const p = (prompt || '').toLowerCase();

  const channels: AISoundscapeChannelConfig[] = [];
  let visualTheme: 'cyan' | 'amber' | 'violet' | 'emerald' | 'rose' = 'cyan';
  let title = 'Paisaje Sonoro Atmosférico';
  let tagline = 'Composición orquestada dinámicamente';
  let binauralFreq = 6.0; // Theta by default for relaxed focus

  // 1. Detect Underwater / Whales
  if (p.includes('submarino') || p.includes('ballena') || p.includes('underwater') || p.includes('bajo el agua') || p.includes('marino') || p.includes('acuático') || p.includes('acuatico')) {
    visualTheme = 'cyan';
    const video = VERIFIED_VIDEO_CATALOG.underwater?.[0] || {
      videoId: '6fT9z0jLhO8',
      title: 'Cantos de Ballenas y Océano Submarino 4K',
      thumbnail: 'https://img.youtube.com/vi/6fT9z0jLhO8/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Cantos de Ballenas & Fondo Submarino',
      soundKey: 'yt_underwater_whales',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Ambiente Submarino',
      volume: 0.75,
      pan: -0.15,
      reverbSend: 0.35,
      delaySend: 0.2,
      tapeWarmth: 0.25,
      filterCutoff: 14000,
    });
  }

  // 2. Detect Tibetan Singing Bowls / Meditation
  if (p.includes('cuenco') || p.includes('tibet') || p.includes('bowl') || p.includes('zen') || p.includes('meditación') || p.includes('meditacion') || p.includes('432')) {
    visualTheme = visualTheme === 'cyan' ? 'cyan' : 'emerald';
    const video = VERIFIED_VIDEO_CATALOG.tibetan?.[0] || {
      videoId: 'By6zerfldXE',
      title: 'Cuencos Tibetanos Cantores a 432 Hz',
      thumbnail: 'https://img.youtube.com/vi/By6zerfldXE/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Cuencos Tibetanos Armónicos 432Hz',
      soundKey: 'yt_tibetan_bowls',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Frecuencia Armónica',
      volume: 0.65,
      pan: 0.3,
      reverbSend: 0.45,
      delaySend: 0.25,
      tapeWarmth: 0.15,
      filterCutoff: 15000,
    });
  }

  // 3. Detect Hang Drum / Handpan
  if (p.includes('hang') || p.includes('handpan') || p.includes('drum') || p.includes('percusión') || p.includes('percusion')) {
    const video = VERIFIED_VIDEO_CATALOG.hang_drum?.[0] || {
      videoId: 'tWv8l7wH1jQ',
      title: 'Hang Drum & Handpan Meditación Hipnótica',
      thumbnail: 'https://img.youtube.com/vi/tWv8l7wH1jQ/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Hang Drum Melódico Acústico',
      soundKey: 'yt_hang_drum',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Melodía Acústica',
      volume: 0.62,
      pan: -0.3,
      reverbSend: 0.3,
      delaySend: 0.2,
      tapeWarmth: 0.2,
      filterCutoff: 16000,
    });
  }

  // 4. Detect Rain / Thunder
  if (p.includes('lluvia') || p.includes('rain') || p.includes('trueno') || p.includes('tormenta') || p.includes('agua')) {
    if (!channels.some(c => c.soundKey.includes('rain'))) {
      const video = VERIFIED_VIDEO_CATALOG.rain?.[0] || {
        videoId: 'mPZkdNFkNps',
        title: 'Lluvia en Ventana con Truenos Suaves 8K',
        thumbnail: 'https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg',
      };
      channels.push({
        customTitle: 'Lluvia en Ventana con Truenos',
        soundKey: 'yt_rain_thunder',
        type: 'youtube_video',
        youtubeVideoId: video.videoId,
        youtubeThumbnail: video.thumbnail,
        role: 'Clima Atmosférico',
        volume: 0.7,
        pan: -0.2,
        reverbSend: 0.25,
        delaySend: 0.15,
        filterCutoff: 16000,
      });
    }
  }

  // 5. Detect Fireplace / Campfire
  if (p.includes('fuego') || p.includes('fire') || p.includes('chimenea') || p.includes('fogata') || p.includes('leña') || p.includes('brasa')) {
    visualTheme = 'amber';
    const video = VERIFIED_VIDEO_CATALOG.fire?.[0] || {
      videoId: 'L_LUpnjgPso',
      title: 'Fuego de Chimenea Crujiente 4K',
      thumbnail: 'https://img.youtube.com/vi/L_LUpnjgPso/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Chimenea Crepitante de Leña',
      soundKey: 'yt_fireplace',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Calidez Acústica',
      volume: 0.65,
      pan: 0.25,
      reverbSend: 0.2,
      delaySend: 0.1,
      tapeWarmth: 0.35,
      filterCutoff: 14000,
    });
  }

  // 6. Detect Lo-Fi / Chill
  if (p.includes('lofi') || p.includes('lo-fi') || p.includes('chill') || p.includes('beats') || p.includes('estudio')) {
    visualTheme = 'rose';
    const video = VERIFIED_VIDEO_CATALOG.lofi?.[0] || {
      videoId: 'DWcJFNfaw9c',
      title: 'Lofi Hip Hop Radio Beats to Relax',
      thumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Beats Lo-Fi Relajantes',
      soundKey: 'yt_lofi_girl',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Ritmo & Melodía',
      volume: 0.6,
      pan: 0.0,
      reverbSend: 0.2,
      delaySend: 0.15,
      tapeWarmth: 0.3,
      filterCutoff: 16000,
    });
  }

  // 7. Detect Jazz / Cafe
  if (p.includes('jazz') || p.includes('café') || p.includes('cafe') || p.includes('piano') || p.includes('paris')) {
    visualTheme = 'amber';
    const video = VERIFIED_VIDEO_CATALOG.jazz_cafe?.[0] || {
      videoId: 'Dx5qFachd3A',
      title: 'Cafetería de París con Jazz Acogedor',
      thumbnail: 'https://img.youtube.com/vi/Dx5qFachd3A/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Piano de Café & Jazz Nocturno',
      soundKey: 'yt_jazz_cafe',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Música de Ambiente',
      volume: 0.65,
      pan: -0.15,
      reverbSend: 0.25,
      delaySend: 0.15,
      tapeWarmth: 0.25,
      filterCutoff: 15000,
    });
  }

  // 8. Detect Cyberpunk / Sci-Fi
  if (p.includes('cyber') || p.includes('blade') || p.includes('runner') || p.includes('futuro') || p.includes('sintetizador') || p.includes('vangelis')) {
    visualTheme = 'violet';
    const video = VERIFIED_VIDEO_CATALOG.cyberpunk?.[0] || {
      videoId: 'd00VwBAoiF0',
      title: 'Blade Runner Cyberpunk Lluvia Neón',
      thumbnail: 'https://img.youtube.com/vi/d00VwBAoiF0/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Sintetizador Sci-Fi & Lluvia Neón',
      soundKey: 'yt_cyberpunk',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Atmósfera Futurista',
      volume: 0.7,
      pan: 0.0,
      reverbSend: 0.35,
      delaySend: 0.25,
      tapeWarmth: 0.3,
      filterCutoff: 16000,
    });
  }

  // 9. Detect Ocean / Beach
  if (p.includes('mar') || p.includes('ocean') || p.includes('océano') || p.includes('playa') || p.includes('costa')) {
    if (!channels.some(c => c.soundKey.includes('underwater'))) {
      visualTheme = 'cyan';
      const video = VERIFIED_VIDEO_CATALOG.ocean?.[0] || {
        videoId: 'WHPEKLQID4U',
        title: 'Olas de Mar Suaves en Playa Virgen',
        thumbnail: 'https://img.youtube.com/vi/WHPEKLQID4U/hqdefault.jpg',
      };
      channels.push({
        customTitle: 'Olas del Océano en la Costa',
        soundKey: 'yt_ocean_waves',
        type: 'youtube_video',
        youtubeVideoId: video.videoId,
        youtubeThumbnail: video.thumbnail,
        role: 'Marea Relajante',
        volume: 0.65,
        pan: 0.2,
        reverbSend: 0.3,
        delaySend: 0.15,
        filterCutoff: 15000,
      });
    }
  }

  // 10. Detect Forest / Birds
  if (p.includes('bosque') || p.includes('forest') || p.includes('pájaro') || p.includes('arbol') || p.includes('naturaleza')) {
    visualTheme = 'emerald';
    const video = VERIFIED_VIDEO_CATALOG.forest?.[0] || {
      videoId: 'xNN7iTA57jM',
      title: 'Pájaros Cantando en Bosque Verde Primaveral',
      thumbnail: 'https://img.youtube.com/vi/xNN7iTA57jM/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Pájaros Silvestres & Brisa del Bosque',
      soundKey: 'yt_forest',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Fauna Natural',
      volume: 0.6,
      pan: 0.25,
      reverbSend: 0.25,
      delaySend: 0.1,
      filterCutoff: 16000,
    });
  }

  // 11. Detect Blizzard / Winter
  if (p.includes('nieve') || p.includes('ventisca') || p.includes('viento') || p.includes('invierno') || p.includes('ártica') || p.includes('artica')) {
    const video = VERIFIED_VIDEO_CATALOG.blizzard?.[0] || {
      videoId: '7BrIJrjxVxA',
      title: 'Tormenta de Nieve y Ventisca Invernal 4K',
      thumbnail: 'https://img.youtube.com/vi/7BrIJrjxVxA/hqdefault.jpg',
    };
    channels.push({
      customTitle: 'Ventisca Ártica & Viento Helado',
      soundKey: 'yt_blizzard',
      type: 'youtube_video',
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      role: 'Viento Blanco',
      volume: 0.65,
      pan: -0.25,
      reverbSend: 0.3,
      delaySend: 0.2,
      filterCutoff: 13000,
    });
  }

  // If no channels matched, construct a balanced default relaxing soundscape
  if (channels.length === 0) {
    const defaultVideo = VerifiedVideoLibrary.getNextWorkingVideo(undefined, prompt);
    channels.push({
      customTitle: defaultVideo.title.slice(0, 28),
      soundKey: `yt_${defaultVideo.videoId}`,
      type: 'youtube_video',
      youtubeVideoId: defaultVideo.videoId,
      youtubeThumbnail: defaultVideo.thumbnail,
      role: 'Ambiente Principal',
      volume: 0.7,
      pan: 0.0,
      reverbSend: 0.25,
      delaySend: 0.15,
      filterCutoff: 16000,
    });
  }

  // Add complementary textural acoustic layers if less than 4 channels
  if (channels.length < 4) {
    // Generative Drone / Pad
    if (channels.some(c => c.soundKey.includes('underwater'))) {
      channels.push({
        customTitle: 'Corrientes Profundas & Resonancia Subacuática',
        soundKey: 'ocean_waves',
        type: 'synthesizer',
        role: 'Textura Subterránea',
        volume: 0.45,
        pan: 0.2,
        reverbSend: 0.4,
        delaySend: 0.3,
        filterCutoff: 8000,
      });
      binauralFreq = 5.5; // Deep Theta
      title = 'Inmersión Submarina & Mística Acústica';
      tagline = 'Cantos de ballenas, cuencos tibetanos y hang drum hipnótico';
    } else if (channels.some(c => c.soundKey.includes('cyberpunk'))) {
      channels.push({
        customTitle: 'Sub-Drone Analógico 55Hz',
        soundKey: 'drone_sub',
        type: 'synthesizer',
        role: 'Cimiento Subgrave',
        volume: 0.5,
        pan: 0.0,
        reverbSend: 0.3,
        delaySend: 0.2,
        filterCutoff: 6000,
      });
      binauralFreq = 8.0; // Alpha
      title = 'Metrópolis Neón Cyberpunk';
      tagline = 'Lluvia sintética, sintetizadores analógicos y drones oscuros';
    } else {
      channels.push({
        customTitle: 'Ruido Marrón Cálido de Enfoque',
        soundKey: 'brown_noise',
        type: 'synthesizer',
        role: 'Textura Envolvente',
        volume: 0.4,
        pan: 0.0,
        reverbSend: 0.2,
        delaySend: 0.1,
        filterCutoff: 10000,
      });
      binauralFreq = 6.0;
      title = title === 'Paisaje Sonoro Atmosférico' ? `Ambiente: ${prompt.slice(0, 32)}` : title;
      tagline = 'Composición multicapa equilibrada acústicamente';
    }
  }

  return {
    name: title,
    tagline,
    concept: `Composición orquestada especialmente para: "${prompt}". Combina capas de video ultra nítidas con síntesis armónica espacial.`,
    visualTheme,
    binauralFreqHz: binauralFreq,
    masterReverb: 0.35,
    masterDelay: 0.2,
    masterWarmth: 0.25,
    category: 'YouTube & Acústico',
    tags: ['YouTube', 'IA', '4K', 'Espacial', 'Inmersivo'],
    channels,
  };
}
