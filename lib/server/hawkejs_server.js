const EXPOSED_STR = Symbol('exposed_string'),
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
 * @version  2.0.0
 *
 * @type     {String}
 */
Main.setProperty(function static_exposed_js_string() {

	if (this[EXPOSED_STR] == null) {
		let dried,
		    obj = Bound.JSON.clone(this.expose_static || {}, 'toHawkejs');

		if (this._debug) {
			dried = Bound.JSON.dry(obj, null, '\t');
		} else {
			dried = Bound.JSON.dry(obj);
		}

		this[EXPOSED_STR] = '<script>window._hawkejs_static_expose = ' + dried + ';</script>';
	}

	return this[EXPOSED_STR];
});

/**
 * Set some variable that should always be sent to the client.
 * (The value will be serialized once and then cached, so it should not change)
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}    name
 * @param    {Object}    value
 */
Main.setMethod(function exposeStatic(name, value) {

	if (!this.expose_static) {
		this.expose_static = {};
	}

	this.expose_static[name] = value;

	// Invalidate the string
	this[EXPOSED_STR] = null;
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
 * @version  2.0.0
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
		return Blast.setImmediate(function foundCache() {
			callback(null, this.template_path_cache[template_name]);
		});
	}

	if (!this.directories) {
		return callback(null, false);
	}

	let current_dir,
	    found_path,
	    did_hwk = false,
	    iter = this.directories.createIterator();

	Fn.until(function test() {
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
 * @version  1.2.4
 *
 * @param    {IncommingMessage}     req
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
		type   : 'viewrender',
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
		return Classes.Pledge.reject(new Error('Undefined templates variable requested'));
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
	    pledge = new Classes.Pledge();

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

		fs.readFile(path, {encoding: 'utf8'}, callback);
	});
});

/**
 * Get the source of a template
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.3.2
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

	Fn.while(function test() {
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
			return callback(new Error('Unable to find template source'));
		}

		callback(null, {
			name   : found_name,
			source : found_source
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

	var file,
	    name;

	if (!options || typeof options != 'object') {
		options = {};
	}

	// Generate the proper path to the file
	// @TODO: this will fail on windows
	if (file_path[0] !== '/') {
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