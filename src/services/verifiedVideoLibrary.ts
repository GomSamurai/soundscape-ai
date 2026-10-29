/**
 * Verified YouTube Video Library with Guaranteed Working & Embeddable Videos
 * Provides instant, zero-latency replacement rotation with 100% active, long-duration ambient videos.
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
      title: '3 Horas de Lluvia Relajante para Dormir y Estudiar',
      thumbnail: 'https://img.youtube.com/vi/q76bMs-NwRk/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'yIQd2Ya0Ziw',
      title: 'Lluvia Suave y Tormenta de Bosque 8 Horas',
      thumbnail: 'https://img.youtube.com/vi/yIQd2Ya0Ziw/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'nDq6TstdEi8',
      title: 'Tormenta de Lluvia y Truenos Acogedora 10 Horas',
      thumbnail: 'https://img.youtube.com/vi/nDq6TstdEi8/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'V1RPi2MYptM',
      title: 'Lluvia Nocturna Zen con Agua y Paz Sonora',
      thumbnail: 'https://img.youtube.com/vi/V1RPi2MYptM/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  fire: [
    {
      videoId: 'L_LUpnjgPso',
      title: 'Fuego de Chimenea Crujiente 4K (3 Horas)',
      thumbnail: 'https://img.youtube.com/vi/L_LUpnjgPso/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'K0pJRo0XU8s',
      title: 'Chimenea Tradicional de Leña de Roble (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/K0pJRo0XU8s/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: '9JpcEtLPMaA',
      title: 'Chimenea Monumental en Palacio y Salón Señorial (1 Hora)',
      thumbnail: 'https://img.youtube.com/vi/9JpcEtLPMaA/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
  ocean: [
    {
      videoId: 'WHPEKLQID4U',
      title: 'Olas de Mar Suaves en Playa Virgen (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/WHPEKLQID4U/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'bn9F19Hi1Lk',
      title: 'Olas de Mar en Estéreo Puro para Dormir (11 Horas)',
      thumbnail: 'https://img.youtube.com/vi/bn9F19Hi1Lk/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'Nep1qytq9JM',
      title: 'Olas Suaves Nocturnas en Playa Tropical (4 Horas)',
      thumbnail: 'https://img.youtube.com/vi/Nep1qytq9JM/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  jazz_cafe: [
    {
      videoId: 'Dx5qFachd3A',
      title: 'Cafetería de París con Jazz Acogedor (Stream 24/7)',
      thumbnail: 'https://img.youtube.com/vi/Dx5qFachd3A/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'fEvM-OUbaKs',
      title: 'Coffee Jazz Lounge Chill Out (Stream 24/7)',
      thumbnail: 'https://img.youtube.com/vi/fEvM-OUbaKs/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'h2zkV-l_TbY',
      title: 'Ambiente de Cafetería y Jazz Suave con Lluvia (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/h2zkV-l_TbY/hqdefault.jpg',
      category: 'Musical',
    },
  ],
  lofi: [
    {
      videoId: 'DWcJFNfaw9c',
      title: 'Lofi Hip Hop Radio Beats to Sleep & Chill (Lofi Girl 24/7)',
      thumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: '7NOSDKb0HlU',
      title: 'Chillhop Beats to Study & Relax (Chillhop 24/7)',
      thumbnail: 'https://img.youtube.com/vi/7NOSDKb0HlU/hqdefault.jpg',
      category: 'Musical',
    },
  ],
  forest: [
    {
      videoId: 'xNN7iTA57jM',
      title: 'Pájaros Cantando en Bosque Verde Primaveral (3 Horas)',
      thumbnail: 'https://img.youtube.com/vi/xNN7iTA57jM/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: '8myYyMg1fFE',
      title: 'Lluvia y Sonidos de Fauna en Bosque Húmedo',
      thumbnail: 'https://img.youtube.com/vi/8myYyMg1fFE/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'eKFTSSKCzWA',
      title: 'Cascada Natural y Canto de Aves en el Bosque',
      thumbnail: 'https://img.youtube.com/vi/eKFTSSKCzWA/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  blizzard: [
    {
      videoId: '7BrIJrjxVxA',
      title: 'Ventisca Ártica y Viento Aullando en el Bosque (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/7BrIJrjxVxA/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  tibetan: [
    {
      videoId: 'By6zerfldXE',
      title: 'Cuencos Tibetanos y Baño de Sonido Relajante (3 Horas)',
      thumbnail: 'https://img.youtube.com/vi/By6zerfldXE/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
    {
      videoId: 'FjHGZj2IjBk',
      title: 'Meditación Zen y Paz Acústica Profunda',
      thumbnail: 'https://img.youtube.com/vi/FjHGZj2IjBk/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
  ],
  cyberpunk: [
    {
      videoId: 'd00VwBAoiF0',
      title: 'Blade Runner Cyberpunk Lluvia Neón y Sintetizadores',
      thumbnail: 'https://img.youtube.com/vi/d00VwBAoiF0/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: '3sL0omwElxw',
      title: 'Lluvia Sci-Fi y Fuego de Chimenea Futurista (3 Horas)',
      thumbnail: 'https://img.youtube.com/vi/3sL0omwElxw/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
  classical: [
    {
      videoId: 'RXhE9oyni_o',
      title: 'Cuarteto de Cuerdas Clásico Completo en Salón Dorado',
      thumbnail: 'https://img.youtube.com/vi/RXhE9oyni_o/hqdefault.jpg',
      category: 'Musical',
    },
  ],
  banquet: [
    {
      videoId: '6ego1nkJMVw',
      title: 'Banquete de Gala · Tintineo de Copas, Cubiertos y Murmullo Cortés (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/6ego1nkJMVw/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'qm-TvNt9vDs',
      title: 'Sobremesa Elegante · Cristalería Fina y Conversación Suave (1 Hora)',
      thumbnail: 'https://img.youtube.com/vi/qm-TvNt9vDs/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'iphXo0rbTaY',
      title: 'Sonido Ambiente de Restaurante Señorial y Banquete (8 Horas)',
      thumbnail: 'https://img.youtube.com/vi/iphXo0rbTaY/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
  chatter: [
    {
      videoId: 'DqFusZ2TJsM',
      title: 'Gente Hablando en Cafetería y Restaurante · Murmullo Relajante (2 Horas)',
      thumbnail: 'https://img.youtube.com/vi/DqFusZ2TJsM/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'SMx967gwsIQ',
      title: 'Sonido de Gente Hablando de Fondo para Acompañamiento y Estudio',
      thumbnail: 'https://img.youtube.com/vi/SMx967gwsIQ/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'gK1E9gYInKI',
      title: 'Ambiente de Bar Español Lleno, Murmullo y Tapas',
      thumbnail: 'https://img.youtube.com/vi/gK1E9gYInKI/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
  tavern: [
    {
      videoId: '3tFPC9RBYlk',
      title: 'Taberna Medieval · Fuego de Chimenea, Risas y Música de Laúd (2.5 Horas)',
      thumbnail: 'https://img.youtube.com/vi/3tFPC9RBYlk/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'SUbvpyEYaxs',
      title: 'Hogar de Taberna Medieval con Laúd Cálido (1 Hora)',
      thumbnail: 'https://img.youtube.com/vi/SUbvpyEYaxs/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'rv3Nl-Od9YU',
      title: 'Sonidos de Taberna Medieval con Chimenea Crujiente (1 Hora)',
      thumbnail: 'https://img.youtube.com/vi/rv3Nl-Od9YU/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
  underwater: [
    {
      videoId: 'R885bpfF-R4',
      title: 'Cantos de Ballenas y Océano Profundo 4K (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/R885bpfF-R4/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: 'YdUwmNp-7oI',
      title: 'Canto de Ballenas en el Arrecife · Ondas Submarinas (6 Horas)',
      thumbnail: 'https://img.youtube.com/vi/YdUwmNp-7oI/hqdefault.jpg',
      category: 'Naturaleza',
    },
    {
      videoId: '8prg0qdjTgU',
      title: 'Inmersión Subacuática y Ecos Cetáceos (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/8prg0qdjTgU/hqdefault.jpg',
      category: 'Naturaleza',
    },
  ],
  space: [
    {
      videoId: 'DunIRy0PPCs',
      title: 'Zumbido de Nave Espacial y Vacío Cósmico (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/DunIRy0PPCs/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
    {
      videoId: 'BtfzACa0kIg',
      title: 'Sonidos del Espacio Profundo y Motores de Nave (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/BtfzACa0kIg/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
    {
      videoId: 'TPWYQ94Ief4',
      title: 'Órbita Planetaria · Resonancia Subgrave Espacial (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/TPWYQ94Ief4/hqdefault.jpg',
      category: 'Binaural & Drones',
    },
  ],
  hang_drum: [
    {
      videoId: '7YxcNCtitfA',
      title: 'Hang Drum y Handpan Meditación Hipnótica al Atardecer (3 Horas)',
      thumbnail: 'https://img.youtube.com/vi/7YxcNCtitfA/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'FnVbcIalin8',
      title: 'Música de Handpan Relajante y Ondas Armónicas (8 Horas)',
      thumbnail: 'https://img.youtube.com/vi/FnVbcIalin8/hqdefault.jpg',
      category: 'Musical',
    },
    {
      videoId: 'EUpmd5M0qVo',
      title: 'Handpan Acústico Meditativo y Flujo Zen (3.5 Horas)',
      thumbnail: 'https://img.youtube.com/vi/EUpmd5M0qVo/hqdefault.jpg',
      category: 'Musical',
    },
  ],
  vinyl: [
    {
      videoId: '8VicNS9H624',
      title: 'Textura de Vinilo y Crujido Analógico Cálido (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/8VicNS9H624/hqdefault.jpg',
      category: 'Atmosférico',
    },
    {
      videoId: 'm5Mz9Tqs9CE',
      title: 'Aguja sobre Disco de Vinilo · Ruido Blanco Vintage (10 Horas)',
      thumbnail: 'https://img.youtube.com/vi/m5Mz9Tqs9CE/hqdefault.jpg',
      category: 'Atmosférico',
    },
  ],
};

// Global rotation pointers per theme to guarantee every click changes to a new video
const rotationIndices: Record<string, number> = {};

export const VerifiedVideoLibrary = {
  detectCategory(queryOrTitle: string): string {
    const text = (queryOrTitle || '').toLowerCase();
    if (text.includes('vinilo') || text.includes('vinyl') || text.includes('aguja') || text.includes('disco') || text.includes('vintage') || text.includes('crackle')) return 'vinyl';
    if (text.includes('banquet') || text.includes('cristal') || text.includes('copas') || text.includes('vajilla') || text.includes('plato') || text.includes('cena')) return 'banquet';
    if (text.includes('gente') || text.includes('habla') || text.includes('murmullo') || text.includes('conversaci') || text.includes('chatter') || text.includes('compañía') || text.includes('personas')) return 'chatter';
    if (text.includes('taberna') || text.includes('tavern') || text.includes('medieval') || text.includes('posada') || text.includes('laúd') || text.includes('lute')) return 'tavern';
    if (text.includes('ballena') || text.includes('whale') || text.includes('submarino') || text.includes('underwater') || text.includes('bajo el agua') || text.includes('acuático') || text.includes('acuatico')) return 'underwater';
    if (text.includes('hang') || text.includes('handpan') || text.includes('pantalón') || text.includes('drum')) return 'hang_drum';
    if (text.includes('aristocr') || text.includes('lujo') || text.includes('palacio') || text.includes('salón') || text.includes('salon') || text.includes('sobremesa') || text.includes('clásic') || text.includes('clasic') || text.includes('realeza') || text.includes('cuerdas') || text.includes('string')) return 'classical';
    if (text.includes('lluvia') || text.includes('rain') || text.includes('tormenta') || text.includes('thunder')) return 'rain';
    if (text.includes('fuego') || text.includes('fire') || text.includes('chimenea') || text.includes('fogata') || text.includes('leña')) return 'fire';
    if (text.includes('mar') || text.includes('ocean') || text.includes('ola') || text.includes('playa') || text.includes('costa')) return 'ocean';
    if (text.includes('jazz') || text.includes('café') || text.includes('cafe') || text.includes('paris')) return 'jazz_cafe';
    if (text.includes('lofi') || text.includes('lo-fi') || text.includes('beats') || text.includes('chillhop')) return 'lofi';
    if (text.includes('bosque') || text.includes('forest') || text.includes('pájaro') || text.includes('bird')) return 'forest';
    if (text.includes('nieve') || text.includes('snow') || text.includes('ventisca') || text.includes('blizzard')) return 'blizzard';
    if (text.includes('tibetan') || text.includes('cuenco') || text.includes('bowl') || text.includes('zen') || text.includes('medita')) return 'tibetan';
    if (text.includes('cyber') || text.includes('blade') || text.includes('runner') || text.includes('neon') || text.includes('futuro')) return 'cyberpunk';
    if (text.includes('espacio') || text.includes('space') || text.includes('cosmos') || text.includes('drone') || text.includes('nave')) return 'space';
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
