const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  mode: 'production',
  devtool: 'none',
  entry: './src/index.ts',
  externals: {
    react: 'React'
  },
  output: {
    filename: 'bundle.js',
    path: __dirname
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx']
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader'
    }]
  },
  optimization: {
    minimizer: [
      new TerserPlugin(),
    ],
  }
}
