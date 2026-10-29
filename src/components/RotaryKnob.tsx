import React, { useRef, useState, useCallback, useEffect } from 'react';

interface RotaryKnobProps {
  label: string;
  value: number; // Current value
  min: number;
  max: number;
  defaultValue?: number;
  step?: number;
  displayValue?: string;
  size?: number;
  color?: string;
  compact?: boolean;
  onChange: (value: number) => void;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min,
  max,
  defaultValue = (min + max) / 2,
  step = 0.01,
  displayValue,
  size = 48,
  color = '#06B6D4',
  compact = false,
  onChange,
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const startValue = useRef<number>(value);

  // Angle range: -135deg (min) to +135deg (max), total 270 degrees
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + norm * 270;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    startValue.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const deltaY = dragStartY.current - e.clientY;
      const sensitivity = (max - min) / 160; // 160px drag for full travel
      let nextVal = startValue.current + deltaY * sensitivity;
      if (step > 0) {
        nextVal = Math.round(nextVal / step) * step;
      }
      nextVal = Math.max(min, Math.min(max, nextVal));
      onChange(nextVal);
    },
    [isDragging, min, max, step, onChange]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const delta = (max - min) * 0.05;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(max, value + delta));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(min, value - delta));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(defaultValue);
    }
  };

  // SVG arc calculation
  const radius = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;

  // Polar to Cartesian
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const bgArc = describeArc(cx, cy, radius, -135, 135);
  const activeArc = describeArc(cx, cy, radius, -135, angle);

  return (
    <div className="flex flex-col items-center select-none group">
      <div
        ref={knobRef}
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className={`relative cursor-ns-resize touch-none focus:outline-none rounded-full p-1 transition-transform ${
          isDragging ? 'scale-105' : 'hover:scale-102'
        }`}
        style={{ width: size, height: size }}
        title={`${label}: ${displayValue || value.toFixed(2)} (Arrastra verticalmente, doble clic para reset)`}
      >
        <svg width={size} height={size} className="overflow-visible">
          {/* Background track */}
          <path d={bgArc} fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          {/* Active arc */}
          <path
            d={activeArc}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>

        {/* Knob face */}
        <div
          className={`absolute rounded-full bg-slate-900 border border-slate-700/80 shadow-inner flex items-center justify-center transition-colors ${
            compact ? 'inset-1.5' : 'inset-2'
          }`}
          style={{
            transform: `rotate(${angle}deg)`,
          }}
        >
          {/* Notch indicator */}
          <div
            className={`rounded-full absolute -top-0.5 ${compact ? 'w-0.5 h-2' : 'w-1 h-2.5'}`}
            style={{ backgroundColor: color }}
          />
        </div>
      </div>

      <span
        className={`uppercase font-semibold tracking-wider text-slate-400 whitespace-nowrap ${
          compact ? 'text-[8px] mt-0.5' : 'text-[10px] mt-1'
        }`}
      >
        {label}
      </span>
      <span
        className={`font-mono tabular-nums text-slate-200 font-medium ${
          compact ? 'text-[9px] leading-tight' : 'text-[11px]'
        }`}
      >
        {displayValue || value.toFixed(1)}
      </span>
    </div>
  );
};
