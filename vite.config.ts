//@ts-nocheck
import { defineConfig } from 'vite'
import path from "path";
import vue from '@vitejs/plugin-vue'

const isProduction = process.env.NODE_ENV === 'production'


// https://vitejs.dev/config/
export default defineConfig({
  base: '/dev_modeller/',
  root: "./",
  server: {
    port: 5000,
    proxy: {
      '/api': {
        target: 'https://dev.vardek.online',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/colors.scss" as *;`

      }
    }
  },
  // build: {
  //   emptyOutDir: true,
  //   sourcemap: false,
  //   declaration: false,
  //   declarationMap: false,
  //   minify: true,
  //   rollupOptions: {
  //     output: {
  //       entryFileNames: "[name].js",
  //       chunkFileNames: "[name].js",
  //       assetFileNames: ({ name, extname }) => {

  //         if (/\.css$/.test(name ?? '')) {
  //           return 'assets/style[extname]';
  //         }
  //         return 'assets/[name][extname]';
  //       },
  //     },
  //   },
  // },
  build: {
    emptyOutDir: true,
    sourcemap: false,
    declaration: false,
    declarationMap: false,
    minify: true,
    // Измените assetsDir
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: "assets/js/[name]-[hash].js",
        chunkFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: ({ name, extname }) => {
          if (/\.css$/.test(name ?? '')) {
            return 'assets/style-[hash][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  }
})
