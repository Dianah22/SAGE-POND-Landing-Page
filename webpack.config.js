const path = require('path');
const terserPlugin = require('terser-webpack-plugin')
module.exports = {
  mode: 'development',
  entry: './js/chat.js',
  optimization:{
    minimizer:[new terserPlugin()],
    minimize:true,
  },
  output: {
    path: path.resolve(__dirname, 'js/chat'),
    filename: 'bundle.chat.js',
    clean:true,
  },
  devtool: 'source-map', // Use 'source-map' to avoid CSP violations
};