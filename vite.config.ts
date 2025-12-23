import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@components': resolve(__dirname, 'src/components'),
            '@utils': resolve(__dirname, 'src/utils'),
            '@store': resolve(__dirname, 'src/store'),
            '@styles': resolve(__dirname, 'src/styles'),
        },
    },
    optimizeDeps: {
        include: ['pdf-lib', 'pdfjs-dist'],
    },
    build: {
        target: 'esnext',
        minify: 'terser',
        rollupOptions: {
            output: {
                manualChunks: {
                    'pdf-lib': ['pdf-lib'],
                    'pdfjs': ['pdfjs-dist'],
                    'fabric': ['fabric'],
                    'vendor': ['react', 'react-dom'],
                },
            },
        },
    },
    worker: {
        format: 'es',
    },
});
