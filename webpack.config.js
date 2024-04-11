const path = require('path');
const terserPlugin = require('terser-webpack-plugin')
module.exports = {
  mode: 'development',
  entry: './app.js',
  optimization:{
    minimizer:[new terserPlugin()],
    minimize:true,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.min.js',
    clean:true,
  },
  devtool: 'eval-source-map',
};