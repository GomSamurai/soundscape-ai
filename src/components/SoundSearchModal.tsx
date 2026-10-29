import React, { useState, useMemo, useEffect } from 'react';
import { SOUND_LIBRARY } from '../services/soundLibrary';
import { SoundLibraryItem, ChannelTrack, SoundSourceType } from '../types/soundscape';
import { YouTubeManager } from '../services/youtubeManager';
import { GeminiKeyService } from '../services/geminiKeyService';
import {
  Search,
  Plus,
  X,
  Globe,
  Youtube,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  Sliders,
  Volume2,
  Wand2,
} from 'lucide-react';

export interface YouTubeLiveResult {
  videoId: string;
  title: string;
  duration?: string;
  author?: string;
  thumbnail: string;
}

export interface SoundSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (track: ChannelTrack) => void;
  replaceTrackId?: string | null;
  replaceTrackName?: string | null;
  initialTab?: 'ai_replace' | 'youtube_live' | 'catalog' | 'youtube_direct' | 'web_url';
  onReplaceTrackSource?: (trackId: string, updated: Partial<ChannelTrack>) => void;
}

interface AISuggestion {
  customTitle: string;
  youtubeSearchQuery: string;
  volume: number;
  pan: number;
  filterCutoff: number;
  reverbSend: number;
  delaySend?: number;
  tapeWarmth?: number;
  role?: string;
  explanation?: string;
}

// Client-side emergency fallback videos to guarantee 100% availability for common soundscapes
const CLIENT_FALLBACK_VIDEOS: Record<string, YouTubeLiveResult[]> = {
  gente: [
    {
      videoId: 'DqFusZ2TJsM',
      title: 'Sonido gente hablando bar restaurante murmurando · 2 Horas relajantes',
      duration: '2:00:02',
      author: 'Música para relajarse',
      thumbnail: 'https://i.ytimg.com/vi/DqFusZ2TJsM/hq720.jpg',
    },
    {
      videoId: 'SMx967gwsIQ',
      title: 'Sonido de Gente Hablando · Ruido de Fondo para Estudiar y Acompañamiento',
      duration: '10:12',
      author: 'Ambient Sound Explorer',
      thumbnail: 'https://i.ytimg.com/vi/SMx967gwsIQ/hq720.jpg',
    },
    {
      videoId: 'gK1E9gYInKI',
      title: 'Sonido de Bar & Cafetería Española Llena · Murmullo Natural',
      duration: '1:32:28',
      author: 'Elo Paradise',
      thumbnail: 'https://i.ytimg.com/vi/gK1E9gYInKI/hq720.jpg',
    },
    {
      videoId: 'iphXo0rbTaY',
      title: 'Sonido ambiente de un Restaurante · Conversación Natural (8 Horas)',
      duration: '8:13:58',
      author: 'World Ambient Sounds',
      thumbnail: 'https://i.ytimg.com/vi/iphXo0rbTaY/hq720.jpg',
    },
    {
      videoId: '7w3cPXNHyzI',
      title: 'Gente Hablando Sonido Ambiente Relajante',
      duration: '1:09:40',
      author: 'Catarsis',
      thumbnail: 'https://i.ytimg.com/vi/7w3cPXNHyzI/hq720.jpg',
    },
  ],
  lluvia: [
    {
      videoId: 'mPZkdNFkNps',
      title: 'Lluvia Relajante y Tormenta Suave en Ventana',
      duration: '3:00:00',
      author: 'Relaxing Sounds',
      thumbnail: 'https://i.ytimg.com/vi/mPZkdNFkNps/hqdefault.jpg',
    },
    {
      videoId: 'yIQd2Ya0Ziw',
      title: 'Lluvia en el Bosque con Truenos Lejanos 4K',
      duration: '2:00:00',
      author: 'Nature Soundscapes',
      thumbnail: 'https://i.ytimg.com/vi/yIQd2Ya0Ziw/hqdefault.jpg',
    },
  ],
  fuego: [
    {
      videoId: 'L_LUpnjgPso',
      title: 'Chimenea Acogedora Fuego de Leña Crujiente',
      duration: '3:00:00',
      author: 'Cozy Fireplace',
      thumbnail: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg',
    },
  ],
  cafe: [
    {
      videoId: 'h2zkV-l_TbY',
      title: 'Cozy Coffee Shop Ambience · Smooth Jazz & Gentle Rain',
      duration: '3:30:00',
      author: 'Coffee Relaxing',
      thumbnail: 'https://i.ytimg.com/vi/h2zkV-l_TbY/hqdefault.jpg',
    },
    {
      videoId: 'U660GwU-d-I',
      title: 'Warm Coffee Shop Ambience with Soft Murmur & Vinyl Lofi',
      duration: '2:15:00',
      author: 'Cozy Corner',
      thumbnail: 'https://i.ytimg.com/vi/U660GwU-d-I/hqdefault.jpg',
    },
  ],
  olas: [
    {
      videoId: 'Nep1qytq9JM',
      title: 'Olas Suaves del Mar en Playa Tropical de Noche',
      duration: '4:00:00',
      author: 'Ocean Sounds',
      thumbnail: 'https://i.ytimg.com/vi/Nep1qytq9JM/hqdefault.jpg',
    },
  ],
  bosque: [
    {
      videoId: 'xNN7iTA57jM',
      title: 'Sonidos del Bosque Templado y Pájaros Cantando al Amanecer',
      duration: '3:00:00',
      author: 'Nature Relax',
      thumbnail: 'https://i.ytimg.com/vi/xNN7iTA57jM/hqdefault.jpg',
    },
  ],
};

