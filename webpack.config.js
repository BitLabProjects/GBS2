const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: './dist',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Group Behaviour Simulation',
    }),
    new CopyWebpackPlugin({
      patterns: [
          { 
            from: 'src/experiments/*/*', 
            filter: async (resourcePath) => {
              return resourcePath.match(/.*(png|jpg)$/);
            },
            to: ({context, absoluteFilename}) => {
              // Replace \ with / to handle only the unix paths but be compatible with windows
              absoluteFilename = absoluteFilename.replaceAll('\\', '\/');
              let regex = absoluteFilename.match(/^.*\/src\/experiments\/([a-z0-9]+)\/(.+\.(png|jpg))$/);
              let result = path.resolve(__dirname, `dist/${regex[1]}/${regex[2]}`);
              return result;
            }
          },
          { 
            from: 'src/experiments/*/art/*', 
            filter: async (resourcePath) => {
              return resourcePath.match(/.*(png|jpg)$/);
            },
            to: ({context, absoluteFilename}) => {
              // Replace \ with / to handle only the unix paths but be compatible with windows
              absoluteFilename = absoluteFilename.replaceAll('\\', '\/');
              let regex = absoluteFilename.match(/^.*\/src\/experiments\/([a-z0-9]+)\/art\/(.+\.(png|jpg))$/);
              let result = path.resolve(__dirname, `dist/${regex[1]}/art/${regex[2]}`);
              return result;
            }
          }
      ]
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
};