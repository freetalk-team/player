const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'public/app.js'),
  output: {
    path: path.resolve(__dirname, 'public/dist'),
    filename: 'player-app.min.js',
    libraryTarget: 'umd',
    library: {
        name: 'PlayerApp',
        type: 'umd',
          // add this to export your class to the library
        export: "default"
    },
  },
 
  mode: 'production',
  optimization: {
    // minimize: false,
    // minimizer: [new TerserPlugin()],
  },
  plugins: [
   
  ],
};

