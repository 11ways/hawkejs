module.exports = function hawkejsSceneClass(Hawkejs, Blast) {

	var async = require('async');

	/**
	 * One Scene instance is created on the client side only,
	 * and is valid the entire time the tab is open.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Scene = Hawkejs.create(function Scene() {

		this.init = function init(parent) {

			// The parent Hawkejs instance
			this.hawkejs = parent;

			// Is the document ready (interactive)
			this.ready = false;

			// Is the document loaded (complete)
			this.loaded = false;

			// The amount of renders
			this.renderCount = 0;

			// The loaded scripts
			this.scripts = new Hawkejs.Blast.Classes.Deck();
			this.styles = {};

			// Live list of anchors to ajaxify
			this.newLinks = document.getElementsByClassName('js-he-link');

			// Get the <html> DOM object
			this[0] = document.children[0];

			// Listen to readyState changes of the document
			document.addEventListener('readystatechange', onReadystatechange.bind(this));
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
		 * Listen to the readystate changes of the `document`
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		function onReadystatechange(e) {

			if (!(e instanceof Event)) {
				throw new TypeError('Invalid event was given');
			}

			if (document.readyState == 'interactive') {
				makeReady.call(this);
			}

			if (document.readystate == 'complete') {
				makeLoaded.call(this);
			}
		};

		/**
		 * React to the ready/interactive state of the document
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		function makeReady() {

			// Never do this twice
			if (this.ready) {
				return;
			}

			// Remember it is ready
			this.ready = true;

			// Emit the ready event
			this.emit('ready');
		};

		/**
		 * React to the loaded/complete state of the document
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		function makeLoaded() {

			// Never do this twice
			if (this.loaded) {
				return;
			}

			// Run makeReady just in case it missed
			this.makeReady();

			// Remember it is ready
			this.loaded = true;

			// Ajaxify any links we missed
			this.ajaxify();

			// Emit the loaded event
			this.emit('loaded');
		};

		/**
		 * Register a render on the client side
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.registerRender = function registerRender(options) {

			var that,
			    scripts,
			    styles;

			if (!this.ready) {
				// Delay this method if the document is not ready yet
				this.afterOnce('ready', this.registerRender.bind(this, options));
				return;
			}

			that = this;
			scripts = options.scripts;
			styles = options.styles;

			scripts.forEach(function(parameters, index) {
				// Register all the scripts
				that.queueScript.apply(that, parameters);
			});

			// Load all queued scripts
			this.loadQueuedScripts();

			// Ajaxify all the anchor links
			this.ajaxify();

			// Increase the rendercount
			this.renderCount++;
		};

		/**
		 * Browse to a link using AJAX.
		 * The response will be an item this client needs to render.
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.1
		 * @version  0.1.2
		 *	
		 * @param    {String}    href        The url to go to
		 * @param    {Object}    get         The data to send as GET parameters
		 * @param    {Object}    post        The data to send as POST parameters
		 * @param    {Function}  callback    The function to callback to (with payload)
		 */
		this.openUrl = function openUrl(href, get, post, callback) {

			var that = this,
			    url,
			    xhr;

			url = Blast.Classes.URL.parse(href);
			Blast.Bound.URL.addQuery(url, get);

			function handleResponse(payload, textStatus, xhr) {

				var viewRender;

				viewRender = hawkejs.render(payload, function clientRenderDone(err) {

					var blockName,
					    element,
					    blocks,
					    block,
					    html;

					blocks = viewRender.blocks;

					// Iterate over every finished block
					for (blockName in blocks) {

						// Get the block
						block = blocks[blockName];

						// Get the html
						html = ''+(block||'<b>Error ' + blockName + '</b>');

						// Get the HTMLElement from inside the root
						element = viewRender.getBlockElement(blockName);

						// No element was found for this block, so we're skipping it
						if (!element) {
							continue;
						}

						element.innerHTML = html;

						// Set the attribute if default content was used
						if (block.usingDefaultContent) {
							element.setAttribute('data-default-content');
						} else {
							element.removeAttribute('data-default-content');
						}

						// @todo: this is not so for every block,
						// only the main template name is kept. That is WRONG
						// and should be fixed ASAP
						element.setAttribute('data-origin', viewRender.mainTemplate);
					}

					that.ajaxify();
				});
			};

			// Create the request
			xhr = new XMLHttpRequest();

			// Set the ajax handler
			xhr.onreadystatechange = function onAjaxStateChange() {

				var that = this,
				    response,
				    reader;

				if (!(this.readyState == 4 && this.status == 200)) {
					return;
				}

				response = this.response;
				reader = new FileReader();

				reader.onloadend = function onReaderLoadend() {
					var result = reader.result;

					if (response.type.indexOf('json') > -1) {
						result = JSON.parse(result);
					}

					handleResponse(result, that.status, that);
				};

				console.log(this.response);

				reader.readAsText(this.response);

			};

			console.log(url);

			xhr.open('GET', Blast.Bound.URL.toString(url));

			// Always get the response as a blob
			xhr.responseType = 'blob';

			xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			xhr.setRequestHeader('x-hawkejs-request', true);
			xhr.send();

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
				this.scripts.set(options.id, options, options.weight);
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

		/**
		 * Make all hawkejs links & forms use AJAX
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.2
		 * @version  1.0.0
		 */
		this.ajaxify = function ajaxify() {
console.time('ajaxify');
			var that = this,
			    i;

			// Do this as long as there are elements in the live HTMLCollection
			while (this.newLinks.length) {

				// Only do this to anchors that have a HREF
				if (this.newLinks[0].href) {

					this.newLinks[0].addEventListener('click', function(e) {

						console.log('User clicked on anchor:', this);
						console.log('Href is:', this.href);

						// Prevent the browser from handling the link
						e.preventDefault();


						that.openUrl(this.href);
					});
				}

				// No matter what: remove the js-he-link classname,
				// so the element gets removed from the live HTMLCollection
				this.newLinks[0].className = this.newLinks[0].className.replace(/\bjs-he-link(?!-)\b/g, '');
			}

console.timeEnd('ajaxify');
		};

		/**
		 * Make all hawkejs links & forms use AJAX
		 * Test 21 anchors: 4.3ms - 0.98ms
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.2
		 * @version  1.0.0
		 */
		this.ajaxifyo = function ajaxify() {

console.time('ajaxify');
			var that = this;

			// Make all hawkejs links ajaxable
			$('[data-hawkejs="link"]:not([href=""]):not([data-hawkejs-ajaxified])').click(function captureHawkejsLinks(e) {

				var $this = $(this),
				    url;

				// Prevent the browser from handling the link
				e.preventDefault();

				// Get the wanted url
				url = $this.attr('href');

				// Go to the page, and afterwards store the payload in the history
				that.goToAjaxViewWithHistory(url);

				// Set the ajaxified boolean on this element
				$this.attr('data-hawkejs-ajaxified', true);
			});
console.timeEnd('ajaxify');
		};

		// To get a prettier output in the browser console
		this.slice = function slice(){};
		this.splice = function splice(){};
		this.length = 1;
	}, {also: Blast.Classes.Informer});

	Hawkejs.Scene = Scene;
};