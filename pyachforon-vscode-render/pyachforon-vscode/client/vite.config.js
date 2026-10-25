import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: {host:'0.0.0.0',port:5173,proxy:{'/socket.io':{target:'http://localhost:3001',ws:true},'/api': 'http://localhost:3001'}},
  build: {outDir: fileURLToPath(new URL('../dist', import.meta.url)),emptyOutDir:true}
});
