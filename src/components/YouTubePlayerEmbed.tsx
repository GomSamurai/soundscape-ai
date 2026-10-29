import React, { useEffect, useState } from 'react';
import { youtubeManager } from '../services/youtubeManager';
import { AlertCircle, ExternalLink, RefreshCw, Search } from 'lucide-react';

interface YouTubePlayerEmbedProps {
  trackId: string;
  videoId: string;
  volume: number;
  masterVolume: number;
  isPlaying: boolean;
  muted: boolean;
  isSoloBlocked: boolean;
  visible?: boolean;
  className?: string;
  onReplaceWithVerified?: (newVideoId: string) => void;
  onAutoReplace?: () => void;
  onOpenReplace?: () => void;
  onErrorChange?: (hasError: boolean, errorCode?: number | null) => void;
}

export const YouTubePlayerEmbed: React.FC<YouTubePlayerEmbedProps> = ({
  trackId,
  videoId,
  volume,
  masterVolume,
  isPlaying,
  muted,
  isSoloBlocked,
  visible = true,
  className = '',
  onReplaceWithVerified,
  onAutoReplace,
  onOpenReplace,
  onErrorChange,
}) => {
  const containerId = `yt-player-${trackId}`;
  const [hasError, setHasError] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  useEffect(() => {
    setHasError(false);
    setErrorCode(null);
    onErrorChange?.(false, null);

    youtubeManager.registerPlayer(
      trackId,
      containerId,
      videoId,
      volume * masterVolume,
      isPlaying,
      () => {
        setHasError(false);
        onErrorChange?.(false, null);
      },
      (code) => {
        setHasError(true);
        setErrorCode(code);
        onErrorChange?.(true, code);
      }
    );

    return () => {
      youtubeManager.unregisterPlayer(trackId);
    };
  }, [trackId, videoId]);

  // Volume & mute dynamic synchronization
  useEffect(() => {
    youtubeManager.updateVolume(trackId, volume, masterVolume, muted, isSoloBlocked);
  }, [trackId, volume, masterVolume, muted, isSoloBlocked]);

  // Playback sync
  useEffect(() => {
    if (isPlaying) {
      youtubeManager.playAll();
    } else {
      youtubeManager.pauseAll();
    }
  }, [isPlaying]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black ${className} ${
        visible
          ? 'block'
          : 'fixed bottom-1 right-1 w-[200px] h-[120px] opacity-[0.01] pointer-events-none z-0 overflow-hidden'
      }`}
    >
      <div id={containerId} className="w-full h-full aspect-video" />

      {/* Graceful Error Fallback Overlay if YouTube blocks embedding */}
      {hasError && visible && (
        <div className="absolute inset-0 bg-slate-950/95 p-3 flex flex-col items-center justify-center text-center space-y-2 z-20 border border-rose-500/40">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <div className="space-y-0.5">
            <h5 className="text-xs font-bold text-white">Video no disponible en YouTube</h5>
            <p className="text-[10px] text-slate-400 max-w-[220px]">
              {errorCode === 101 || errorCode === 150
                ? 'El autor restringió la inserción en reproductores externos.'
                : 'Este enlace de YouTube no está disponible o fue eliminado.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {onAutoReplace && (
              <button
                onClick={onAutoReplace}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                title="Buscar y aplicar automáticamente un video activo verificado"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Actualizar por uno válido</span>
              </button>
            )}

            {onOpenReplace && (
              <button
                onClick={onOpenReplace}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="Buscar manualmente un video de reemplazo"
              >
                <Search className="w-3 h-3" />
                <span>Buscar reemplazo</span>
              </button>
            )}

            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[10px] font-medium flex items-center gap-1 transition-colors"
            >
              <span>YouTube</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
