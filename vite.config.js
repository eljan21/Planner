import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on 127.0.0.1, ::1 and the LAN (lets you test on a phone too)
    proxy: { '/api': 'http://localhost:3000' },
  },
});
