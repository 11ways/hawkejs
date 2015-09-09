module.exports = function HawkejsClientOverrides(Hawkejs, Blast) {

	var URL = Blast.Bound.URL;

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

		var xhr = new XMLHttpRequest(),
		    url;

		// Set the AJAX handler
		xhr.addEventListener('load', function transferComplete(e) {

			if (xhr.status > 400) {
				return callback(new Error('Transfer failed: ' + xhr.response));
			}

			callback(null, xhr.response || xhr.responseText);
		});

		// Catch errors
		xhr.addEventListener('error', function transferFailed(e) {
			if (callback) {
				callback(new Error('Transfer failed'));
			}
		}, false);

		url = Blast.Collection.URL.parse('/hawkejs/template');
		URL.addQuery(url, 'name', templateName+'');

		xhr.open('GET', url + '');
		xhr.responseType = 'text';

		xhr.send();
	});

	/**
	 * Render the wanted template
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
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
		    payload;

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

		// Start executing the template code
		Blast.nextTick(function doBeginRender() {
			viewRender.beginRender(names, variables);

			// If a callback has been given, make sure it gets the html
			if (callback) {
				viewRender.finish(function renderFinished(err) {

					var tasks = [];

					if (err) {
						return callback(err);
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

					Blast.Bound.Function.parallel(false, tasks, callback);
				});
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
	 * @version  1.0.0
	 */
	Hawkejs.ViewRender.setMethod(function doExtensions(variables, callback) {

		var that  = this,
		    tasks = [];

		// Check what extension index was done last
		if (typeof this.lastExtensionIndex !== 'number') {
			this.lastExtensionIndex = -1;
		}

		that.extensions.forEach(function(extensionTemplates, index) {

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
				that.execute(extensionTemplates, variables, false, function doneExtensionExecute(err) {
					next(err);
				});
			};
		});

		Blast.Bound.Function.parallel(tasks, function doneAllExtensions(err) {

			that.running--;

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
	 * @version  1.0.0
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

		names.forEach(function eachName(name, index) {

			tasks[index] = function getScript(next) {
				if (scene.loadedNames[name]) {
					return next();
				}

				if (scene.loadingNames[name]) {
					return scene.once({type: 'script', name: name}, next);
				}

				scene.getScript(name, next);
			}
		});

		Blast.Bound.Function.series(false, tasks, function gotAllScripts(err) {

			if (err != null) {

				if (typeof console !== 'undefined') {
					console.log(err.stack);
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