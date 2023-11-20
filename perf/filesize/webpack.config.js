module.exports = {
  mode: 'production',
  devtool: 'eval',
  entry: './src/index.ts',
  externals: {
    react: 'React',
  },
  output: {
    filename: 'bundle.js',
    path: __dirname,
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
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
