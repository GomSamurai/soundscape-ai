import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));

// In-memory Cloud Sync Store for persistence
interface CloudSoundscapeProject {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  channels: any[];
  masterVolume: number;
  masterReverb: number;
  tags: string[];
  visualTheme: string;
}

let cloudProjectsStore: Record<string, CloudSoundscapeProject> = {};

// Helper: Initialize Google Gen AI client with telemetry header
function getGenAIClient(customApiKey?: string): GoogleGenAI | null {
  const key = customApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Default server instance
const defaultAi = getGenAIClient();

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGemini: Boolean(defaultAi),
    defaultModel: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// API: Verify custom or default Gemini API key in real-time with gemini-3.8-flash
app.post('/api/gemini/verify-key', async (req, res) => {
  const clientKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
  const keyToTest = clientKey?.trim() || process.env.GEMINI_API_KEY?.trim();

  if (!keyToTest) {
    return res.status(400).json({
      valid: false,
      error: 'No se ha detectado ninguna clave de API en la solicitud ni en el servidor.',
    });
  }

  try {
    const testAi = new GoogleGenAI({
      apiKey: keyToTest,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await testAi.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping de verificación para Soundscape AI suite. Responde únicamente con: OK',
    });

    return res.json({
      success: true,
      valid: true,
      model: 'gemini-3.8-flash',
      message: 'Conexión validada exitosamente con Gemini 3.8 Flash.',
      reply: response.text?.trim() || 'OK',
      isCustom: Boolean(clientKey?.trim()),
    });
  } catch (err: any) {
    return res.status(400).json({
      valid: false,
      error: err.message || 'Error al validar la clave con Gemini 3.8 Flash. Verifica que sea correcta.',
    });
  }
});

// Verified fallback video dictionary in case of network timeouts
const VERIFIED_FALLBACKS: Record<string, { id: string; title: string }> = {
  rain: { id: 'mPZkdNFkNps', title: 'Rain on Window with Thunder 8K' },
  fire: { id: 'L_LUpnjgPso', title: 'Fireplace Sounds 4K' },
  jazz: { id: 'Dx5qFachd3A', title: 'Cozy Paris Coffee Shop Jazz' },
  lofi: { id: 'DWcJFNfaw9c', title: 'Lofi Hip Hop Radio Beats' },
  cyberpunk: { id: 'd00VwBAoiF0', title: 'Blade Runner Cyberpunk Rain' },
  ocean: { id: 'WHPEKLQID4U', title: 'Calm Ocean Waves Relaxing' },
  blizzard: { id: '7BrIJrjxVxA', title: 'Blizzard & Snowstorm Ambience' },
  tibetan: { id: 'By6zerfldXE', title: 'Tibetan Singing Bowls 432Hz' },
  forest: { id: 'xNN7iTA57jM', title: 'Birds in Forest Spring Ambience' },
};

// Helper: Live YouTube Search scraper with embed validation
// Helper: Live YouTube Search scraper with embed validation & pagination
interface YouTubeSearchResult {
  videoId: string;
  title: string;
  duration?: string;
  author?: string;
  thumbnail: string;
}

async function searchYouTubeLive(query: string, page = 1, maxCandidates = 40): Promise<YouTubeSearchResult[]> {
  try {
    // Generate page-specific modifier for deeper infinite results across pages
    let searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    if (page > 1) {
      const pageModifiers = [
        'relaxing soundscape',
        'ambience 4k audio',
        'deep immersive atmosphere',
        'extended session soundscape',
        'calm meditation ambience',
        'pure field recording',
      ];
      const modifier = pageModifiers[(page - 2) % pageModifiers.length];
      searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} ${modifier}`)}`;
    }

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) return [];
    const html = await res.text();
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.+?});/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const sectionList =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const results: YouTubeSearchResult[] = [];
    const seenIds = new Set<string>();

    for (const section of sectionList) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (v && v.videoId && v.title?.runs?.[0]?.text) {
          const videoId = v.videoId;
          if (seenIds.has(videoId)) continue;
          seenIds.add(videoId);

          const title = v.title.runs[0].text;
          const duration = v.lengthText?.simpleText || 'En vivo';
          const author = v.ownerText?.runs?.[0]?.text || '';
          const thumbnail =
            v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

          results.push({ videoId, title, duration, author, thumbnail });
          if (results.length >= maxCandidates) break;
        }
      }
      if (results.length >= maxCandidates) break;
    }

    return results;
  } catch (err) {
    console.warn('Error scraping YouTube search:', err);
    return [];
  }
}

