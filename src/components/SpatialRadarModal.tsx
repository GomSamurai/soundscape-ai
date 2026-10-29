import React, { useRef, useState, useCallback } from 'react';
import { ChannelTrack } from '../types/soundscape';
import { Compass, X, Headphones, Youtube, RotateCcw } from 'lucide-react';

interface SpatialRadarModalProps {
  isOpen: boolean;
  tracks: ChannelTrack[];
  onClose: () => void;
  onUpdateTrack: (trackId: string, updated: Partial<ChannelTrack>) => void;
}

export const SpatialRadarModal: React.FC<SpatialRadarModalProps> = ({
  isOpen,
  tracks,
  onClose,
  onUpdateTrack,
}) => {
  const radarRef = useRef<HTMLDivElement>(null);
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);

  const radarSize = 360;
  const center = radarSize / 2;

  // Convert track pan & reverb/filter to 2D coordinates (X: pan, Y: depth)
  // X: -1 to 1 -> -radius to +radius
  // Y: distance/depth (derived from reverbSend & volume) -> -radius to +radius
  const getCoordinates = (track: ChannelTrack) => {
    const x = center + track.pan * (center - 24);
    // Y: Reverb send (0 to 1) maps to distance from center (front to back)
    const depth = (track.reverbSend - 0.5) * 2; // -1 (front) to 1 (back)
    const y = center + depth * (center - 24);
    return { x, y };
  };

  const handlePointerDown = (trackId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTrackId(trackId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingTrackId || !radarRef.current) return;
      const rect = radarRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Normalize from -1 to 1 relative to center
      const normX = Math.max(-1, Math.min(1, (clientX - center) / (center - 24)));
      const normY = Math.max(-1, Math.min(1, (clientY - center) / (center - 24)));

      // Pan is directly X
      const pan = Math.round(normX * 100) / 100;

      // Distance from center controls reverb send (0.05 to 0.8) and air absorption filter
      const dist = Math.sqrt(normX * normX + normY * normY);
      const reverbSend = Math.max(0.05, Math.min(0.85, 0.2 + dist * 0.5));
      const filterCutoff = Math.max(1000, Math.min(20000, Math.round(20000 - dist * 12000)));

      onUpdateTrack(draggingTrackId, {
        pan,
        reverbSend,
        filterCutoff,
      });
    },
    [draggingTrackId, center, onUpdateTrack]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingTrackId) {
      setDraggingTrackId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleReset = () => {
    tracks.forEach((track, idx) => {
      // Symmetrically spread tracks around soundstage
      const angle = (idx / tracks.length) * Math.PI * 2;
      const pan = Math.sin(angle) * 0.6;
      onUpdateTrack(track.id, {
        pan,
        reverbSend: 0.25,
        filterCutoff: 16000,
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Radar Espacial 2D (Sonido Holofónico)
              </h2>
              <p className="text-xs text-slate-400">
                Arrastra las fuentes sonoras en el espacio para calibrar panorama, profundidad y distancia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Radar Canvas Body */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          <div
            ref={radarRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative rounded-full bg-slate-950 border border-slate-800 shadow-inner select-none overflow-hidden touch-none"
            style={{ width: radarSize, height: radarSize }}
          >
            {/* Concentric distance rings */}
            <div className="absolute inset-8 rounded-full border border-slate-800/80 pointer-events-none" />
            <div className="absolute inset-20 rounded-full border border-slate-800/60 pointer-events-none" />
            <div className="absolute inset-32 rounded-full border border-slate-800/40 pointer-events-none" />

            {/* Crosshairs */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-slate-800/80 pointer-events-none" />
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-slate-800/80 pointer-events-none" />

            {/* Spatial Labels */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase text-slate-500 pointer-events-none">
              Frente
            </span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase text-slate-500 pointer-events-none">
              Atrás
            </span>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-mono uppercase text-slate-500 pointer-events-none">
              Izq
            </span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono uppercase text-slate-500 pointer-events-none">
              Der
            </span>

            {/* Center Listener Icon */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-cyan-950 border border-cyan-500/60 text-cyan-300 shadow-md z-10 pointer-events-none">
              <Headphones className="w-4 h-4" />
            </div>

            {/* Sound Sources Draggable Nodes */}
            {tracks.map((track) => {
              const { x, y } = getCoordinates(track);
              const isSelected = draggingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onPointerDown={(e) => handlePointerDown(track.id, e)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-xl cursor-grab active:cursor-grabbing transition-shadow z-20 flex flex-col items-center group ${
                    isSelected ? 'scale-110 z-30' : 'hover:scale-105'
                  }`}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                  }}
                  title={`${track.name} (Pan: ${track.pan > 0 ? 'R' : 'L'}${Math.round(
                    Math.abs(track.pan) * 100
                  )}%, Reverb: ${Math.round(track.reverbSend * 100)}%)`}
                >
                  {/* Glowing Node Disc */}
                  <div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform"
                    style={{
                      backgroundColor: track.color || '#06B6D4',
                      borderColor: '#FFFFFF',
                    }}
                  >
                    {track.type === 'youtube_video' ? (
                      <Youtube className="w-4 h-4 text-white" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Node label */}
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-medium text-slate-200 truncate max-w-[80px] shadow pointer-events-none">
                    {track.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick instructions & Reset button */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Arrastra cualquier nodo hacia los lados o hacia el fondo</span>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Distribución Equitativa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
