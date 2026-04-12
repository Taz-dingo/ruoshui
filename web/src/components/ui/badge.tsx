import type { HTMLAttributes } from 'react';

import { badgeVariants } from '../../styles/system';
import { cn } from '../../utils/cn';

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
      className={cn('inline-flex items-center rounded-full px-[7px] py-[2px]', badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export {
  Badge
};
