var webpack = require('webpack');
var path = require('path');

var baseConfig = {
  // entry: path.resolve(__dirname, 'src/ElementSticky.js'),
  devtool: 'source-map',
  mode: 'production',
  // output: {
  //   path: path.resolve(__dirname, 'dist'),
  //   filename: 'ElementSticky.js',
  //   library: 'ElementSticky',
  //   libraryTarget: 'umd',
  //   libraryExport: 'default',
  //   umdNamedDefine: true,
  // },
  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /(node_modules|bower_components|test)/,
    }],
  },
  resolve: {
    extensions: ['.js'],
  },
};

var config1 = { ...baseConfig,
  entry: path.resolve(__dirname, 'src/ElementSticky.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ElementSticky.js',
    library: 'ElementSticky',
    libraryTarget: 'umd',
    libraryExport: 'default',
    umdNamedDefine: true,
  },
};

var config2 = { ...baseConfig,
  entry: path.resolve(__dirname, 'src/ElementSticky.polyfilled.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ElementSticky.polyfilled.js',
    library: 'ElementSticky',
    libraryTarget: 'umd',
    libraryExport: 'default',
    umdNamedDefine: true,
  },
};

webpack(config1, function (err, stats) {
  var str = err ? err.stack : stats;
  process.stdout.write(str.toString({
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }) + '\n\n');
});

webpack(config2, function (err, stats) {
  var str = err ? err.stack : stats;
  process.stdout.write(str.toString({
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }) + '\n\n');
});
