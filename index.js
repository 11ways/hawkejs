var HawkejsNS        = require('./lib/class/hawkejs.js'),
    Hawkejs          = HawkejsNS.Hawkejs,
    libmodule        = require('module'),
    original_wrap    = libmodule.wrap,
    original_wrapper = libmodule.wrapper.slice(0),
    original_resolve = libmodule._resolveFilename,
    strict_wrapper   = original_wrapper[0] + '"use strict";',
    libpath          = require('path'),
    libua            = require('useragent'),
    cache            = {},
    temp             = require('temp'),
    fs               = require('fs'),
    Blast            = __Protoblast,
    files;

// Export the Hawkejs namespace
module.exports = HawkejsNS;

// Track and cleanup files on exit
temp.track();

/**
 * Get a unique name for a certain path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.1
 * @version  1.1.1
 *
 * @param    {String}   file_path
 * @param    {Object}   options
 *
 * @return   {String}
 */
Hawkejs.setMethod(function _getUniqueName(file_path, options) {

	var test_name,
	    pieces,
	    file,
	    name,
	    key,
	    nr;

	// Now we need to generate a name for this file:
	// for that we use the last 2 pieces of the path
	if (options.name) {
		name = options.name;
	} else {
		pieces = file_path.split('/');

		// Try the filename first, the last part of the path
		name = Blast.Bound.Array.last(pieces);

		// If that already exists, add the directory name
		if (this.files[name]) {
			name = Blast.Bound.Array.last(pieces, 2).join('/');
		}
	}

	// Now iterate over all the files already added
	for (key in this.files) {
		file = this.files[key];

		// If the same path has already been added, stop now
		if (file.path == file_path) {
			return;
		}
	}

	test_name = name;
	nr = 1;

	// See if this name already exists
	while (this.files[test_name]) {
		test_name = name + '_' + nr;
		nr++;
	}

	name = test_name;

	return name;
});

/**
 * Make the next `require` call strict
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @param    {Object}   options
 *
 * @return   {void}
 */
Hawkejs.setMethod(function makeNextRequireStrict(options) {
	// Overwrite the original wrap method
	libmodule.wrap = function wrap(script) {

		var head,
		    bottom,
		    result;

		// Restore the original functions
		libmodule.wrap = original_wrap;
		libmodule._resolveFilename = original_resolve;

		if (script[0] != 'm' && script.indexOf('module.exports') == -1) {
			head = strict_wrapper + 'module.exports = function(Hawkejs, Blast) {';
			bottom = '};';
			options.make_commonjs = true;
		} else {
			head = strict_wrapper;
			bottom = '';
		}

		// Add the strict wrapper for this requirement
		result = head + script + bottom + libmodule.wrapper[1];

		return result;
	};

	// Overwrite the original _resolveFilename method
	libmodule._resolveFilename = function _resolveFilename(request, parent, isMain) {
		try {
			return original_resolve(request, parent, isMain);
		} catch (err) {
			libmodule.wrap = original_wrap;
			libmodule._resolveFilename = original_resolve;
			throw err;
		}
	};

});

/**
 * Load a script for use with Hawkejs across all instances
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.3
 *
 * @param    {String}   file_path
 * @param    {Object}   options
 *
 * @return   {void}
 */
Hawkejs.setMethod(function load(file_path, options) {

	var file,
	    name;

	if (!options || typeof options != 'object') {
		options = {};
	}

	// Generate the proper path to the file
	// @TODO: this will fail on windows
	if (file_path[0] !== '/') {
		file_path = libpath.resolve(__dirname, file_path);
	}

	// Get a unique name
	name = this._getUniqueName(file_path, options);

	// If no name is returned, this is a duplicate
	// and should not be added
	if (!name) {
		return;
	}

	options.name = name;

	if (options.server == null) {
		options.server = true;
	}

	if (options.client == null) {
		options.client = true;
	}

	// Enable commonjs support by default
	if (options.is_commonjs == null) {
		options.is_commonjs = true;
	}

	// Store the path in the options, too
	options.path = file_path;

	// See if this file needs to be required on the server
	if (options.server) {
		this.makeNextRequireStrict(options);

		if (options.is_commonjs) {
			require(file_path)(HawkejsNS, Hawkejs.Blast);
		} else {
			require(file_path);
		}
	}

	// And finally: add this file to the files object
	this.files[name] = options;
});

