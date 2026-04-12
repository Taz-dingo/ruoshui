import type { ReactNode } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from './accordion';
import { inspectorSectionClassNames } from '../../styles/system';
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
      value={isOpen ? panelId : ''}
      onValueChange={(value) => {
        const nextIsOpen = value === panelId;
        if (nextIsOpen !== isOpen) {
          onToggle();
        }
      }}
    >
      <AccordionItem
        className={cn(inspectorSectionClassNames.root, className)}
        data-panel={panelId}
        value={panelId}
      >
        <AccordionTrigger
          className={inspectorSectionClassNames.trigger}
        >
          <span className={inspectorSectionClassNames.title}>{title}</span>
          <span className={inspectorSectionClassNames.summary}>{summary}</span>
          <span
            aria-hidden="true"
            className={cn(
              inspectorSectionClassNames.triggerIcon,
              isOpen && 'text-brand/88'
            )}
          >
            {isOpen ? '−' : '+'}
          </span>
        </AccordionTrigger>
        <AccordionContent
          className={cn(
            inspectorSectionClassNames.body,
            isOpen ? 'block' : 'hidden'
          )}
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
