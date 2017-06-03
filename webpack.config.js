var webpack = require("webpack");

module.exports = {
	entry: __dirname + '/demo/src/demo.js',
	output: {
		path: __dirname + '/demo/bundle',
		filename: 'demo.min.js',
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: 'babel-loader'
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('production')
			}
		}),
		new webpack.optimize.UglifyJsPlugin({ minimize: true })
	],
	devtool: "source-map"
}

