'use client';

/**
 * SubmitButton – uses useFormStatus to disable the button while the enclosing
 * form's server action is in-flight. This prevents double-submits from
 * double-clicks or impatient re-submits, which was the root cause of duplicate
 * variant creation (each extra click raced through to a separate DB insert).
 */

import { useFormStatus } from 'react-dom';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Label shown while the form action is pending (optional). */
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  const isBusy = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isBusy}
      aria-busy={pending}
      className={className}
      {...rest}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
