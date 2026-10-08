import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],test:{include:['src/**/*.test.{ts,tsx}','server/**/*.test.ts','test/**/*.test.ts'],environment:'node',fileParallelism:false}});
