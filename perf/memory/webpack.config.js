let { resolve } = require('path')

let DIST = resolve(__dirname, './dist')
console.log('dist', DIST)

module.exports = {
  mode: 'development',
  devtool: 'eval',
  devServer: {
    compress: true,
    https: false,
    port: 8081,
    static: {
      directory: DIST,
    },
  },
  entry: './src/index.tsx',
  output: {
    filename: 'bundle.js',
    path: DIST,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
      },
    ],
  },
}
