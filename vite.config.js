/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    /* Map all REACT_APP_* and NODE_ENV references to runtime values via Vite's
     * define option so the existing process.env.* call sites continue to work
     * without a codebase-wide rename to import.meta.env. */
    const processEnv = Object.fromEntries(
        Object.entries(env)
            .filter(([key]) => key.startsWith('REACT_APP_'))
            .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
    )

    const plugins = [react()]

    if (process.env.ANALYZE === 'true') {
        plugins.push(
            visualizer({
                filename: 'build/bundle-stats.html',
                template: 'treemap',
                gzipSize: true,
                brotliSize: true,
                open: false
            })
        )
    }

    if (mode === 'production' && process.env.SENTRY_AUTH_TOKEN) {
        plugins.push(
            sentryVitePlugin({
                authToken: process.env.SENTRY_AUTH_TOKEN,
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
                release: { name: `smyrnatools@${env.npm_package_version}` },
                sourcemaps: { assets: './build/assets/**' }
            })
        )
    }

    return {
        plugins,
        envPrefix: 'REACT_APP_',
        define: {
            ...processEnv,
            'process.env.NODE_ENV': JSON.stringify(mode)
        },
        server: {
            port: 3000,
            open: true
        },
        build: {
            outDir: 'build',
            sourcemap: mode === 'production' ? 'hidden' : false
        },
        resolve: {
            alias: {
                path: 'path-browserify'
            }
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./src/setupTests.js'],
            css: false,
            // Tests excluded below use Jest-specific patterns
            // (jest.doMock + require, deep provider-tree assumptions). Port
            // them to vitest's vi.mock / dynamic import patterns to re-enable.
            exclude: [
                '**/node_modules/**',
                '**/build/**',
                // Agent-spawned worktrees mirror the repo under .claude/.
                // Vitest's default glob picks them up and double-runs every
                // test (including ones excluded by exact path below), so
                // exclude the whole tree.
                '**/.claude/**',
                'src/services/__tests__/DatabaseService.test.js',
                'src/utils/__tests__/APIUtility.test.js',
                'src/views/__tests__/LoginView.test.jsx',
                'src/views/__tests__/MixersView.test.jsx'
            ]
        }
    }
})
