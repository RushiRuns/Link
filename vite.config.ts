import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          // Copy the static preload CJS into dist-electron before Electron launches.
          // The preload is NOT built through vite-plugin-electron because that pipeline
          // emits two outputs (ESM + CJS lib) to the same filename, corrupting the file.
          // The source of truth remains electron/preload.ts (TypeScript, type-checked by tsc).
          plugins: [
            {
              name: 'copy-preload',
              buildStart() {
                mkdirSync('dist-electron', { recursive: true });
                copyFileSync(
                  path.resolve(__dirname, 'electron/preload.cjs'),
                  path.resolve(__dirname, 'dist-electron/preload.cjs')
                );
              }
            }
          ],
          build: {
            outDir: 'dist-electron',
            emptyOutDir: false,
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});

