'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useRef, useEffect } from 'react';
import { addOrderComment, type ActionResult } from './actions';

/**
 * Admin comment input — Shopify-style timeline composer. Submits via
 * the addOrderComment server action; on success, clears the textarea
 * and revalidates the page so the new comment appears in the timeline.
 */
export function CommentForm({ orderId }: { orderId: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(addOrderComment, null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clear the input after successful post
  useEffect(() => {
    if (result?.ok && textareaRef.current) {
      textareaRef.current.value = '';
    }
  }, [result]);

  return (
    <form action={formAction} className="rounded-2xl border border-cobalt/15 bg-white p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <textarea
        ref={textareaRef}
        name="comment"
        required
        rows={3}
        placeholder="Leave a comment…"
        maxLength={2000}
        className="w-full rounded-xl border-0 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-0 resize-y"
      />
      <div className="flex items-center justify-between border-t border-cobalt/10 pt-3 mt-2">
        <p className="text-[11px] text-ink-soft/70">
          Only operators see comments. The customer never does.
        </p>
        <PostButton />
      </div>
      {result && (
        <div
          className={`mt-2 rounded-lg px-3 py-2 text-xs ${
            result.ok
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {result.ok ? result.message : result.error}
        </div>
      )}
    </form>
  );
}

function PostButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink text-white px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-cobalt transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Posting…' : 'Post'}
    </button>
  );
}
