/**
 * Unified sequence registry — the one place that knows both sequence kinds:
 *   seq-<handle>  → compound (approved-counterpart)  · lib/product-sequences
 *   cat-<slug>    → category (mechanism-class)       · lib/category-sequences
 *
 * Both share the same 4-beat cadence (BEAT_DAYS / BEAT_COUNT from
 * product-sequences), so the journey engine stays generic — it only needs to
 * resolve a beat, know whether a key is valid, and (for /enroll) find a
 * concrete redirect target + interest lane. Add a new sequence family here and
 * every consumer (cron, enroll, picker) picks it up.
 */
import 'server-only';
import { renderSequenceBeat, type SequenceCtx } from './product-sequences';
import { renderCategoryBeat } from './category-sequences';
import { counterpartForSequenceKey } from './approved-counterparts';
import { categoryForKey } from './compound-categories';

export type { SequenceCtx };
export { BEAT_DAYS, BEAT_COUNT } from './product-sequences';

type Rendered = { subject: string; html: string; text: string };

export function sequenceExists(key: string): boolean {
  return Boolean(counterpartForSequenceKey(key) || categoryForKey(key));
}

/** Render beat `index` for whichever kind `key` names. Null if unknown/out-of-range. */
export function resolveSequenceBeat(key: string, index: number, ctx: SequenceCtx): Rendered | null {
  const compound = counterpartForSequenceKey(key);
  if (compound) return renderSequenceBeat(compound, index, ctx);
  const category = categoryForKey(key);
  if (category) return renderCategoryBeat(category, index, ctx);
  return null;
}

/** Concrete PDP handle to land an enrollee on (compound self, or category hero). */
export function redirectHandleFor(key: string): string | null {
  const compound = counterpartForSequenceKey(key);
  if (compound) return compound.handle;
  const category = categoryForKey(key);
  if (category) return category.heroHandle;
  return null;
}

/** Interest-tag lane for a key (compound.lane or category.slug). */
export function laneFor(key: string): string | null {
  const compound = counterpartForSequenceKey(key);
  if (compound) return compound.lane;
  const category = categoryForKey(key);
  if (category) return category.slug;
  return null;
}
