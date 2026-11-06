import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // The e2e run with accounts switched on builds into its own folder (.next-auth), so it can sit
  // beside the default build without overwriting it.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Every visitor gets the page's metadata in its head. Otherwise Next.js streams it into the body
  // for browsers it recognizes, and KakaoTalk's link preview, which is not on its list of bots,
  // would not find the team's title and picture.
  htmlLimitedBots: /.*/,
  // Vendored fonts live in versioned folders (public/fonts/<package>-<version>), so a file at a
  // given URL never changes and can be cached for a year.
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
