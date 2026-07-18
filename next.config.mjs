/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: ".",
  },
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true
      },
      {
        source: '/:slug.html',
        destination: '/contracts/:slug',
        permanent: true
      }
    ];
  }
};

export default nextConfig;
