import { cn } from '@/lib/cn';

/**
 * Avatar — engine-accurate CSS from Component Library.
 *
 * Engine: width=36, height=36, borderRadius=9999px,
 *         bg=var(--color-primary-muted), justify=center, align=center
 *         text: Inter 13px 600, color=var(--color-primary-foreground)
 */

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-11 w-11 text-base',
};

const colors = [
  { bg: 'var(--color-primary-muted)', text: 'var(--color-primary-foreground)' },
  { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  { bg: 'var(--color-info-light)', text: 'var(--color-info)' },
  { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
  { bg: '#E0E7FF', text: 'var(--color-accent-indigo)' },
  { bg: '#FCE7F3', text: 'var(--color-accent-pink)' },
  { bg: '#CCFBF1', text: 'var(--color-accent-teal)' },
];

function colorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn(
          'shrink-0 rounded-full object-cover',
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  const c = colorFromName(name);
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-sans font-semibold',
        sizeClasses[size],
        className,
      )}
      title={name}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {initials}
    </div>
  );
}
