import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react-swc';
import compression from 'vite-plugin-compression';
import Unocss from 'unocss/vite';
import presetIcons from '@unocss/preset-icons';
import presetWind from '@unocss/preset-wind';
import transformerDirective from '@unocss/transformer-directives';
import svgr from 'vite-plugin-svgr';

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
        colors: {
          orange: {
            normal: '#E14E28', // className="bg-purple-primary"
            light: '#FFE8C9',
            lightHover: '#FFF9F0',
            dot: '#FFB75D',
          },
          black: {
            normal: '#225050',
            light: '#769292',
          },
          gray: {
            normal: '#C2C4D0',
            light: '#E1E1E7',
          },
          white: {
            normal: '#FFFDFA',
          },
          error: {
            normal: '#E96170',
          },
          green: {
            normal: '#009595',
          },
          blue: {
            normal: '#9FB6EF',
          },
        },
        boxShadow: {
          popper: '0px 4px 16px rgba(0,0,0,0.16)',
        },
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
      '@constants': resolve(__dirname, 'src/constants'),
      '@uniswap-v2-sdk': resolve(__dirname, 'src/uniswap-v2-sdk'),
      events: 'rollup-plugin-node-polyfills/polyfills/events',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules') && !id.includes('buffer') && !id.includes('polyfill')) {
            return 'vendor';
          }
        },
      },
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
