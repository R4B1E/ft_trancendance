const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dst'),
  },
  devServer: {
    static: './dst',
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  /*optimization: {

    runtimeChunk: 'single',

  },S U S*/
  devtool: 'inline-source-map' // for debugging
};

