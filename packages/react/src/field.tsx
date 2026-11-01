import { useId, type HTMLAttributes, type ReactNode } from 'react';

/** What the field gives its control: the id, the description and the invalid mark. */
export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  /** Only in group mode: the shared name of the radios. */
  name?: string;
};

/** Group mode: the field is a `fieldset role="radiogroup"` and `children` draws the options inside it. */
export type FieldGroup = {
  name: string;
  size: string;
  disabled: boolean;
  className?: string;
  /** Consumer attributes (events, data-*), spread on the fieldset. */
  attrs?: HTMLAttributes<HTMLFieldSetElement>;
};

/**
 * Shared field markup of Input and Textarea. Internal: not exported from the entry.
 * Draws label, hint and error around the control that `children` builds from the props it is given.
 */
export function Field({
  label,
  hint,
  error,
  required,
  id,
  describedBy,
  inline = false,
  group,
  children,
}: {
  label: string;
  hint: string;
  error: string;
  required: boolean;
  id: string | undefined;
  describedBy: string | undefined;
  /** Checkbox layout: the control comes before the label. */
  inline?: boolean;
  /** Radio group layout: fieldset + legend; the description and aria state go on the fieldset. */
  group?: FieldGroup;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const generated = useId();
  const controlId = id ?? generated;
  // The error first, then the hint, then the consumer's own ids.
  const description = [error && `${controlId}-error`, hint && `${controlId}-hint`, describedBy].filter(Boolean).join(' ');
  const hintNode = hint && (
    <p id={`${controlId}-hint`} className="museum-field__hint">
      {hint}
    </p>
  );
  const errorNode = error && (
    <p id={`${controlId}-error`} className="museum-field__error">
      {error}
    </p>
  );
  const requiredMark = required && (
    <span className="museum-field__required" aria-hidden="true">
      *
    </span>
  );
  if (group) {
    const cls = ['museum-field museum-radiogroup', `museum-radiogroup--${group.size}`, group.className].filter(Boolean).join(' ');
    return (
      <fieldset
        {...group.attrs}
        id={controlId}
        className={cls}
        role="radiogroup"
        aria-describedby={description || undefined}
        aria-invalid={error ? true : undefined}
        aria-required={required ? true : undefined}
        disabled={group.disabled || undefined}
        data-museum-radiogroup=""
      >
        <legend className="museum-field__label">
          {label}
          {requiredMark}
        </legend>
        {children({ id: controlId, name: group.name, 'aria-describedby': undefined, 'aria-invalid': undefined })}
        {hintNode}
        {errorNode}
      </fieldset>
    );
  }
  const labelNode = (
    <label className="museum-field__label" htmlFor={controlId}>
      {label}
      {requiredMark}
    </label>
  );
  const control = children({ id: controlId, 'aria-describedby': description || undefined, 'aria-invalid': error ? true : undefined });
  return (
    <div className={inline ? 'museum-field museum-field--inline' : 'museum-field'}>
      {inline ? control : labelNode}
      {inline ? labelNode : control}
      {hintNode}
      {errorNode}
    </div>
  );
}
