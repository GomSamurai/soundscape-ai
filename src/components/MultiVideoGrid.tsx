import React from 'react';
import { ChannelTrack } from '../types/soundscape';
import { YouTubePlayerEmbed } from './YouTubePlayerEmbed';
import { VerifiedVideoLibrary } from '../services/verifiedVideoLibrary';
import { Volume2, VolumeX, Trash2, Plus, Youtube, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';

interface MultiVideoGridProps {
  tracks: ChannelTrack[];
  masterVolume: number;
  isPlaying: boolean;
  hasAnySolo: boolean;
  onUpdateTrack: (trackId: string, updated: Partial<ChannelTrack>) => void;
  onRemoveTrack: (trackId: string) => void;
  onOpenAddModal: () => void;
  onOpenReplace?: (
    trackId: string,
    trackName: string,
    initialTab?: 'ai_replace' | 'youtube_live' | 'catalog' | 'youtube_direct' | 'web_url'
  ) => void;
}

export const MultiVideoGrid: React.FC<MultiVideoGridProps> = ({
  tracks,
  masterVolume,
  isPlaying,
  hasAnySolo,
  onUpdateTrack,
  onRemoveTrack,
  onOpenAddModal,
  onOpenReplace,
}) => {
  const videoTracks = tracks.filter(
    (t) => t.type === 'youtube_video' || t.type === 'video_url'
  );

  const handleAutoReplace = async (track: ChannelTrack) => {
    try {
      const cleanName = track.name.replace(/\(.*?\)/g, '').trim();
      let newVideoId = '';
      let newTitle = '';
      let newThumb = '';

      try {
        const res = await fetch(
          `/api/youtube/find-replacement?query=${encodeURIComponent(cleanName)}&category=${encodeURIComponent(
            track.category || ''
          )}&currentId=${encodeURIComponent(track.youtubeVideoId || '')}`
        );
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.replacement && data.replacement.videoId && data.replacement.videoId !== track.youtubeVideoId) {
            newVideoId = data.replacement.videoId;
            newTitle = data.replacement.title;
            newThumb = data.replacement.thumbnail;
          }
        }
      } catch (networkErr) {
        console.warn('Backend find-replacement unreachable, using verified catalog:', networkErr);
      }

      // If backend didn't supply a different working video, use local verified rotation library
      if (!newVideoId) {
        const fallback = VerifiedVideoLibrary.getNextWorkingVideo(
          track.youtubeVideoId,
          cleanName,
          track.category
        );
        newVideoId = fallback.videoId;
        newTitle = fallback.title;
        newThumb = fallback.thumbnail;
      }

      if (newVideoId) {
        const safeTitle = (newTitle || cleanName || 'Video Verificado').trim();
        onUpdateTrack(track.id, {
          youtubeVideoId: newVideoId,
          youtubeThumbnail: newThumb || `https://img.youtube.com/vi/${newVideoId}/hqdefault.jpg`,
          name: `${safeTitle.slice(0, 30)} (Actualizado)`,
          isUnavailable: false,
        });
      }
    } catch (err) {
      console.error('Error auto-replacing video in MultiVideoGrid:', err);
    }
  };

  if (videoTracks.length === 0) {
    return (
      <div className="w-full p-12 rounded-2xl bg-slate-900/80 border border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-400">
          <Youtube className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-bold text-white">
            Sin videos de YouTube activos en la mezcla
          </h3>
          <p className="text-xs text-slate-400">
            Añade tantos videos de YouTube o fuentes de video web como desees. Cada uno funcionará como un canal independiente con su propio control de volumen, panorama, ecualización y efectos dinámicos.
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Video de YouTube</span>
        </button>
      </div>
    );
  }

  // Calculate grid layout columns based on number of active videos
  const gridColsClass =
    videoTracks.length === 1
      ? 'grid-cols-1'
      : videoTracks.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : videoTracks.length <= 4
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-rose-950 border border-rose-500/40 text-rose-400">
            <Youtube className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Mosaico Multi-Reproductor de YouTube ({videoTracks.length} Videos en Mezcla)
          </h3>
        </div>

        <button
          onClick={onOpenAddModal}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir Otro Video de YouTube</span>
        </button>
      </div>

      <div className={`grid ${gridColsClass} gap-4`}>
        {videoTracks.map((track) => {
          const isSoloBlocked = hasAnySolo && !track.solo;

          return (
            <div
              key={track.id}
              className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl flex flex-col group hover:border-slate-700 transition-all"
            >
              {/* Video Screen Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 z-10">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: track.color || '#F43F5E' }}
                  />
                  <h4 className="text-xs font-bold text-white truncate" title={track.name}>
                    {track.name}
                  </h4>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onOpenReplace && (
                    <>
                      <button
                        onClick={() => onOpenReplace(track.id, track.name, 'ai_replace')}
                        title="Reemplazar con IA (Gemini 3.8 Flash)"
                        className="py-0.5 px-1.5 rounded text-[9px] font-bold bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-violet-900/40 hover:scale-105 active:scale-95"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
                        <span className="text-[8px] font-mono">IA</span>
                      </button>

                      <button
                        onClick={() => onOpenReplace(track.id, track.name, 'youtube_live')}
                        title="Buscar video en YouTube"
                        className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {track.youtubeVideoId && (
                    <a
                      href={`https://www.youtube.com/watch?v=${track.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir en YouTube"
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => onRemoveTrack(track.id)}
                    title="Eliminar de la mezcla"
                    className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Video Screen Area */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                {track.type === 'youtube_video' && track.youtubeVideoId ? (
                  <YouTubePlayerEmbed
                    trackId={track.id}
                    videoId={track.youtubeVideoId}
                    volume={track.volume}
                    masterVolume={masterVolume}
                    isPlaying={isPlaying}
                    muted={track.muted}
                    isSoloBlocked={isSoloBlocked}
                    visible={true}
                    className="w-full h-full"
                    onAutoReplace={() => handleAutoReplace(track)}
                    onOpenReplace={() => onOpenReplace?.(track.id, track.name)}
                  />
                ) : track.type === 'video_url' && track.sourceUrl ? (
                  <video
                    src={track.sourceUrl}
                    autoPlay={isPlaying}
                    loop
                    playsInline
                    muted={track.muted || isSoloBlocked}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-600 text-xs">Sin fuente de video</div>
                )}

                {/* Overlaid status badge */}
                {(track.muted || isSoloBlocked) && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded border border-rose-500/40">
                      {track.muted ? 'Silenciado (Mute)' : 'Aislado por Solo'}
                    </span>
                  </div>
                )}
              </div>

              {/* Floating Bottom Channel Strip for this Video */}
              <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex flex-col gap-2">
                {/* Volume Slider & Solo / Mute */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <button
                      onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={track.muted ? 'Activar audio' : 'Silenciar'}
                    >
                      {track.muted || track.volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) =>
                        onUpdateTrack(track.id, { volume: parseFloat(e.target.value) })
                      }
                      className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                      title={`Volumen del video: ${Math.round(track.volume * 100)}%`}
                    />

                    <span className="text-[10px] font-mono tabular-nums text-slate-300 w-8 text-right">
                      {Math.round(track.volume * 100)}%
                    </span>
                  </div>

                  {/* Solo & Mute Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        track.solo
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-amber-300'
                      }`}
                      title="Solo"
                    >
                      S
                    </button>

                    <button
                      onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        track.muted
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-rose-300'
                      }`}
                      title="Mute"
                    >
                      M
                    </button>
                  </div>
                </div>

                {/* Quick Pan & DSP Effects Mini Controls */}
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                  <div className="flex items-center gap-1.5">
                    <span>Pan:</span>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={track.pan}
                      onChange={(e) => onUpdateTrack(track.id, { pan: parseFloat(e.target.value) })}
                      className="w-14 h-1 accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                    />
                    <span className="font-mono text-cyan-300">
                      {Math.abs(track.pan) < 0.05 ? 'C' : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : `L${Math.round(Math.abs(track.pan) * 100)}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span>Eco:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={track.delaySend || 0}
                        onChange={(e) => onUpdateTrack(track.id, { delaySend: parseFloat(e.target.value) })}
                        className="w-12 h-1 accent-violet-400 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span>Rev:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={track.reverbSend || 0.2}
                        onChange={(e) => onUpdateTrack(track.id, { reverbSend: parseFloat(e.target.value) })}
                        className="w-12 h-1 accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
