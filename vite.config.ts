import { defineConfig } from 'vite';
import { resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte({
      configFile: resolve(__dirname, 'svelte.config.js'),
      compilerOptions: {
        runes: true,
      },
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/core': resolve(__dirname, './src/core'),
      '@/ui': resolve(__dirname, './src/ui'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/config': resolve(__dirname, './src/config'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    minify: process.env.NODE_ENV === 'production',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        format: 'iife', // Chrome Extension V3 必需
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        extend: true,
        // 内联所有动态导入，避免代码分割
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },

  // 复制 public 文件夹到 dist
  publicDir: 'public',

  // Chrome 扩展环境变量
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'development'
    ),
  },
});
