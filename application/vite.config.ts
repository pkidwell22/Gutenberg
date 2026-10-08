import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: {host:'127.0.0.1',port:64818,strictPort:true,proxy:{'/api':'http://127.0.0.1:64819','/raw':'http://127.0.0.1:64819','/notes':'http://127.0.0.1:64819'}}, build:{outDir:'dist'} });
