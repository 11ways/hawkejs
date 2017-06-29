module.exports = function HawkejsClientOverrides(Hawkejs, Blast) {

	var URL = Blast.Bound.URL,
	    hinders = {};

	/**
	 * Get template source file by requesting it from the server
	 * 
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}     templateName
	 * @param    {Function}   callback
	 */
	Hawkejs.setMethod(function getSourceInternal(templateName, callback) {

		var url;

		url = Blast.Collection.URL.parse('/hawkejs/template');
		URL.addQuery(url, 'name', templateName+'');
		url = String(url);

		// Get the hinder object, if it exists
		hinder = hinders[url];

		if (!hinder) {
			// It doesn't exist, so create a new worker
			hinder = Function.hinder(function worker(done) {
				var xhr = new XMLHttpRequest();

						// Set the AJAX handler
				xhr.addEventListener('load', function transferComplete(e) {

					if (xhr.status > 400) {
						return done(new Error('Transfer failed: ' + xhr.response));
					}

					done(null, xhr.response || xhr.responseText);
				});

				// Catch errors
				xhr.addEventListener('error', function transferFailed(e) {
					done(new Error('Transfer failed'));
				}, false);

				xhr.open('GET', url);
				xhr.responseType = 'text';

				xhr.send();
			});

			hinders[url] = hinder;
		}

		// Add a new callback to the hinder
		hinder.push(callback);
	});

	/**
	 * Get the source of a template
	 * 
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.3
	 * @version  1.1.3
	 *
	 * @param    {Array}      names
	 * @param    {Function}   callback
	 */
	Hawkejs.setMethod(function getFirstAvailableInternalSource(names, callback) {

		var url;

		// Filter out duplicates
		Blast.Bound.Array.unique(names);

		url = Blast.Collection.URL.parse('/hawkejs/templates');
		URL.addQuery(url, 'name', names);
		url = String(url);

		// Get the hinder object, if it exists
		hinder = hinders[url];

		if (!hinder) {
			// It doesn't exist, so create a new worker
			hinder = Function.hinder(function worker(done) {
				var xhr = new XMLHttpRequest();

				// Set the AJAX handler
				xhr.addEventListener('load', function transferComplete(e) {

					if (xhr.status > 400) {
						return done(new Error('Transfer failed: ' + xhr.response));
					}

					done(null, xhr.response || xhr.responseText);
				});

				// Catch errors
				xhr.addEventListener('error', function transferFailed(e) {
					done(new Error('Transfer failed'));
				}, false);

				xhr.open('GET', url);
				xhr.responseType = 'json';

				xhr.send();
			});

			hinders[url] = hinder;
		}

		// Add a new callback to the hinder
		hinder.push(callback);
	});

	/**
	 * Render the wanted template
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.4
	 *
	 * @param    {String}    names
	 * @param    {Object}    variables
	 * @param    {Function}  callback
	 *
	 * @return   {ViewRender}
	 */
	Hawkejs.setMethod(function render(names, variables, callback) {

		var that = this,
		    viewRender,
		    payload,
		    result;

		if (typeof variables == 'function') {
			callback = variables;
			variables = {};
		}

		if (typeof names == 'object' && !Array.isArray(names)) {
			payload = names;
			names = payload.mainTemplate;
			variables = payload.variables;
		}

		// Create a new ViewRender object
		viewRender = new Hawkejs.ViewRender(this);

		// Indicate it's a client render
		viewRender.clientRender = true;

		// Add the root element
		viewRender.root = document;

		// Assign the payload
		Blast.Bound.Object.assign(viewRender, payload);

		Blast.Bound.Function.series(function doBeginRender(next) {
			viewRender.beginRender(names, variables, next);
		}, function getRenderHtml(next) {

			if (!callback) {
				return next();
			}

			viewRender.finish(function renderFinished(err) {

				var tasks = [];

				if (err) {
					return next(err);
				}

				// Iterate over every block to make sure it's completed
				Blast.Bound.Object.each(viewRender.blocks, function blockIter(block, name) {

					// If the block element is just a plain object, it's meant for
					// client-side emitting info. Ignore it.
					if (block.joinBuffer == null) {
						return;
					}

					tasks.push(block.joinBuffer.bind(block));
				});

				Blast.Bound.Function.parallel(false, tasks, function gotResult(err, buffer_result) {

					if (err) {
						return next(err);
					}

					result = buffer_result;

					next();
				});
			});

		}, function done(err) {

			if (err) {
				if (callback) {
					callback(err);
				} else {
					throw err;
				}

				return;
			}

			if (callback) {
				callback(null, result);
			}
		});

		return viewRender;
	});

	/**
	 * Detect if the given templateName is already in the root or its children
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.ViewRender.setMethod(function detectTemplate(templates, root) {

		var elements,
		    list,
		    i,
		    j;

		if (!root) {
			root = this.root || document;
		}

		list = templates.templates;

		// Get all the x-hawkejs elements
		elements = root.getElementsByTagName('x-hawkejs');

		// Go over every possible templateName
		for (i = 0; i < list.length; i++) {

			for (j = 0; j < elements.length; j++) {

				// Only `assign` blocks can be overwritten,
				// not implements or print_elements
				if (elements[j].getAttribute('data-type') !== 'block') {
					continue;
				}

				if (elements[j].getAttribute('data-template') === list[i].name) {
					return list[i].name;
				}
			}
		}

		return false;
	});

	/**
	 * Get the block element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.ViewRender.setMethod(function getBlockElement(blockName, root) {

		var elements,
		    i;

		if (!root) {
			root = this.root;
		}

		elements = root.getElementsByTagName('x-hawkejs');

		for (i = 0; i < elements.length; i++) {
			if (elements[i].getAttribute('data-name') === blockName) {
				return elements[i];
			}
		}

		return false;
	});

	/**
	 * Do the extensions that haven't been executed so far,
	 * on the client side.
	 *
	 * When the last doExtensions is done this does NOT mean all the blocks are
	 * done, either. (This is because we don't execute extensions already on the
	 * page)
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.4
	 */
	Hawkejs.ViewRender.setMethod(function doExtensions(variables, callback) {

		var that  = this,
		    tasks = [];

		// Check what extension index was done last
		if (typeof this.lastExtensionIndex !== 'number') {
			this.lastExtensionIndex = -1;
		}

		that.extensions.forEach(function eachExtension(extensionTemplates, index) {

			// Skip extensions that have already been done
			if (index <= that.lastExtensionIndex) {
				return;
			}

			if (that.detectTemplate(extensionTemplates)) {
				that.extensions[index] = extensionTemplates;
				return;
			}

			// Remember this extension has already been done
			that.lastExtensionIndex = index;

			tasks[tasks.length] = function executeExtension(next) {
				that.execute(extensionTemplates, variables, true, next);
			};
		});

		Blast.Bound.Function.parallel(tasks, function doneAllExtensions(err) {

			that.decrementIo();

			if (callback) {
				callback(err);
			} else if (err != null) {
				throw err;
			}

			that.checkFinish();
		});
	});

	/**
	 * Basic 'require' for JS files
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.3
	 *
	 * @param    {Array}    names
	 * @param    {Function} callback
	 */
	Hawkejs.setMethod(function require(names, callback) {

		var scene = this.scene,
		    tasks;

		if (!scene) {
			throw new Error('Scene is not ready');
		}

		names = Blast.Bound.Array.cast(names);
		tasks = new Array(names.length);

		names.forEach(function eachName(entry, index) {

			var path,
			    name;

			if (typeof entry == 'string') {
				path = name = entry;
			} else {
				path = entry.path || entry.source || entry.src;
				name = entry.name;
			}

			tasks[index] = function getScript(next) {
				if (scene.loadedNames[name] || scene.loadedPaths[path]) {
					return next();
				}

				if (scene.loadingNames[name] || scene.loadingPaths[path]) {
					return scene.once({type: 'script', name: name}, function() {next()});
				}

				scene.getScript({name: name, path: path}, next);
			};
		});

		Blast.Bound.Function.series(false, tasks, function gotAllScripts(err) {

			if (err != null) {

				console.log('ERR: ' + err, typeof err);

				if (typeof console !== 'undefined') {
					console.log(err, err.stack);
				}

				if (callback) {
					return callback(err);
				}

				throw err;
			}

			if (callback) {
				callback(null);
			}
		});
	});

	/**
	 * Basic logger
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.log = function log(level, args) {

		if (typeof console == 'undefined') {
			return;
		}

		// Add a colourful prefix
		if (navigator.userAgent.indexOf('MSIE') == -1) {
			args.unshift('%s[DEBUG] ');
			args.unshift('color:red;font-weight:bold;');
			console.log.apply(console, args);
		} else {
			Function.prototype.apply.call(console.log, console, args);
		}
	};
};