// Helper: Fast check if video is embeddable via YouTube oEmbed with timeout
async function checkYouTubeEmbeddable(videoId: string, timeoutMs = 1200): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(
        videoId
      )}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    return res.status === 200;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

// Helper: Batch verify YouTube candidates concurrently
async function searchVerifiedYouTube(
  query: string,
  targetCount = 20,
  page = 1
): Promise<YouTubeSearchResult[]> {
  const candidates = await searchYouTubeLive(query, page, Math.max(30, targetCount * 2));
  const verified: YouTubeSearchResult[] = [];

  // Check in batches of 6 concurrently for speed
  const batchSize = 6;
  for (let i = 0; i < candidates.length && verified.length < targetCount; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const checks = await Promise.all(batch.map((c) => checkYouTubeEmbeddable(c.videoId)));
    for (let j = 0; j < batch.length; j++) {
      if (checks[j]) {
        verified.push(batch[j]);
        if (verified.length >= targetCount) break;
      }
    }
  }

  // Fallbacks if page 1 returned zero results
  if (verified.length === 0 && page === 1) {
    const q = query.toLowerCase();
    const fallbackList = Object.values(VERIFIED_FALLBACKS);
    for (const fb of fallbackList) {
      verified.push({
        videoId: fb.id,
        title: fb.title,
        thumbnail: `https://img.youtube.com/vi/${fb.id}/hqdefault.jpg`,
      });
      if (verified.length >= 6) break;
    }
  }

  return verified;
}

// API: YouTube Live Availability & Embed Validator
app.get('/api/youtube/verify', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ valid: false, error: 'videoId is required' });
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(
      videoId
    )}&format=json`;
    const ytRes = await fetch(oembedUrl);

    if (ytRes.status === 200) {
      const data = await ytRes.json();
      return res.json({
        valid: true,
        videoId,
        title: data.title,
        author: data.author_name,
        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      });
    } else {
      return res.json({
        valid: false,
        error:
          ytRes.status === 404
            ? 'El video de YouTube no existe o fue eliminado.'
            : 'El autor del video ha desactivado la reproducción insertada fuera de YouTube.',
      });
    }
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: 'Error al contactar con YouTube oEmbed' });
  }
});

// API: Live Search YouTube Videos with Pagination
app.get('/api/youtube/search', async (req, res) => {
  const query = (req.query.q as string) || '';
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(6, parseInt(req.query.limit as string, 10) || 20));

  if (!query.trim()) {
    return res.status(400).json({ success: false, error: 'q parameter required' });
  }

  try {
    const results = await searchVerifiedYouTube(query, limit, page);
    res.json({
      success: true,
      query,
      page,
      limit,
      results,
      count: results.length,
      hasMore: results.length >= 8, // can fetch further pages
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Find Valid Replacement for Broken / Unavailable Video
app.get('/api/youtube/find-replacement', async (req, res) => {
  const { query = 'ambient soundscape relaxing', category = '' } = req.query;
  const searchTerm = `${query} ${category} ambience relaxing`.trim();

  try {
    const verified = await searchVerifiedYouTube(searchTerm, 3);
    if (verified.length > 0) {
      return res.json({ success: true, replacement: verified[0] });
    }
    // Safe guaranteed fallback
    const fb = VERIFIED_FALLBACKS.rain;
    res.json({
      success: true,
      replacement: {
        videoId: fb.id,
        title: fb.title,
        thumbnail: `https://img.youtube.com/vi/${fb.id}/hqdefault.jpg`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Cloud Sync (get all synced projects)
app.get('/api/cloud/sync', (req, res) => {
  res.json({
    success: true,
    projects: Object.values(cloudProjectsStore),
    syncedAt: new Date().toISOString(),
  });
});

