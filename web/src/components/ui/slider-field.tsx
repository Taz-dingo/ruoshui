import type { InputHTMLAttributes, ReactNode } from 'react';

import { sliderFieldClassNames } from '../../styles/system';
import { cn } from '../../utils/cn';

interface SliderFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  description?: ReactNode;
  label: ReactNode;
  valueLabel: ReactNode;
  containerClassName?: string;
}

function SliderField({
  className,
  containerClassName,
  description,
  label,
  valueLabel,
  ...props
}: SliderFieldProps) {
  return (
    <label className={cn(sliderFieldClassNames.root, containerClassName)}>
      <span className={sliderFieldClassNames.label}>{label}</span>
      <input
        className={cn(sliderFieldClassNames.input, className)}
        type="range"
        {...props}
      />
      <strong className={sliderFieldClassNames.value}>{valueLabel}</strong>
      {description ? (
        <span className={sliderFieldClassNames.description}>{description}</span>
      ) : null}
    </label>
  );
}

export {
  SliderField
};