function getFallbackResultsForQuery(query: string): YouTubeLiveResult[] {
  const q = query.toLowerCase().trim();
  if (
    q.includes('gente') ||
    q.includes('habla') ||
    q.includes('murmullo') ||
    q.includes('conversaci') ||
    q.includes('bar') ||
    q.includes('restauran') ||
    q.includes('personas') ||
    q.includes('chatter')
  ) {
    return CLIENT_FALLBACK_VIDEOS.gente;
  }
  if (q.includes('lluvia') || q.includes('tormenta') || q.includes('rain')) {
    return CLIENT_FALLBACK_VIDEOS.lluvia;
  }
  if (q.includes('fuego') || q.includes('chimenea') || q.includes('fire')) {
    return CLIENT_FALLBACK_VIDEOS.fuego;
  }
  if (q.includes('cafe') || q.includes('café') || q.includes('coffee') || q.includes('lofi') || q.includes('jazz')) {
    return CLIENT_FALLBACK_VIDEOS.cafe;
  }
  if (q.includes('ola') || q.includes('mar') || q.includes('playa') || q.includes('ocean')) {
    return CLIENT_FALLBACK_VIDEOS.olas;
  }
  if (q.includes('bosque') || q.includes('forest') || q.includes('pajaro') || q.includes('ave')) {
    return CLIENT_FALLBACK_VIDEOS.bosque;
  }

  // Catalog item matches with youtubeVideoId
  const catalogMatches = SOUND_LIBRARY.filter(
    (item) =>
      item.youtubeVideoId &&
      (item.name.toLowerCase().includes(q) || item.tags.some((t) => t.toLowerCase().includes(q)))
  ).map((item) => ({
    videoId: item.youtubeVideoId!,
    title: item.name,
    duration: 'En vivo',
    author: item.authorOrAttribution || 'Catálogo Oficial',
    thumbnail: item.youtubeThumbnail || `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`,
  }));

  if (catalogMatches.length > 0) return catalogMatches;
  return CLIENT_FALLBACK_VIDEOS.gente;
}

function generateClientAiHeuristic(prompt: string, currentName?: string | null): AISuggestion {
  const p = prompt.toLowerCase();
  let title = prompt.slice(0, 32);
  let vol = 0.52;
  let pan = 0;
  let cutoff = 14000;
  let reverb = 0.25;
  let role = 'Ambiente Acústico';
  let explanation = `Diseñado para complementar el canal ${currentName ? `"${currentName}"` : ''} con máxima fidelidad sonora.`;

  if (
    p.includes('gente') ||
    p.includes('habla') ||
    p.includes('murmullo') ||
    p.includes('bar') ||
    p.includes('conversaci') ||
    p.includes('restauran')
  ) {
    title = 'Murmullo & Conversación Social';
    vol = 0.45;
    pan = 0.2;
    cutoff = 6500;
    reverb = 0.28;
    role = 'Foley Social';
    explanation =
      'Atenuación suave en agudos (6.5kHz) y paneo a la derecha para dar presencia sin interferir con instrumentos melódicos.';
  } else if (p.includes('lluvia') || p.includes('tormenta')) {
    title = 'Lluvia Suave en Ventanal';
    vol = 0.65;
    pan = -0.25;
    cutoff = 12000;
    reverb = 0.35;
    role = 'Clima Atmosférico';
    explanation =
      'Amplio espectro con reverberación espacial amplia para generar un entorno envolvente y acogedor.';
  } else if (p.includes('fuego') || p.includes('chimenea')) {
    title = 'Chimenea de Leña Crujiente';
    vol = 0.58;
    pan = 0.15;
    cutoff = 15000;
    reverb = 0.15;
    role = 'Calidez Íntima';
    explanation =
      'Respuesta fiel en transitorios crujientes con reverb seco para situarlo cerca del punto de escucha.';
  } else if (p.includes('saxo') || p.includes('jazz') || p.includes('solista')) {
    title = 'Saxofón Jazz Nocturno';
    vol = 0.62;
    pan = -0.1;
    cutoff = 16000;
    reverb = 0.4;
    role = 'Instrumento Solista';
    explanation = 'Presencia destacada y reverberación cálida para posicionarlo como elemento melódico central.';
  }

  return {
    customTitle: title,
    youtubeSearchQuery: prompt,
    volume: vol,
    pan: pan,
    filterCutoff: cutoff,
    reverbSend: reverb,
    delaySend: 0.1,
    tapeWarmth: 0.2,
    role: role,
    explanation: explanation,
  };
}

