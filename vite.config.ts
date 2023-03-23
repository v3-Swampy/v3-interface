import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react-swc';
import compression from 'vite-plugin-compression';
import Unocss from 'unocss/vite';
import presetIcons from '@unocss/preset-icons';
import presetWind from '@unocss/preset-wind';
import transformerDirective from '@unocss/transformer-directives';
import svgr from 'vite-plugin-svgr';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svgr(),
    Unocss({
      transformers: [transformerDirective()],
      presets: [
        presetWind(),
        presetIcons({
          prefix: 'i-',
          extraProperties: {
            display: 'inline-block',
            'vertical-align': 'middle',
          },
        }),
      ],
      theme: {
        breakpoints: {
          tiny: '350px',
          mini: '375px',
          mobile: '460px',
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
        colors: {},
      },
    }),
    react(),
    compression(),
  ],
  resolve: {
    alias: {
      '@assets': resolve(__dirname, 'src/assets'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@contracts': resolve(__dirname, 'src/contracts'),
      '@modules': resolve(__dirname, 'src/modules'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@router': resolve(__dirname, 'src/router'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@components': resolve(__dirname, 'src/components'),
      '@service': resolve(__dirname, 'src/service'),
    },
  },
  build: {
    minify: false,
    rollupOptions: {
      output: {},
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});
