import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['server/_core/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/index.js',
  external: [
    '@supabase/*',
    'express',
    'dotenv',
    'cookie-parser',
    'cors',
    'zod',
    '@trpc/*',
    'superjson',
    'drizzle-orm',
    'mysql2',
    'postgres',
    '@aws-sdk/*',
    'jose',
    'nanoid',
    'axios'
  ],
  sourcemap: true,
  logLevel: 'info'
});

console.log('✓ Server built successfully');
