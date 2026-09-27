import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
    test: {
        env: loadEnv(mode, process.cwd(), ''),
        // Backend integration tests share one MongoDB test database.
        // Serializing files prevents one test file from deleting another's fixtures.
        fileParallelism: false,
    },
}));