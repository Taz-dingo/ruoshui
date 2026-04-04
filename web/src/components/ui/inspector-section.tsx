import type { ReactNode } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from './accordion';
import { cn } from '../../utils/cn';

interface InspectorSectionProps {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
  panelId: string;
  summary: string;
  title: string;
  onToggle: () => void;
}

function InspectorSection({
  children,
  className,
  isOpen,
  panelId,
  summary,
  title,
  onToggle
}: InspectorSectionProps) {
  return (
    <Accordion
      collapsible
      type="single"
      value={isOpen ? panelId : undefined}
      onValueChange={(value) => {
        const nextIsOpen = value === panelId;
        if (nextIsOpen !== isOpen) {
          onToggle();
        }
      }}
    >
      <AccordionItem
        className={cn('inspector-section', className)}
        data-panel={panelId}
        value={panelId}
      >
        <AccordionTrigger
          className={cn('inspector-toggle', isOpen && 'is-active')}
        >
          <span className="section-title">{title}</span>
          <span className="toggle-meta">{summary}</span>
        </AccordionTrigger>
        <AccordionContent
          className={cn('inspector-body', isOpen && 'is-open')}
          data-body={panelId}
        >
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export {
  InspectorSection
};
