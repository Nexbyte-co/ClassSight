import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Lets the dev server be opened through `tailscale serve` (HTTPS on the phone, needed for Web NFC)
  server: { allowedHosts: ['.ts.net'] },
})
