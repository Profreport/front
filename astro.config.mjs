import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  output: 'static',
  site: import.meta.env.PUBLIC_SITE_URL || undefined,
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    // Optimize images to WebP format
    formats: ['webp', 'avif'],
    // Enable responsive images
    experimentalResponsiveImages: true,
  },
  vite: {
    build: {
      // Minify CSS and JS
      minify: 'esbuild',
      cssMinify: true,
      // Split chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
});
