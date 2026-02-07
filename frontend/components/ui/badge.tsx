import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
          {
            'bg-primary text-primary-foreground': variant === 'default',
            'bg-secondary text-secondary-foreground': variant === 'secondary',
            'bg-[var(--badge-confirmed-bg)] text-[var(--badge-confirmed-fg)]':
              variant === 'success',
            'bg-[var(--badge-pending-bg)] text-[var(--badge-pending-fg)]': variant === 'warning',
            'bg-[var(--badge-cancelled-bg)] text-[var(--badge-cancelled-fg)]': variant === 'error',
            'bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)]': variant === 'info',
            'border border-border text-foreground': variant === 'outline',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
