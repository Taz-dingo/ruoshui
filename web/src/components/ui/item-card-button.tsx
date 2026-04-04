import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '../../utils/cn';

const itemCardButtonVariants = cva(
  'w-full rounded-[14px] border text-left transition-[background-color,border-color,transform,box-shadow] duration-180 ease-out disabled:cursor-not-allowed disabled:opacity-55',
  {
    variants: {
      density: {
        regular: 'px-3 py-2.5',
        compact: 'px-2.5 py-2'
      },
      active: {
        true: 'border-[rgba(168,201,125,0.36)] bg-[rgba(168,201,125,0.12)]',
        false: 'border-[rgba(231,218,198,0.08)] bg-[rgba(244,236,222,0.03)]'
      },
      running: {
        true: 'border-[rgba(199,227,158,0.42)] shadow-[inset_0_0_0_1px_rgba(199,227,158,0.18)]',
        false: ''
      }
    },
    compoundVariants: [
      {
        active: false,
        running: false,
        className: 'hover:-translate-y-px hover:border-[rgba(168,201,125,0.36)] hover:bg-[rgba(168,201,125,0.12)]'
      }
    ],
    defaultVariants: {
      density: 'regular',
      active: false,
      running: false
    }
  }
);

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
