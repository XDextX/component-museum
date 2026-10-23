import { useId, type ReactNode } from 'react';

/** What the field gives its control: the id, the description and the invalid mark. */
export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
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
  children,
}: {
  label: string;
  hint: string;
  error: string;
  required: boolean;
  id: string | undefined;
  describedBy: string | undefined;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const generated = useId();
  const controlId = id ?? generated;
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
      {children({ id: controlId, 'aria-describedby': description || undefined, 'aria-invalid': error ? true : undefined })}
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
