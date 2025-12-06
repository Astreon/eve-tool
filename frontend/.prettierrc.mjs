import baseConfig from '../prettier.config.mjs'

export default {
    ...baseConfig,
    plugins: [...(baseConfig.plugins ?? []), 'prettier-plugin-tailwindcss'],
}
