import type { HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-[7px] py-[2px] text-[9px] uppercase tracking-[0.04em]',
  {
    variants: {
      variant: {
        default: 'bg-[rgba(244,236,222,0.06)] text-[rgba(231,218,198,0.74)]',
        success: 'bg-[rgba(168,201,125,0.88)] text-[#243019]',
        muted: 'bg-[rgba(122,88,61,0.42)] text-[rgba(231,218,198,0.82)]'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'muted';
}

function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export {
  Badge
};
