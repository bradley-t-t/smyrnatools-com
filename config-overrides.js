const path = require('path')

module.exports = function override(config, env) {
    config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: require.resolve('path-browserify'),
        util: false,
        crypto: false,
        stream: false,
        buffer: false,
        process: false,
        zlib: false,
        querystring: false
    }

    // Configure video files to not have content hashes for better caching
    config.module.rules.forEach(rule => {
        if (rule.oneOf) {
            rule.oneOf.forEach(oneOfRule => {
                if (oneOfRule.test && oneOfRule.test.toString().includes('mp4|webm|ogg')) {
                    if (oneOfRule.options && oneOfRule.options.name) {
                        oneOfRule.options.name = 'static/media/[name].[ext]'
                    }
                }
            })
        }
    })

    return config
}