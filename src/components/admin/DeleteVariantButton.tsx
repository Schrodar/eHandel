'use client';

/**
 * DeleteVariantButton – a client component that wraps the deleteVariant server
 * action with a confirmation dialog and a loading state to prevent spam-clicks.
 *
 * Why a separate client component instead of a plain <form>?
 * Plain form actions do not support window.confirm (they run on the server),
 * so we need a client-side click handler.
 */

import { useState } from 'react';
import { deleteVariant } from '@/app/admin/(protected)/products/actions';

type Props = {
  variantId: string;
  productId: string;
};

export function DeleteVariantButton({ variantId, productId }: Props) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (
      !window.confirm(
        'Är du säker på att du vill ta bort denna variant? Åtgärden kan inte ångras.',
      )
    ) {
      return;
    }

    // Guard: prevent double-click while the request is in-flight.
    if (pending) return;
    setPending(true);

    console.log('[Admin] deleteVariant – start', { variantId, productId });

    try {
      const fd = new FormData();
      fd.set('id', variantId);
      fd.set('productId', productId);
      await deleteVariant(fd);
      // After a successful delete the server action redirects – the page
      // reloads automatically and the variant disappears from the list.
    } catch (err) {
      console.error('[Admin] deleteVariant – error', err);
      // Reset pending so the user can retry if something went wrong.
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={pending}
      className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Tar bort…' : 'Ta bort'}
    </button>
  );
}
