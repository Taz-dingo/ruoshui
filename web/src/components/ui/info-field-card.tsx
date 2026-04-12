import type { HTMLAttributes, ReactNode } from 'react';

import {
  surfaceClassNames,
  textClassNames
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
      <span className={cn('info-field-label', textClassNames.meta)}>{label}</span>
      <strong className="info-field-value">{value}</strong>
    </div>
  );
}

export {
  InfoFieldCard
};
