import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LogoMark } from '@/components/ui/logo';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  className?: string;
}

export function Breadcrumb({ items, homeHref, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1.5 font-sans text-[13px]', className)}>
      {homeHref && (
        <>
          <a href={homeHref} className="flex items-center">
            <LogoMark size="sm" />
          </a>
          <ChevronRight size={14} className="text-foreground-muted" />
        </>
      )}
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-foreground-muted" />}
            {isLast || !item.href ? (
              <span className={isLast ? 'font-semibold text-foreground' : 'text-foreground-muted'}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="text-foreground-muted hover:text-foreground-secondary no-underline transition">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
