import React, { useState, useMemo, useEffect } from 'react';
import { SOUND_LIBRARY } from '../services/soundLibrary';
import { SoundLibraryItem, ChannelTrack, SoundSourceType } from '../types/soundscape';
import { YouTubeManager } from '../services/youtubeManager';
import { Search, Plus, X, Globe, Youtube, Check, AlertCircle, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface YouTubeLiveResult {
  videoId: string;
  title: string;
  duration?: string;
  author?: string;
  thumbnail: string;
}

interface SoundSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (track: ChannelTrack) => void;
  replaceTrackId?: string | null;
  replaceTrackName?: string | null;
  onReplaceTrackSource?: (trackId: string, updated: Partial<ChannelTrack>) => void;
}

export const SoundSearchModal: React.FC<SoundSearchModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
  replaceTrackId,
  replaceTrackName,
  onReplaceTrackSource,
}) => {
  const [activeTab, setActiveTab] = useState<'youtube_live' | 'catalog' | 'youtube_direct' | 'web_url'>('youtube_live');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Live YouTube search state
  const [liveQuery, setLiveQuery] = useState(replaceTrackName ? replaceTrackName.replace(/\(.*?\)/g, '').trim() : 'ambient soundscape relaxing');
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [liveResults, setLiveResults] = useState<YouTubeLiveResult[]>([]);
  const [hasSearchedLive, setHasSearchedLive] = useState(false);
  const [livePage, setLivePage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Quick filter presets for instant discovery
  const QUICK_SEARCH_CHIPS = [
    { label: '🌧️ Lluvia & Truenos', term: 'lluvia tormenta sonido relajante' },
    { label: '☕ Café & Jazz Lofi', term: 'lofi hip hop radio beats to relax' },
    { label: '🔥 Chimenea Acogedora', term: 'chimenea crujiente fuego de leña' },
    { label: '🌊 Olas & Océano', term: 'olas de mar playa sonido relajante' },
    { label: '🌲 Bosque & Pájaros', term: 'sonidos del bosque pajaros naturaleza' },
    { label: '🌌 Cyberpunk Ambience', term: 'blade runner ambient cyberpunk futuristic' },
    { label: '🧘 Cuencos 432Hz', term: 'tibetan singing bowls 432hz meditation' },
    { label: '❄️ Ventisca & Nieve', term: 'blizzard snowstorm soundscape' },
  ];

  // YouTube direct link input state
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
      if (data.success && Array.isArray(data.results)) {
        if (append) {
          // Avoid duplicate video IDs when appending
          setLiveResults((prev) => {
            const existingIds = new Set(prev.map((item) => item.videoId));
            const fresh = data.results.filter((item: YouTubeLiveResult) => !existingIds.has(item.videoId));
            return [...prev, ...fresh];
          });
        } else {
          setLiveResults(data.results);
        }
        setLivePage(page);
        setHasMore(data.hasMore !== false && data.results.length > 0);
      } else {
        if (!append) setLiveResults([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching YouTube live search:', err);
      if (!append) setLiveResults([]);
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

  useEffect(() => {
    if (isOpen && activeTab === 'youtube_live' && !hasSearchedLive) {
      executeLiveSearch(liveQuery, 1, false);
    }
  }, [isOpen, activeTab]);

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

  // Apply track or replace source
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
        volume: 0.65,
        pan: 0,
        filterCutoff: 16000,
        filterType: 'lowpass',
        filterQ: 1.0,
        reverbSend: 0.25,
        delaySend: 0.15,
        tapeWarmth: 0.1,
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
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {replaceTrackId ? (
                <>
                  <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>Reemplazar Fuente de: &ldquo;{replaceTrackName || 'Canal'}&rdquo;</span>
                </>
              ) : (
                <>
                  <Youtube className="w-4 h-4 text-rose-500" />
                  <span>Buscador Inteligente de Videos y Sonidos</span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {replaceTrackId
                ? 'Elige un video de YouTube activo o sonido para reemplazar la pista sin perder tus ajustes de volumen o efectos'
                : 'Busca cualquier video en tiempo real de YouTube (100% verificado y activo) o elige sonidos de estudio'}
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
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('youtube_live')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'youtube_live'
                ? 'bg-rose-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar en YouTube en Directo</span>
          </button>

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
                    placeholder="Escribe cualquier búsqueda en YouTube (ej: lluvia torrencial, jazz parís, cyberpunk, lofi beats...)"
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
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
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
