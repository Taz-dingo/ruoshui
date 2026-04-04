import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../utils/cn';

interface SliderFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  valueLabel: ReactNode;
  containerClassName?: string;
}

function SliderField({
  className,
  containerClassName,
  label,
  valueLabel,
  ...props
}: SliderFieldProps) {
  return (
    <label className={cn('slider-field', containerClassName)}>
      <span className="slider-field-label">{label}</span>
      <input
        className={cn('quality-slider', className)}
        type="range"
        {...props}
      />
      <strong className="slider-field-value">{valueLabel}</strong>
    </label>
  );
}

export {
  SliderField
};
