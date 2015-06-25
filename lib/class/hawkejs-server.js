module.exports = function hawkejsServer(Hawkejs, Blast) {

	var ViewFile,
	    path  = require('path'),
	    log   = Hawkejs.logHandler;
	    fs    = require('fs');

	/**
	 * Register a view directory
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    dirpath
	 * @param    {Number}    weight
	 */
	Hawkejs.setMethod(function addViewDirectory(dirpath, weight) {

		if (typeof weight !== 'number') {
			weight = 10;
		}

		if (!this.directories) {
			this.directories = new Hawkejs.Blast.Classes.Deck();
		}

		this.directories.push(dirpath, weight);
	});

	/**
	 * Get the preferred path of a certain template
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}     templateName
	 * @param    {Function}   callback
	 */
	Hawkejs.setMethod(function getTemplatePath(templateName, callback) {

		var foundPath,
		    iter;

		// Make sure the template path ends with .ejs
		templateName = this.Utils.String.postfix(templateName, '.ejs');

		if (!this.templatePathCache) {
			this.templatePathCache = {};
		}

		if (this.templatePathCache[templateName]) {
			return setImmediate(callback.bind(this, null, this.templatePathCache[templateName]));
		}

		iter = this.directories.createIterator();

		Blast.Collection.Function.until(function test() {
			return !iter.hasNext() || foundPath;
		}, function fn(next) {

			// Get the next item
			var checkPath,
			    basePath = iter.next().value;

			// Construct the path to check
			checkPath = path.resolve(basePath, templateName);

			fs.exists(checkPath, function checkTemplateExists(exists) {

				if (exists) {
					foundPath = checkPath;
				}

				next();
			});

		}, function doneGettingTemplatePath(err) {
			callback(err, foundPath);
		});
	});

	/**
	 * Get the source of a template without checking cache,
	 * this is the server or client specific method.
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}     templateName
	 * @param    {Function}   callback
	 */
	Hawkejs.setMethod(function getSourceInternal(templateName, callback) {

		this.getTemplatePath(templateName, function gotTemplatePath(err, templatePath) {

			if (err) {
				return callback(err);
			} else if (!templatePath) {
				return callback(new Error('Template path "' + templateName + '" not found'));
			}

			fs.readFile(templatePath, {encoding: 'utf8'}, callback);
		});
	});

	/**
	 * Let Hawkejs handle the view lookup logic in Express
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.setMethod(function configureExpress(app, express) {

		var that = this;

		// Enable caching
		app.set('view cache', true);

		app.set('view', function ViewFileWrapper(name) {return new ViewFile(that, name)});
	});

	/**
	 * ViewFile class, for express
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewFile = Blast.Collection.Function.inherits(function ViewFile(hawkejs, name) {

		// The hawkejs parent
		this.hawkejs = hawkejs;

		// Store the name of this view
		this.name = name;

		// Set the name as the path, let hawkejs do the rest
		this.path = name;
	});

	/**
	 * The render function express will call
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewFile.setMethod(function render(options, fn) {

		var req = options[0],
		    res = options[1],
		    viewvars = options[2];

		this.viewRender = this.hawkejs.render(this.name, viewvars, fn);
		this.viewRender.prepare(req, res);

		return this.viewRender;
	});

	/**
	 * Get information from the req & res objects
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {IncommingMessage}     req
	 * @param    {OutgoingMessage}      res
	 */
	Hawkejs.ViewRender.setMethod(function prepare(req, res) {

		var url;

		url = Blast.Collection.URL.parse(req.url);
		Blast.Bound.URL.addQuery(url, 'hajax', null);
		url = Blast.Bound.URL.toString(url);

		// Set request info
		this.request = {
			hawkejs: req.headers['x-hawkejs-request'] == 'true',
			status: req.statusCode,
			method: req.method,
			ajax: req.headers['x-requested-with'] == 'XMLHttpRequest',
			url: url
		};

		// Is this going to be a clientRender?
		this.clientRender = this.request.hawkejs;

		// Add the response object
		this.res = res;

		// Set the history url
		res.setHeader('x-history-url', url);

		this.hawkejs.emit({type: 'viewrender', status: 'prepared', client: this.clientRender}, this);
		this.emit('prepared');
	});

	/**
	 * Do the extensions that haven't been executed so far,
	 * on the server side
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.ViewRender.setMethod(function doExtensions(variables, callback) {

		var that  = this,
		    tasks = [],
		    names = [];

		// Check what extension index was done last
		if (typeof this.lastExtensionIndex !== 'number') {
			this.lastExtensionIndex = -1;
		}

		that.extensions.forEach(function eachExtension(extension, index) {

			// Skip extensions that have already been done
			if (index <= that.lastExtensionIndex) {
				return;
			}

			log(8, 'Scheduling extension nr', index, ':', extension.getNames());

			// Expansion paths can be arrays, on the server we always use the first one
			if (Array.isArray(extension)) {
				extension = extension[0];
			}

			// Remember this extension has already been done
			that.lastExtensionIndex = index;

			// Needed for logging
			names.push(extension.getNames());

			tasks[tasks.length] = function executeExtension(next) {
				that.execute(extension, variables, true, function doneExtensionExecute() {
					log(8, 'Executed extension template', extension.getNames());
					next();
				});
			};
		});

		Blast.Bound.Function.parallel(tasks, function doneAllExtensions(err) {

			that.running--;

			log(8, 'Finished extensions', names, 'decreased IO running count to', that.running);

			if (callback) {
				callback();
			}

			that.checkFinish();
		});
	});

	/**
	 * Basic logger
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.log = function log(level, args) {

		var prefix = '\u001b[90m[\u001b[39m\u001b[38;5;157m\u001b[1m';
		prefix += 'HAWKEJS';
		prefix += '\u001b[22m\u001b[39m\u001b[90m]';
		prefix += '\u001b[1;49;39m -\u001b[0m';

		// Add level indent
		args.unshift('\u001b[90m•' + Blast.Bound.String.multiply(' »', level) + '\u001b[0m');

		// Add a colourful prefix
		args.unshift(prefix);

		console.log.apply(console, args);
	};

};