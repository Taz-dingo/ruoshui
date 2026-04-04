import type { HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[22px] border border-[rgba(207,184,151,0.16)] bg-[rgba(47,36,29,0.76)] shadow-[var(--shadow)] backdrop-blur-[14px]',
        className
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between gap-3', className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('grid gap-3 p-4', className)}
      {...props}
    />
  );
}

function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex justify-start', className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('mt-1 mb-0 text-[18px] leading-[1.1] tracking-[-0.04em]', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('m-0 text-[12px] leading-[1.6] text-[var(--muted)]', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
};
