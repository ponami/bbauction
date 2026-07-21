/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/gate/:path*',
        destination: 'https://orulzi.com/gate/:path*',
      },
    ]
  },
}
module.exports = nextConfig
