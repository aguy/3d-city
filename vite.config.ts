import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Allows root `index.html` to reference the compiled `./dist/assets/app.js` bundle
 * so GitHub Pages can serve the repository root directly from the `main` branch,
 * while `vite` dev server (`npm run dev`) transparently serves `/src/main.tsx` with HMR.
 */
function devEntrySwapPlugin(): Plugin {
  return {
    name: 'dev-entry-swap',
    apply: 'serve',
    transformIndexHtml(html) {
      return html
        .replace(/<link[^>]+href="\.\/dist\/assets\/app\.css"[^>]*>/i, '')
        .replace('./dist/assets/app.js', '/src/main.tsx');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [devEntrySwapPlugin(), react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: './src/main.tsx',
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/app[extname]',
      },
    },
  },
});
