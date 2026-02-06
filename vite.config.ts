import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ambil path folder saat ini secara aman
  const rootPath = process.cwd();
  // Load env (Vite otomatis cuma ambil yang depannya VITE_ secara default)
  const env = loadEnv(mode, rootPath, '');
  
  return {
    plugins: [react()],
    server: {
      host: true, 
      port: 5173,
      allowedHosts: true, 
      watch: {
        usePolling: true,
        interval: 1000,
      }
    },
    // REVISI: Hapus define yang numpuk-numpuk.
    // Vite secara otomatis nge-inject semua yang depannya VITE_ ke import.meta.env
    define: {
      // Cukup ini kalau lo emang masih butuh library pihak ketiga yang nyari process.env.NODE_ENV
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      sourcemap: mode === 'development', // Bantu debugging pas dev
    }
  };
});
