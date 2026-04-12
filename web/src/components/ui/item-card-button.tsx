import type { ButtonHTMLAttributes, ReactNode } from 'react';

import {
  itemCardButtonVariants,
  itemCardTextClassNames
} from '../../styles/system';
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
      <span className={itemCardTextClassNames.line}>
        <strong className={itemCardTextClassNames.title}>{title}</strong>
        {meta ? <small className={itemCardTextClassNames.meta}>{meta}</small> : null}
      </span>
      {body ? <span className={itemCardTextClassNames.body}>{body}</span> : null}
    </button>
  );
}

export {
  ItemCardButton
};
