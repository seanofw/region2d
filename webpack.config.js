
module.exports = {
	entry: __dirname + '/demo/src/demo.js',
	output: {
		path: __dirname + '/demo/bundle',
		filename: 'demo.js',
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
	devtool: "source-map"
}

