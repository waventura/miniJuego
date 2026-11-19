import { defineConfig } from 'vite';

const versionCode = Number(process.env.APP_VERSION_CODE || '1');
const versionName = process.env.APP_VERSION_NAME || `1.0.${versionCode}`;

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(versionName),
    __APP_VERSION_CODE__: JSON.stringify(versionCode),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
