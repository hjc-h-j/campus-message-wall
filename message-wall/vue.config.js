const { defineConfig } = require('@vue/cli-service')
const path = require('path')
    //less全局变量
module.exports = defineConfig({
    transpileDependencies: true,
    pluginOptions: {
        'style-resources-loader': {
            preProcessor: 'less',
            patterns: [
                path.resolve(__dirname, './src/styles/commons.less')
            ]
        }
    }
})