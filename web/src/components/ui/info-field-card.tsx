import type { HTMLAttributes, ReactNode } from 'react';

import {
  itemCardTextClassNames,
  surfaceClassNames,
} from '../../styles/system';
import { cn } from '../../utils/cn';

interface InfoFieldCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
}

function InfoFieldCard({
  className,
  label,
  value,
  ...props
}: InfoFieldCardProps) {
  return (
    <div
      className={cn(
        surfaceClassNames.infoField,
        'grid min-w-0 gap-[5px] px-3 py-2.5',
        className
      )}
      {...props}
    >
      <span className="text-ui-xs leading-[1.45] text-ink-muted/74">{label}</span>
      <strong className={cn(itemCardTextClassNames.title, 'text-[11px] leading-[1.45]')}>{value}</strong>
    </div>
  );
}

export {
  InfoFieldCard
};
