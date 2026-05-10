import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 800,
        aggregateTimeout: 300,
        ignored: /node_modules/
      }
    }
    return config
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.layak.tech' }],
        destination: 'https://layak.tech/:path*',
        permanent: true
      }
    ]
  }
}

export default nextConfig
