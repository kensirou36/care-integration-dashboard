import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    base: '/care-integration-dashboard/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'terser',
    },
    server: {
        port: 5173,
        open: true,
    },
})
