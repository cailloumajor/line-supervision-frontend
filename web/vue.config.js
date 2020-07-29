module.exports = {
  chainWebpack: (config) => {
    config.plugin("html").tap((args) => {
      args[0].title = "***REMOVED***"
      return args
    })
  },
  configureWebpack: (config) => {
    if (process.env.NODE_ENV !== "production") {
      config.devtool = "source-map"
    }
  },
  transpileDependencies: ["vuetify"],
}
