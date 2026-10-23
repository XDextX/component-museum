import type { InputHTMLAttributes } from 'react';
import { Field } from '../field.js';

/** Input's own API, from contracts/input.contract.json translated to React. */
export type InputOwnProps = {
  label: string;
  hint?: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  /** Added to the `<input>`'s own classes, never replacing them. */
  className?: string;
};

/** Any other HTML attribute reaches the `<input>`; the Omit keeps the own props single. */
export type InputProps = InputOwnProps & Omit<InputHTMLAttributes<HTMLInputElement>, keyof InputOwnProps>;

export function Input({
  label,
  hint = '',
  error = '',
  type = 'text',
  size = 'md',
  disabled = false,
  required = false,
  className,
  id,
  'aria-describedby': describedBy,
  ...attributes
}: InputProps) {
  const classes = ['museum-input', `museum-input--${size}`, className].filter(Boolean).join(' ');
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} describedBy={describedBy}>
      {/* Free attributes first, so the component's own (data-museum-input included) win a clash (RF-11). */}
      {({ id: controlId, ...aria }) => (
        <input
          {...attributes}
          id={controlId}
          className={classes}
          type={type}
          disabled={disabled}
          required={required}
          {...aria}
          data-museum-input=""
        />
      )}
    </Field>
  );
}
