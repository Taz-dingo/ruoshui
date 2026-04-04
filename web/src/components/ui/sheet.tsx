import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react';

import { cn } from '../../utils/cn';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  description?: string;
  title?: string;
}

const SheetOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function SheetOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-[5] bg-[rgba(11,12,15,0.18)]',
        className
      )}
      {...props}
    />
  );
});

const SheetContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(function SheetContent(
  {
    children,
    className,
    description,
    title,
    'aria-describedby': ariaDescribedBy,
    ...props
  },
  ref
) {
  const resolvedTitle =
    title ?? (typeof props['aria-label'] === 'string' ? props['aria-label'] : '面板');
  const contentProps = description
    ? props
    : {
        ...props,
        'aria-describedby': ariaDescribedBy ?? undefined
      };

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(className)}
        {...contentProps}
      >
        <DialogPrimitive.Title className="sr-only">
          {resolvedTitle}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="sr-only">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetOverlay,
  SheetPortal,
  SheetTrigger
};
