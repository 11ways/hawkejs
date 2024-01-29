const EXPOSED_PATH = Symbol('exposed_path'),
      EXPOSED_TEMP = Symbol('exposed_temp'),
      EXPOSED_STR  = Symbol('exposed_string'),
      libpath     = require('path'),
      Main        = Hawkejs.Hawkejs,
      fs          = require('fs');

/**
 * Get the closest element (up the dom tree)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Main.setStatic(function closest(element, query) {

	var cur = element;

	console.log('Doing CLOSEST on the server?', element, query);

	return null;
});

/**
 * Get the serialized string for the exposed static variables
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.6
 *
 * @type     {string}
 */
Main.setProperty(function static_exposed_js_string() {

	if (this[EXPOSED_STR] == null) {
		let obj = Bound.JSON.clone(this.expose_static || {}, 'toHawkejs'),
		    dried = this.stringifyToExpression(obj);

		dried = 'window._hawkejs_static_expose = ' + dried + ';';

		if (this.exposed_path) {
			let url = this.createScriptUrl(this.exposed_path, {root_path: this.root_path});
			url.param('i', Blast.Classes.Crypto.randomHex(3));

			this[EXPOSED_TEMP] = dried;
			this[EXPOSED_STR] = '<script src="' + url + '"></script>';

			this.getStaticExposedPath();
		} else {
			this[EXPOSED_STR] = '<script>' + dried + '</script>';
		}
	}

	return this[EXPOSED_STR];
});

/**
 * Set some variable that should always be sent to the client.
 * (The value will be serialized once and then cached, so it should not change)
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.6
 *
 * @param    {String}    name
 * @param    {Object}    value
 */
Main.setMethod(function exposeStatic(name, value) {

	if (!this.expose_static) {
		this.expose_static = {};
	}

	if (arguments.length == 1) {
		return this.expose_static[name];
	}

	this.expose_static[name] = value;

	// Invalidate the string
	this[EXPOSED_STR] = null;
	this[EXPOSED_PATH] = null;
});

/**
 * Create the exposed file
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.6
 * @version  2.3.15
 *
 * @param    {Function}    callback
 */
Main.setMethod(function getStaticExposedPath(callback) {

	if (typeof this[EXPOSED_PATH] == 'string') {
		return callback(null, this[EXPOSED_PATH]);
	}

	if (!this[EXPOSED_PATH]) {
		let pledge = new Classes.Pledge.Swift();

		Blast.openTempFile({prefix: 'hwkstat_', suffix: '.js'}, (err, info) => {

			if (err) {
				return pledge.reject(err);
			}

			if (this[EXPOSED_TEMP] == null) {
				// Generate the exposed string
				let exposed_string = this.static_exposed_js_string;
			}

			fs.writeFile(info.fd, this[EXPOSED_TEMP], err => {

				if (err) {
					return pledge.reject(err);
				}

				this[EXPOSED_PATH] = info.path;
				pledge.resolve(info.path);
			});
		});

		this[EXPOSED_PATH] = pledge;
	}

	this[EXPOSED_PATH].done(callback);
});

/**
 * Add something that will be added to the html right after the title
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}    code
 */
Main.setMethod(function addRawHtml(code) {

	if (!this.raw_code) {
		this.raw_code = '';
	}

	this.raw_code += '\t\t' + code + '\n';
});

/**
 * Register a view directory
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}    dirpath
 * @param    {Number}    weight
 */
Main.setMethod(function addViewDirectory(dirpath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	if (!this.directories) {
		this.directories = new Blast.Classes.Deck();
	}

	this.directories.push(dirpath, weight);
});

/**
 * Get the preferred path of a certain template
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.15
 *
 * @param    {String}     template_name
 * @param    {Function}   callback
 */
Main.setMethod(function getTemplatePath(template_name, callback) {

	if (!this.template_path_cache) {
		this.template_path_cache = {};
	}

	// Check the path cache if debug is disabled
	if (!this._debug && this.template_path_cache[template_name]) {
		return callback(null, this.template_path_cache[template_name]);
	}

	if (!this.directories) {
		return callback(null, false);
	}

	let current_dir,
	    found_path,
	    did_hwk = false,
	    iter = this.directories.createIterator();

	Hawkejs.FN_SYNC.until(function test() {
		return !current_dir && (!iter.hasNext() || found_path);
	}, function fn(next) {

		var path_to_check,
		    file;

		// Make sure the template path ends with .hwk or .ejs
		if (!did_hwk) {
			file = Bound.String.postfix(template_name, '.hwk');
		} else {
			file = Bound.String.postfix(template_name, '.ejs');
		}

		if (!current_dir) {
			current_dir = iter.next().value;
		}

		// Make sure the file does not go up a directory
		file = libpath.normalize(file);

		if (file[0] == '/') {
			file = file.slice(1);
		}

		// Construct the next path to check
		path_to_check = libpath.resolve(current_dir, file);

		fs.exists(path_to_check, function checkTemplateExists(exists) {

			if (exists) {
				found_path = path_to_check;
				current_dir = null;
			} else {
				if (did_hwk) {
					current_dir = null;
					did_hwk = false;
				} else {
					did_hwk = true;
				}
			}

			next();
		});
	}, function doneGettingTemplatePath(err) {
		callback(err, found_path);
	});
});

