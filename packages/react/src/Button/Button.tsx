import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react';

/** Button's own API, from contracts/button.contract.json translated to React. */
export type ButtonOwnProps = {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** Added to the component's own classes, never replacing them. */
  className?: string;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

/** Any other HTML attribute reaches the `<button>`; the Omit keeps the own props single. */
export type ButtonProps = ButtonOwnProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps>;

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className,
  children,
  onClick,
  ...attributes
}: ButtonProps) {
  const classes = ['museum-button', `museum-button--${variant}`, `museum-button--${size}`, className].filter(Boolean).join(' ');
  return (
    // Free attributes first, so the component's own (data-museum-button included) win a clash (RF-11).
    <button {...attributes} type={type} disabled={disabled} className={classes} onClick={onClick} data-museum-button="">
      {children}
    </button>
  );
}
