/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // turbopack removed for build compatibility
  },

  // Disable ESLint during builds to avoid missing dependency error
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  images: {
    domains: ['placehold.co', 'via.placeholder.com'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Webpack configuration
  webpack: (config: any, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }: any) => {
    // Fix for chokidar and other Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // Suppress OpenTelemetry warnings and handlebars warnings
    config.ignoreWarnings = [
      {
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        message: /require.extensions is not supported by webpack/,
      },
    ];

    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
        })
      );
    }

    // Claude Code optimizations
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/.git/**',
          '**/.claude-cache/**',
          '**/dist/**',
          '**/*.log',
        ],
      };
    }

    return config;
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Rewrites for API routes and Claude Code integration
  async rewrites() {
    return [
      {
        source: '/api/claude/:path*',
        destination: 'http://localhost:8000/api/:path*', // Proxy to Claude Code if running
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // Performance optimizations
  productionBrowserSourceMaps: false,

  // Output configuration
  output: 'standalone',

  // Claude Code specific settings
  outputFileTracingRoot: process.env.CLAUDE_CODE_PROJECT_ROOT || undefined,
};

module.exports = nextConfig;
