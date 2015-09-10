var Hawkejs = require('./lib/class/hawkejs.js'),
    libpath = require('path'),
    libua   = require('useragent'),
    cache   = {},
    temp    = require('temp'),
    fs      = require('fs'),
    files;

// Export the Hawkejs class
module.exports = Hawkejs;

// Track and cleanup files on exit
temp.track();

/**
 * Load a script for use with Hawkejs across all instances
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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

		if (options.server) {
			require(location)(Hawkejs, Hawkejs.Blast);
		}

		// Will only be registered when require works on the server
		// @todo: still need to add check for client side scripts
		this.files[filePath] = options;
	}
});

// The files that need to be loaded
files = [
	'element_builder.js',
	'templates.js',
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
	this.load('lib/client/isvisible.js', {server: false});

	// Register Mutation Observer Polyfill
	this.load('lib/client/mutation_observer.js', {
		server: false,
		versions: {
			android: {max: 4.3},
			chrome:  {max: 17},
			firefox: {max: 13},
			ie:      {max: 10},
			mobile_safari: {max: 5.1},
			opera:   {max: 12.1},
			safari:  {max: 5.1}
		}
	});

	// Register Element Polyfill
	this.load('lib/client/register_element.js', {
		server: false,
		versions: {
			chrome:  {max: 35}
		}
	});

	// History API Polyfill
	this.load('lib/client/history.js', {
		server: false,
		versions: {
			android: {max: 4.1},
			chrome:  {max: 4},
			firefox: {max: 3.6},
			ie:      {max: 9},
			mobile_safari: {max: 4.3},
			opera:   {max: 10.1},
			safari:  {max: 5.1}
		}
	});

	this.load('lib/class/hawkejs-client.js', {server: false});
	this.load('lib/class/custom_element.js', {server: false});
	this.load('lib/client/dom_spotting.js', {server: false});
	this.load('lib/client/element_hawkejs.js', {server: false});
	this.load('lib/client/element_bound.js', {server: false});
	this.load('lib/class/scene.js', {server: false});
});

/**
 * Create a file for the client side
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}    options
 * @param    {Function}  callback
 */
Hawkejs.setMethod(function createClientFile(options, callback) {

	var that = this,
	    extraFiles,
	    files_id,
	    browser,
	    family,
	    tasks,
	    ua,
	    id;

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	if (options.useragent) {

		if (typeof options.useragent == 'object') {
			ua = options.useragent;
		} else {
			ua = libua.parse(options.useragent);
		}

		family = ua.family.toLowerCase();

		if (~family.indexOf('chrome') || ~family.indexOf('chromium')) {
			browser = 'chrome';
		} else if (~family.indexOf('safari')) {
			browser = 'safari'

			if (~family.indexOf('mobile') && ~family.indexOf('apple')) {
				browser = 'mobile_safari';
			}
		} else if (~family.indexOf('opera')) {
			browser = 'opera';
		} else if (~family.indexOf('trident') || ~family.indexOf('msie')) {
			browser = 'ie';
		} else if (~family.indexOf('firefox')) {
			browser = 'firefox';
		} else if (~family.indexOf('android')) {
			browser = 'android';
		}

		id = browser + '-' + ua.major + '.' + ua.minor;
	} else {
		id = 'full';
	}

	if (cache[id]) {
		if (callback) callback(null, cache[id]);
		return;
	}

	extraFiles = [];
	tasks = {};

	files.forEach(function eachFile(class_path) {
		extraFiles.push('lib/class/' + class_path);
	});

	Hawkejs.Blast.Bound.Object.each(this.files, function eachFile(options, class_path) {

		var version,
		    family,
		    entry;

		// Only allow files that are meant for the browser
		if (options.browser) {

			// See if we've been given a useragent
			if (options.versions && browser && ua && id != 'full') {
				if (entry = options.versions[browser]) {
					// Parse the version number
					version = parseFloat(ua.major + '.' + ua.minor);

					// If the user's browser version is higher than the required max,
					// it is also not needed
					if (version > entry.max) {
						return;
					}
				}
			}

			if (extraFiles.indexOf(class_path) < 0) extraFiles.push(class_path);
		}
	});

	// Calculate the id of the combination of files
	files_id = Blast.Bound.Object.checksum(extraFiles);

	if (cache[files_id]) {
		cache[id] = cache[files_id];
		if (callback) callback(null, cache[id]);
		return;
	}

	// Read in all the main files
	extraFiles.forEach(function eachExtraClassFile(classPath) {
		tasks[classPath] = function readClassFile(next) {
			fs.readFile(libpath.resolve(__dirname, classPath), {encoding: 'utf8'}, next);
		};
	});

	tasks.hawkejs = function getHawkejs(next) {
		fs.readFile(libpath.resolve(__dirname, 'lib/class/hawkejs.js'), {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.template = function getTemplate(next) {
		fs.readFile(libpath.resolve(__dirname, 'lib/client/template.js'), {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.protoblast = function getProtoblast(next) {

		var Blast = require('protoblast')(false);

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

		temp.open(files_id, function gotTempFile(err, info) {

			if (err) {
				return callback(err);
			}

			// Write the newly generated template into the temp file
			fs.write(info.fd, template);

			// Store the temp path under its two ids
			cache[id] = info.path;
			cache[files_id] = info.path;

			if (callback) callback(null, info.path);
		});
	});
});