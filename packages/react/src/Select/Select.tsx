import type { SelectHTMLAttributes } from 'react';
import { Field } from '../field.js';

/** One option of the select. */
export type SelectOption = { value: string; label: string; disabled?: boolean };

/** Select's own API, from contracts/select.contract.json translated to React. */
export type SelectOwnProps = {
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
  /** Text of a first, disabled option that shows while nothing is chosen. */
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  defaultValue?: string;
  /** Added to the `<select>`'s own classes, never replacing them. */
  className?: string;
};

/**
 * Controlled use: `value` plus your `onChange`. Any other HTML attribute reaches the `<select>`;
 * the Omit keeps the own props single.
 */
export type SelectProps = SelectOwnProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, keyof SelectOwnProps>;

export function Select({
  label,
  options,
  hint = '',
  error = '',
  placeholder = '',
  size = 'md',
  disabled = false,
  required = false,
  defaultValue = '',
  className,
  id,
  value,
  'aria-describedby': describedBy,
  ...attributes
}: SelectProps) {
  const classes = ['museum-select', `museum-select--${size}`, className].filter(Boolean).join(' ');
  // A controlled select (`value`) never also gets `defaultValue`; one that is not in `options` counts as absent.
  const initial = options.some((option) => option.value === defaultValue) ? defaultValue : '';
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} describedBy={describedBy}>
      {/* Free attributes first, so the component's own (data-museum-select included) win a clash. */}
      {({ id: controlId, ...aria }) => (
        <select
          {...attributes}
          id={controlId}
          className={classes}
          {...aria}
          required={required}
          disabled={disabled}
          value={value}
          defaultValue={value === undefined ? initial : undefined}
          data-museum-select=""
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
