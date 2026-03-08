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
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <svg
            className="h-3 w-3 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {pendingLabel ?? children}
        </span>
      ) : children}
    </button>
  );
}
