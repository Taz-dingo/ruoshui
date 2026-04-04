import * as SwitchPrimitive from '@radix-ui/react-switch';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react';

import { cn } from '../../utils/cn';

const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-[rgba(231,218,198,0.12)] bg-[rgba(244,236,222,0.06)] transition-colors data-[state=checked]:bg-[rgba(168,201,125,0.22)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-[rgba(244,236,222,0.88)] shadow transition-transform data-[state=checked]:translate-x-[1.3rem]'
        )}
      />
    </SwitchPrimitive.Root>
  );
});

export {
  Switch
};
