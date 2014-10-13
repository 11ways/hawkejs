module.exports = function hawkejsSceneClass(Hawkejs, Blast) {

	var loadedPaths = {};

	/**
	 * One Scene instance is created on the client side only,
	 * and is valid the entire time the tab is open.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Scene = Blast.Classes.Informer.extend(function Scene(parent) {

		// Call the Informer constructor
		Scene.super.call(this);

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

		// Exposed variables
		this.exposed = {};

		// Live HTMLCollection of x-hawkejs elements
		this.elements = document.getElementsByTagName('x-hawkejs');

		// Live HTMLCollection of anchors to ajaxify
		this.newLinks = document.getElementsByClassName('js-he-link');

		// Live HTMLCollection to new blocks
		this.newBlocks = document.getElementsByClassName('js-he-newblock');

		// Get the title element
		this.pageTitleElement = document.getElementsByTagName('title');

		// Get the <html> DOM object
		this[0] = document.head.parentElement;

		// To get a prettier output in the browser console
		this.length = 1;

		// Listen to readyState changes of the document
		document.addEventListener('readystatechange', onReadystatechange.bind(this));
	});

	/**
	 * Get the source code representation of this object
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Scene.setMethod(function toSource() {

		var src = '(function(){';
		src += 'var a = new Hawkejs.Scene();';
		src += 'a.scripts = ' + this.scripts.toSource() + ';';
		src += 'return a;';
		src += '}())';

		return src;
	});

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

		if (document.readyState == 'complete') {
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

		// Make sure there is a title element
		if (!this.pageTitleElement.length) {
			document.head.appendChild(document.createElement('title'));
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
		makeReady.call(this);

		// Remember it is ready
		this.loaded = true;

		// Ajaxify any links we missed
		this.ajaxify();

		// Emit the loaded event
		this.emit('loaded');
	};

	/**
	 * Get the HTML element of a certain block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name      The name of the block to get
	 * @param    {String}   origin    The optional template to match
	 */
	Scene.setMethod(function getBlockElement(name, origin) {

		var el,
		    i;

		for (i = 0; i < this.elements.length; i++) {
			el = this.elements[i];

			// Skip non blocks
			if (el.getAttribute('data-type') !== 'block') {
				continue;
			}

			if (el.getAttribute('data-name') == name) {

				// If the origin is important, make sure it matches
				if (origin && el.getAttribute('data-origin') != origin) {
					continue;
				}

				return el;
			}
		}

		return false;
	});

	/**
	 * Register the server-side render on the client
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Scene.setMethod(function registerRender(options) {

		var that = this;

		if (!this.ready) {
			// Delay this method if the document is not ready yet
			this.afterOnce('ready', this.registerRender.bind(this, options));
			return;
		}

		// Expose variables
		Object.assign(this.exposed, options.exposeToScene);

		Function.parallel(function loadScripts(next) {
			// Get scripts
			that.handleScripts(options, next);
		}, function loadStyles(next) {
			// Get styles
			that.handleStyles(options, next);
		}, function done(err) {

			if (err != null) {
				throw err;
			}

			// General handling of links, titles, emitting events, ...
			that.generalPostRender(options);

			// Increase the rendercount
			that.renderCount++;
		});
	});

	/**
	 * Emit events for created blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}   renderData
	 */
	Scene.setMethod(function emitCreated(renderData) {

		var that = this,
		    blockName,
		    data,
		    type,
		    el;

		if (!renderData.blocks) {
			return;
		}

		// Set the template this body comes from
		if (!document.body.getAttribute('data-origin')) {

			blockName = renderData.lastTemplate + '__main__';

			// Set the template origin
			document.body.setAttribute('data-origin', renderData.lastTemplate);

			// Set the name
			document.body.setAttribute('data-name', blockName);

			type = {
				type     : 'create',
				category : 'block',
				name     : blockName,
				template : renderData.lastTemplate,
				variables: renderData.variables,
				default  : false,
				root     : true
			};

			data = {
				name     : type.name,
				template : type.template,
				default  : false
			}

			console.log('Emitting ', type, document.body);
			that.emit(type, document.body, data);
		}

		// Emit an event for every new x-hawkejs block added to the DOM
		while (this.newBlocks.length) {

			// Get the first element
			el = this.newBlocks[0];

			type = {
				type     : 'create',
				category : 'block',
				name     : el.getAttribute('data-name'),
				template : el.getAttribute('data-origin'),
				variables: renderData.variables,
				default  : el.getAttribute('data-default-content') == 'true'
			};

			data = {
				name     : type.name,
				template : type.template,
				default  : type.default
			};

			// No matter what: remove the js-he-newblock classname,
			// so the element gets removed from the live HTMLCollection
			el.className = el.className.replace(/\bjs-he-newblock(?!-)\b/g, '');

			// Emit the created event
			console.log('Emitting ', type, el)
			that.emit(type, el, data);
		}

		// Emit an event for every x-hawkejs block that gets new content
		Blast.Bound.Object.each(renderData.blocks, function eachBlock(block, name) {

			var el = that.getBlockElement(name),
			    type;

			// If we couldn't find the block, it was not created
			if (!el) {
				console.log('Skipping ', block)
				return;
			}

			type = {
				type     : 'set',
				category : 'block',
				name     : name,
				template : block.template,
				variables: renderData.variables,
				default  : false
			};

			// Emit the set event
			console.log('Emitting ', type, el)
			that.emit(type, el, block);
		});
	});

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
	Scene.setMethod(function openUrl(href, get, post, callback) {

		var that = this,
		    url,
		    xhr;

		// Create an url object
		url = Blast.Classes.URL.parse(href);
		Blast.Bound.URL.addQuery(url, get);

		// Create the request
		xhr = new XMLHttpRequest();

		// Set the ajax handler
		xhr.onreadystatechange = function onAjaxStateChange() {

			var response,
			    reader;

			if (!(this.readyState == 4 && this.status == 200)) {
				return;
			}

			response = this.response;
			reader = new FileReader();

			reader.onloadend = function onReaderLoadend() {
				var result = reader.result;

				if (response.type.indexOf('json') > -1) {
					// @todo: add difference between regular & dry json
					result = JSON.undry(result);
				}

				that.serverResponse(url, result, xhr);
			};

			reader.readAsText(xhr.response);
		};

		if (post != null) {
			xhr.open('POST', Blast.Bound.URL.toString(url));
		} else {
			xhr.open('GET', Blast.Bound.URL.toString(url));
		}

		// Always get the response as a blob
		xhr.responseType = 'blob';

		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		xhr.setRequestHeader('x-hawkejs-request', true);

		// Emit the AJAX event before starting the request
		this.emit({type: 'ajax', state: 'begin'}, xhr, url, post);

		// Initialize the request
		if (post != null) {
			xhr.setRequestHeader('Content-type', 'application/json');
			xhr.send(JSON.stringify(post));
		} else {
			xhr.send();
		}
	});

	/**
	 * Handle an AJAX response from the server
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {URL}            url        The requesting URL
	 * @param    {Object}         payload
	 * @param    {XMLHttpRequest} xhr
	 */
	Scene.setMethod(function serverResponse(url, payload, xhr) {

		var that = this,
		    viewRender;

		Function.series(function renderPayload(next) {
			viewRender = hawkejs.render(payload, next);
		}, function afterRender(nextSeries) {

			Function.parallel(function loadScripts(next) {
				that.handleScripts(viewRender, next);
			}, function loadStyles(next) {
				that.handleStyles(viewRender, next);
			}, function setAttributes(next) {

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

				next();
			}, function doneParallel(err) {
				nextSeries(err);
			});
		}, function done(err) {

			if (err != null) {
				throw err;
			}

			that.generalPostRender(viewRender);
		});
	});

	/**
	 * General post-render handling
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {ViewRender}   viewRender    (Server only sends object)
	 */
	Scene.setMethod(function generalPostRender(viewRender) {

		// If the title is not null
		if (viewRender.pageTitle != null) {
			this.setPageTitle(viewRender.pageTitle);
		}

		// Ajaxify all the anchor links
		this.ajaxify();

		// Emit the created events
		this.emitCreated(viewRender);
	});

	/**
	 * Set the title of this page
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   title
	 */
	Scene.setMethod(function setPageTitle(title) {
		this.pageTitleElement[0].innerHTML = title;
	});

	/**
	 * Handle scripts after a viewRender is finished
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {ViewRender}   viewRender
	 */
	Scene.setMethod(function handleScripts(viewRender, callback) {

		var that = this,
		    scripts;

		scripts = viewRender.scripts || [];

		scripts.forEach(function eachScript(parameters, index) {
			// Register all the scripts
			that.queueScript.apply(that, parameters);
		});

		// Load all queued scripts
		this.loadQueuedScripts(callback);
	});

	/**
	 * Handle styles after a viewRender is finished
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {ViewRender}   viewRender
	 */
	Scene.setMethod(function handleStyles(viewRender, callback) {

		var that = this,
		    styles = viewRender.styles,
		    tasks;

		if (!Array.isArray(styles) || styles.length === 0) {
			return Blast.setImmediate(callback);
		}

		tasks = new Array(styles.length);

		styles.forEach(function eachStyle(parameters, index) {
			tasks[index] = function doStyle(next) {
				that.enableStyle(parameters[0], parameters[1], next);
			};
		});

		// Unlike scripts, styles should be loaded parallel
		Function.parallel(tasks, callback);
	});

	/**
	 * Enable a style
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   instructions   The id or path to the script
	 * @param    {Object}   options
	 */
	Scene.setMethod(function enableStyle(instructions, options, callback) {

		var that = this,
		    blockName,
		    style,
		    tasks,
		    path,
		    data,
		    i;

		if (typeof options === 'string') {
			blockName = options;
		}

		if (!options || typeof options !== 'object') {
			options = {};

			if (blockName) {
				options.originBlock = blockName;
			}
		}

		// Handle arrays of styles in parallel
		if (Array.isArray(instructions)) {
			tasks = [];

			instructions.forEach(function eachStyle(instruction) {
				tasks.push(function loadStylePath(next) {
					that.enableStyle(instruction, options, next);
				});
			});


			Blast.Bound.Function.parallel(tasks, callback);
			return;
		}

		// At this point 'instructions' will no longer be an array
		path = instructions;

		// Normalize the path
		if (path[0] == '/') {
			if (path[1] != '/') {
				path = Blast.Bound.String.beforeLast(this.hawkejs.root, '/') + path;
			}
		} else {
			path = this.hawkejs.root + this.hawkejs.stylePath + path;
		}

		if (!Blast.Bound.String.endsWith(path, '.css')) {
			path += '.css';
		}

		// Make sure the entry exists in the styles object
		if (!this.styles[path]) {
			this.styles[path] = {
				blocks: {},
				element: null
			};
		}

		data = this.styles[path];

		// Register this style under the given block
		blockName = options.originBlock || 'manual';

		data.blocks[blockName] = true;

		// Create the element if we haven't done so already
		if (!data.element) {

			// Create the style element
			style = document.createElement('link');

			// Set the needed attributes
			style.setAttribute('rel', 'stylesheet');
			style.setAttribute('href', path);

			// Set the onload event
			style.onload = function onStyleLoad() {
				if (callback != null) callback();
			};

			// Add it to the document
			document.head.appendChild(style);

			data.element = style;

			// Remember this path has been loaded
			loadedPaths[path] = true;
		}

		// If this style was disabled in the past, re-enable it
		if (data.element.hasAttribute('disabled')) {
			data.element.removeAttribute('disabled');
		}
	});

	/**
	 * Disable a style
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   instructions   The id or path to the script
	 * @param    {Object}   options
	 */
	Scene.setMethod(function disableStyle(instructions) {

		var path,
		    data,
		    i;

		if (Array.isArray(instructions)) {
			for (i = 0; i < instructions.length; i++) {
				this.disableStyle(instructions[i]);
			}
			return;
		}

		path = instructions;

		// Normalize the path
		if (path[0] == '/') {
			if (path[1] != '/') {
				path = this.hawkejs.root + path;
			}
		} else {
			path = this.hawkejs.root + this.hawkejs.stylePath + path;
		}

		if (!Blast.Bound.String.endsWith(path, '.css')) {
			path += '.css';
		}

		data = this.styles[path];

		if (!data || !data.element) {
			return;
		}

		data.element.setAttribute('disabled', 'disabled');
	});

	/**
	 * Load a script and call the callback once it's executed
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   path       The id or path to the script
	 * @param    {Boolean}  force      Force a reload if already loaded?
	 * @param    {Function} callback
	 */
	Scene.setMethod(function getScript(path, force, callback) {

		var that = this,
		    script,
		    tasks;

		if (typeof force === 'function') {
			callback = force;
			force = false;
		}

		// Handle arrays of scripts in series
		if (Array.isArray(path)) {
			tasks = [];

			path.forEach(function eachScript(path) {
				tasks.push(function loadScriptPath(next) {
					that.getScript(path, force, next);
				});
			});

			Blast.Bound.Function.series(tasks, callback);
			return;
		}

		// Normalize the path
		if (path[0] == '/') {
			if (path[1] != '/') {
				path = Blast.Bound.String.beforeLast(this.hawkejs.root, '/') + path;
			}
		} else {
			path = this.hawkejs.root + this.hawkejs.scriptPath + path;
		}

		if (!Blast.Bound.String.endsWith(path, '.js')) {
			path += '.js';
		}

		// See if it has already been loaded
		if (!force && loadedPaths[path]) {
			Blast.setImmediate(callback);
			return;
		}

		// Create the actual element
		script = document.createElement('script');

		// Set the source attribute
		script.src = path;

		// Set the onload event
		script.onload = function onScriptLoad() {
			loadedPaths[path] = true;
			if (callback) callback();
		};

		// Add it to the head
		document.head.appendChild(script);
	});

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
	Scene.setMethod(function setStylesheet(path, enable) {

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
	});

	/**
	 * Queue a script for loading in the current scene,
	 * should only be called by Scene itself.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Array}    instructions
	 * @param    {Object}   options
	 */
	Scene.setMethod(function queueScript(instructions, options) {

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

		// Store the instructions inside the options too
		if (!options.instructions) {
			options.instructions = instructions;
		}

		// Load them in series by default
		if (typeof options.series === 'undefined') {
			options.series = true;
		}

		// Add an id if none is set yet
		if (!options.id) {
			options.id = Blast.Bound.Object.checksum(options.instructions);
		}

		console.log(this.scripts);

		// First go over every script to see if it is unique
		this.scripts.every(function everyScript(item, key) {

			if (options.id == item.id || Blast.Bound.Object.alike(options.instructions, item.instructions)) {
				if (options.reload) {
					item.reload = true;
				}

				shouldBeAdded = false;

				// Stop "every" loop
				return false;
			}
		});

		if (shouldBeAdded) {
			console.log('%c[DEBUG]', 'color:red;font-weight:bold;', 'Should add ', shouldBeAdded, options);
			this.scripts.set(options.id, options, options.weight);
		}
	});

	/**
	 * Load all the not-yet-loaded scripts in the queue
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Function}   callback   Function to be called after they have loaded
	 */
	Scene.setMethod(function loadQueuedScripts(callback) {

		var that  = this,
		    tasks = {};

		// Get all the ordered scripts from the hashmap
		this.scripts.forEach(function eachScriptGroup(options, key, index, internalItem) {

			var flowHandler,
			    subTasks;

			if (typeof options.loadcount !== 'number') {
				options.loadcount = 0;
			}

			if (options.series) {
				flowHandler = Blast.Bound.Function.series;
			} else {
				flowHandler = Blast.Bound.Function.parallel;
			}

			// Schedule request if loudcount is zero or reload is wanted
			if (!options.loadcount || options.reload) {

				subTasks = {};

				// Create subtasks for every entry in the instructions
				// We do this because these can be in series OR parallel
				options.instructions.forEach(function eachInstruction(instruction) {
					subTasks[instruction] = function getInstruction(next_subtask) {
						that.getScript(instruction, function doneLoadingInstruction() {
							next_subtask();
						});
					};
				});

				// Schedule this task, which will happen asynchronously
				tasks[key] = function doLoadScript(next) {

					flowHandler(subTasks, function doneLoadingScript() {

						// Set reload to false
						options.reload = false;

						// Increase the loadcount
						options.loadcount++;

						next(null, true);
					});
				};
			}
		});

		Blast.Bound.Function.parallel(tasks, function(err, result) {

			console.log('Scripts have been loaded');
			console.log(result);

			if (callback) callback();

		});
	});

	/**
	 * Make all hawkejs links & forms use AJAX
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.2
	 * @version  1.0.0
	 */
	Scene.setMethod(function ajaxify() {

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
	});

	// To get a prettier output in the browser console
	Scene.setMethod(function slice(){});
	Scene.setMethod(function splice(){});

	Hawkejs.Scene = Scene;
};