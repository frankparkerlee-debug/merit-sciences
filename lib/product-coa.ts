import 'server-only';
import { listCoaRecords } from './coa-cache';
import {
  matchCurrentCertificates,
  type CertRow,
  type CurrentCertificate,
  type ProductLike,
} from './product-coa-match';

export { coaSearchTerm, type CurrentCertificate } from './product-coa-match';

/** Current certificate per product handle (see lib/product-coa-match). Never
 *  throws: a database failure yields an empty map and every caller falls back
 *  to the /coa search link. */
export async function currentCertificates(products: ProductLike[]): Promise<Map<string, CurrentCertificate>> {
  try {
    const records = (await listCoaRecords()) as unknown as CertRow[];
    return matchCurrentCertificates(records, products);
  } catch {
    return new Map();
  }
}

export async function currentCertificate(p: ProductLike): Promise<CurrentCertificate | null> {
  return (await currentCertificates([p])).get(p.handle) ?? null;
}
