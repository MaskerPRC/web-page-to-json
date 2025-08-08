const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  
  // 开发服务器配置
  devServer: {
    port: 8080,
    open: true,
    client: {
      overlay: {
        warnings: false,
        errors: false,
        runtimeErrors: (error) => {
          const ignoreErrors = [
            "ResizeObserver loop limit exceeded",
            "ResizeObserver loop completed with undelivered notifications"
          ];
          if (ignoreErrors.some(e => error.message.includes(e))) {
            return false;
          }
          return true;
        },
      },
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3025',
        changeOrigin: true,
        ws: true
      }
    }
  },
  
  // 生产构建配置
  productionSourceMap: false,
  
  // PWA配置
  pwa: {
    name: '网页解析工具',
    themeColor: '#409EFF',
    msTileColor: '#409EFF',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'default'
  },
  
  // 链式操作webpack配置
  chainWebpack: config => {
    // 优化图片
    config.module
      .rule('images')
      .test(/\.(png|jpe?g|gif|svg)(\?.*)?$/)
      .use('url-loader')
      .loader('url-loader')
      .options({
        limit: 10000,
        fallback: {
          loader: 'file-loader',
          options: {
            name: 'img/[name].[hash:8].[ext]'
          }
        }
      })

    // 如需进一步减小体积，可迁移到 Vite 并使用按需自动导入插件
  },
  
  // CSS配置
  css: {
    loaderOptions: {
      scss: {
        additionalData: `
          @use "@/styles/variables.scss" as *;
        `
      }
    }
  }
})
