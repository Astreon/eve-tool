import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const fullBuildId =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_BUILD_ID ??
    process.env.GITHUB_SHA ??
    'local'

const shortBuildId = fullBuildId.slice(0, 7)

const config = defineConfig({
    server: {
        port: 3005,
    },
    plugins: [
        devtools(),
        nitro(),
        viteTsConfigPaths({
            projects: ['./tsconfig.json'],
        }),
        tailwindcss(),
        tanstackStart(),
        viteReact(),
    ],
    define: {
        __APP_VERSION__: JSON.stringify(
            process.env.npm_package_version ?? '0.0.0',
        ),
        __APP_BUILD_SHORT__: JSON.stringify(shortBuildId),
    },
})

export default config