// API: Cloud Sync (save / update project)
app.post('/api/cloud/sync', (req, res) => {
  try {
    const { project } = req.body;
    if (!project || !project.id) {
      return res.status(400).json({ error: 'Project payload with id is required' });
    }
    cloudProjectsStore[project.id] = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    res.json({ success: true, project: cloudProjectsStore[project.id] });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sync project to cloud' });
  }
});

// API: Delete from cloud
app.delete('/api/cloud/sync/:id', (req, res) => {
  const { id } = req.params;
  if (cloudProjectsStore[id]) {
    delete cloudProjectsStore[id];
  }
  res.json({ success: true, message: 'Deleted from cloud' });
});

// API: AI Soundscape Generation with Live YouTube Discovery & DSP Effects
app.post('/api/gemini/generate-soundscape', async (req, res) => {
  const { prompt, currentTracks = [] } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt es requerido' });
  }

  let parsedRecipe: any = null;

  const clientKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
  const activeAi = getGenAIClient(clientKey);

  if (activeAi) {
    try {
      const systemInstruction = `Eres el Diseñador Acústico e Ingeniero de Audio Principal de Soundscape AI.
Tu tarea es convertir descripciones creativas del usuario en una receta multicanal inmersiva que combine videos de YouTube reales y capas de sintetizador procedimental.

Para CADA canal de YouTube:
- Proporciona en 'youtubeSearchQuery' un término de búsqueda muy descriptivo y en inglés o español para encontrar videos ambientales de alta calidad (ej: "medieval tavern ambient lute music", "cyberpunk rain tokyo blade runner", "deep space ambient drone 4k", "forest stream gentle birds chirping", "lofi hip hop study beats cafe", "tibetan singing bowls 432hz").
- Ajusta el panorama estéreo 'pan' (-0.8 a 0.8), volumen (0.2 a 0.85), frecuencia de corte 'filterCutoff' (500 a 18000 Hz), envío de reverberación 'reverbSend' (0.1 a 0.7), envío de delay/eco 'delaySend' (0 a 0.6), y calidez analógica de saturación 'tapeWarmth' (0 a 0.5).

Para capas de sintetizador procedimental:
- Usa soundKey: 'binaural_theta', 'binaural_alpha', 'binaural_delta', 'drone_sub', 'pink_noise', 'brown_noise', 'white_noise', 'ocean', 'rain', 'wind', 'vinyl'.`;

      const response = await activeAi.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Diseña una composición acústica para esta petición del usuario: "${prompt}".
Genera entre 3 y 5 canales equilibrados, de los cuales al menos 1 o 2 sean videos de YouTube con términos de búsqueda específicos.
Pistas previas (evitar duplicados innecesarios): ${JSON.stringify(currentTracks)}.`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Título evocador del paisaje sonoro' },
              tagline: { type: Type.STRING, description: 'Subtítulo conciso de 4 a 8 palabras' },
              concept: { type: Type.STRING, description: 'Descripción sensorial poética del entorno (2-3 oraciones)' },
              category: { type: Type.STRING, description: 'Categoría principal' },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Etiquetas acústicas',
              },
              visualTheme: {
                type: Type.STRING,
                description: 'Tema de color visual: cyan, amber, emerald, violet, sky, rose',
              },
              binauralFreqHz: { type: Type.NUMBER, description: 'Frecuencia binaural recomendada en Hz' },
              masterReverb: { type: Type.NUMBER, description: 'Reverberación master (0.0 a 1.0)' },
              masterDelay: { type: Type.NUMBER, description: 'Delay master (0.0 a 0.7)' },
              masterWarmth: { type: Type.NUMBER, description: 'Calidez analógica master (0.0 a 0.6)' },
              channels: {
                type: Type.ARRAY,
                description: 'Canales recomendados',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'Tipo de canal: "youtube_video" o "synthesizer"',
                    },
                    youtubeSearchQuery: {
                      type: Type.STRING,
                      description: 'Término de búsqueda específico para YouTube si es youtube_video',
                    },
                    soundKey: {
                      type: Type.STRING,
                      description: 'Identificador base (yt_video, binaural_theta, binaural_alpha, drone_sub, pink_noise, brown_noise, vinyl, rain, ocean, wind)',
                    },
                    customTitle: { type: Type.STRING, description: 'Nombre descriptivo del canal en la mezcla' },
                    volume: { type: Type.NUMBER, description: 'Volumen inicial recomendado (0.1 a 1.0)' },
                    pan: { type: Type.NUMBER, description: 'Balance estéreo (-1.0 a 1.0)' },
                    filterCutoff: { type: Type.NUMBER, description: 'Frecuencia de corte de filtro en Hz (200 a 18000)' },
                    reverbSend: { type: Type.NUMBER, description: 'Envío de reverb (0.0 a 1.0)' },
                    delaySend: { type: Type.NUMBER, description: 'Envío de eco / delay (0.0 a 1.0)' },
                    tapeWarmth: { type: Type.NUMBER, description: 'Calidez y saturación de cinta analógica (0.0 a 1.0)' },
                    role: { type: Type.STRING, description: 'Rol acústico: video principal, atmósfera, cimiento, detalle' },
                  },
                  required: ['type', 'customTitle', 'volume', 'pan'],
                },
              },
            },
            required: ['name', 'tagline', 'concept', 'category', 'tags', 'channels'],
          },
        },
      });

      parsedRecipe = JSON.parse(response.text || '{}');
    } catch (apiErr: any) {
      console.warn('Gemini API call failed, falling back to semantic live-search composer:', apiErr.message);
    }
  }

  // If Gemini wasn't available or errored, construct an intelligent semantic query recipe
  if (!parsedRecipe || !parsedRecipe.channels || parsedRecipe.channels.length === 0) {
    const p = prompt.trim();
    const userWords = p.toLowerCase();

    // Derive 2 targeted YouTube search queries from prompt
    let q1 = `${p} ambience relaxing`;
    let q2 = 'calm atmospheric soundscape 4k';

    if (userWords.includes('lluvia') || userWords.includes('tormenta')) {
      q1 = 'heavy rain thunder window ambience 4k';
      q2 = 'rainy day lofi chill beats';
    } else if (userWords.includes('medieval') || userWords.includes('taberna')) {
      q1 = 'medieval tavern fantasy lute ambience';
      q2 = 'fireplace and wooden rain tavern';
    } else if (userWords.includes('cyberpunk') || userWords.includes('futur')) {
      q1 = 'blade runner cyberpunk futuristic rain ambience';
      q2 = 'synthwave ambient night city';
    } else if (userWords.includes('espacio') || userWords.includes('space') || userWords.includes('galaxia')) {
      q1 = 'deep space ambient spaceship hum drone';
      q2 = 'celestial cosmic synthesizer meditation';
    } else if (userWords.includes('bosque') || userWords.includes('naturaleza') || userWords.includes('pájaro')) {
      q1 = 'forest birds gentle stream nature sounds 4k';
      q2 = 'wind through pine trees relaxing';
    } else if (userWords.includes('café') || userWords.includes('cafe') || userWords.includes('jazz')) {
      q1 = 'cozy coffee shop jazz rain ambience';
      q2 = 'paris cafe gentle chatter fireplace';
    } else if (userWords.includes('medita') || userWords.includes('zen') || userWords.includes('cuenco')) {
      q1 = 'tibetan singing bowls 432 hz deep meditation';
      q2 = 'zen garden water fountain bamboo';
    }

    parsedRecipe = {
      name: `Paisaje: ${p.slice(0, 36)}`,
      tagline: 'Composición generada en directo con búsqueda inteligente de YouTube',
      concept: `Paisaje sonoro multicanal diseñado dinámicamente para "${p}". Incluye capas de video de YouTube obtenidas en tiempo real y sintonización estéreo.`,
      category: 'Composición Inteligente',
      tags: ['YouTube Live Search', 'Audio Espacial', 'Estéreo Dinámico'],
      visualTheme: 'cyan',
      binauralFreqHz: 6.0,
      masterReverb: 0.35,
      masterDelay: 0.25,
      masterWarmth: 0.2,
      channels: [
        {
          type: 'youtube_video',
          youtubeSearchQuery: q1,
          customTitle: `Video 1: ${q1.slice(0, 28)}`,
          volume: 0.7,
          pan: -0.25,
          filterCutoff: 16000,
          reverbSend: 0.2,
          delaySend: 0.15,
          tapeWarmth: 0.1,
          role: 'video principal',
        },
        {
          type: 'youtube_video',
          youtubeSearchQuery: q2,
          customTitle: `Video 2: ${q2.slice(0, 28)}`,
          volume: 0.55,
          pan: 0.3,
          filterCutoff: 14000,
          reverbSend: 0.25,
          delaySend: 0.2,
          tapeWarmth: 0.15,
          role: 'atmósfera',
        },
        {
          type: 'synthesizer',
          soundKey: 'binaural_theta',
          customTitle: 'Onda Cerebral Theta (6.0 Hz)',
          volume: 0.35,
          pan: 0.0,
          filterCutoff: 12000,
          reverbSend: 0.2,
          delaySend: 0.0,
          tapeWarmth: 0.0,
          role: 'cimiento',
        },
        {
          type: 'synthesizer',
          soundKey: 'drone_sub',
          customTitle: 'Drone Armónico Sub-Grave (55 Hz)',
          volume: 0.28,
          pan: 0.0,
          filterCutoff: 8000,
          reverbSend: 0.3,
          delaySend: 0.25,
          tapeWarmth: 0.3,
          role: 'resonancia',
        },
      ],
    };
  }

  // Live YouTube Resolution: For every channel with type 'youtube_video', perform REAL LIVE YouTube search!
  const resolvedChannels = [];

  for (const ch of parsedRecipe.channels) {
    if (ch.type === 'youtube_video') {
      const query = ch.youtubeSearchQuery || ch.customTitle || prompt;
      const foundVideos = await searchVerifiedYouTube(query, 1);
      const chosenVideo = foundVideos[0];

      if (chosenVideo) {
        resolvedChannels.push({
          ...ch,
          soundKey: 'yt_video',
          youtubeVideoId: chosenVideo.videoId,
          youtubeThumbnail: chosenVideo.thumbnail,
          customTitle: ch.customTitle || chosenVideo.title,
        });
      } else {
        // Fallback to verified rain
        resolvedChannels.push({
          ...ch,
          soundKey: 'yt_video',
          youtubeVideoId: VERIFIED_FALLBACKS.rain.id,
          youtubeThumbnail: `https://img.youtube.com/vi/${VERIFIED_FALLBACKS.rain.id}/hqdefault.jpg`,
          customTitle: ch.customTitle || VERIFIED_FALLBACKS.rain.title,
        });
      }
    } else {
      resolvedChannels.push(ch);
    }
  }

  parsedRecipe.channels = resolvedChannels;

  return res.json({
    success: true,
    data: parsedRecipe,
  });
});

