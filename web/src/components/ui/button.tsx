import type { ButtonHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full border text-[12px] transition-[transform,border-color,background-color,color,opacity] duration-180 ease-out disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-[var(--accent)] px-[13px] py-[9px] text-[#2a221a]',
        secondary:
          'border-[var(--line)] bg-[rgba(244,236,222,0.04)] px-[13px] py-[9px] text-[var(--text)]',
        tertiary:
          'border-[rgba(168,201,125,0.22)] bg-[rgba(168,201,125,0.08)] px-[13px] py-[9px] text-[var(--accent-strong)]',
        ghost:
          'border-transparent bg-transparent px-[13px] py-[9px] text-[rgba(231,218,198,0.72)]',
        floating:
          'border-[rgba(207,184,151,0.18)] bg-[rgba(47,36,29,0.84)] px-4 py-3 text-[var(--text)] shadow-[var(--shadow)] backdrop-blur-[16px]'
      }
    },
    defaultVariants: {
      variant: 'primary'
    }
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'floating';
}

function Button({
  className,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      type={type}
      {...props}
    />
  );
}

export {
  Button,
  buttonVariants
};
