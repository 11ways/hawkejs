module.exports = function hawkejsSceneClass(HawkejsNS, Blast) {

	var weak_properties = new WeakMap(),
	    loadedPaths = {},
	    loadedNames = {},
	    loadingPaths = {},
	    loadingNames = {},
	    Function = Blast.Bound.Function,
	    Hawkejs  = HawkejsNS.Hawkejs;

	/**
	 * One Scene instance is created on the client side only,
	 * and is valid the entire time the tab is open.
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.1
	 *
	 * @param    {Hawkejs}   parent
	 * @param    {Object}    options
	 */
	var Scene = Function.inherits('Informer', 'Hawkejs', function Scene(parent, options) {

		var helper,
		    name;

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

		// Live data bindings
		this.live_bindings = {};

		// The loaded scripts
		this.scripts = new Blast.Classes.Deck();

		this.styles = {};

		// Exposed variables
		this.exposed = {};

		// Diversion functions
		this.diversions = {};

		// Assign slots
		this.assigns = {};

		this.loadedNames = loadedNames;
		this.loadedPaths = loadedPaths;
		this.loadingPaths = loadingPaths;
		this.loadingNames = loadingNames;

		// Live HTMLCollection of live elements
		this.live_elements = document.getElementsByTagName('he-bound');

		// Live HTMLCollection of x-hawkejs elements
		this.elements = document.getElementsByClassName('x-hawkejs');

		// Live HTMLCollection of anchors to ajaxify
		this.newLinks = document.getElementsByClassName('js-he-link');

		// Live HTMLCollection of forms to ajaxify
		this.newForms = document.getElementsByClassName('js-he-form');

		// Live HTMLCollection to new blocks
		this.newBlocks = document.getElementsByClassName('js-he-newblock');

		// Live collection to dialog wrappers
		this.dialogWrappers = document.getElementsByClassName('js-he-dialog-wrapper');

		// Get the title element
		this.pageTitleElement = document.getElementsByTagName('title');

		// Get the <html> DOM object
		this[0] = document.head.parentElement;

		// To get a prettier output in the browser console
		this.length = 1;

		// Is there a connection?
		this.online = null;

		this.enableClientRender = true;

		this.helpers = {};

		// Stored states
		this.states = [];

		// Create link to the state instance
		this.status = Blast.state;

		for (key in Hawkejs.helpers) {
			helper = Hawkejs.helpers[key];

			if (helper.onScene != null) {
				helper.onScene(this, options);
			}
		}

		if (options) {
			this.registerRender(options);
		}

		// Emit this scene is being made
		Blast.emit('hawkejs_scene', this);

		// Listen to readyState changes of the document
		document.addEventListener('readystatechange', onReadystatechange.bind(this));
	});

	/**
	 * Are we online?
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.3.0
	 * @version  1.3.0
	 *
	 * @type     {Boolean}
	 */
	Scene.setProperty(function online() {
		return this.status.online;
	});

	/**
	 * Is the current tab visible?
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.3.0
	 * @version  1.3.0
	 *
	 * @type     {Boolean}
	 */
	Scene.setProperty(function is_visible() {
		return this.status.is_visible;
	});

	/**
	 * Prepare the bottom element property
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Scene.prepareProperty(function bottomElement() {
		return document.getElementsByClassName('js-he-bottom')[0];
	});

	/**
	 * Listen to the readystate changes of the `document`
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
	 * Register diversion functions
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name      The name of the block to get
	 * @param    {Function} fnc
	 */
	Scene.setMethod(function registerDiversion(name, fnc) {

		if (typeof name == 'function') {
			fnc = name;
			name = fnc.name;
		}

		if (!name) {
			throw new Error('Diversion function does not have a valid name');
		}

		this.diversions[name] = fnc;
	});

	/**
	 * Get the HTML element of a certain block
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.0
	 *
	 * @param    {String}   name      The name of the block to get
	 * @param    {String}   origin    The optional template to match
	 *
	 * @return   {HTMLElement}
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
				if (origin) {

					if (typeof origin == 'string') {
						if (el.getAttribute('data-origin') != origin) {
							continue;
						}
					} else if (!origin.contains(el)) {
						continue;
					}
				}

				return el;
			}
		}

		return false;
	});

	/**
	 * Register the server-side render on the client.
	 * Client-side renders only execute the generalPostRender method.
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.4
	 *
	 * @param    {Object}   options
	 */
	Scene.setMethod(function registerRender(options) {

		var that = this,
		    element,
		    name,
		    temp,
		    url;

		// Create a view instance
		if (!this.generalView) {
			this.generalView = new HawkejsNS.ViewRender(that.hawkejs, true);

			// Link the helpers
			this.helpers = this.generalView.helpers;

			// Expose variables
			Blast.Bound.Object.assign(this.exposed, options.exposeToScene);
		}

		if (!this.ready) {
			// Delay this method if the document is not ready yet
			this.afterOnce('ready', this.registerRender.bind(this, options));
			return;
		}

		if (!options.base_time) {
			options.base_time = Date.now();
		}

		if (options.request) {
			url = options.request.url;
		}

		temp = {
			instance : {
				payload : options,
				url     : url
			}
		};

		temp.dried = Blast.Collection.JSON.dry(temp.instance);

		// Store this as the first state
		this.states.push(temp);

		this.enableClientRender = options.enableClientRender;

		// If there was an internal redirect, change the url to reflect it
		if (this.exposed.redirected_to) {
			// @TODO: clean this up
			history.pushState(null, null, this.exposed.redirected_to);
		}

		// See if we need to fix custom elements
		if (options.variables.__he_elements && options.variables.__he_elements.length) {
			// This shouldn't take too long, unless lots of debug data is set
			Blast.Bound.Object.walk(options.variables, function eachEntry(value, key, parent) {
				if (value && typeof value == 'object' && value.__delay_undry) {
					parent[key] = value.__delay_undry();
				}
			});
		}

		// Inject the server-side viewrender data
		Blast.Bound.Object.assign(this.generalView, options);

		Blast.emit('hawkejs_registered');

		Function.parallel(false, function loadScripts(next) {
			// Get scripts
			that.handleScripts(options, next);
		}, function loadStyles(next) {
			// Get styles
			that.handleStyles(options, function handledStyles(err) {

				if (err) {
					if (console) console.error('Failed to handle styles:', err);
				}

				next();
			});
		}, function done(err) {

			if (err != null) {
				throw err;
			}

			that.attachHistoryListener();

			// General handling of links, titles, emitting events, ...
			that.generalPostRender(options);

			// Increase the rendercount
			that.renderCount++;
		});
	});

	/**
	 * Attach the history popstate listener to the window
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Scene.setMethod(function attachHistoryListener() {

		var hash = location.hash,
		    that = this;

		// Listen to the "popstate" event,
		// which happends when the back or forward button is pressed,
		// but also when a hashchange happens
		window.addEventListener('popstate', function onPopstate(e) {

			var viewRender,
			    content,
			    payload,
			    i;

			// If the state is found, we can use that to recreate the page
			if (e.state) {

				// Get the content
				content = e.state.content;

				// Unzip the content if needed
				if (e.state.zipped) {
					content = Blast.Collection.String.decompressFromUTF16(content);
				}

				// Parse the JSON content
				content = Blast.Collection.JSON.undry(content);

				// @TODO: implement better way of getting rid of dialogs & remove event
				if (content.payload && content.payload.base_time) {
					for (i = that.dialogWrappers.length - 1; i >= 0; i--) {
						if (that.dialogWrappers[i].dataset.added >= content.payload.base_time) {
							that.dialogWrappers[i].remove();
							that.emit('dialog_close');
							that.emit({type: 'remove', category: 'dialog'});
						}
					}
				}

				Function.series(false, function preRenderEvent(next) {
					that.emit('preHistory', content, next);
				}, function renderPayload(next) {
					viewRender = hawkejs.render(content.payload, next);
				}, function afterRender(next) {
					that.applyRenderResult(viewRender, content.payload, next);
				}, function finished(err) {
					if (err) {
						throw err;
					}
					that.emit('postHistory', content, viewRender);
				});
			} else {

				var returnLocation,
				    old_hash = hash;

				// Overwrite the old hash
				hash = location.hash;

				// Just emit a hash change event, don't reload the url
				if (hash) {
					return that.emit('hashchange', hash, old_hash);
				}

				// It wasn't found, so we'll just have to re-request the page
				// without adding it to the history again, of course

				// Get the wanted location
				returnLocation = history.location || document.location;

				// @TODO dialog closing and remove event
				for (i = 0; i < that.dialogWrappers.length; i++) {
					that.dialogWrappers[i].remove();
					that.emit('dialog_close');
					that.emit({type: 'remove', category: 'dialog'});
				}

				// Go there
				// @todo: don't add this to the history again!
				that.openUrl(returnLocation);
			}
		});
	});

	/**
	 * Emit events for created blocks
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.0
	 *
	 * @param    {Object}   renderData
	 */
	Scene.setMethod(function emitCreated(renderData) {

		var that = this,
		    blockName,
		    template,
		    scripts,
		    list,
		    data,
		    type,
		    fnc,
		    el,
		    i;

		scripts = [];
		list = [];

		if (renderData.inlineEvents) {
			for (i = 0; i < renderData.inlineEvents.length; i++) {
				that.emit.apply(that, renderData.inlineEvents[i].args);
			}
		}

		if (renderData.scripts && renderData.scripts.length) {
			for (i = 0; i < renderData.scripts.length; i++) {
				scripts = scripts.concat(renderData.scripts[i][0]);
			}
		}

		// Set the template this body comes from
		if (!document.body.getAttribute('data-origin')) {

			template = renderData.lastTemplate;

			if (!template) {
				console.warn('No lastTemplate rendered found?');
			} else {

				let type,
				    data;

				blockName = template.name + '__main__';

				// Make sure history was not explicitly disabled
				if (renderData.history !== false) {
					// Set the template origin
					document.body.setAttribute('data-template', template.name);

					// Set the name
					document.body.setAttribute('data-name', blockName);

					// Set the active theme
					document.body.setAttribute('data-theme', template.activeTheme);
				}

				type = {
					type     : 'create',
					category : 'block',
					name     : blockName,
					template : template.name,
					default  : false,
					root     : true
				};

				data = {
					name     : type.name,
					template : type.template,
					default  : false
				}

				that.hawkejs.require(scripts, function requiredScripts() {
					that.emit(type, document.body, renderData.variables, data);
				});
			}
		}

		// Emit an event for every new x-hawkejs block added to the DOM
		Function.while(function test() {
			return that.newBlocks.length > 0;
		}, function doTask(next) {

			var type,
			    data,
			    el;

			// Get the first element
			el = that.newBlocks[0];

			type = {
				type     : 'create',
				category : 'block',
				name     : el.getAttribute('data-name'),
				target   : el.getAttribute('data-target'),
				template : el.getAttribute('data-template'),
				entry    : el.getAttribute('data-entry-template'),
				theme    : el.getAttribute('data-theme') || 'default',
				default  : el.getAttribute('data-default-content') == 'true'
			};

			data = {
				name     : type.name,
				target   : type.target,
				template : type.template,
				entry    : type.entry,
				variables: renderData.variables,
				default  : type.default
			};

			// No matter what: remove the js-he-newblock classname,
			// so the element gets removed from the live HTMLCollection
			el.className = el.className.replace(/\bjs-he-newblock(?!-)\b/g, '');

			// Emit the created event
			that.hawkejs.require(scripts, function requiredScripts() {
				that.emit(type, el, renderData.variables, data);
			});

			next();
		});

		// Emit an event for every x-hawkejs block that gets new content
		Blast.Bound.Object.each(renderData.blocks, function eachBlock(block, name) {

				var el,
				    type,
				    temp,
				    parent,
				    category,
				    variables,
				    templatename;

				if (block.in_scope) {
					parent = document.getElementById(block.in_scope);

					if (!parent) {
						return;
					}

					el = that.getBlockElement(block.name, parent);
				} else {
					el = that.getBlockElement(name);
				}

				// If we couldn't find the block, it was not created
				if (!el) {

					el = document.getElementById(name);

					if (el) {
						block.template = null;
						variables = block.variables;
					} else {
						return;
					}
				} else {
					variables = renderData.variables;
				}

				templatename = block.template;

				if (!templatename) {
					// @todo: get name of actually used template, in case first was not found
					templatename = Blast.Bound.Object.path(block, 'origin.name.templates.0.name');
				}

				if (el.dataset.type) {
					category = el.dataset.type;
				} else {
					category = 'block';
				}

				type = {
					type     : 'set',
					category : category,
					name     : name,
					target   : el.getAttribute('data-target'),
					template : block.template || el.getAttribute('data-template'),
					entry    : el.getAttribute('data-entry-template'),
					theme    : el.getAttribute('data-theme') || 'default',
					default  : false
				};

				if (category == 'dialog') {
					that._insertDialog(type, el, variables, block);
				}

				// Don't emit just yet
				list.push({
					category  : category,
					type      : type,
					el        : el,
					variables : variables,
					block     : block
				});
		});

		// Require all the scripts
		that.hawkejs.require(scripts, function requiredScripts() {

			var entry,
			    i;

			// Emit dialogs first
			for (i = 0; i < list.length; i++) {
				entry = list[i];
				that.emit(entry.type, entry.el, entry.variables, entry.block);
			}
		});

		if (renderData.dialogOpen) {
			(function() {
				var el = document.getElementById(renderData.dialogOpen);

				if (el) {
					type = {
						type     : 'set',
						category : 'dialog',
						name     : null,
						target   : null,
						template : el.getAttribute('data-template'),
						entry    : el.getAttribute('data-entry-template'),
						theme    : el.getAttribute('data-theme') || 'default',
						default  : false
					};

					that._insertDialog(type, el, renderData.variables, renderData);

					that.hawkejs.require(scripts, function requiredScripts() {
						that.emit(type, el, renderData.variables, renderData);
					});
				}
			}());
		}

		that.emit({type: 'rendered', template: renderData.mainTemplate + ''}, renderData.variables, renderData);
	});

	/**
	 * Make an AJAX request
	 * 
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.0
	 *
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    options     Options
	 * @param    {Function}  callback    The function to callback to
	 *
	 * @return   {Pledge}
	 */
	Scene.setMethod(function fetch(href, options, callback) {

		var that = this,
		    request = new Blast.Classes.Develry.Request(),
		    pledge,
		    url;

		if (typeof href == 'object' && !(href instanceof Blast.Classes.RURL)) {
			callback = options;
			options = href;
			href = options.href;
		}

		if (typeof options == 'function') {
			callback = options;
			options = {};
		}

		if (!options) {
			options = {};
		}

		if (!callback) {
			callback = Blast.Bound.Function.thrower;
		}

		// Fix url property
		url = Blast.Classes.RURL.parse(options.url || href || options.href);

		if (Blast.isIE) {
			url.param('hajax', Date.now());
		} else {
			url.param('hajax', 1);
		}

		// Add time-on-page to post requests
		if (options.post) {
			url.param('htop', ~~Blast.performanceNow());
		}

		options.url = url;
		request.setOptions(options);

		pledge = request.start();
		pledge.xhr = request.xhr;
		pledge.request = request;

		pledge.done(function done(err, result) {

			if (err) {
				return callback(err);
			}

			callback(null, result, request.xhr);
		});

		return pledge;
	});

	/**
	 * Browse to a link using AJAX.
	 * The response will be an item this client needs to render.
	 * 
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.2.9
	 *
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    options     Options
	 * @param    {Function}  callback    The function to callback to (with payload)
	 */
	Scene.setMethod(function openUrl(href, options, callback) {

		var that = this,
		    sub_pledge,
		    pledge,
		    url;

		if (typeof href == 'object' && !(href instanceof Blast.Classes.RURL)) {
			callback = options;
			options = href;
			href = options.href;
		}

		if (typeof options == 'function') {
			callback = options;
			options = {};
		}

		if (typeof options != 'object' || options == null) {
			options = {};
		}

		if (!callback) {
			callback = Blast.Bound.Function.thrower;
		}

		this.emit('opening_url', href, options);

		if (!options.headers) {
			options.headers = {};
		}

		options.headers['x-hawkejs-request'] = true;

		url = Blast.Classes.RURL.parse(href);
		options.url = url;

		if (this.interceptOpenUrl) {
			sub_pledge = this.interceptOpenUrl(url, options);

			if (sub_pledge) {
				pledge = new Pledge();
				pledge.done(callback);

				sub_pledge.then(function resolved() {
					pledge.resolve();
				});

				// Perform the regular fetch in case something goes wrong
				sub_pledge.catch(function rejected(err) {
					let new_pledge = that.fetch(url, options);

					pledge.xhr = new_pledge.xhr;

					new_pledge.done(function done(err, result) {

						handleResult(err, result);

						if (err) {
							return pledge.reject(err);
						}

						pledge.resolve(result);
					});
				});

				return pledge;
			}
		}

		pledge = this.fetch(url, options);
		pledge.done(handleResult);

		function handleResult(err, result) {
			if (err) {
				return callback(err);
			}

			if (result) {
				that.serverResponse(url, options, result, pledge.xhr, callback);
			} else {
				callback();
			}
		}

		return pledge;
	});

	/**
	 * Render something in the context of this scene
	 * 
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.0
	 * @version  1.2.0
	 *
	 * @param    {String|ViewRender|Function}   template
	 * @param    {Object}                       variables
	 * @param    {Function}                     callback
	 *
	 * @return   {ViewRender}
	 */
	Scene.setMethod(function render(template, variables, callback) {

		var that = this,
		    view_renderer;

		if (typeof variables == 'function') {
			callback = variables;
			variables = null;
		}

		if (typeof callback != 'function') {
			callback = Function.thrower;
		}

		if (!variables) {
			variables = {};
		}

		view_renderer = hawkejs.render(template, variables, function rendered(err) {

			if (err) {
				console.log('Error rendering', template, err);
				return callback(err);
			}

			that.applyRenderResult(view_renderer, callback);
		});

		// Disable history by default when rendering manually in a scene
		view_renderer.history = variables.history || false;

		return view_renderer;
	});

	/**
	 * Serialize a form and return an object
	 * 
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.6
	 *
	 * @param    {String|HTMLElement}    form
	 *
	 * @return   {Object}
	 */
	Scene.setMethod(function serialize_form(_form) {

		var skip_types = ['file', 'reset', 'submit', 'button'],
		    named_elements,
		    form_val,
		    element,
		    value,
		    field,
		    name,
		    form,
		    data = {},
		    i,
		    j;

		if (typeof _form == 'string') {
			form = document.querySelector(_form);
		} else {
			form = _form;
		}

		result = new FormData(form);
		named_elements = form.querySelectorAll('[name]');

		for (i = 0; i < named_elements.length; i++) {
			element = named_elements[i];
			name = element.getAttribute('name');

			if (!name) {
				continue;
			}

			// Checkboxes can only be added when they are "checked"
			if (element.nodeName == 'INPUT' && element.getAttribute('type') == 'checkbox') {
				if (!element.checked) {
					continue;
				}
			}

			form_val = result.get(name);
			value = element.value;

			if (!result.has(name) || (form_val == '' && form_val !== value)) {
				result.set(name, value);
			}
		}

		return result;
	});

	/**
	 * Browse to a page by modifying window.location
	 * 
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.4
	 *
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    get         The data to send as GET parameters
	 */
	Scene.setMethod(function reload(url, get) {

		if (url == null) {
			url =  Blast.Classes.RURL.parse(window.location);
		}

		if (get != null) {
			url.addQuery(get);
		}

		if (typeof console !== 'undefined') {
			console.log('Doing a hard reload to ', url);
		}

		window.location = url.href;
	});

	/**
	 * Render the AJAX response from the server
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.0
	 *
	 * @param    {RURL}           url        The requesting URL
	 * @param    {Object}         payload
	 * @param    {XMLHttpRequest} xhr
	 * @param    {Function}       callback
	 */
	Scene.setMethod(function serverResponse(url, options, payload, xhr, callback) {

		var that = this,
		    stateContent,
		    historyUrl,
		    viewRender,
		    fallback,
		    temp_url,
		    temp;

		if (xhr) {
			// See if there is a x-history-url
			temp_url = xhr.getResponseHeader('x-history-url');
		}

		if (temp_url) {
			temp_url = decodeURI(temp_url);
		}

		// The server might tell us to use a different url for the history
		historyUrl = temp_url || url;

		// Make hashes work as expected
		if (url.hash) {
			historyUrl = historyUrl + url.hash;
		}

		if (typeof payload == 'string') {

			if (xhr) {
				fallback = xhr.getResponseHeader('x-fallback-url');

				if (fallback) {
					window.location = decodeURI(fallback);
					return;
				}
			}

			if (callback) {
				callback(new Error('Payload was not an object'), payload);
			}

			return;
		}

		// Store the render time
		payload.base_time = Date.now();

		// Make sure there is a baseId
		if (payload.baseId == null) {
			payload.baseId = payload.base_time;
		}

		// Only create stateContent if it is not explicitly turned off
		if (options.history !== false) {

			// Create a payload clone now
			stateContent = {
				url: historyUrl + '',
				requestUrl: url + '',
				payload: payload
			};

			if (that.states.length) {
				payload.previous_state = that.states.length - 1;
			}

			stateContent = Blast.Collection.JSON.dry(stateContent);

			// Store the state in the scene as a dried json string,
			// when it's needed it'll be undried on the fly
			temp = {
				dried    : stateContent,
				instance : null
			};

			that.states.push(temp);

			payload.current_state = temp;
		}

		Function.series(false, function renderPayload(next) {
			viewRender = hawkejs.render(payload, next);

			if (options.history !== false) {
				viewRender.previous_state = payload.previous_state;
				viewRender.current_state = payload.current_state;
			}

			// @TODO: clean this up
			viewRender.history = options.history;

			if (options.diversion) {
				viewRender.diversion = options.diversion;
			}

			if (options.root) {
				viewRender.root = options.root;
			}

		}, function afterRender(nextSeries) {
			that.applyRenderResult(viewRender, payload, nextSeries);
		}, function done(err) {

			var stateData,
			    isChrome,
			    hashel,
			    offset,
			    temp,
			    top;

			if (err != null) {
				if (callback) {
					return callback(err);
				} else {
					throw err;
				}
			}

			if (stateContent && viewRender.history !== false) {
				isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

				stateData = {
					content: stateContent
				};

				// if (!isChrome && stateData.content.length >= 320000) {
				// 	stateData.zipped = true;
				// 	stateData.content = Blast.Collection.String.compressToUTF16(stateData.content);
				// }

				// Register the new state
				history.pushState(stateData, null, historyUrl);
			}

			if (url.hash) {
				try {
					temp = document.querySelector(url.hash);
				} catch (err) {};
			}

			if (temp == null && viewRender.focusBlock) {
				// See if it is a selector on its own first
				try {
					temp = document.querySelector(viewRender.focusBlock);
				} catch (err) {};

				// Try it as an id second
				if (temp == null) {
					try {
						temp = document.querySelector('#' + viewRender.focusBlock);
					} catch (err) {};
				}

				if (temp == null) {
					try {
						temp = document.querySelector('[data-name="' + viewRender.focusBlock + '"]');
					} catch (err) {};
				}
			}

			// Only scroll when it's not a dialog
			if (!viewRender.dialog && options.scroll !== false) {
				if (temp != null) {
					// Scroll to the found element
					hawkejs.scene.scrollTo(temp);
				} else {
					// Scroll to the top
					hawkejs.scene.scrollTo();
				}
			}

			if (options.move_browser_focus !== false) {
				that.moveBrowserFocus(viewRender);
			}

			if (callback) {

				if (xhr && xhr.status >= 500) {
					if (payload.variables.message) {
						err = payload.variables.message;
					} else {
						err = new Error(xhr.statusText);
					}

					callback(err, viewRender);
				} else {
					callback(null, viewRender);
				}
			}
		});
	});

	/**
	 * Move the browser focus to a specific element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.4
	 * @version  1.2.4
	 *
	 * @param    {Element|ViewRender}   element   Optional element
	 */
	Scene.setMethod(function moveBrowserFocus(element) {

		var view_render,
		    blocks,
		    block,
		    i;

		// Detect viewrender instance
		if (element && element.exposeToScene != null) {
			view_render = element;
			element = null;

			// Get all created blocks
			blocks = Object.values(view_render.blocks);

			Blast.Bound.Array.sortByPath(blocks, 'block_id');

			for (i = 0; i < blocks.length; i++) {
				block = blocks[i];

				element = document.querySelector('.x-hawkejs[data-name="' + block.name + '"]');

				if (element) {
					break;
				}
			}

			if (!element) {
				return;
			}

			Blast.Classes.Element.prototype.forceFocus.call(element);
		}
	});

	/**
	 * Apply the client-side render to the current document
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.0
	 *
	 * @param    {ViewRender}   viewRender
	 * @param    {Object}       payload
	 * @param    {Function}     callback
	 */
	Scene.setMethod(function applyRenderResult(viewRender, payload, callback) {

		var that = this;

		if (typeof payload == 'function') {
			callback = payload;
			payload = null;
		}

		if (!callback) {
			callback = Function.thrower;
		}

		Function.parallel(false, function loadScripts(next) {
			that.handleScripts(viewRender, next);
		}, function loadStyles(next) {
			that.handleStyles(viewRender, function handledStyles(err) {

				if (err) {
					if (console) console.error('Failed to handle styles:', err);
				}

				next();
			});
		}, function setAttributes(next) {

			var oldElement,
			    blockName,
			    className,
			    timerId,
			    element,
			    blocks,
			    block,
			    html;

			blocks = viewRender.blocks;

			if (viewRender.dialog) {
				doBlock(viewRender.mainBlock);
			}

			// Iterate over every finished block
			for (blockName in blocks) {

				// Skip if we already did this block
				if (viewRender.dialog && viewRender.mainBlock == blockName) {
					continue;
				}

				doBlock(blockName);
			}

			function doBlock(blockName) {

				// Get the block
				block = blocks[blockName];

				if (viewRender.dialog && viewRender.mainBlock == blockName) {
					className = 'js-he-dialog';

					if (block.options.className) {
						className += ' ' + block.options.className;
					}

					if (that.bottomElement) {
						element = document.createElement('x-hawkejs');
						element.setAttribute('id', viewRender.dialogOpen);
						element.setAttribute('class', className);
						element.setAttribute('data-type', 'dialog');
						that.bottomElement.appendChild(element);
					} else {
						// @TODO: bottom element not found, show some warning?
						return;
					}
				} else if (viewRender.mainBlock == blockName && viewRender.root && viewRender.root.constructor.name == 'Placeholder') {
					element = viewRender.root.element;
				} else {

					// Get the HTMLElement from inside the root
					element = viewRender.getBlockElement(blockName);

					// No element was found for this block, so we're skipping it
					if (!element) {
						return;
					}
				}

				// Get the html
				html = String(block||'<b>Error ' + blockName + '</b>');

				if (block.options.content == 'push') {
					if (oldElement = element.lastChild) {
						oldElement.classList.add('he-old');

						// Create interval that attempts to remove the old element
						timerId = setInterval(function clearOldElement() {

							// Do nothing if the old element is still visible
							if (oldElement.isVisible()) {
								return;
							}

							// Remove the old element from the DOM
							oldElement.remove();

							// Stop the interval
							clearInterval(timerId);
						}, 2000);
					}

					// Insert the HTML at the end
					element.insertAdjacentHTML('beforeend', html);

					// Change the element
					element = element.lastChild;
				} else {
					element.innerHTML = html;
				}

				// Set the attribute if default content was used
				if (block.usingDefaultContent) {
					element.setAttribute('data-default-content');
				} else {
					element.removeAttribute('data-default-content');
				}

				// "template" is the name of the template providing the HTML
				element.setAttribute('data-template', block.origin.name);

				// "origin" is the entry point of the render
				element.setAttribute('data-origin', viewRender.mainTemplate);
			}

			next();
		}, function doGeneral(next) {
			that.generalPostRender(viewRender, next);
		}, function doneParallel(err) {
			if (callback) callback(err);
		});
	});

	/**
	 * General post-render handling
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.0
	 *
	 * @param    {ViewRender}   viewRender    (Server only sends object)
	 */
	Scene.setMethod(function generalPostRender(viewRender, callback) {

		var old_block,
		    element,
		    assign,
		    block,
		    name;

		// If the title is not null
		if (viewRender.pageTitle != null) {
			this.setPageTitle(viewRender.pageTitle);
		}

		// Merge live bindings
		Blast.Bound.Object.merge(this.live_bindings, viewRender.live_bindings);

		// Copy over the initial assign options
		// (Mainly for the css className option)
		for (name in viewRender.assigns) {
			this.assigns[name] = viewRender.assigns[name];
		}

		for (name in viewRender.blocks) {

			// Get the new block
			block = viewRender.blocks[name];

			// Get the space where this block will be assigned
			assign = this.assigns[name];

			if (!assign) {
				continue;
			}

			// Get the previously assigned block
			old_block = assign.block;

			// Store the new block
			assign.block = block;

			// Get the actual block element
			element = this.getBlockElement(name);

			if (!element) {
				continue;
			}

			// Always make sure the initial assign classname is added
			if (assign.options.className) {
				Hawkejs.addClasses(element, assign.options.className);
			}

			// If the old block assigned classnames, remove those
			if (old_block && old_block.options.className) {
				Hawkejs.removeClasses(element, old_block.options.className);
			}

			// If the newblock has classes, add those
			if (block && block.options.className) {
				Hawkejs.addClasses(element, block.options.className);
			}
		}

		// Emit the created events
		this.emitCreated(viewRender);

		// Ajaxify all the anchor links
		this.ajaxify();

		if (callback) callback(null, viewRender);
	});

	/**
	 * Set the title of this page
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.0
	 *
	 * @param    {String}   title
	 */
	Scene.setMethod(function setPageTitle(title) {

		var that = this;

		if (title && title.constructor && title.constructor.name == 'I18n') {
			title.getContent(function gotTitleContent(err) {

				if (err) {
					return;
				}

				doTitle(title);
			});
		} else {
			doTitle(title);
		}

		function doTitle(title) {

			if (typeof title != 'string') {
				title = String(title);

				if (title == '[object Object]') {
					return;
				}
			}

			title = Blast.Bound.String.stripTags(title);
			title = Blast.Bound.String.encodeHTML(title);

			that.pageTitleElement[0].innerHTML = title;
		}
	});

	/**
	 * Handle scripts after a viewRender is finished
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
	 * @author   Jelle De Loecker   <jelle@develry.be>
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

		tasks = [];

		styles.forEach(function eachStyle(parameters, index) {

			// Empty arrays mean no styles need to be loaded
			if (!parameters[0] || !parameters[0].length) {
				return;
			}

			tasks.push(function doStyle(next) {
				that.enableStyle(parameters[0], parameters[1], next);
			});
		});

		// Unlike scripts, styles should be loaded parallel.
		// The execution should start directly,
		// and not at the top of the event queue.
		// This is needed to prevent FOUC.
		Function.parallel(false, tasks, callback);
	});

	/**
	 * Enable a style
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.0
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
		    url,
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
		if (Array.isArray(instructions) && instructions.length) {
			tasks = new Array(instructions.length);

			instructions.forEach(function eachStyle(instruction, index) {
				tasks[index] = function onLoaded(next) {
					that.enableStyle(instruction, options, next);
				};
			});

			if (callback == null) {
				return;
			}

			if (tasks.length == 0) {
				return callback();
			}

			// Run the tasks in parallel, but force them to start directly,
			// and not at the top of the event queue.
			// This is needed to prevent FOUC.
			Function.parallel(false, tasks, callback);
			return;
		}

		// At this point 'instructions' will no longer be an array
		path = instructions;

		url = Blast.Classes.RURL.parse(path, this.hawkejs.root + this.hawkejs.stylePath);

		if (!url.hostname || url.usedBaseProperty('hostname')) {
			if (this.exposed.version_info) {
				url.param('v', this.exposed.version_info);
			}

			if (!Blast.Bound.String.endsWith(url.pathname, '.css')) {
				url.pathname += '.css';
			}
		}

		if (options.theme && options.theme != 'default') {
			url.param('theme', options.theme);
		}

		path = String(url);

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

			// See if this element is already somewhere on the page
			style = document.querySelector('link[href="' + path + '"]');

			if (!style) {
				// Create the style element
				style = document.createElement('link');

				// Set the needed attributes
				style.setAttribute('rel', 'stylesheet');
				style.setAttribute('href', path);

				// Set the onload event
				if (callback != null) {

					// Add onload callback
					style.onload = function onStyleLoad() {
						callback();
					};

					style.onerror = function onStyleError(event) {
						callback(new Error('Failed to load style "' + path + '"'));
					};
				}

				// Add it to the document
				document.head.appendChild(style);
			} else {
				Blast.setImmediate(callback);
			}

			data.element = style;

			// Remember this path has been loaded
			loadedPaths[path] = true;
		} else if (callback != null) {
			Blast.setImmediate(callback);
		}

		// If this style was disabled in the past, re-enable it
		data.element.removeAttribute('disabled');
		data.element.disabled = false;
	});

	/**
	 * Disable a style
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.9
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
		data.element.disabled = true;
	});

	/**
	 * Load a script and call the callback once it's executed
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.0
	 *
	 * @param    {Object}   options
	 * @param    {Boolean}  force      Force a reload if already loaded?
	 * @param    {Function} callback
	 */
	Scene.setMethod(function getScript(options, force, callback) {

		var that = this,
		    script,
		    is_url,
		    tasks,
		    path,
		    name;

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

			Blast.Bound.Function.series(false, tasks, callback);
			return;
		}

		if (typeof options == 'string') {
			name = path = options;
		} else {
			path = options.path || options.source || options.src;
			name = options.name;
		}

		// Normalize the path
		if (path.slice(0, 4) === 'http') {
			// Do nothing, path is a regular url
			is_url = true;
		} else if (path[0] == '/') {
			if (path[1] == '/') {
				is_url = true;
			} else {
				path = Blast.Bound.String.beforeLast(this.hawkejs.root, '/') + path;
			}
		} else {
			path = this.hawkejs.root + this.hawkejs.scriptPath + path;
		}

		// Only add the .js suffix if it's a local file (and not a full url)
		if (!is_url && !Blast.Bound.String.endsWith(path, '.js')) {
			path += '.js';
		}

		// See if it has already been loaded
		if (!force && (loadedPaths[path] || loadedNames[name])) {
			Blast.setImmediate(callback);
			return;
		}

		if (loadingPaths[path] || loadingNames[name]) {
			Blast.setImmediate(function() {
				that.hawkejs.require(name, callback);
			});
			return;
		}

		// Create the actual element
		script = document.createElement('script');

		// Set the source attribute
		script.src = path;

		// Indicate we've started loading this script
		loadingPaths[path] = true;
		loadingNames[name] = true;

		// Set the onload event
		script.onload = function onScriptLoad() {
			loadedPaths[path] = true;
			loadedNames[name] = true;

			// Emit an event
			that.emit({type: 'script', name: name}, name, path);

			if (callback) callback();
		};

		// Add it to the head
		document.head.appendChild(script);
	});

	/**
	 * Enable or disable a certain stylesheet file
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
			this.scripts.set(options.id, options, options.weight);
		}
	});

	/**
	 * Load all the not-yet-loaded scripts in the queue
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
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

					flowHandler(false, subTasks, function doneLoadingScript() {

						// Set reload to false
						options.reload = false;

						// Increase the loadcount
						options.loadcount++;

						next(null, true);
					});
				};
			}
		});

		Blast.Bound.Function.parallel(false, tasks, function(err, result) {
			if (callback) {
				callback(err);
			} else if (err) {
				throw err;
			}
		});
	});

	/**
	 * Make all hawkejs links & forms use AJAX
	 * 
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.2
	 * @version  1.2.4
	 */
	Scene.setMethod(function ajaxify() {

		var that = this,
		    initial_url,
		    elements,
		    link,
		    form,
		    href,
		    i;

		// Store the initial url
		initial_url = Blast.Classes.RURL.parse(document.location);

		// Get all the elements that can update the location
		elements = document.querySelectorAll('[data-update-location]');

		if (elements.forEach == null) {
			elements = Blast.Bound.Array.cast(elements);
		}

		// Iterate over those elements and add a change listener
		elements.forEach(function eachElement(element) {

			var update_values,
			    initial_value,
			    param_name,
			    key;

			if (weak_properties.get(element)) {
				return;
			}

			weak_properties.set(element, true);

			update_values = element.getAttribute('data-update-location');

			if (update_values) {
				update_values = Blast.Bound.String.decodeAttributes(update_values);

				for (key in update_values) {
					if (update_values[key] == null) {
						param_name = key;
					}
				}
			}

			if (!param_name) {
				param_name = element.getAttribute('name');
			}

			if (!param_name && !update_values) {
				return;
			}

			// If there's a param name, set the corresponding value
			if (param_name) {
				// Get the value from the current url
				initial_value = initial_url.param(param_name);

				// Don't set null when the url has no value
				if (initial_value == null && update_values) {

					// If the update_values has a value, that
					// will be seen as as the default
					initial_value = update_values[param_name];
				}

				// If it's still null, use an empty string
				if (initial_value == null) {
					initial_value = '';
				}

				element.value = initial_value;
			}

			element.addEventListener('change', function onChange(e) {

				var url_value,
				    url,
				    key;

				url = Blast.Classes.RURL.parse(document.location);

				if (param_name) {
					url_value = url.param(param_name);

					// If the value is the same, do nothing
					if (url_value == this.value) {
						return;
					}

					// Special conditions apply when the value is not in the url
					if (url_value == null) {

						// Ignore if the element value is empty
						if (this.value == '') {
							return;
						}

						// Ignore if it's the default value
						if (update_values && update_values[param_name] == this.value) {
							return;
						}
					}
				}

				for (key in update_values) {
					url.param(key, update_values[key]);
				}

				url.param(param_name, this.value);
				that.openUrl(url);
			});
		});

		if (!this.enableClientRender) {
			return;
		}

		// Do this as long as there are elements in the live HTMLCollection
		while (this.newLinks.length) {
			link = this.newLinks[0];
			href = link.href || link.getAttribute('data-href') || link.getAttribute('href');

			// Only do this to elements that have a HREF attribute
			if (href) {

				link.addEventListener('click', function onLinkClick(e) {

					var link = this,
					    options = {},
					    unlinks,
					    segment,
					    href,
					    i;

					if (e.defaultPrevented) {
						return;
					}

					// Get all "unlinking" elements
					unlinks = link.getElementsByClassName('js-he-unlink');

					// See if any element prevents any default link
					for (i = 0; i < unlinks.length; i++) {
						if (unlinks[i] == e.target || unlinks[i].contains(e.target)) {
							return;
						}
					}

					// Prevent the browser from handling the link
					e.preventDefault();

					// Get the href attribute first
					href = this.getAttribute('href');

					if (href && href[0] == '#') {

						if (link.classList.contains('js-he-close-dialog')) {
							dialog_wrapper = Hawkejs.closest(link, '.js-he-dialog-wrapper');

							if (dialog_wrapper) {
								dialog_wrapper.click();
							}

							if (href == '#') {
								return;
							}
						};

						if (href.length > 1) {
							return that.scrollTo(href);
						}
					}

					// Get a possible diversion
					options.diversion = this.getAttribute('data-divert');

					// See if the history has been turned of client-side
					if (this.getAttribute('data-history') == 'false') {
						options.history = false;
					}

					// See if scroll is enabled
					if (this.classList.contains('js-he-noscroll')) {
						options.scroll = false;
					}

					if (!this.dataset.breakSegment) {
						// @TODO: better implementation and segment route checking
						segment = Hawkejs.closest(link, '[data-segment-route]');
					}

					// Limit the change to this element
					if (segment) {
						options.history = false;
						options.root = segment;
					}

					if (!href) {
						href = this.getAttribute('data-href') || this.getAttribute('href');
					}

					that.openUrl(href, options, function done(err) {

						if (err) {
							if (typeof that.errorHandler == 'function') {
								that.errorHandler(err, {type: 'openUrl', options: options, url: href});
							} else {
								console.error(err);
							}

							return;
						}

						if (link.classList.contains('js-he-close-dialog')) {
							dialog_wrapper = Hawkejs.closest(link, '.js-he-dialog-wrapper');

							if (dialog_wrapper) {
								dialog_wrapper.click();
							}
						}
					});
				});
			}

			// No matter what: remove the js-he-link classname,
			// so the element gets removed from the live HTMLCollection
			link.classList.remove('js-he-link');
		}

		while (this.newForms.length) {
			form = this.newForms[0];

			form.addEventListener('submit', function onSubmit(e) {

				var form = this,
				    form_data = that.serialize_form(this),
				    options = {},
				    method = this.getAttribute('method');

				// Prevent the browser from refreshing the page
				e.preventDefault();

				// See if the history has been turned of client-side
				if (this.getAttribute('data-history') == 'false') {
					options.history = false;
				}

				if (!method || method.toLowerCase() == 'post') {
					options.post = form_data;
				} else {
					options.get = form_data;
				}

				that.openUrl(this.action || location.href, options, function done(err) {

					var dialog_wrapper;

					if (err) {
						return console.error(err);
					}

					if (form.classList.contains('js-he-close-dialog')) {
						dialog_wrapper = Hawkejs.closest(form, '.js-he-dialog-wrapper');

						if (dialog_wrapper) {
							dialog_wrapper.click();
						}
					}
				});
			});

			form.classList.remove('js-he-form');
		}
	});

	/**
	 * Get or set a cookie value
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.1
	 *
	 * @param    {String}   name      The name of the cookie
	 * @param    {Mixed}    value     The value of the cookie
	 * @param    {Object}   options
	 */
	Scene.setMethod(function cookie(name, value, options) {

		var cookies,
		    old;

		if (arguments.length < 2) {
			// We don't cache cookies, because they can change at any time
			cookies = Blast.Collection.String.decodeCookies(document.cookie);
		}

		if (arguments.length == 1) {
			return cookies[name];
		}

		if (arguments.length == 0) {
			return cookies;
		}

		if (options == null) options = {};

		// If the value is null or undefined, the cookie should be removed
		if (value == null) {
			options.expires = new Date(0);
		}

		if (typeof options.expires == 'number') {
			options.expires = new Date(options.expires);
		}

		if (options.secure == null) {
			if (document.location.protocol == 'https:') {
				options.secure = true;
			}
		}

		// If no path is given, default to the root path
		if (options.path == null) {

			// When deleting a cookie, make sure it is also deleted for this location
			if (value == null) {
				this.cookie(name, null, {path: document.location.pathname});
			}

			options.path = '/';
		}

		document.cookie = Blast.Collection.String.encodeCookie(name, value, options);
	});

	/**
	 * Get the scene id from a cookie or create one
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Scene.setMethod(function getSceneId() {

		var start_time,
		    cookies,
		    config,
		    entry,
		    list,
		    key;

		if (!this.sceneId) {

			// Get all the available cookies
			cookies = this.cookie();

			// Prepare an array
			list = [];

			// Get the closest start time as possible
			start_time = Blast.Bound.Object.path(window, 'performance.timing.responseStart') || (Date.now() - ~~Blast.performanceNow());

			for (key in cookies) {
				if (key.indexOf('scene_start') == -1) {
					continue;
				}

				config = cookies[key];

				list.push({
					difference: Math.abs(start_time - config.start),
					config: config,
					key: key
				});
			}

			// Sort the ascending difference
			Blast.Bound.Array.sortByPath(list, 1, 'difference');

			// The first one should be the correct one
			if (list[0]) {
				entry = list[0];
				this.sceneId = entry.config.id;

				// Now delete the cookie
				this.cookie(entry.key, null);
			} else {
				this.sceneId = Blast.Classes.Crypto.randomHex(8) || Blast.Classes.Crypto.pseudoHex();
			}

			this.sceneData = {};
		}

		return this.sceneId;
	});

	/**
	 * Scene specific data
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name      The name of the cookie
	 * @param    {Mixed}    value     The value of the cookie
	 */
	Scene.setMethod(function data(name, value) {

		this.getSceneId();

		if (arguments.length == 0) {
			return this.sceneData;
		}

		if (arguments.length == 1) {
			return this.sceneData[name];
		}

		this.sceneData[name] = value;
	});

	/**
	 * getBoundingClientRect relative to another element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {HTMLElement}   container
	 * @param    {HTMLElement}   element
	 *
	 * @return   {Object}
	 */
	Scene.setMethod(function getRelativeBoundingClientRect(container, element) {

		var parent,
		    child;

		if (!container) {
			return;
		}

		if (typeof container == 'string') {
			container = document.querySelector(container);
		}

		parent = container.getBoundingClientRect();

		if (element == null) {
			return parent;
		}

		if (typeof element == 'string') {
			element = document.querySelector(element);
		}

		child = element.getBoundingClientRect();

		return {
			bottom: parent.bottom - child.bottom,
			height: child.height,
			left: child.left - parent.left,
			right: parent.right - child.right,
			top: child.top - parent.top,
			width: child.width,
		};
	});

	/**
	 * getBoundingClientRect relative to the body
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {HTMLElement}   element
	 *
	 * @return   {Object}
	 */
	Scene.setMethod(function getAbsoluteBoundingClientRect(element) {
		return this.getRelativeBoundingClientRect(document.body, element);
	});

	/**
	 * Get scroll information on an element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.0
	 * @version  1.2.0
	 *
	 * @param    {HTMLElement}   container
	 * @param    {HTMLElement}   toElement
	 */
	Scene.setMethod(function getScrollInfo(container, toElement) {

		var change,
		    start,
		    to;

		if (arguments.length == 1) {
			toElement = container;
			container = document.body; //document.body.parentElement;
		}

		if (typeof toElement == 'string') {
			toElement = document.querySelector(toElement);
		}

		if (typeof container == 'string') {
			container = document.querySelector(container);
		}

		rect = this.getRelativeBoundingClientRect(container, toElement);

		if (!rect) {
			return;
		}

		// Used to use container.scrollTop, but that doesn't work for body
		to = container.clientTop + rect.top;
		start = container.scrollTop;
		change = to - start;

		return change;
	});

	/**
	 * Scroll to a certain element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.0
	 *
	 * @param    {HTMLElement}   container
	 * @param    {HTMLElement}   toElement
	 * @param    {Number}        duration
	 */
	Scene.setMethod(function scrollTo(container, toElement, duration) {

		var currentTime,
		    increment,
		    change,
		    start,
		    rect,
		    to;

		switch (arguments.length) {

			case 0:
				if (document.documentElement.scrollTop) {
					document.documentElement.scrollTop = 0;
				} else {
					document.body.scrollTop = 0;
				}
				return;

			case 1:
				if (this.exposed && this.exposed.default_scrollto_duration) {
					duration = this.exposed.default_scrollto_duration;
				} else {
					duration = 250;
				}

				toElement = container;
				container = document.body.parentElement;
				break;

			case 2:
				duration = toElement;
				toElement = container;
				container = document.body.parentElement;
				break;
		}

		if (typeof toElement == 'string') {
			toElement = document.querySelector(toElement);
		}

		if (typeof container == 'string') {
			container = document.querySelector(container);
		}

		rect = this.getRelativeBoundingClientRect(container, toElement);

		if (!rect) {
			return;
		}

		// Used to use container.scrollTop, but that doesn't work for body
		to = container.clientTop + rect.top;

		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1 || Blast.isIE) {
			if (container == document.body.parentElement) {
				container = document.documentElement;
			}

			if (toElement == document.body.parentElement) {
				toElement = document.documentElement;
			}
		}

		if (container.scrollTop == 0 && container == document.documentElement) {
			container.scrollTop = 1;

			if (!container.scrollTop) {
				return this.scrollTo(document.body, toElement, duration);
			}
		}

		start = container.scrollTop;
		change = to - start;
		currentTime = 0;
		increment = 20;

		function animateScroll(){

			var val;

			currentTime += increment;

			if (currentTime > duration) {
				currentTime = duration;
			}

			val = Blast.Bound.Math.easeInOutQuad(currentTime, start, change, duration);

			if (container.scrollTop == val) {
				return;
			}

			container.scrollTop = val;

			if (currentTime < duration) {
				setTimeout(animateScroll, increment);
			}
		};

		// Only animate a scroll when the value should actually change
		animateScroll();
	});

	/**
	 * Add the dialog listeners
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.9
	 *
	 * @return   {HTMLElement}   The wrapper of the dialog
	 */
	Scene.setMethod(function _insertDialog(filter, el, variables, viewRender) {

		var that = this,
		    wrapper,
		    style;

		if (viewRender) {
			viewRender.dialog_element = el;
		}

		if (!that.dialog_style) {
			style = document.createElement('style');
			style.setAttribute('type', 'text/css');
			style.innerHTML = '.js-he-dialog-wrapper:before {'
			                + 'content:"";display:inline-block;height:100%;'
			                + 'vertical-align:middle;'
			                + '}\n'
			                + '.js-he-dialog-wrapper {'
			                + 'text-align:center;'
			                + 'position:fixed;width:100vw;'
			                + 'background-color:rgba(0,0,0,0.4);top:0;bottom:0;'
			                + 'z-index:99998;overflow:auto;'
			                + '}\n'
			                + '.js-he-dialog {'
			                + 'display: inline-block;text-align:left;'
			                + 'vertical-align:middle;'
			                + '}';

			that.dialog_style = style;
			document.head.appendChild(style);
		}

		wrapper = Blast.parseHTML('<x-hawkejs class="js-he-dialog-wrapper"></x-hawkejs>');
		wrapper.appendChild(el);

		if (viewRender) {
			wrapper.dataset.added = viewRender.base_time;
		}

		// Close when the wrapper is clicked
		wrapper.addEventListener('click', function onClick(e) {

			var state;

			// Only remove the wrapper if it was clicked itself
			if (e.target == wrapper) {
				wrapper.remove();

				if (viewRender && viewRender.previous_state != null) {
					state = that.getStateByNumber(viewRender.previous_state);

					if (state) {
						if (!state.instance) {
							state.instance = Blast.Collection.JSON.undry(state.dried);
						}

						// @TODO: also add payload, somehow?
						history.pushState(null, null, state.instance.url);

						// Add the same state again
						that.states.push(state);
					}
				}

				if (viewRender && viewRender.emit) {
					viewRender.emit('dialog_close');
				} else {
					that.emit('dialog_close');
				}

				that.emit({
					type     : 'remove',
					category : 'dialog',
					template : filter.template || 'manual',
					theme    : filter.theme || 'default'
				}, el);
			}
		});

		document.body.appendChild(wrapper);

		return wrapper;
	});

	/**
	 * Get a state by number
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.1
	 * @version  1.2.1
	 */
	Scene.setMethod(function getStateByNumber(index) {

		if (typeof index != 'number') {
			return index;
		}

		if (this.states[index]) {
			return this.states[index];
		}

	});

	/**
	 * Create a custom dialog
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.0
	 * @version  1.2.0
	 *
	 * @return   {HTMLElement}
	 */
	Scene.setMethod(function createDialog() {

		var that = this,
		    dialog;

		dialog = document.createElement('div');
		dialog.classList.add('js-he-dialog');

		this._insertDialog({}, dialog);

		Blast.setImmediate(function doImmediate() {
			that.emit({
				type     : 'set',
				category : 'dialog'
			}, dialog);
		});

		return dialog;
	});

	/**
	 * Update bound data
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.1
	 */
	Scene.setMethod(function updateData(id, data) {

		var that = this,
		    elements,
		    element,
		    event,
		    arr,
		    i;

		arr = this.live_bindings[id];

		// Look for elements requiring an update-event first
		elements = document.querySelectorAll('[data-update-event="' + id + '"]');

		for (i = 0; i < elements.length; i++) {
			element = elements[i];

			// Create a custom event
			event = new CustomEvent('dataUpdate', {detail: data, bubbles: true});
			element.dispatchEvent(event);
		}


		// Do nothing if no bindings were found for this id
		if (!arr) {
			return;
		}

		arr.forEach(function eachEntry(entry, index) {

			var view_renderer,
			    object_name,
			    variables,
			    element,
			    pieces,
			    entry,
			    path,
			    i;

			if (!entry || !(element = document.getElementById(entry.element_id))) {
				arr[i] = undefined;
				return;
			}

			// Get the data-path attribute
			path = element.getAttribute('data-path');

			if (path) {
				// Split the path
				pieces = path.split('.');

				// The object name should be the first part of the path
				object_name = pieces[0];
			} else {
				object_name = '__update_data';
			}

			// Use the original variables
			variables = Blast.Bound.Object.assign({}, entry.variables);

			// Set the new data under the given or calculated name
			variables[object_name] = data;

			// Set the scope options
			variables.__scope = entry.scope;

			// Revive the function
			if (!entry.fnc) {
				entry.fnc = this.hawkejs.compile({
					compiled: entry.callback,
					call: entry.path || object_name,
					scope: entry.scope
				});
			}

			// Render the function with the new variables
			view_renderer = hawkejs.render(entry.fnc, variables, function gotResult(err, html) {

				var block = view_renderer.blocks[view_renderer.mainBlock];

				if (block.options.className) {
					Hawkejs.addClasses(element, block.options.className);
				}

				element.innerHTML = html;
				that.applyRenderResult(view_renderer, null);
			});
		});

		// Remove holes from the array
		Blast.Bound.Array.clean(arr);
	});

	/**
	 * Call the callback when items of the given query appears
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.0
	 */
	Scene.setMethod(function appears(query, options, callback) {

		var that = this,
		    intervalId,
		    elements,
		    queue,
		    live;

		if (typeof options == 'function') {
			callback = options;
			options = {};
		}

		if (typeof query == 'object') {
			elements = Blast.Bound.Array.cast(query);
		} else {
			if (options.live) {
				if (query.indexOf('.') > -1 || query.indexOf('#') > -1) {
					throw new Error('Live appearances require a single classname');
				}

				elements = document.getElementsByClassName(query);
				live = true;
			} else {
				elements = Blast.Bound.Array.cast(document.querySelectorAll(query));
				live = false;
			}
		}

		if (typeof options.interval != 'number') {
			options.interval = 5000;
		}

		// Don't go below 100ms
		if (options.interval < 100) {
			options.interval = 100;
		}

		// Create a new function queue
		queue = Function.createQueue();

		// Wait at least 330ms between executions
		queue.throttle = options.throttle || 330;

		// Only 1 execution at a time
		queue.limit = 1;

		// Start the queue
		queue.start();

		// Listen to the scroll and click event
		document.addEventListener('wheel', req, {passive: true});
		document.addEventListener('scroll', req, {passive: true});
		document.addEventListener('click', req, {passive: true});

		// Listen to the rendered event
		that.on('rendered', req);

		// Request a check
		function req() {
			if (!queue._queue.length) {
				queue.add(check);
			}
		}

		// The actual check
		function check() {

			var el,
			    i;

			// Return early if no elements need to be checked
			if (!elements.length) {
				return;
			}

			for (i = 0; i < elements.length; i++) {
				el = elements[i];

				if (el.isVisible(options.padding)) {
					if (live) {
						el.classList.remove(query);
					} else {
						elements.splice(i, 1);
					}

					i--;
					callback(el);

					// If delay_callback is true,
					// wait until the next check to call another item
					if (options.delay_callback) {
						req();
						break;
					}
				}
			}

			// Stop all future checks if no elements are left and it's not live
			if (!live && !elements.length) {
				document.removeEventListener('wheel', req);
				document.removeEventListener('click', req);
				document.removeEventListener('scroll', req);
				that.removeListener('rendered', req);
				clearInterval(intervalId);
				queue.destroy();
			}
		}

		// Request a check every so many milliseconds
		intervalId = setInterval(req, options.interval);

		// Request the initial check
		req();

		return req;
	});

	/**
	 * Get the duration of the current online status
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.3
	 * @version  1.3.0
	 *
	 * @type     {Number}   Duration in ms
	 */
	Scene.setProperty(function online_status_duration() {
		return this.status.online_status_duration;
	});

	/**
	 * See if a connection exists
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.3
	 * @version  1.2.3
	 *
	 * @param    {String}     path
	 * @param    {Function}   callback
	 */
	Scene.setMethod(function checkConnection(path, callback) {

		var that = this,
		    duration = 0,
		    start = Date.now(),
		    bomb,
		    xhr;

		if (typeof path == 'function') {
			callback = path;
			path = null;
		}

		if (!path) {
			path = this.check_connection_path || '/favicon.ico';
		}

		// If no connection path has been set yet, make this the main one
		if (!this.check_connection_path) {
			this.check_connection_path = path;
		}

		if (!callback) {
			callback = Function.thrower;
		}

		// Only run callback once
		callback = Function.regulate(callback);

		// Create the request
		xhr = new XMLHttpRequest();

		// Fetch the resource
		xhr.open('HEAD', path + '?ping=' + start, true);
		xhr.send();

		// Listen to state changes
		xhr.addEventListener('readystatechange', processRequest, false);

		// Timeout after 1000ms
		bomb = Function.timebomb(1000, function timeout() {
			that.online = false;
			callback(null, false);
		});

		function processRequest(e) {
			var result;

			duration = Date.now() - start;

			if (xhr.readyState == 4) {
				bomb.defuse();

				if (xhr.status >= 200 && xhr.status < 400) {
					result = true;
				} else {
					result = false;
				}

				if (that.check_connection_path == path) {
					that.online = result;
				}

				callback(null, result);
			}
		}

		return xhr;
	});

	/**
	 * Run function in a webworker, with Protoblast support
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.3
	 * @version  1.2.3
	 *
	 * @param    {Function}   fnc
	 *
	 * @return   {WebWorker}
	 */
	Scene.setMethod(function runInWorker(fnc) {

		var blob_url,
		    worker;

		// Build a worker from an anonymous function body
		blob_url = URL.createObjectURL(new Blob(
			[
				'(', require._require.modules.protoblast.toString(), '());',
				'(self.Protoblast());',
				'(',
				fnc.toString(),
				')()'
			],
			{type: 'application/javascript'}
		));

		worker = new Worker(blob_url);

		// Won't be needing this anymore
		//URL.revokeObjectURL(blob_url);

		return worker;
	});

	// To get a prettier output in the browser console
	Scene.setMethod(function slice(){});
	Scene.setMethod(function splice(){});
};