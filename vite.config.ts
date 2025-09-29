import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react-swc';
import compression from 'vite-plugin-compression';
import Unocss from 'unocss/vite';
import presetWind from '@unocss/preset-wind';
import transformerDirective from '@unocss/transformer-directives';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    svgr(),
    Unocss({
      transformers: [transformerDirective()],
      presets: [presetWind()],
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
            light: '#FFEDD5',
            lightHover: '#FFF9EF',
            dot: '#FFB75D',
          },
          black: {
            normal: '#222222',
            light: '#769292',
          },
          gray: {
            normal: '#8E8E8E',
            light: '#E1E1E7',
            slight: '#DDDDDD',
            end: '#F5F3F1',
          },
          white: {
            normal: '#FFFDFA',
          },
          error: {
            normal: '#B80101',
          },
          warning: {
            normal: '#FFB75D',
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
      jsbi: 'jsbi/dist/jsbi-cjs.js',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_DEBUG': false,
  },
  server: {
    proxy: {
      '/prod': {
        target: 'https://cdnqxybj18.execute-api.ap-southeast-1.amazonaws.com',
        changeOrigin: true,
        secure: false,
        headers: {
          Referer: 'https://cdnqxybj18.execute-api.ap-southeast-1.amazonaws.com',
        },
      },
      '/points/api': {
        target: 'https://app.wallfreex.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/points\/api/, '/points/api'),
        headers: {
          Referer: 'https://app.wallfreex.com',
        },
      },
    },
  },
});
