import type { FieldsetHTMLAttributes, InputHTMLAttributes } from 'react';
import { Field } from '../field.js';

/** One radio of the group. */
export type RadioGroupOption = { value: string; label: string; disabled?: boolean };

/** RadioGroup's own API, from contracts/radiogroup.contract.json translated to React. */
export type RadioGroupOwnProps = {
  label: string;
  name: string;
  options: RadioGroupOption[];
  hint?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  defaultValue?: string;
  /** Added to the `<fieldset>`'s own classes, never replacing them. */
  className?: string;
};

/**
 * Controlled use: `value` plus your `onChange`, which reaches the `<fieldset>` and hears the radios' bubbling change.
 * Any other HTML attribute reaches the `<fieldset>`; the Omit keeps the own props single.
 */
export type RadioGroupProps = RadioGroupOwnProps & Pick<InputHTMLAttributes<HTMLInputElement>, 'value'> & Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, keyof RadioGroupOwnProps | 'value'>;

const noop = () => {};

export function RadioGroup({
  label,
  name,
  options,
  hint = '',
  error = '',
  size = 'md',
  disabled = false,
  required = false,
  defaultValue = '',
  className,
  id,
  value,
  'aria-describedby': describedBy,
  ...attributes
}: RadioGroupProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} describedBy={describedBy} group={{ name, size, disabled, className, attrs: attributes }}>
      {({ id: groupId, name: groupName }) =>
        options.map((option, i) => (
          <div key={option.value} className="museum-radiogroup__option">
            <input
              id={`${groupId}-${i}`}
              type="radio"
              className="museum-radio"
              name={groupName}
              value={option.value}
              required={required}
              disabled={option.disabled}
              // A controlled group (`value`) never also gets `defaultChecked`; the radios need an onChange of their own
              // for React not to warn, and the consumer's one (on the fieldset) hears the bubbling event.
              checked={value === undefined ? undefined : option.value === value}
              defaultChecked={value === undefined ? option.value === defaultValue : undefined}
              onChange={value === undefined ? undefined : noop}
            />
            <label htmlFor={`${groupId}-${i}`}>{option.label}</label>
          </div>
        ))
      }
    </Field>
  );
}
