import * as SwitchPrimitive from '@radix-ui/react-switch';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react';

import { switchClassNames } from '../../styles/system';
import { cn } from '../../utils/cn';

const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        switchClassNames.root,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(switchClassNames.thumb)}
      />
    </SwitchPrimitive.Root>
  );
});

export {
  Switch
};
