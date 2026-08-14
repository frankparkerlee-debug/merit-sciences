// IndexNow — instant-indexing ping for Bing / Yandex (and, downstream,
// ChatGPT Search + Copilot, which run on the Bing index). Instead of waiting
// days for a re-crawl, we tell the engines exactly which URLs changed and they
// fetch them in minutes. Key is published at /<KEY>.txt (public/).
export const INDEXNOW_KEY = '8f4e2a9c7b1d6350e9a2c4f8b0d1e6a3';
const HOST = 'meritsciences.com';

export async function submitToIndexNow(
  urls: string[],
): Promise<{ ok: boolean; status: number; submitted: number }> {
  const list = Array.from(new Set(urls)).slice(0, 10000); // IndexNow caps at 10k/req
  if (list.length === 0) return { ok: true, status: 0, submitted: 0 };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: list,
    }),
  });
  return { ok: res.ok, status: res.status, submitted: list.length };
}

/**
 * Fire an IndexNow ping for a specific content change.
 *
 * The scheduled `/api/cron/indexnow` route resubmits the whole site, but
 * nothing on Render was ever wired to call it — so in practice a new lot or a
 * newly-published product waited for an organic recrawl. Bing is ChatGPT's
 * retrieval index, so that lag is directly a lag in being citable.
 *
 * This is the event-driven half: the admin action that changes the content
 * tells the engines about exactly that content, immediately. It is awaited
 * rather than floated because a promise left dangling in a server action can
 * be cut off when the response flushes — but it is wrapped so that a slow or
 * failing IndexNow endpoint can never turn a successful save into a failed
 * one. A missed ping costs freshness; a thrown error would cost the write.
 */
export async function pingIndexNow(urls: string[]): Promise<void> {
  const list = urls.filter(Boolean);
  if (list.length === 0) return;
  try {
    await Promise.race([
      submitToIndexNow(list),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* freshness is best-effort; never fail the write that triggered it */
  }
}
