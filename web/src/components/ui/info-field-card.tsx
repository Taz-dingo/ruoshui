import type { HTMLAttributes, ReactNode } from 'react';

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
        'grid min-w-0 gap-[5px] rounded-[14px] border border-[rgba(231,218,198,0.08)] bg-[rgba(244,236,222,0.03)] px-3 py-2.5',
        className
      )}
      {...props}
    >
      <span className="info-field-label">{label}</span>
      <strong className="info-field-value">{value}</strong>
    </div>
  );
}

export {
  InfoFieldCard
};
