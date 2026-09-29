import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// One build serves every province: tools/deploy_landings.sh copies dist/ into src/<province>/
// and writes that province's key into index.html. Paths are relative so the same page works
// at <province>.gas24.ir/ and at gas24.ir/<province>/.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
