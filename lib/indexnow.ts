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
