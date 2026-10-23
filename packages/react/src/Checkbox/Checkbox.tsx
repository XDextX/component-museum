import type { InputHTMLAttributes } from 'react';
import { Field } from '../field.js';

/** Checkbox's own API, from contracts/checkbox.contract.json translated to React. */
export type CheckboxOwnProps = {
  label: string;
  hint?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  defaultChecked?: boolean;
  /** Added to the `<input>`'s own classes, never replacing them. */
  className?: string;
};

/** Any other HTML attribute (`name`, `value`, `checked`, `onChange`…) reaches the `<input>`; the Omit keeps the own props single. */
export type CheckboxProps = CheckboxOwnProps & Omit<InputHTMLAttributes<HTMLInputElement>, keyof CheckboxOwnProps | 'type'>;

export function Checkbox({
  label,
  hint = '',
  error = '',
  size = 'md',
  disabled = false,
  required = false,
  defaultChecked = false,
  className,
  id,
  checked,
  'aria-describedby': describedBy,
  ...attributes
}: CheckboxProps) {
  const classes = ['museum-checkbox', `museum-checkbox--${size}`, className].filter(Boolean).join(' ');
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} describedBy={describedBy} inline>
      {/* Free attributes first, so the component's own (data-museum-checkbox included) win a clash. */}
      {({ id: controlId, ...aria }) => (
        <input
          {...attributes}
          id={controlId}
          className={classes}
          type="checkbox"
          disabled={disabled}
          required={required}
          // A controlled checkbox (`checked`) never also gets `defaultChecked`: React warns about both.
          checked={checked}
          defaultChecked={checked === undefined ? defaultChecked : undefined}
          {...aria}
          data-museum-checkbox=""
        />
      )}
    </Field>
  );
}
