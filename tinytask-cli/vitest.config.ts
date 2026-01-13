import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist/**', 'tests/**', '**/*.config.ts'],
    },
  },
  resolve: {
    alias: {
      '@modelcontextprotocol/sdk/client/index.js': '@modelcontextprotocol/sdk/client/index.js',
      '@modelcontextprotocol/sdk/client/streamable.js':
        '@modelcontextprotocol/sdk/client/streamable.js',
      '@modelcontextprotocol/sdk/types.js': '@modelcontextprotocol/sdk/types.js',
    },
  },
});
