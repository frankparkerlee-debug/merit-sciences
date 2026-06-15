'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadProductImage, type UploadImageResult } from '../actions';
import { PRODUCT_PLACEHOLDER_IMAGE } from '@/lib/product-types';

/**
 * Two-pane image manager for the product edit page.
 *
 *   - Primary image — replace via direct upload. The current image (or
 *     the Merit placeholder if none) is rendered as a thumbnail; "Upload"
 *     uploads to Supabase Storage and immediately persists onto the row.
 *   - Gallery — list of additional images. Uploads append.
 *
 * The hidden `imageUrl` + `images` form inputs on the edit form keep
 * working in parallel — admin can also paste a URL directly. After an
 * upload the inputs are re-synced so a subsequent "Save" won't clobber
 * the freshly-uploaded URL.
 */
export function ImageUploader({
  handle,
  initialPrimary,
  initialGallery,
}: {
  handle: string;
  initialPrimary: string | null;
  initialGallery: string[];
}) {
  const [primary, setPrimary] = useState<string | null>(initialPrimary);
  const [gallery, setGallery] = useState<string[]>(initialGallery);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* PRIMARY */}
      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink mb-2">
          Primary image
        </p>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-cream/60 border border-cobalt/10 flex-shrink-0">
            <Image
              src={primary || PRODUCT_PLACEHOLDER_IMAGE}
              alt="Primary"
              fill
              sizes="96px"
              className="object-contain p-1"
              unoptimized
            />
          </div>
          <UploadButton
            handle={handle}
            field="imageUrl"
            label={primary ? 'Replace' : 'Upload'}
            onSuccess={(url) => {
              setPrimary(url);
              // Sync the hidden text input so subsequent form save keeps it.
              const input = document.querySelector<HTMLInputElement>('input[name="imageUrl"]');
              if (input) input.value = url;
              setError(null);
            }}
            onError={setError}
          />
          {primary && (
            <button
              type="button"
              onClick={() => {
                setPrimary(null);
                const input = document.querySelector<HTMLInputElement>('input[name="imageUrl"]');
                if (input) input.value = '';
              }}
              className="text-[11px] tracking-[0.12em] uppercase font-bold text-ink-soft hover:text-ink underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* GALLERY */}
      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink mb-2">
          Gallery ({gallery.length})
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {gallery.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative w-16 h-16 rounded-lg overflow-hidden bg-cream/60 border border-cobalt/10 group"
            >
              <Image
                src={url}
                alt={`Gallery ${idx + 1}`}
                fill
                sizes="64px"
                className="object-contain p-1"
                unoptimized
              />
              <button
                type="button"
                onClick={() => {
                  const next = gallery.filter((_, i) => i !== idx);
                  setGallery(next);
                  const ta = document.querySelector<HTMLTextAreaElement>('textarea[name="images"]');
                  if (ta) ta.value = next.join('\n');
                }}
                className="absolute top-0 right-0 w-5 h-5 bg-ink/80 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-lg"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
          <UploadButton
            handle={handle}
            field="images"
            label="+ Add"
            compact
            onSuccess={(url) => {
              const next = [...gallery, url];
              setGallery(next);
              const ta = document.querySelector<HTMLTextAreaElement>('textarea[name="images"]');
              if (ta) ta.value = next.join('\n');
              setError(null);
            }}
            onError={setError}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-[10px] text-ink-soft leading-relaxed">
        Uploads → Supabase Storage bucket <code className="font-mono">product-images</code>. PNG /
        JPEG / WebP / SVG, 8 MB max. URLs are persisted instantly; you don&apos;t need to hit Save for image changes to stick.
      </p>
    </div>
  );
}

function UploadButton({
  handle,
  field,
  label,
  compact,
  onSuccess,
  onError,
}: {
  handle: string;
  field: 'imageUrl' | 'images';
  label: string;
  compact?: boolean;
  onSuccess: (url: string) => void;
  onError: (msg: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={`inline-flex items-center justify-center cursor-pointer ${
        compact
          ? 'w-16 h-16 rounded-lg border border-dashed border-cobalt/40 text-[10px] tracking-[0.1em] uppercase font-bold text-cobalt hover:bg-cobalt/5'
          : 'px-4 py-2 rounded-lg bg-ink text-white text-[11px] tracking-[0.16em] uppercase font-bold hover:bg-cobalt transition-colors'
      } ${pending ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {pending ? '…' : label}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.append('handle', handle);
          fd.append('field', field);
          fd.append('file', file);
          startTransition(async () => {
            const result: UploadImageResult = await uploadProductImage(fd);
            if (result.ok) {
              onSuccess(result.publicUrl);
            } else {
              onError(result.error);
            }
            if (ref.current) ref.current.value = '';
          });
        }}
      />
    </label>
  );
}
