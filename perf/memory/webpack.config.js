let { resolve } = require('path')

let DIST = resolve(__dirname, './dist')
console.log('dist', DIST)

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    contentBase: DIST,
    compress: true,
    https: false,
    port: 8081,
    disableHostCheck: true
  },
  entry: './src/index.tsx',
  output: {
    filename: 'bundle.js',
    path: DIST
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'awesome-typescript-loader'
    },
    {
      enforce: 'pre',
      test: /\.js$/,
      loader: 'source-map-loader'
    },
    ]
  }
}