/**
 * Get information from the req & res objects
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {IncomingMessage}      req
 * @param    {OutgoingMessage}      res
 */
Hawkejs.Renderer.setMethod(function prepare(req, res) {

	var history_url,
	    url;

	history_url = res.getHeader('x-history-url');

	if (history_url) {
		url = history_url;
	} else {
		url = Blast.Classes.RURL.parse(req.url);
		url.param('hajax', null);
		url.param('htop', null);
		url.param('h_diversion', null);
		url = url.href;
	}

	// Set request info
	this.request = {
		hawkejs : req.headers['x-hawkejs-request'] == 'true',
		status  : req.statusCode,
		method  : req.method,
		ajax    : req.headers['x-requested-with'] == 'XMLHttpRequest',
		url     : url
	};

	// Is this going to be a clientRender?
	this.client_render = this.request.hawkejs;

	// Add the response object
	this.res = res;

	// Set the history url if it hasn't been set already
	if (!history_url) {
		res.setHeader('x-history-url', encodeURI(url));
	}

	this.hawkejs.emit({
		type   : 'renderer',
		status : 'prepared',
		client : this.client_render
	}, this);

	this.emit('prepared');
});

/**
 * Get the source of a template
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}     template_name
 *
 * @return   {Pledge}
 */
Main.setMethod(function getSource(template_name) {

	if (template_name == null) {
		return Classes.Pledge.Swift.reject(new Error('Undefined templates variable requested'));
	}

	// Create the source cache if it doesn't exist yet
	if (!this.template_source_cache) {
		this.template_source_cache = {};
	}

	// Return sourcecode from the cache if it's already available
	if (this.template_source_cache[template_name]) {
		return this.template_source_cache[template_name];
	}

	let that = this,
	    pledge = new Classes.Pledge.Swift();

	that.getSourceInternal(template_name, function gotResponse(err, source) {

		// Clear the cache if debug is enabled
		if (that._debug) {
			that.template_source_cache[template_name] = null;
		}

		if (err) {
			pledge.reject(err);
		} else {
			pledge.resolve(source);
		}
	});

	this.template_source_cache[template_name] = pledge;

	return pledge;
});

/**
 * Get the source of a template without checking cache,
 * this is the server specific method.
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}     template_name
 * @param    {Function}   callback
 */
Main.setMethod(function getSourceInternal(template_name, callback) {

	this.getTemplatePath(template_name, function gotTemplatePath(err, path) {

		if (err) {
			return callback(err);
		} else if (!path) {
			return callback(new Error('Template path "' + template_name + '" not found'));
		}

		fs.readFile(path, {encoding: 'utf8'}, function gotFileResult(err, source) {

			if (err) {
				return callback(err);
			}

			callback(null, {
				path     : path,
				filename : libpath.basename(path),
				source   : source
			});
		});
	});
});

/**
 * Get the source of a template
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  2.0.0
 *
 * @param    {Array}      names
 * @param    {Function}   callback
 */
Main.setMethod(function getFirstAvailableInternalSource(names, callback) {

	var that = this,
	    found_source,
	    found_name,
	    iter;

	iter = new Blast.Classes.Iterator(names);

	Hawkejs.FN_SYNC.while(function test() {
		return found_source == null && iter.hasNext();
	}, function getCompiledTask(next) {

		var template_name = iter.next().value;

		that.getSource(template_name).done(function gotTemplateSource(err, source) {

			if (err) {
				return next();
			}

			found_source = source;
			found_name = template_name;
			next();
		});
	}, function finished(err) {

		if (err) {
			return callback(err);
		}

		if (!found_source) {
			return callback(new Error('Unable to find template [' + names + ']'));
		}

		callback(null, {
			name     : found_name,
			filename : found_source.filename,
			source   : found_source.source,
		});
	});
});

/**
 * Load a script for use with Hawkejs across all instances
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   file_path
 * @param    {Object}   options
 *
 * @return   {void}
 */
Main.setMethod(function load(file_path, options) {

	if (!options || typeof options != 'object') {
		options = {};
	}

	// Generate the proper path to the file
	if (!libpath.isAbsolute(file_path)) {
		file_path = libpath.resolve('..', __dirname, file_path);
	}

	Blast.require(file_path, Object.assign({}, options));
});

/**
 * Create a client-file
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   options
 *
 * @return   {Pledge}
 */
Main.setMethod(function createClientFile(options) {
	return Blast.getClientPath(options);
});