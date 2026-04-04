import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react';

import { cn } from '../../utils/cn';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = forwardRef<
  ElementRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn(className)}
      {...props}
    />
  );
});

const AccordionTrigger = forwardRef<
  ElementRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ children, className, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(className)}
        {...props}
      >
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});

const AccordionContent = forwardRef<
  ElementRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ children, className, ...props }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(className)}
      {...props}
    >
      {children}
    </AccordionPrimitive.Content>
  );
});

export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
};
