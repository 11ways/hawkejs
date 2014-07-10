module.exports = function(Hawkejs) {

	var async = require('async');

	/**
	 * The Scene class: client side handling
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Scene = Hawkejs.create(function Scene() {

		this.init = function init(parent) {
			// The parent Hawkeye instance
			this.hawkejs = parent;

			// The loaded scripts
			this.scripts = new Hawkejs.Hashmap();
			this.styles = {};
		};

		/**
		 * Get the source code representation of this object
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.toSource = function toSource() {

			var src = '(function(){';
			src += 'var a = new Hawkejs.Scene();';
			src += 'a.scripts = ' + this.scripts.toSource() + ';';
			src += 'return a;';
			src += '}())';

			return src;
		};

		/**
		 * Load a script and call the callback once it's executed
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.loadScript = function loadScript(path, callback) {

			var that = this,
			    script;

			// Create the actual element
			script = document.createElement('script');

			// Set the source attribute
			script.src = path;

			// Set the onload event
			script.onload = function onScriptLoad() {
				if (callback) callback();
			};

			// Add it to the head
			document.head.appendChild(script);
		};

		/**
		 * Register a render on the client side
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.registerRender = function registerRender(options) {

			var that = this,
			    scripts = options.scripts,
			    styles = options.styles;

			scripts.forEach(function(parameters, index) {
				// Register all the scripts
				that.queueScript.apply(that, parameters);
			});

			// Load all queued scripts
			this.loadQueuedScripts();
		};

		/**
		 * Enable or disable a certain stylesheet file
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {String}   path
		 * @param    {Boolean}  enable   Set to false to disable the stylesheet
		 */
		this.setStylesheet = function setStylesheet(path, enable) {

			var $existing = $('link[href="' + path + '"]'),
			    link;

			if (typeof enable === 'undefined') enable = true;

			if ($existing.length) {
				$existing.attr('disabled', !enable);
			} else {

				// Create a new link element
				link = document.createElement('link');

				// Indicate it's a stylesheet
				link.rel = 'stylesheet';

				// Set the source
				link.href = path;

				// Add it to the document
				document.body.appendChild(link);
			}
		};

		/**
		 * Queue a script for loading in the current scene
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {String}   path
		 * @param    {Object}   options
		 */
		this.queueScript = function queueScript(path, options) {

			var that = this,
			    shouldBeAdded = true;

			// Make sure the options object exists
			if (!options || typeof options !== 'object') {
				options = {};
			}

			// Don't reload a script if it is already loaded by default
			if (typeof options.reload === 'undefined') {
				options.reload = false;
			}

			// If no id is given, use the path as its id
			if (!options.id) {
				options.id = path;
			}

			// Store the path inside the options too
			if (!options.path) {
				options.path = path;
			}

			// First go over every script to see if it is unique
			this.scripts.every(function(item, key) {

				if (options.id == item.id || options.path == item.path) {
					if (options.reload) {
						item.reload = true;
					}

					shouldBeAdded = false;

					// Stop "every" loop
					return false;
				}
			});

			if (shouldBeAdded) {
				this.scripts.push(options.id, options, options.weight);
			}
		};

		/**
		 * Load all the not-yet-loaded scripts in the queue
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Function}   callback   Function to be called after they have loaded
		 */
		this.loadQueuedScripts = function loadQueuedScripts(callback) {

			var that  = this,
			    tasks = {};

			// Get all the ordered scripts from the hashmap
			this.scripts.forEach(function(options, key, index, internalItem) {

				if (typeof options.loadcount !== 'number') {
					options.loadcount = 0;
				}

				if (!options.loadcount || options.reload) {
					tasks[key] = function(next) {

						that.loadScript(options.path, function() {

							// Set reload to false
							options.reload = false;

							// Increase the loadcount
							options.loadcount++;

							next(null, true);
						});
					};
				}
			});

			async.series(tasks, function(err, result) {

				console.log('Scripts have been loaded');
				console.log(result);

				if (callback) callback();

			});
		};
	});

	Hawkejs.Scene = Scene;
};