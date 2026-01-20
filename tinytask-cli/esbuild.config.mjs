import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to resolve @modelcontextprotocol/sdk wildcard exports
const mcpResolverPlugin = {
  name: 'mcp-resolver',
  setup(build) {
    build.onResolve({ filter: /@modelcontextprotocol\/sdk\/client\/.+\.js$/ }, args => {
      // Extract the path after /client/
      const match = args.path.match(/@modelcontextprotocol\/sdk\/client\/(.+)\.js$/);
      if (match) {
        const subpath = match[1];
        // Resolve to the actual ESM file
        const resolvedPath = join(
          __dirname,
          'node_modules',
          '@modelcontextprotocol',
          'sdk',
          'dist',
          'esm',
          'client',
          `${subpath}.js`
        );
        return { path: resolvedPath };
      }
    });
    
    build.onResolve({ filter: /@modelcontextprotocol\/sdk\/types\.js$/ }, args => {
      const resolvedPath = join(
        __dirname,
        'node_modules',
        '@modelcontextprotocol',
        'sdk',
        'dist',
        'esm',
        'types.js'
      );
      return { path: resolvedPath };
    });
  },
};

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs', // Use CommonJS for Node.js SEA
  outfile: 'dist/bundle.cjs',
  sourcemap: false,
  minify: false,
  external: [],
  plugins: [mcpResolverPlugin],
  logLevel: 'info',
});

console.log('✓ Bundle created: dist/bundle.cjs');
