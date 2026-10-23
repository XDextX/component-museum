import { useId, type InputHTMLAttributes } from 'react';

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
  const generated = useId();
  const controlId = id ?? generated;
  const classes = ['museum-input', `museum-input--${size}`, className].filter(Boolean).join(' ');
  // The error first, then the hint, then the consumer's own ids.
  const description = [error && `${controlId}-error`, hint && `${controlId}-hint`, describedBy].filter(Boolean).join(' ');
  return (
    <div className="museum-field">
      <label className="museum-field__label" htmlFor={controlId}>
        {label}
        {required && (
          <span className="museum-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {/* Free attributes first, so the component's own (data-museum-input included) win a clash (RF-11). */}
      <input
        {...attributes}
        id={controlId}
        className={classes}
        type={type}
        disabled={disabled}
        required={required}
        aria-describedby={description || undefined}
        aria-invalid={error ? true : undefined}
        data-museum-input=""
      />
      {hint && (
        <p id={`${controlId}-hint`} className="museum-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${controlId}-error`} className="museum-field__error">
          {error}
        </p>
      )}
    </div>
  );
}
