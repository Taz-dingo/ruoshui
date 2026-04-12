import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { itemCardButtonVariants } from '../../styles/system';
import { cn } from '../../utils/cn';

interface ItemCardButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  body?: ReactNode;
  density?: 'regular' | 'compact';
  isActive?: boolean;
  isRunning?: boolean;
  meta?: ReactNode;
  title: ReactNode;
}

function ItemCardButton({
  body,
  className,
  density = 'regular',
  isActive = false,
  isRunning = false,
  meta,
  title,
  type = 'button',
  ...props
}: ItemCardButtonProps) {
  return (
    <button
      className={cn(
        'item-card-button',
        itemCardButtonVariants({
          active: isActive,
          density,
          running: isRunning
        }),
        className
      )}
      type={type}
      {...props}
    >
      <span className="item-card-line">
        <strong className="item-card-title">{title}</strong>
        {meta ? <small className="item-card-meta">{meta}</small> : null}
      </span>
      {body ? <span className="item-card-body">{body}</span> : null}
    </button>
  );
}

export {
  ItemCardButton
};
