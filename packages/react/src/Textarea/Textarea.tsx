import type { TextareaHTMLAttributes } from 'react';
import { Field } from '../field.js';

/** Textarea's own API, from contracts/textarea.contract.json translated to React. */
export type TextareaOwnProps = {
  label: string;
  hint?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  /** Added to the `<textarea>`'s own classes, never replacing them. */
  className?: string;
};

/** Any other HTML attribute (`rows`, `value`, `name`…) reaches the `<textarea>`; the Omit keeps the own props single. */
export type TextareaProps = TextareaOwnProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof TextareaOwnProps>;

export function Textarea({
  label,
  hint = '',
  error = '',
  size = 'md',
  disabled = false,
  required = false,
  className,
  id,
  'aria-describedby': describedBy,
  ...attributes
}: TextareaProps) {
  const classes = ['museum-textarea', `museum-textarea--${size}`, className].filter(Boolean).join(' ');
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} describedBy={describedBy}>
      {/* Free attributes first, so the component's own (data-museum-textarea included) win a clash. */}
      {({ id: controlId, ...aria }) => (
        <textarea
          {...attributes}
          id={controlId}
          className={classes}
          disabled={disabled}
          required={required}
          {...aria}
          data-museum-textarea=""
        />
      )}
    </Field>
  );
}