// The files that need to be loaded
files = [
	'parser/base_parser.js',
	'parser/string_parser.js',
	'parser/token_parser.js',
	'parser/html_tokenizer.js',
	'parser/expressions_parser.js',
	'expression.js',
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
	files.forEach(function eachFile(path) {

		if (path == 'hawkejs.js') {
			return;
		}

		if (path.indexOf('/') == -1) {
			path = 'class/' + path;
		}

		that.load('lib/' + path, {name: path});
	});

	// Require these files in the browser only
	this.load('lib/client/isvisible.js', {server: false});

	// Register CustomEvent Polyfill for IE
	this.load('lib/client/custom_event.js', {
		server: false,
		versions: {
			android: {max: 4.2}, // ?
			chrome:  {max: 14},
			firefox: {max: 10},
			ie:      {max: 11},
			mobile_safari: {max: 7.0}, // ?
			opera:   {max: 11.5},
			safari:  {max: 7.0} // ?
		}
	});

	// Register ClassList Polyfill
	this.load('lib/client/classlist.js', {
		server: false,
		versions: {
			android: {max: 2.3},
			chrome:  {max: 7},
			firefox: {max: 3.5},
			ie:      {max: 9},
			edge:    {max: 0},
			mobile_safari: {max: 4.3},
			opera:   {max: 10.1},
			safari:  {max: 5}
		}
	});

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

	// Register Dataset Polyfill for IE
	this.load('lib/client/dataset.js', {
		server: false,
		is_commonjs: false,
		versions: {
			android: {max:  0},
			chrome:  {max:  7},
			firefox: {max:  5},
			ie:      {max: 10},
			mobile_safari: {max: 0},
			opera:   {max: 11.9},
			safari:  {max: 5}
		}
	});

	// Register Element Polyfill
	this.load('lib/client/register_element.js', {
		server: false,
		versions: {
			chrome:  {max: 35},
			opera :  {max: 25}
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

	// Register FormData Polyfill
	this.load('lib/client/formdata.js', {
		server: false,
		is_commonjs: false,
		versions: {
			chrome:  {max: 49},
			firefox: {max: 43}
		}
	});

	this.load('lib/class/hawkejs-client.js', {server: false});

	this.load('lib/class/node.js', {client: false});
	this.load('lib/class/html_class_list.js', {client: false});
	this.load('lib/class/html_style.js', {client: false});
	this.load('lib/class/html_element.js', {client: false});
	this.load('lib/class/html_element_extensions.js', {client: true});

	this.load('lib/class/custom_element.js', {server: true});
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
 * @version  1.2.3
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

	if (!callback) {
		callback = Blast.Bound.Function.thrower;
	}

	if (options.useragent) {

		if (typeof options.useragent == 'object') {
			ua = options.useragent;
		} else {
			ua = libua.lookup(options.useragent);
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
		} else if (family == 'ie' || ~family.indexOf('trident') || ~family.indexOf('msie')) {
			browser = 'ie';
		} else if (~family.indexOf('firefox')) {
			browser = 'firefox';
		} else if (~family.indexOf('android')) {
			browser = 'android';
		} else if (~family.indexOf('edge')) {
			browser = 'edge';
		}

		id = browser + '-' + ua.major + '.' + ua.minor;
	} else {
		id = 'full';
	}

	if (cache[id]) {
		return callback(null, cache[id]);
	}

	extraFiles = [];
	tasks = {};

	Blast.Bound.Object.each(this.files, function eachFile(file_options, name) {

		var version,
		    family,
		    entry,
		    i;

		// Only allow files that are meant for the browser
		if (file_options.client) {

			// See if we've been given a useragent
			if (file_options.versions && browser && ua && id != 'full') {
				if (entry = file_options.versions[browser]) {
					// Parse the version number
					version = parseFloat(ua.major + '.' + ua.minor);

					// If the user's browser version is higher than the required max,
					// it is also not needed
					if (version > entry.max) {
						return;
					}
				}
			}

			// Iterate over all the already added files
			for (i = 0; i < extraFiles.length; i++) {
				entry = extraFiles[i];

				// If the paths are the same,
				// then don't add it again
				if (entry.path == file_options.path) {
					return;
				}
			}

			// No duplicates found for this path,
			// so add it
			extraFiles.push(file_options);
		}
	});

	// Calculate the id of the combination of files
	files_id = Blast.Bound.Object.checksum(extraFiles);

	if (cache[files_id]) {
		cache[id] = cache[files_id];
		return callback(null, cache[id]);
	}

	// Read in all the main files
	extraFiles.forEach(function eachExtraClassFile(options) {
		tasks[options.path] = function readClassFile(next) {
			fs.readFile(libpath.resolve(__dirname, options.path), {encoding: 'utf8'}, next);
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
	Blast.Bound.Function.parallel(tasks, function gotAllFiles(err, result) {

		var clientFiles,
		    template,
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

		clientFiles = [];

		extraFiles.forEach(function eachFile(file) {

			var obj = {},
			    key;

			// Clone the options, without certain properties
			for (key in file) {
				switch (key) {

					case 'browser':
					case 'server':
					case 'path':
						continue;

					default:
						obj[key] = file[key];
				}
			}

			clientFiles.push(obj);

			code += 'require.register(' + JSON.stringify(file.name) + ', function(module, exports, require){\n';

			if (file.make_commonjs) {
				code += 'module.exports = function(Hawkejs, Blast) {';
				code += result[file.path];
				code += '};';
			} else {
				code += result[file.path];
			}

			code += '\n});\n';
		});

		code += 'clientFiles = ' + JSON.stringify(clientFiles, null, 2) + ';\n';

		template = template.slice(0, id) + '\n' + code + template.slice(id);

		// Remove everything between "//HAWKEJS START CUT" and "//HAWKEJS END CUT"
		template = template.replace(/\/\/\s?HAWKEJS\s?START\s?CUT(.*\n)+?(\/\/\s?HAWKEJS\s?END\s?CUT)+?/gm, '');

		temp.open({prefix: 'hawkejs_' + files_id, suffix: '.js'}, function gotTempFile(err, info) {

			if (err) {
				return callback(err);
			}

			// Write the newly generated template into the temp file
			fs.write(info.fd, template, function doneWriting(err) {

				if (err) {
					return callback(err);
				}

				callback(null, info.path);
			});

			// Store the temp path under its two ids
			cache[id] = info.path;
			cache[files_id] = info.path;
		});
	});
});