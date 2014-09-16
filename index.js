var Hawkejs = require('./lib/class/hawkejs.js'),
    fs      = require('fs'),
    files;

// Export the Hawkejs class
module.exports = Hawkejs;

/**
 * Load a script for use with Hawkejs across all instances
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   filePath
 * @param    {Object}   options
 *
 * @return   {void}
 */
Hawkejs.setMethod(function load(filePath, options) {

	var location = filePath;

	if (!options || typeof options != 'object') {
		options = {};
	}

	if (typeof options.server == 'undefined') {
		options.server = true;
	}

	if (typeof options.browser == 'undefined') {
		options.browser = true;
	}

	if (location[0] !== '/') {
		location = __dirname + '/' + location;
	}

	if (!this.files[filePath]) {
		this.files[filePath] = options;

		if (options.server) {
			require(location)(Hawkejs, Hawkejs.Blast);
		}
	}
});

// The files that need to be loaded
files = [
	'element_builder.js',
	'helper.js',
	'placeholder.js',
	'view_render.js',
	'block_buffer.js',
	'hawkejs-server.js'
];

Hawkejs.setMethod(function afterInit() {

	var that = this;

	// Call the super function
	afterInit.super.call(this);

	// Require all the main class files
	files.forEach(function(classPath) {

		if (classPath == 'hawkejs.js') {
			return;
		}

		that.load('lib/class/' + classPath, {id: classPath});
	});

	// Require these files in the browser only
	this.load('lib/class/hawkejs-client.js', {server: false});
	this.load('lib/class/scene.js', {server: false});
});

/**
 * Create a file for the client side
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function}  callback
 */
Hawkejs.setMethod(function createClientFile(callback) {

	var that = this,
	    tasks = {},
	    extraFiles = [],
	    cfile = __dirname + '/hawkejs-client-side.js';

	if (that.generatedClientFile) {
		if (callback) callback(null, that.generatedClientFile);
		return cfile;
	}

	files.forEach(function(classPath) {
		extraFiles.push('lib/class/' + classPath);
	});

	Hawkejs.Blast.Bound.Object.each(this.files, function(options, classPath) {
		if (options.browser) {
			if (extraFiles.indexOf(classPath) < 0) extraFiles.push(classPath);
		}
	});

	// Read in all the main files
	extraFiles.forEach(function eachExtraClassFile(classPath) {
		tasks[classPath] = function readClassFile(next) {
			fs.readFile(__dirname + '/' + classPath, {encoding: 'utf8'}, next);
		};
	});

	tasks.hawkejs = function getHawkejs(next) {
		fs.readFile(__dirname + '/lib/class/hawkejs.js', {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.template = function getTemplate(next) {
		fs.readFile(__dirname + '/lib/client/template.js', {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.jsondry = function getJsondry(next) {

		var ePath = require.resolve('json-dry');

		fs.readFile(ePath, {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.protoblast = function getProtoblast(next) {

		var Blast = require('protoblast')();

		fs.readFile(Blast.getClientPath(true), {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	// Fetch all the files
	Hawkejs.Blast.Bound.Function.parallel(tasks, function gotAllFiles(err, result) {

		var template,
		    code,
		    id;

		if (err) {
			throw err;
		}

		code = '';
		template = result.template;
		id = template.indexOf('//_REGISTER_//');

		// Add json-dry
		code += 'require.register("json-dry", function(module, exports, require){\n';
		code += result.tasks;
		code += '\n});\n';

		// Add protoblast for browser
		code += 'require.register("protoblast", function(module, exports, require){\n';
		code += result.protoblast;
		code += '\n});\n';

		// Add main hawkejs
		code += 'require.register("hawkejs", function(module, exports, require){\n';
		code += result.hawkejs;
		code += '\n});\n';

		extraFiles.forEach(function(filekey) {

			var options = that.files[filekey];

			code += 'require.register("' + filekey + '", function(module, exports, require){\n';
			code += result[filekey];
			code += '\n});\n';
		});

		code += 'clientFiles = ' + JSON.stringify(extraFiles) + ';\n';

		template = template.slice(0, id) + '\n' + code + template.slice(id);

		fs.writeFile(cfile, template, function() {
			that.generatedClientFile = cfile;
			
			if (callback) callback(null, cfile);
		});
	});

	return cfile;
});