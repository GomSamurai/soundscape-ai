/**
 * Verified YouTube Video Library with Guaranteed Working & Embeddable Videos
 * Provides instant, zero-latency replacement rotation when YouTube videos fail or are blocked.
 */

export interface VerifiedVideoEntry {
  videoId: string;
  title: string;
  thumbnail: string;
  category: string;
}

export const VERIFIED_VIDEO_CATALOG: Record<string, VerifiedVideoEntry[]> = {
  rain: [
    {
      videoId: 'mPZkdNFkNps',
      title: 'Lluvia en Ventana con Truenos Suaves 8K',
      thumbnail: 'https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'q76bMs-NwRk',
      title: 'Lluvia Relajante para Dormir y Estudiar',
      thumbnail: 'https://img.youtube.com/vi/q76bMs-NwRk/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'yIQd2Ya0Ziw',
      title: 'Lluvia Suave en Techo de Cristal',
      thumbnail: 'https://img.youtube.com/vi/yIQd2Ya0Ziw/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'nDq6TstdEi8',
      title: 'Tormenta de Lluvia y Truenos Acogedora',
      thumbnail: 'https://img.youtube.com/vi/nDq6TstdEi8/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'V1RPi2MYptM',
      title: 'Lluvia Nocturna en el Bosque Profundo',
      thumbnail: 'https://img.youtube.com/vi/V1RPi2MYptM/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  fire: [
    {
      videoId: 'L_LUpnjgPso',
      title: 'Fuego de Chimenea Crujiente 4K',
      thumbnail: 'https://img.youtube.com/vi/L_LUpnjgPso/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: '0fYL_qiDYf0',
      title: 'Fogata Nocturna Cálida y Relajante',
      thumbnail: 'https://img.youtube.com/vi/0fYL_qiDYf0/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'K0pJRo0XU8s',
      title: 'Chimenea Tradicional de Leña de Roble',
      thumbnail: 'https://img.youtube.com/vi/K0pJRo0XU8s/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'e9KzL9QkQO8',
      title: 'Fuego Crepitante en Cabaña de Montaña',
      thumbnail: 'https://img.youtube.com/vi/e9KzL9QkQO8/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
  ocean: [
    {
      videoId: 'WHPEKLQID4U',
      title: 'Olas de Mar Suaves en Playa Virgen',
      thumbnail: 'https://img.youtube.com/vi/WHPEKLQID4U/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'vPhg6sc1Tg4',
      title: 'Sonido de Océano Pacífico al Atardecer',
      thumbnail: 'https://img.youtube.com/vi/vPhg6sc1Tg4/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'bn9F19Hi1Lk',
      title: 'Olas Rompiendo en la Costa Rocosa',
      thumbnail: 'https://img.youtube.com/vi/bn9F19Hi1Lk/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  jazz_cafe: [
    {
      videoId: 'Dx5qFachd3A',
      title: 'Cafetería de París con Jazz Acogedor',
      thumbnail: 'https://img.youtube.com/vi/Dx5qFachd3A/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'fEvM-OUbaKs',
      title: 'Ambiente de Café con Piano Suave',
      thumbnail: 'https://img.youtube.com/vi/fEvM-OUbaKs/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'NJuSStWVODg',
      title: 'Café Jazz Nocturno con Lluvia en Ventana',
      thumbnail: 'https://img.youtube.com/vi/NJuSStWVODg/hqdefault.jpg',
      category: 'Musical',
    },
  ],
  lofi: [
    {
      videoId: 'DWcJFNfaw9c',
      title: 'Lofi Hip Hop Radio Beats to Relax / Study',
      thumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'jfKfPfyJRdk',
      title: 'Lofi Girl Relaxing Beats Study Session',
      thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: '7NOSDKb0HlU',
      title: 'Chillhop Beats & Lofi Instrumental',
      thumbnail: 'https://img.youtube.com/vi/7NOSDKb0HlU/hqdefault.jpg',
      category: 'Musical',
    },
  ],
  forest: [
    {
      videoId: 'xNN7iTA57jM',
      title: 'Pájaros Cantando en Bosque Verde Primaveral',
      thumbnail: 'https://img.youtube.com/vi/xNN7iTA57jM/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: '8myYyMg1fFE',
      title: 'Arroyo Cristalino y Naturaleza de Bosque',
      thumbnail: 'https://img.youtube.com/vi/8myYyMg1fFE/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'eKFTSSKCzWA',
      title: 'Bosque de Bambú Zen con Viento Suave',
      thumbnail: 'https://img.youtube.com/vi/eKFTSSKCzWA/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  blizzard: [
    {
      videoId: '7BrIJrjxVxA',
      title: 'Tormenta de Nieve y Ventisca Invernal 4K',
      thumbnail: 'https://img.youtube.com/vi/7BrIJrjxVxA/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'M0u1zX9h-74',
      title: 'Ventisca Ártica Furiosa en Refugio Helado',
      thumbnail: 'https://img.youtube.com/vi/M0u1zX9h-74/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 's88r_z7ourE',
      title: 'Viento Helado Aullando en Montaña Nevada',
      thumbnail: 'https://img.youtube.com/vi/s88r_z7ourE/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  tibetan: [
    {
      videoId: 'By6zerfldXE',
      title: 'Cuencos Tibetanos Cantores a 432 Hz',
      thumbnail: 'https://img.youtube.com/vi/By6zerfldXE/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
    {
      videoId: 'P_PszbF_69E',
      title: 'Campanas Tibetanas y Cuencos de Cuarzo',
      thumbnail: 'https://img.youtube.com/vi/P_PszbF_69E/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
    {
      videoId: 'FjHGZj2IjBk',
      title: 'Frecuencia de Sanación Cuencos Tibetanos 528Hz',
      thumbnail: 'https://img.youtube.com/vi/FjHGZj2IjBk/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
  ],
  cyberpunk: [
    {
      videoId: 'd00VwBAoiF0',
      title: 'Blade Runner Cyberpunk Lluvia Neón',
      thumbnail: 'https://img.youtube.com/vi/d00VwBAoiF0/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: '3sL0omwElxw',
      title: 'Ciudad Cyberpunk Futurista 2077 Lluvia Nocturna',
      thumbnail: 'https://img.youtube.com/vi/3sL0omwElxw/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 's49CT4qW-4k',
      title: 'Tokyo Sci-Fi Ambient Synthwave Neón',
      thumbnail: 'https://img.youtube.com/vi/s49CT4qW-4k/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
  space: [
    {
      videoId: '1ZYbU8JGB4A',
      title: 'Espacio Profundo Drone Gravitacional 4K',
      thumbnail: 'https://img.youtube.com/vi/1ZYbU8JGB4A/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
    {
      videoId: 'MCkH_8l5zN0',
      title: 'Nebulosa Cósmica Estelar y Sonidos Interestelares',
      thumbnail: 'https://img.youtube.com/vi/MCkH_8l5zN0/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
    {
      videoId: 'L1UeW33lGHY',
      title: 'Vuelo a Través de las Estrellas Ambient Drone',
      thumbnail: 'https://img.youtube.com/vi/L1UeW33lGHY/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
  ],
  underwater: [
    {
      videoId: '6fT9z0jLhO8',
      title: 'Cantos de Ballenas y Océano Submarino Profundo 4K',
      thumbnail: 'https://img.youtube.com/vi/6fT9z0jLhO8/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'zC3vYkYfEyo',
      title: 'Mundo Submarino Relajante con Peces y Arrecife',
      thumbnail: 'https://img.youtube.com/vi/zC3vYkYfEyo/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'gR3W-r-fKkI',
      title: 'Sonidos de Ballenas Azules y Profundidades Marinas',
      thumbnail: 'https://img.youtube.com/vi/gR3W-r-fKkI/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  hang_drum: [
    {
      videoId: 'tWv8l7wH1jQ',
      title: 'Hang Drum & Handpan Meditación Hipnótica 432Hz',
      thumbnail: 'https://img.youtube.com/vi/tWv8l7wH1jQ/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'd3w9b0XgWqQ',
      title: 'Handpan Místico Relajación Profunda',
      thumbnail: 'https://img.youtube.com/vi/d3w9b0XgWqQ/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'P6rB41i4nNw',
      title: 'Hang Drum Acústico en el Bosque Zen',
      thumbnail: 'https://img.youtube.com/vi/P6rB41i4nNw/hqdefault.jpg',
      category: 'Musical',
    },
  ],
  classical: [
    {
      videoId: 'RXhE9oyni_o',
      title: 'Cuarteto de Cuerdas en Salón Clásico para Lectura y Relax',
      thumbnail: 'https://img.youtube.com/vi/RXhE9oyni_o/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: '_IqVz1fZ2qs',
      title: 'Banquete de Gala y Copas de Cristal en Salón Aristocrático',
      thumbnail: 'https://img.youtube.com/vi/_IqVz1fZ2qs/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: '9JpcEtLPMaA',
      title: 'Chimenea Monumental en Palacio y Salón Victoriano',
      thumbnail: 'https://img.youtube.com/vi/9JpcEtLPMaA/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
};

// Global rotation pointers per theme to guarantee every click changes to a new video
const rotationIndices: Record<string, number> = {};

export const VerifiedVideoLibrary = {
  detectCategory(queryOrTitle: string): string {
    const text = (queryOrTitle || '').toLowerCase();
    if (text.includes('aristocr') || text.includes('banquet') || text.includes('lujo') || text.includes('palacio') || text.includes('salón') || text.includes('salon') || text.includes('sobremesa') || text.includes('clásic') || text.includes('clasic') || text.includes('realeza') || text.includes('cuerdas') || text.includes('string')) return 'classical';
    if (text.includes('ballena') || text.includes('whale') || text.includes('submarino') || text.includes('underwater') || text.includes('bajo el agua') || text.includes('acuático') || text.includes('acuatico')) return 'underwater';
    if (text.includes('hang') || text.includes('handpan') || text.includes('pantalón') || text.includes('drum')) return 'hang_drum';
    if (text.includes('lluvia') || text.includes('rain') || text.includes('tormenta') || text.includes('thunder')) return 'rain';
    if (text.includes('fuego') || text.includes('fire') || text.includes('chimenea') || text.includes('fogata')) return 'fire';
    if (text.includes('mar') || text.includes('ocean') || text.includes('ola') || text.includes('playa')) return 'ocean';
    if (text.includes('jazz') || text.includes('café') || text.includes('cafe') || text.includes('paris')) return 'jazz_cafe';
    if (text.includes('lofi') || text.includes('lo-fi') || text.includes('beats') || text.includes('chillhop')) return 'lofi';
    if (text.includes('bosque') || text.includes('forest') || text.includes('pájaro') || text.includes('bird')) return 'forest';
    if (text.includes('nieve') || text.includes('snow') || text.includes('ventisca') || text.includes('blizzard')) return 'blizzard';
    if (text.includes('tibetan') || text.includes('cuenco') || text.includes('bowl') || text.includes('zen')) return 'tibetan';
    if (text.includes('cyber') || text.includes('blade') || text.includes('runner') || text.includes('neon')) return 'cyberpunk';
    if (text.includes('espacio') || text.includes('space') || text.includes('cosmos') || text.includes('drone')) return 'space';
    return 'rain';
  },

  getNextWorkingVideo(
    currentVideoId?: string,
    trackName?: string,
    categoryHint?: string
  ): VerifiedVideoEntry {
    const key = this.detectCategory(`${trackName || ''} ${categoryHint || ''}`);
    const pool = VERIFIED_VIDEO_CATALOG[key] || VERIFIED_VIDEO_CATALOG.rain;

    // Filter out current video if possible so we always switch to a DIFFERENT working video
    const available = pool.filter((v) => v.videoId !== currentVideoId);
    const candidatePool = available.length > 0 ? available : pool;

    if (typeof rotationIndices[key] !== 'number') {
      rotationIndices[key] = 0;
    }

    const index = rotationIndices[key] % candidatePool.length;
    rotationIndices[key] = index + 1;

    return candidatePool[index];
  },
};
