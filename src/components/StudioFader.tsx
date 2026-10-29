import React from 'react';

interface StudioFaderProps {
  volume: number; // 0 to 1.2
  vuLevel: number; // 0 to 100
  muted?: boolean;
  isSoloBlocked?: boolean;
  color?: string;
  trackLabel?: string;
  onChange: (value: number) => void;
}

const TOTAL_SEGMENTS = 14;

export const StudioFader: React.FC<StudioFaderProps> = ({
  volume,
  vuLevel,
  muted = false,
  isSoloBlocked = false,
  color = '#06B6D4',
  onChange,
}) => {
  // Convert 0..1.2 volume to dB string
  const getDbString = () => {
    if (muted) return 'MUTE';
    if (isSoloBlocked) return 'SOLO';
    if (volume <= 0.001) return '-inf';
    const db = (volume - 1) * 20;
    return `${db > 0 ? '+' : ''}${db.toFixed(1)}dB`;
  };

  // Determine how many segments light up (0 to 14)
  const activeSegments = muted || isSoloBlocked ? 0 : Math.round((vuLevel / 100) * TOTAL_SEGMENTS);

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Upper readout */}
      <div className="w-full flex items-center justify-between text-[8px] font-mono text-slate-400 px-1 mb-1">
        <span className="text-slate-500 font-bold uppercase">VOL</span>
        <span
          className={`font-bold tabular-nums ${
            muted ? 'text-rose-400' : isSoloBlocked ? 'text-amber-400' : 'text-cyan-300'
          }`}
        >
          {getDbString()}
        </span>
      </div>

      {/* Main Fader Bay: Scale + Fader + LED Meter */}
      <div className="relative w-full h-36 bg-slate-950 rounded-xl border border-slate-800/90 p-2 flex items-center justify-between shadow-inner">
        {/* Scale labels on left */}
        <div className="flex flex-col justify-between h-full text-[7px] font-mono text-slate-500 select-none py-0.5 w-3.5 text-right pr-0.5">
          <span>+6</span>
          <span className="text-slate-400 font-bold">0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-∞</span>
        </div>

        {/* Center Fader Slot & Slider */}
        <div className="relative flex-1 h-full flex items-center justify-center">
          {/* Vertical Guide Rail */}
          <div className="absolute w-1 h-full bg-slate-900 rounded-full border border-slate-800 shadow-inner flex items-center justify-center">
            {/* 0dB Reference Tick */}
            <div className="absolute top-[30%] w-3 h-[1px] bg-slate-600 -translate-y-1/2" />
          </div>

          {/* Interactive Range Input */}
          <input
            type="range"
            min="0"
            max="1.2"
            step="0.01"
            value={volume}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20 [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
            title={`Volumen: ${Math.round(volume * 100)}%`}
          />

          {/* High-End Precision Anodized Fader Cap */}
          <div
            className="absolute w-7 h-3 rounded-[3px] bg-gradient-to-b from-slate-200 to-slate-400 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center pointer-events-none transition-transform z-10"
            style={{
              bottom: `calc(${Math.min(100, (volume / 1.2) * 100)}% - 6px)`,
            }}
          >
            {/* Illuminated Center Accent */}
            <div
              className="w-3.5 h-[1.5px] rounded-full shadow-sm"
              style={{ backgroundColor: muted ? '#EF4444' : isSoloBlocked ? '#F59E0B' : color }}
            />
          </div>
        </div>

        {/* Segmented LED VU Meter on Right */}
        <div className="flex flex-col-reverse justify-between h-full w-2 pl-1 gap-[2px]">
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
            const isLit = idx < activeSegments;
            // Top 2: Red, Next 3: Amber, Bottom 9: Cyan/Green
            let activeColor = '#06B6D4'; // Cyan
            let inactiveColor = '#08334440';
            if (idx >= 12) {
              activeColor = '#EF4444'; // Red peak
              inactiveColor = '#450a0a40';
            } else if (idx >= 9) {
              activeColor = '#F59E0B'; // Amber
              inactiveColor = '#451a0340';
            }

            return (
              <div
                key={idx}
                className="w-1.5 h-[5.5px] rounded-[1px] transition-all duration-75"
                style={{
                  backgroundColor: isLit ? activeColor : inactiveColor,
                  boxShadow: isLit ? `0 0 5px ${activeColor}` : 'none',
                  opacity: isLit ? 1 : 0.3,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Percentage readout */}
      <div className="mt-1 text-[8px] font-mono text-slate-400 tabular-nums">
        {Math.round(volume * 100)}%
      </div>
    </div>
  );
};
