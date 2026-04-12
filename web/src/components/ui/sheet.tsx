import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react';

import {
  scrollAreaClassNames,
  surfaceClassNames
} from '../../styles/system';
import { cn } from '../../utils/cn';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  description?: string;
  side?: 'bottom' | 'left' | 'right' | 'top';
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
        'fixed inset-0 z-[7] bg-[rgba(9,11,15,0.24)] backdrop-blur-[3px] data-[state=closed]:pointer-events-none data-[state=closed]:animate-[ruoshui-sheet-overlay-out_180ms_ease_forwards] data-[state=open]:animate-[ruoshui-sheet-overlay-in_240ms_ease_forwards]',
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
    side = 'right',
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
        className={cn(
          'fixed outline-none will-change-[transform,opacity] data-[side=bottom]:origin-bottom',
          scrollAreaClassNames.thin,
          surfaceClassNames.panel,
          className
        )}
        data-side={side}
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
