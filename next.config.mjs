/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow loading product images from anywhere during prototype phase.
  // Tighten this once production image hosting is wired up.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    // Required for the Merit-branded placeholder vial SVG fallback used
    // when a product has no imageUrl yet. The SVG is internally authored
    // — not user-supplied — so the loosening of next/image's default
    // SVG block is safe.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        // Apple Pay domain association — Apple/PayPal expect
        // application/json (Next defaults extension-less files to
        // application/octet-stream which fails verification).
        source: '/.well-known/apple-developer-merchantid-domain-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