// API: AI Mix Balancer (Spatial & Acoustic Optimization)
app.post('/api/gemini/balance-mix', async (req, res) => {
  const clientKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
  const activeAi = getGenAIClient(clientKey);

  if (!activeAi) {
    return res.status(503).json({
      error: 'Servicio de Gemini no disponible. Configura tu API Key en los ajustes de Soundscape AI.',
    });
  }

  const { channels = [] } = req.body;
  if (!Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({ error: 'Se requiere una lista de canales activa' });
  }

  try {
    const response = await activeAi.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Eres un Ingeniero de Mastering Acústico. Optimiza la siguiente mezcla multicanal para evitar enmascaramiento frecuencial, mejorar la imagen estéreo y mantener un balance orgánico y transparente:
${JSON.stringify(channels, null, 2)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            engineerAnalysis: {
              type: Type.STRING,
              description: 'Explicación técnica concisa (1-2 oraciones) de los ajustes realizados en el espacio estéreo y dinámico',
            },
            balancedChannels: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  volume: { type: Type.NUMBER, description: 'Volumen ajustado (0.05 a 0.95)' },
                  pan: { type: Type.NUMBER, description: 'Panorama estéreo balanceado (-1.0 a 1.0)' },
                  filterCutoff: { type: Type.NUMBER, description: 'Frecuencia de corte optimizada en Hz' },
                  reverbSend: { type: Type.NUMBER, description: 'Envío de reverberación optimizado' },
                },
                required: ['id', 'volume', 'pan'],
              },
            },
          },
          required: ['engineerAnalysis', 'balancedChannels'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al optimizar mezcla con IA' });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AURA Audio Suite server running on http://0.0.0.0:${port}`);
  });
}

startServer();