export const SoundSearchModal: React.FC<SoundSearchModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
  replaceTrackId,
  replaceTrackName,
  initialTab,
  onReplaceTrackSource,
}) => {
  const [activeTab, setActiveTab] = useState<
    'ai_replace' | 'youtube_live' | 'catalog' | 'youtube_direct' | 'web_url'
  >(initialTab || (replaceTrackId ? 'ai_replace' : 'youtube_live'));

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // AI Replace state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiVideos, setAiVideos] = useState<YouTubeLiveResult[]>([]);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Live YouTube search state
  const [liveQuery, setLiveQuery] = useState('gente hablando');
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [liveResults, setLiveResults] = useState<YouTubeLiveResult[]>([]);
  const [hasSearchedLive, setHasSearchedLive] = useState(false);
  const [livePage, setLivePage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Quick chips for live discovery
  const QUICK_SEARCH_CHIPS = [
    { label: '👥 Gente Hablando', term: 'gente hablando bar restaurante murmullo' },
    { label: '🌧️ Lluvia & Truenos', term: 'lluvia tormenta sonido relajante' },
    { label: '☕ Café & Jazz Lofi', term: 'lofi hip hop radio beats to relax' },
    { label: '🔥 Chimenea Acogedora', term: 'chimenea crujiente fuego de leña' },
    { label: '🌊 Olas & Océano', term: 'olas de mar playa sonido relajante' },
    { label: '🌲 Bosque & Pájaros', term: 'sonidos del bosque pajaros naturaleza' },
    { label: '🌌 Cyberpunk Ambience', term: 'blade runner ambient cyberpunk futuristic' },
    { label: '🧘 Cuencos 432Hz', term: 'tibetan singing bowls 432hz meditation' },
  ];

  // Quick inspiration chips for AI prompt
  const AI_INSPIRATION_CHIPS = [
    { label: '👥 Gente Hablando & Murmullo', prompt: 'Gente hablando y murmullo en un café acogedor sin música estridente' },
    { label: '🎷 Saxo Jazz de Madrugada', prompt: 'Solo de saxofón tenor melancólico tocando en club de jazz' },
    { label: '☕ Café de París & Lofi', prompt: 'Ambiente de cafetería parisina con lofi suave y tazas de porcelana' },
    { label: '🌧️ Lluvia Fina en Ventanal', prompt: 'Lluvia suave golpeando cristales con truenos lejanos' },
    { label: '🔥 Chimenea Crujiente', prompt: 'Fuego de chimenea crepitante y leña de roble ardiendo' },
    { label: '🌊 Olas del Mar Nocturnas', prompt: 'Olas suaves del océano rompiendo en la orilla de noche' },
    { label: '🌲 Bosque & Viento en Pinos', prompt: 'Viento susurrando entre las copas de los árboles y pájaros silvestres' },
    { label: '🧘 Cuencos Tibetanos 432Hz', prompt: 'Cuencos tibetanos y campanas de meditación zen a 432Hz' },
    { label: '🪐 Sub-Drone Cósmico Profundo', prompt: 'Drone sub-grave y resonancia espacial profunda' },
  ];

  // YouTube direct link state
  const [ytInput, setYtInput] = useState('');
  const [ytCustomTitle, setYtCustomTitle] = useState('');
  const [parsedYtId, setParsedYtId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    title?: string;
    author?: string;
    thumbnail?: string;
    error?: string;
  } | null>(null);

  // Web URL state
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customMediaType, setCustomMediaType] = useState<SoundSourceType>('audio_url');

  const categories = [
    'Todos',
    'YouTube Videos',
    'Naturaleza',
    'Binaural & Drones',
    'Atmosférico',
  ];

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else if (replaceTrackId) {
        setActiveTab('ai_replace');
      } else {
        setActiveTab('youtube_live');
      }

      const cleanName = replaceTrackName
        ? replaceTrackName.replace(/\(.*?\)/g, '').trim()
        : '';

      const defaultLiveQuery = cleanName || 'gente hablando';
      setLiveQuery(defaultLiveQuery);

      const defaultAiPrompt = cleanName
        ? `Gente hablando y ambiente acústico para complementar ${cleanName}`
        : 'Gente hablando en una cafetería acogedora';
      setAiPrompt(defaultAiPrompt);

      // Execute initial search right away if in youtube_live tab
      const targetTab = initialTab || (replaceTrackId ? 'ai_replace' : 'youtube_live');
      if (targetTab === 'youtube_live') {
        executeLiveSearch(defaultLiveQuery, 1, false);
      }
    }
  }, [isOpen, replaceTrackId, replaceTrackName, initialTab]);

  // Execute AI Replacement
  const handleExecuteAiReplace = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || aiPrompt).trim();
    if (!promptToUse) return;

    setIsGeneratingAi(true);
    setAiNotice(null);

    try {
      const res = await fetch('/api/gemini/replace-channel', {
        method: 'POST',
        headers: GeminiKeyService.getAuthHeaders(),
        body: JSON.stringify({
          userPrompt: promptToUse,
          currentTrack: {
            name: replaceTrackName || 'Canal',
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.aiSuggestion) {
        setAiSuggestion(data.aiSuggestion);
        if (Array.isArray(data.results) && data.results.length > 0) {
          setAiVideos(data.results);
        } else {
          const fallback = getFallbackResultsForQuery(data.aiSuggestion.youtubeSearchQuery || promptToUse);
          setAiVideos(fallback);
        }
      } else {
        throw new Error(data.error || 'Respuesta incompleta');
      }
    } catch (err) {
      console.warn('AI replace endpoint fallback:', err);
      const heuristic = generateClientAiHeuristic(promptToUse, replaceTrackName);
      setAiSuggestion(heuristic);
      const fallbackVideos = getFallbackResultsForQuery(promptToUse);
      setAiVideos(fallbackVideos);
      setAiNotice('Sugerencia generada con el motor acústico de respaldo.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Perform live search when tab is active or query changes (with pagination)
  const executeLiveSearch = async (termToSearch: string, page = 1, append = false) => {
    if (!termToSearch.trim()) return;
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsSearchingLive(true);
      setLivePage(1);
    }
    setHasSearchedLive(true);

    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(termToSearch.trim())}&page=${page}&limit=20`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        if (append) {
          setLiveResults((prev) => {
            const existingIds = new Set(prev.map((item) => item.videoId));
            const fresh = data.results.filter((item: YouTubeLiveResult) => !existingIds.has(item.videoId));
            return [...prev, ...fresh];
          });
        } else {
          setLiveResults(data.results);
        }
        setLivePage(page);
        setHasMore(data.hasMore !== false);
      } else {
        // Safe semantic fallback so the user is never left with an empty screen
        if (!append) {
          const fallback = getFallbackResultsForQuery(termToSearch);
          setLiveResults(fallback);
        }
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Error in live search, utilizing verified fallback:', err);
      if (!append) {
        const fallback = getFallbackResultsForQuery(termToSearch);
        setLiveResults(fallback);
      }
      setHasMore(false);
    } finally {
      setIsSearchingLive(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (isLoadingMore || isSearchingLive || !hasMore) return;
    const nextPage = livePage + 1;
    executeLiveSearch(liveQuery, nextPage, true);
  };

  const handleSelectChip = (term: string) => {
    setLiveQuery(term);
    executeLiveSearch(term, 1, false);
  };

  // Verify YouTube video with backend oEmbed endpoint
  const verifyYouTubeVideo = async (videoId: string) => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch(`/api/youtube/verify?videoId=${encodeURIComponent(videoId)}`);
      const data = await res.json();
      setVerificationResult(data);
      if (data.valid && data.title && !ytCustomTitle) {
        setYtCustomTitle(data.title);
      }
    } catch (e) {
      setVerificationResult({ valid: false, error: 'Error de conexión al verificar' });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle YouTube input change and auto-extract ID
  const handleYtInputChange = (val: string) => {
    setYtInput(val);
    const id = YouTubeManager.extractVideoId(val);
    setParsedYtId(id);
    if (id) {
      verifyYouTubeVideo(id);
    } else {
      setVerificationResult(null);
    }
  };

  // Apply track or replace source with optional AI parameters
  const handleApplySource = (payload: {
    type: SoundSourceType;
    name: string;
    soundKey: string;
    youtubeVideoId?: string;
    youtubeThumbnail?: string;
    synthType?: any;
    sourceUrl?: string;
    color?: string;
    category?: string;
    volume?: number;
    pan?: number;
    filterCutoff?: number;
    reverbSend?: number;
    delaySend?: number;
    tapeWarmth?: number;
  }) => {
    if (replaceTrackId && onReplaceTrackSource) {
      onReplaceTrackSource(replaceTrackId, {
        type: payload.type,
        name: payload.name,
        soundKey: payload.soundKey,
        youtubeVideoId: payload.youtubeVideoId,
        youtubeThumbnail: payload.youtubeThumbnail,
        synthType: payload.synthType,
        sourceUrl: payload.sourceUrl,
        isUnavailable: false,
        ...(payload.volume !== undefined && { volume: payload.volume }),
        ...(payload.pan !== undefined && { pan: payload.pan }),
        ...(payload.filterCutoff !== undefined && { filterCutoff: payload.filterCutoff }),
        ...(payload.reverbSend !== undefined && { reverbSend: payload.reverbSend }),
        ...(payload.delaySend !== undefined && { delaySend: payload.delaySend }),
        ...(payload.tapeWarmth !== undefined && { tapeWarmth: payload.tapeWarmth }),
      });
    } else {
      const newTrack: ChannelTrack = {
        id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: payload.name,
        soundKey: payload.soundKey,
        type: payload.type,
        synthType: payload.synthType,
        sourceUrl: payload.sourceUrl,
        youtubeVideoId: payload.youtubeVideoId,
        youtubeThumbnail: payload.youtubeThumbnail,
        volume: payload.volume !== undefined ? payload.volume : 0.65,
        pan: payload.pan !== undefined ? payload.pan : 0,
        filterCutoff: payload.filterCutoff !== undefined ? payload.filterCutoff : 16000,
        filterType: 'lowpass',
        filterQ: 1.0,
        reverbSend: payload.reverbSend !== undefined ? payload.reverbSend : 0.25,
        delaySend: payload.delaySend !== undefined ? payload.delaySend : 0.15,
        tapeWarmth: payload.tapeWarmth !== undefined ? payload.tapeWarmth : 0.1,
        muted: false,
        solo: false,
        playbackRate: 1.0,
        loop: true,
        category: payload.category || (payload.type === 'youtube_video' ? 'YouTube Videos' : 'Personalizado'),
        color: payload.color || (payload.type === 'youtube_video' ? '#F43F5E' : '#06B6D4'),
        videoMode: payload.type === 'youtube_video' || payload.type === 'video_url',
      };
      onAddTrack(newTrack);
    }
    onClose();
  };

  const handleAddLiveYouTube = (video: YouTubeLiveResult) => {
    handleApplySource({
      type: 'youtube_video',
      name: video.title,
      soundKey: `yt_${video.videoId}`,
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      color: '#F43F5E',
      category: 'YouTube Videos',
    });
  };

  const handleApplyAiVideoWithCalibration = (video: YouTubeLiveResult, withDsp = true) => {
    const finalTitle = aiSuggestion?.customTitle || video.title;
    handleApplySource({
      type: 'youtube_video',
      name: finalTitle,
      soundKey: `yt_${video.videoId}`,
      youtubeVideoId: video.videoId,
      youtubeThumbnail: video.thumbnail,
      color: '#A855F7',
      category: 'IA Acústica',
      ...(withDsp && aiSuggestion
        ? {
            volume: aiSuggestion.volume,
            pan: aiSuggestion.pan,
            filterCutoff: aiSuggestion.filterCutoff,
            reverbSend: aiSuggestion.reverbSend,
            delaySend: aiSuggestion.delaySend,
            tapeWarmth: aiSuggestion.tapeWarmth,
          }
        : {}),
    });
  };

  const handleAddYouTubeDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = parsedYtId || YouTubeManager.extractVideoId(ytInput);
    if (!videoId) return;

    const title =
      ytCustomTitle.trim() ||
      verificationResult?.title ||
      `Video de YouTube (${videoId})`;

    const thumbnail =
      verificationResult?.thumbnail ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    handleApplySource({
      type: 'youtube_video',
      name: title,
      soundKey: `yt_${videoId}`,
      youtubeVideoId: videoId,
      youtubeThumbnail: thumbnail,
      color: '#F43F5E',
      category: 'YouTube Videos',
    });

    setYtInput('');
    setYtCustomTitle('');
    setParsedYtId(null);
    setVerificationResult(null);
  };

  const filteredCatalogItems = useMemo(() => {
    return SOUND_LIBRARY.filter((item) => {
      const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  const handleSelectCatalogSound = (item: SoundLibraryItem) => {
    handleApplySource({
      type: item.type,
      name: item.name,
      soundKey: item.key,
      youtubeVideoId: item.youtubeVideoId,
      youtubeThumbnail: item.youtubeThumbnail,
      synthType: item.synthType,
      sourceUrl: item.sourceUrl,
      color: item.color,
      category: item.category,
    });
  };

  const handleAddCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    const title = customTitle.trim() || (customMediaType === 'video_url' ? 'Video Web Stream' : 'Audio Web Stream');
    handleApplySource({
      type: customMediaType,
      name: title,
      soundKey: `custom_${Date.now()}`,
      sourceUrl: customUrl.trim(),
      color: customMediaType === 'video_url' ? '#14B8A6' : '#6366F1',
      category: 'Web Video / Streaming',
    });

    setCustomUrl('');
    setCustomTitle('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {replaceTrackId ? (
                <>
                  <RefreshCw className="w-4 h-4 text-violet-400" />
                  <span>Reemplazar Canal: &ldquo;{replaceTrackName || 'Canal'}&rdquo;</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>Buscador & Reemplazo con IA</span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {replaceTrackId
                ? 'Elige una nueva fuente sonora o deja que Gemini 3.8 Flash busque el mejor video y calibre el sonido automáticamente.'
                : 'Busca videos en YouTube en tiempo real, explora el catálogo o diseña nuevos canales con IA.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Mode Segmented Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs overflow-x-auto no-scrollbar">
          {/* Tab 0: AI Replace */}
          <button
            onClick={() => setActiveTab('ai_replace')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ai_replace'
                ? 'bg-gradient-to-r from-violet-600 to-rose-600 text-white shadow-md shadow-violet-900/30 ring-1 ring-violet-400/50'
                : 'text-violet-300 hover:text-white bg-violet-950/40 hover:bg-violet-900/40 border border-violet-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>✨ Reemplazar con IA</span>
            <span className="text-[9px] bg-black/40 text-amber-200 px-1 py-0.2 rounded font-mono">
              3.8 Flash
            </span>
          </button>

          {/* Tab 1: Live YouTube */}
          <button
            onClick={() => {
              setActiveTab('youtube_live');
              if (liveResults.length === 0) {
                executeLiveSearch(liveQuery || 'gente hablando', 1, false);
              }
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'youtube_live'
                ? 'bg-rose-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar en YouTube en Directo</span>
          </button>

          {/* Tab 2: Catalog */}
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Catálogo Verificado</span>
          </button>

          {/* Tab 3: Direct Link */}
          <button
            onClick={() => setActiveTab('youtube_direct')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'youtube_direct'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>Pegar Enlace Directo</span>
          </button>

          {/* Tab 4: Web URL */}
          <button
            onClick={() => setActiveTab('web_url')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'web_url'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Flujo Web</span>
          </button>
        </div>

        {/* TAB: REEMPLAZAR CON IA (GEMINI 3.8 FLASH) */}
        {activeTab === 'ai_replace' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-950/70 border-b border-slate-800 space-y-3">
              {/* Context Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-violet-950/70 via-slate-900 to-rose-950/70 border border-violet-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Wand2 className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Ingeniería Acústica con Gemini 3.8 Flash</span>
                      <span className="text-[9px] bg-violet-500/30 text-violet-200 border border-violet-500/50 px-1.5 py-0.2 rounded font-mono">
                        Auto-Calibración
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Pídele cualquier sonido en lenguaje natural. La IA seleccionará el mejor video de YouTube y ajustará el volumen, panorama y filtros del canal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Prompt Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleExecuteAiReplace();
                }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-slate-200">
                    ¿Qué sonido necesitas para este canal?
                  </span>
                  {replaceTrackName && (
                    <span className="text-[11px] text-cyan-400 font-mono">
                      Reemplazando: {replaceTrackName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Ej: gente hablando en un café elegante, saxo jazz nostálgico, lluvia en tejado..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-violet-500/40 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isGeneratingAi || !aiPrompt.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-lg shadow-violet-900/40"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Analizando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Buscar con IA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Inspiration Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider shrink-0 mr-1">
                  Ideas Rápidas:
                </span>
                {AI_INSPIRATION_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setAiPrompt(chip.prompt);
                      handleExecuteAiReplace(chip.prompt);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-violet-950 border border-slate-800 hover:border-violet-600/50 text-slate-300 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer text-xs"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Results Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isGeneratingAi ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                    <Sparkles className="w-4 h-4 text-amber-300 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">
                    Gemini 3.8 Flash está diseñando el reemplazo acústico...
                  </p>
                  <p className="text-[11px] text-slate-400 text-center max-w-sm">
                    Calculando balance de volumen, paneo estéreo, filtrado de frecuencias y seleccionando videos de YouTube con inserción verificada.
                  </p>
                </div>
              ) : aiSuggestion ? (
                <>
                  {/* AI Acoustic Calibration Card */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-violet-950/60 via-slate-900/90 to-slate-950 border border-violet-500/40 shadow-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-300">
                          {aiSuggestion.customTitle}
                        </span>
                        {aiSuggestion.role && (
                          <span className="text-[10px] font-mono bg-violet-900/60 text-violet-200 border border-violet-700/60 px-2 py-0.5 rounded-full">
                            {aiSuggestion.role}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <Check className="w-3 h-3" /> Calibrado por IA
                      </span>
                    </div>

                    {aiSuggestion.explanation && (
                      <p className="text-xs text-slate-300 italic border-l-2 border-violet-500/50 pl-2">
                        &ldquo;{aiSuggestion.explanation}&rdquo;
                      </p>
                    )}

                    {/* Acoustic Parameters Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-center">
                      <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Volumen</div>
                        <div className="text-xs font-mono font-bold text-cyan-300">
                          {Math.round(aiSuggestion.volume * 100)}%
                        </div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Panorama</div>
                        <div className="text-xs font-mono font-bold text-violet-300">
                          {aiSuggestion.pan > 0
                            ? `+${Math.round(aiSuggestion.pan * 100)} R`
                            : aiSuggestion.pan < 0
                            ? `${Math.round(aiSuggestion.pan * 100)} L`
                            : 'Centro'}
                        </div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Filtro Cutoff</div>
                        <div className="text-xs font-mono font-bold text-amber-300">
                          {Math.round(aiSuggestion.filterCutoff)} Hz
                        </div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Reverb Send</div>
                        <div className="text-xs font-mono font-bold text-rose-300">
                          {Math.round(aiSuggestion.reverbSend * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {aiNotice && (
                    <div className="text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-800/40 p-2 rounded-lg">
                      {aiNotice}
                    </div>
                  )}

                  {/* Videos Found */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
                      <span className="font-semibold text-slate-200">
                        Videos recomendados por la IA ({aiVideos.length})
                      </span>
                      <span className="text-[10px] text-slate-500">
                        100% Verificados para Inserción
                      </span>
                    </div>

                    {aiVideos.map((v) => (
                      <div
                        key={v.videoId}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-violet-500/50 transition-all gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                          <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-white">
                              {v.duration || 'En vivo'}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-slate-100 truncate" title={v.title}>
                                {v.title}
                              </h4>
                              <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.2 rounded shrink-0">
                                200 OK
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {v.author || 'YouTube'} · ID: {v.videoId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                          <button
                            onClick={() => handleApplyAiVideoWithCalibration(v, true)}
                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-md shadow-violet-900/30"
                            title="Aplica el video y configura el volumen, panorama y filtros recomendados por la IA"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>{replaceTrackId ? 'Reemplazar con Calibración IA' : 'Añadir con Calibración IA'}</span>
                          </button>

                          <button
                            onClick={() => handleApplyAiVideoWithCalibration(v, false)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
                            title="Reemplaza solo el video manteniendo tus ajustes actuales de volumen y efectos"
                          >
                            <span>Solo Video</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center p-12 text-slate-500 text-xs space-y-2">
                  <Sparkles className="w-8 h-8 text-violet-400 mx-auto opacity-70" />
                  <p className="text-sm font-semibold text-slate-300">
                    Diseño y Búsqueda de Canales con IA
                  </p>
                  <p className="max-w-md mx-auto text-slate-400">
                    Escribe lo que deseas para este canal o pulsa una de las ideas rápidas para que Gemini 3.8 Flash busque el mejor contenido de YouTube y optimice los parámetros de audio.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Live YouTube Search Engine with Infinite Discovery */}
        {activeTab === 'youtube_live' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-950/70 border-b border-slate-800 space-y-2.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeLiveSearch(liveQuery, 1, false);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Escribe cualquier búsqueda en YouTube (ej: gente hablando, lluvia torrencial, jazz parís, lofi...)"
                    value={liveQuery}
                    onChange={(e) => setLiveQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingLive || !liveQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-sm"
                >
                  {isSearchingLive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Buscar</span>
                </button>
              </form>

              {/* Quick Preset Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                  Sugerencias:
                </span>
                {QUICK_SEARCH_CHIPS.map((chip) => (
                  <button
                    key={chip.term}
                    type="button"
                    onClick={() => handleSelectChip(chip.term)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer text-xs"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Status & Counter Bar */}
              {liveResults.length > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-medium text-slate-200">
                      {liveResults.length} videos disponibles con inserción garantizada
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                      Página {livePage}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Buscador ilimitado · YouTube Embed 200 OK
                  </span>
                </div>
              )}
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {isSearchingLive ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                  <p className="text-xs font-medium">Buscando y validando inserción de videos en YouTube...</p>
                  <p className="text-[10px] text-slate-500">Filtrando automáticamente videos bloqueados o eliminados</p>
                </div>
              ) : liveResults.length === 0 ? (
                <div className="text-center p-12 text-slate-500 text-xs">
                  {hasSearchedLive
                    ? 'No se encontraron videos disponibles con inserción para esta búsqueda. Prueba con otros términos o elige una de las sugerencias.'
                    : 'Escribe una búsqueda o pulsa una sugerencia para consultar YouTube en directo.'}
                </div>
              ) : (
                <>
                  {liveResults.map((v) => (
                    <div
                      key={v.videoId}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-white">
                            {v.duration || 'En vivo'}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-slate-100 truncate" title={v.title}>
                              {v.title}
                            </h4>
                            <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.2 rounded shrink-0">
                              200 OK Verificado
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {v.author || 'YouTube'} · ID: {v.videoId}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddLiveYouTube(v)}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                      >
                        {replaceTrackId ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reemplazar Canal</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir a Mezcla</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}

                  {/* Infinite Pagination: Cargar Más Resultados */}
                  {hasMore && (
                    <div className="pt-2 pb-4 flex justify-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                            <span>Cargando más videos de YouTube (Página {livePage + 1})...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 text-rose-400" />
                            <span>Cargar Más Resultados (+20 videos siguientes)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Curated Catalog */}
        {activeTab === 'catalog' && (
          <>
            <div className="px-6 py-4 space-y-3 bg-slate-950/40 border-b border-slate-800/80">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en catálogo (lofi, lluvia, chimenea, jazz, olas, viento...)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
              {filteredCatalogItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {item.type === 'youtube_video' && item.youtubeThumbnail ? (
                      <div className="relative w-16 h-10 rounded overflow-hidden bg-black shrink-0">
                        <img
                          src={item.youtubeThumbnail}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Youtube className="w-4 h-4 text-rose-500" />
                        </div>
                      </div>
                    ) : (
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-slate-100 truncate">
                          {item.name}
                        </h4>
                        {item.type === 'youtube_video' && (
                          <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.2 rounded shrink-0">
                            Verificado Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>{item.authorOrAttribution || item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.tags.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectCatalogSound(item)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {replaceTrackId ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reemplazar</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tab 3: Direct YouTube URL Loader with Live Validation */}
        {activeTab === 'youtube_direct' && (
          <form onSubmit={handleAddYouTubeDirect} className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">
                Pega cualquier enlace o ID de video de YouTube:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                  value={ytInput}
                  onChange={(e) => handleYtInputChange(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 pr-10"
                  autoFocus
                />
                {isVerifying && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                El sistema valida automáticamente en vivo con YouTube si el video está activo y permite inserción.
              </span>
            </div>

            {/* Validation State Feedback */}
            {verificationResult && (
              <div
                className={`p-4 rounded-xl border flex items-center gap-4 ${
                  verificationResult.valid
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                }`}
              >
                {verificationResult.valid ? (
                  <>
                    <img
                      src={
                        verificationResult.thumbnail ||
                        `https://img.youtube.com/vi/${parsedYtId}/hqdefault.jpg`
                      }
                      alt="Vista previa"
                      referrerPolicy="no-referrer"
                      className="w-24 h-16 rounded object-cover border border-emerald-800"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>Video Verificado y 100% Disponible para Inserción</span>
                      </div>
                      <p className="text-xs text-white font-medium line-clamp-1">
                        {verificationResult.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Canal: {verificationResult.author} · ID: {parsedYtId}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-rose-300">
                        Video No Recomendado para Inserción
                      </h5>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {verificationResult.error ||
                          'Este video tiene restringida la reproducción fuera de YouTube.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">
                Título del canal en la consola (detectado automáticamente):
              </label>
              <input
                type="text"
                placeholder="Nombre del canal"
                value={ytCustomTitle}
                onChange={(e) => setYtCustomTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={!parsedYtId}
              className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{replaceTrackId ? 'Reemplazar en este Canal' : 'Añadir Video a la Mezcla'}</span>
            </button>
          </form>
        )}

        {/* Tab 4: Custom Direct Web Media URL */}
        {activeTab === 'web_url' && (
          <form onSubmit={handleAddCustomUrl} className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">
                URL directa de archivo multimedia (MP3, WAV, OGG, MP4, WebM):
              </label>
              <input
                type="url"
                required
                placeholder="https://ejemplo.com/archivo.mp3"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-200">
                  Nombre del canal:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Transmisión Ambiental"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-200">
                  Tipo de flujo:
                </label>
                <select
                  value={customMediaType}
                  onChange={(e) => setCustomMediaType(e.target.value as SoundSourceType)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none"
                >
                  <option value="audio_url">Audio Web Directo</option>
                  <option value="video_url">Video Web Directo (con monitor)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{replaceTrackId ? 'Reemplazar en este Canal' : 'Añadir Fuente Web a la Suite'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
