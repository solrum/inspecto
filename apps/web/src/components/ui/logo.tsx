/**
 * Inspecto Logo — Stacked Layers
 *
 * Three overlapping rounded rectangles representing design review layers.
 * Based on component/LogoMark from inspecto-design-v1.pen:
 *   Layer 1: #6366F1, opacity 0.4, offset (0, 16)
 *   Layer 2: #7C3AED, opacity 0.6, offset (8, 8)
 *   Layer 3: gradient #7C3AED → #4F46E5, offset (16, 0)
 */

import { cn } from '@/lib/cn';

const SIZES = {
  sm: { box: 24, layer: 16, radius: 4, shift: 4 },
  md: { box: 36, layer: 24, radius: 6, shift: 6 },
  lg: { box: 52, layer: 36, radius: 8, shift: 8 },
} as const;

interface LogoMarkProps {
  size?: keyof typeof SIZES;
  className?: string;
}

export function LogoMark({ size = 'md', className }: LogoMarkProps) {
  const s = SIZES[size];

  return (
    <svg
      width={s.box}
      height={s.box}
      viewBox={`0 0 ${s.box} ${s.box}`}
      fill="none"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={`logo-grad-${size}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      {/* Layer 1 — back */}
      <rect
        x={0}
        y={s.shift * 2}
        width={s.layer}
        height={s.layer}
        rx={s.radius}
        fill="#6366F1"
        opacity={0.4}
      />
      {/* Layer 2 — middle */}
      <rect
        x={s.shift}
        y={s.shift}
        width={s.layer}
        height={s.layer}
        rx={s.radius}
        fill="#7C3AED"
        opacity={0.6}
      />
      {/* Layer 3 — front */}
      <rect
        x={s.shift * 2}
        y={0}
        width={s.layer}
        height={s.layer}
        rx={s.radius}
        fill={`url(#logo-grad-${size})`}
      />
    </svg>
  );
}

interface LogoProps {
  size?: keyof typeof SIZES;
  className?: string;
  textClassName?: string;
}

const TEXT_SIZES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-[28px]',
} as const;

export function Logo({ size = 'md', className, textClassName }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className={cn('font-display font-bold', TEXT_SIZES[size], textClassName)}>
        Inspecto
      </span>
    </span>
  );
}
