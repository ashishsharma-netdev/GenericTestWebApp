import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        auth: resolve(rootDir, 'auth.html'),
        admin: resolve(rootDir, 'admin.html'),
        student: resolve(rootDir, 'student.html')
      }
    }
  }
});
