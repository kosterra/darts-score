const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'production',
  entry: './index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/',
    filename: 'bundle.js',
  },
  target: 'node',
  plugins: [
    new CopyPlugin({
        patterns: [
            { from: "public", to: "public" } //to the dist root directory
        ],
    }),
],
};