/**
 * Renders a JSON-LD structured-data <script>. Pass any schema.org object
 * built by lib/seo.ts. Safe to use multiple times per page (Product +
 * FAQPage + BreadcrumbList all coexist).
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is inert text in a script[type=ld+json];
      // there's no HTML/JS execution surface here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
