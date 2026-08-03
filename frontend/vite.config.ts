import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  // Configuration pour le développement (gestion des routes SPA)
  server: {
    // Utiliser la bonne propriété pour Vite
    // @ts-ignore - TypeScript ne reconnaît pas cette propriété mais elle existe
    historyApiFallback: true,
  },
  
  // Configuration pour le build
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Garder les noms de fichiers stables pour le cache
        manualChunks: undefined,
      },
    },
  },
  
  // Optimisations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@reduxjs/toolkit', 'react-redux'],
  },
})  