const HtmlWebpackPlugin = require( 'html-webpack-plugin' );

module.exports = {
	context: __dirname,
	devtool: 'sourcemap',
	entry: [
		'./client.js'
	],
	output: {
		path: __dirname + '/public',
		filename: 'app.js'
	},
	module: {
		preLoaders: [
			{ test: /\.jsx?$/, exclude: /node_modules/, loaders: [ 'eslint-loader' ] }
		],
		loaders: [
			{ test: /\.jsx?$/, exclude: /node_modules/, loaders: [ 'babel-loader' ] },
			{ test: /\.json$/, loader: 'json-loader'},
			{ test: /\.scss$/, loader: 'style-loader!css-loader!postcss-loader!sass-loader'}
		]
	},
	resolve: {
		extensions: ['', '.js', '.jsx', '.json', '.scss', '.css' ],
		moduleDirectories: [ 'lib', 'node_modules' ]
	},
	plugins: [
		new HtmlWebpackPlugin( {
			title: 'Simperium'
		} )
	]
};
