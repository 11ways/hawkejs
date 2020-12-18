const ACTIVE_REQUEST = Symbol('active_request'),
      INITIALIZED = Symbol('initialized'),
      SEEN_BLOCK = Symbol('seen_block'),
      AJAXIFIED  = Symbol('ajaxified'),
      loaded_paths = {},
      loaded_names = {},
      loading_paths = {},
      loading_names = {};

/**
 * One Scene instance is created on the client side only,
 * and is valid the entire time the tab is open.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.1
 *
 * @param    {Hawkejs.Hawkejs}   hawkejs
 * @param    {Object}            options
 */
const Scene = Fn.inherits('Hawkejs.Base', function Scene(hawkejs) {

	// The parent hawkejs instance
	this.hawkejs = hawkejs;

	// Exposed variables
	this.exposed = {};

	// History states, for the history api
	this.history_states = [];

	// The loaded scripts
	this.scripts = new Blast.Classes.Deck();

	// The loaded styles
	this.styles = {};

	// Assign slots
	this.assigns = {};

	// Stored history states
	this.states = [];

	// The current active openUrl request
	this.opening_url = null;

	// @TODO: fix code that relies on this!
	this.dialog_wrappers = [];

	// Emit this scene is being made
	Blast.emit('hawkejs_scene', this);

	// Listen to readyState changes of the document
	document.addEventListener('readystatechange', onReadystatechange.bind(this));
});

Scene.setDeprecatedProperty('generalView', 'general_renderer');
Scene.setDeprecatedProperty('renderCount', 'render_count');
Scene.setDeprecatedProperty('sceneId',     'scene_id');
Scene.setDeprecatedProperty('sceneData',   'scene_data');

/**
 * Create a general view
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Renderer}
 */
Scene.prepareProperty(function general_renderer() {
	var instance = new Hawkejs.Renderer(this.hawkejs);
	instance.nested = true;
	return instance;
});

/**
 * A live nodelist of all anchors
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {HTMLCollection}
 */
Scene.prepareProperty(function all_anchors() {
	return document.getElementsByTagName('a');
});

/**
 * A live nodelist of all form elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {HTMLCollection}
 */
Scene.prepareProperty(function all_forms() {
	return document.getElementsByTagName('form');
});

/**
 * The title element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {HTMLElement}
 */
Scene.setProperty(function title_element() {

	var element = document.head.getElementsByTagName('title')[0];

	if (!element) {
		element = document.createElement('title');
		document.head.append(element);
	}

	return element;
});

/**
 * Prepare the bottom element property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
Scene.setProperty(function bottom_element() {
	return document.getElementsByTagName('he-bottom')[0];
});

/**
 * Allow the back button?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.2
 *
 * @type     {Boolean}
 */
Scene.enforceProperty(function allow_back_button(new_value, old_value) {

	// Allow the back button by default
	if (new_value == null) {
		new_value = true;
	} else if (typeof new_value != 'boolean') {
		new_value = !!new_value;
	}

	// If the value didn't change, do nothing
	if (new_value === old_value) {
		return new_value;
	}

	// If we're disabling the back button, push an initial null state
	if (!new_value) {
		history.pushState(null, null, document.URL);
	} else if (new_value && old_value === false) {
		// Remove the previous null value
		history.back();
	}

	return new_value;
});

/**
 * Is the scene ready?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Scene.setProperty('ready', false);

/**
 * Is the scene loaded?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Scene.setProperty('loaded', false);

/**
 * Reference to the Helpers collection
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Helpers}
 */
Scene.setProperty(function helpers() {
	return this.general_renderer.helpers;
});

/**
 * Reference to the State instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {State}
 */
Scene.setProperty(function status() {
	return Blast.state;
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
 * @version  2.0.0
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

	// Add the body event listener
	this.ajaxify();
};

/**
 * React to the loaded/complete state of the document
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
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

	// Emit the loaded event
	this.emit('loaded');
};

/**
 * Make an AJAX request
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}    href        The url to go to
 * @param    {Object}    options     Options
 * @param    {Function}  callback    The function to callback to
 *
 * @return   {Pledge}
 */
Scene.setMethod(function fetch(href, options, callback) {
	return this.general_renderer.fetch(href, options, callback);
});

/**
 * Browse to a link using AJAX.
 * The response will be an item this client needs to render.
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  2.0.2
 *
 * @param    {String}    href        The url to go to
 * @param    {Object}    options     Options
 * @param    {Function}  callback    The function to callback to (with payload)
 *
 * @return   {Pledge}
 */
Scene.setMethod(function openUrl(href, options, callback) {

	const that = this;

	let req_pledge,
	    pledge = new Classes.Pledge(),
	    url;

	// Set the start time
	pledge.time_started = Date.now();

	// Allow cancelling the request
	pledge.cancel = function cancel() {
		if (req_pledge && req_pledge.cancel) {
			req_pledge.cancel();
		}
	};

	if (typeof href == 'object' && !Classes.RURL.isUrl(href)) {
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

	// Make the pledge handle any callbacks
	pledge.done(callback);

	// Mark elements as being busy
	if (options.source_element) {
		this.markElementBusy(options.source_element, true);
	}

	this.emit('opening_url', href, options);

	if (!options.headers) {
		options.headers = {};
	}

	options.headers['x-hawkejs-request'] = true;

	// Get the RURL instance
	url = Classes.RURL.parse(href);
	options.url = url;

	// If another openUrl request is busy, cancel it!
	if (this.opening_url && this.opening_url.cancel) {
		this.opening_url.cancel();
	}

	this.opening_url = pledge;

	if (options.download_if_inline == null) {
		options.download_if_inline = true;
	}

	// Check for client-side url interceptions?
	if (this.interceptOpenUrl) {
		let intercepting = this.interceptOpenUrl(url, options);

		if (intercepting) {

			// If everything works out,
			// the client-side action will handle the rendering
			intercepting.then(function resolved() {
				pledge.resolve();
			});

			// Perform the regular fetch in case something goes wrong
			intercepting.catch(function rejected(err) {
				req_pledge = that.fetch(url, options);

				if (!isStillSameRequest()) {
					return;
				}

				copyOverXhr(req_pledge);

				req_pledge.done(function done(err, result) {
					handleResult(err, result);
				});
			});

			return pledge;
		}
	}

	function copyOverXhr(other_pledge) {
		pledge.xhr = other_pledge.xhr;
		pledge.request = other_pledge.request;

		if (other_pledge.cancel) {
			pledge.cancel = other_pledge.cancel;
		}
	}

	function finishUp(err, result) {

		that.emit('opened_url', href, err, result);

		if (err) {
			pledge.reject(err);
		} else {
			pledge.resolve(result);
		}
	}

	// Function to check if this is still the same request
	function isStillSameRequest() {

		if (that.opening_url == pledge) {
			return true;
		}

		let error = new Error('Request has been cancelled');
		pledge.reject(error);

		return false;
	}

	req_pledge = this.fetch(url, options);
	req_pledge.done(handleResult);
	copyOverXhr(req_pledge);

	if (Blast.DEBUG) {
		console.log('Opening URL', url, options, req_pledge);
	}

	function handleResult(err, result) {

		var location,
		    request = req_pledge.request,
		    xhr = req_pledge.xhr;

		// See if the server wants us to do a hard navigate to a new location
		if (xhr && (location = xhr.getResponseHeader('x-hawkejs-navigate'))) {

			let popup = xhr.getResponseHeader('x-hawkejs-popup');

			if (popup) {
				if (popup == 'true') {
					popup = '';
				}

				finishUp();

				return window.open(location, 'hawkejs_popup', popup);
			}

			that.hard_navigating_to = location;
			return window.location = location;
		}

		if (!isStillSameRequest()) {
			return;
		}

		if (xhr.status == 202 && (location = request.getResponseHeader('location'))) {
			let delay = parseFloat(request.getResponseHeader('expected-duration'));

			if (!isFinite(delay)) {
				delay = 0.2;
			}

			delay *= 1000;

			if (options.source_element && delay) {
				options.source_element.dataset.heRetryAt = Date.now() + delay;
			}

			setTimeout(function followLocation() {

				if (!isStillSameRequest()) {
					return;
				}

				req_pledge = that.fetch(location, {
					source_element: options.source_element,
					'x-hawkejs-request': true
				});

				req_pledge.done(handleResult);
			}, delay);

			return;
		}

		if (options.source_element) {
			that.markElementBusy(options.source_element, false);
		}

		if (err) {

			if (Blast.DEBUG) {
				console.error('Received error:', err);
			}

			if (err.result) {
				result = err.result;
			} else {
				return finishUp(err);
			}
		}

		if (result) {

			if (Blast.DEBUG) {
				console.log('Handling server response', result);
			}

			// Reject without rendering if wanted
			// @TODO: what if there is no error message?
			if (result.error && options.render_error === false && result.message instanceof Error) {
				return pledge.reject(result.message);
			}

			if (err && result.error_templates) {

				let templates = result.error_templates,
				    variables = result;

				result = new Hawkejs.Renderer(hawkejs);
				result.add(templates);

				result.variables = variables;
			}

			that.handleServerResponse(url, options, result, req_pledge.xhr).done(finishUp);
		} else {
			finishUp(null, result);
		}
	}

	return pledge;
});

/**
 * Render and apply something in this scene
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.4
 * @version  2.0.4
 *
 * @param    {String|Renderer|Function}   template
 * @param    {Object}                     variables
 *
 * @return   {Pledge}
 */
Scene.setMethod(function render(template, variables) {

	const that = this;

	let pledge = new Pledge();

	let renderer = hawkejs.render(template, variables, function done(err) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(that.applyRenderResult(renderer));
	});

	return pledge;
});

/**
 * Render the AJAX response from the server
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {RURL}           url        The requesting URL
 * @param    {Object}         payload    The response from the server
 * @param    {XMLHttpRequest} xhr        The request object
 *
 * @return   {Pledge}
 */
Scene.setMethod(function handleServerResponse(url, options, payload, xhr) {

	var history_url;

	// See if the server told us to use a different url for the history
	if (xhr) {
		history_url = xhr.getResponseHeader('x-history-url');

		if (history_url) {
			history_url = decodeURI(history_url);
		}
	}

	if (!history_url) {
		history_url = url;
	}

	// Make hashes work as expected
	if (url.hash) {
		history_url = history_url + url.hash;
	}

	if (history_url) {
		history_url = Blast.Classes.RURL.parse(history_url);

		// Make sure to remove the "hajax" parameter
		history_url.param('hajax', null);

		// Turn it back into a string
		history_url = history_url.href;
	}

	if (typeof payload == 'string') {

		if (xhr) {
			let fallback = xhr.getResponseHeader('x-fallback-url');

			// Something went wrong, but we have a fallback url?
			// Then go there
			if (fallback) {
				window.location = decodeURI(fallback);
				return;
			}
		}

		return Classes.Pledge.reject(new Error('Payload was not an object'));
	}

	let that = this,
	    state_content,
	    renderer,
	    pledge = new Classes.Pledge();

	// Store the render time
	payload.base_time = Date.now();

	// Make sure there is a baseId
	if (payload.base_id == null) {
		payload.base_id = payload.base_time;
	}

	// Only create state_content if it is not explicitly turned off
	if (options.history !== false) {

		// Create a payload clone now
		state_content = {
			url         : String(history_url),
			request_url : String(url),
			payload     : payload
		};

		if (this.states.length) {
			payload.previous_state = this.states.length - 1;
		}

		state_content = Bound.JSON.dry(state_content);

		// Store the state in the scene as a dried json string,
		// when it's needed it'll be undried on the fly
		let temp = {
			dried    : state_content,
			instance : null
		};

		this.states.push(temp);

		payload.current_state = temp;
	}

	Function.series(false, function renderPayload(next) {

		renderer = hawkejs.render(payload, next);

		if (options.history !== false) {
			renderer.previous_state = payload.previous_state;
			renderer.current_state = payload.current_state;
		}

		// @TODO: clean this up
		renderer.history = options.history;

		if (options.root) {
			renderer.root = options.root;
		}
	}, function afterRender(next) {
		that.applyRenderResult(renderer, payload).done(next);
	}, function done(err) {

		if (err) {
			pledge.reject(err);
			return;
		}

		let element;

		if (state_content && renderer.history !== false) {

			let state_data = {
				content: state_content
			};

			// Register the new state
			history.pushState(state_data, null, history_url);
		}

		if (url.hash) {
			try {
				element = document.querySelector(url.hash);
			} catch (err) {};
		}

		if (element == null && renderer.focus_block) {
			let block = renderer.blocks.get(renderer.focus_block);
			element = that.findNamedElement(renderer.focus_block);

			if (block && element && block.options.append) {
				element = Hawkejs.getFirstElement(block.lines);
			}
		}

		let scroll_pledge;

		// Only scroll when it's not a dialog
		if (!renderer.dialog && options.scroll !== false) {
			if (element != null) {
				// Scroll to the found element
				scroll_pledge = hawkejs.scene.scrollTo(element);
			} else {
				// Scroll to the top
				scroll_pledge = hawkejs.scene.scrollTo();
			}
		}

		if (options.move_browser_focus !== false) {
			if (scroll_pledge) {
				scroll_pledge.done(function done() {
					that.moveBrowserFocus(renderer);
				});
			} else {
				that.moveBrowserFocus(renderer);
			}
		}

		if (xhr && xhr.status >= 500) {
			if (payload.variables.message) {
				err = payload.variables.message;
			} else {
				err = new Error(xhr.statusText);
			}

			pledge.reject(err);
		} else {
			pledge.resolve(renderer);
		}
	});

	return pledge;
});

/**
 * Apply the client-side render to the current document
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 * @param    {Object}             payload
 *
 * @return   {Pledge}
 */
Scene.setMethod(function applyRenderResult(renderer, payload) {

	var that = this;

	let pledge = Fn.parallel(false, [
		that.handleRendererScripts(renderer),
		function loadStyles(next) {
			that.handleRendererStyles(renderer).done(function handledStyles(err) {

				if (err) {
					if (console) console.error('Failed to handle styles:', err);
				}

				next();
			});
		},
		this._updateContents(renderer, payload),
		Classes.Pledge.resolve(this.generalPostRender(renderer))
	]);

	return pledge;
});

/**
 * Update the document with rendered blocks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 * @param    {Object}             payload
 *
 * @return   {Pledge}
 */
Scene.setMethod(async function _updateContents(renderer, payload) {

	let block;

	if (renderer.dialog) {
		await this._prepareDialog(renderer);
	}

	// Add all already-created dialog elements to the bottom element
	Hawkejs.appendChildren(this.bottom_element, renderer.dialogs);

	for (block of renderer.blocks) {
		this._updateBlock(renderer, block.name);
	}

	// We have to do styles & scripts again, because there could be new ones
	if (renderer.dialog) {
		await Fn.parallel([
			this.handleRendererScripts(renderer),
			this.handleRendererStyles(renderer)
		]);
	}
});

/**
 * The renderer has a dialog, make it available in the he-bottom element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
Scene.setMethod(async function _prepareDialog(renderer) {

	var template = renderer.last_template;

	if (!template) {
		return;
	}

	block = renderer.blocks.get(template.target_block_name);

	if (!block) {
		return;
	}

	let dialog = document.createElement('he-dialog');

	// @TODO: This breaks things. It's not needed for dialogs anyway,
	// but still...
	//dialog.hawkejs_renderer = renderer;

	dialog.setAttribute('id', renderer.dialog_open);
	dialog.classList.add('js-he-dialog');
	Hawkejs.addClasses(dialog, block.options.className);

	if (dialog[Hawkejs.RENDER_CONTENT]) {
		await dialog[Hawkejs.RENDER_CONTENT]();
	}

	dialog.onHawkejsAssemble(renderer);

	this.bottom_element.append(dialog);
});

/**
 * Add the dialog listeners
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.1
 *
 * @param    {Object}            filter
 * @param    {HTMLElement}       el
 * @param    {Object}            variables
 * @param    {Hawkejs.Block}     block
 *
 * @return   {HTMLElement}   The wrapper of the dialog
 */
Scene.setMethod(function _insertDialog(filter, el, variables, block) {

	if (document.contains(el)) {
		return;
	}

	this.bottom_element.append(el);
});

/**
 * See if the given block already exists in the document,
 * and update it if it does
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.3
 *
 * @param    {Hawkejs.Renderer}   renderer
 * @param    {String}             block_name
 */
Scene.setMethod(function _updateBlock(renderer, block_name) {

	let check_name = false,
	    element,
	    block = renderer.blocks.get(block_name);

	if (renderer.root && renderer.main_block_name == block_name) {
		element = renderer.root;
	} else if (renderer.assigns[block_name] && renderer.assigns[block_name].element) {
		element = renderer.assigns[block_name].element;
		check_name = true;
	} else {
		element = this.getBlockElement(block);
	}

	if (!element) {
		return;
	}

	if (typeof element.getBlockUpdateTarget == 'function') {
		element = element.getBlockUpdateTarget();
	} else if (check_name && !element.dataset.heName) {
		return;
	}

	if (!element) {
		return;
	}

	let nodes = block.toElements(),
	    node,
	    i;

	// @TODO: The "push" stuff goes here

	// Clear the original content if append is falsy
	if (!block.options.append) {
		Hawkejs.removeChildren(element);
	}

	if (block.options.attributes) {
		Hawkejs.setAttributes(element, block.options.attributes);
	}

	// Append the rendered contents
	for (i = 0; i < nodes.length; i++) {
		node = nodes[i];

		try {
			element.append(node);
		} catch (err) {
			console.warn('Error appending node:', node, err);
		}
	}

	element.dataset.heTemplate = block.origin.name;

	if (block.origin.theme && block.origin.theme != 'default') {
		element.dataset.theme = block.origin.theme;
	} else {
		element.removeAttribute('data-theme');
	}
});

/**
 * Try getting an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.1
 *
 * @param    {String}        name
 *
 * @return   {HTMLElement}   The element, if found
 */
Scene.setMethod(function findNamedElement(name) {

	var selectors,
	    element,
	    i;

	selectors = [
		name,
		'#' + name,
		'[data-he-name="' + name + '"]',

		// These blocks shouldn't really be assignable so we query them last
		'[data-he-block="' + name + '"]'
	];

	for (i = 0; i < selectors.length; i++) {
		try {
			element = document.querySelector(selectors[i]);

			if (element) {
				return element;
			}
		} catch (err) {
			// Ignore
		}
	}
});

/**
 * Try getting an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.1
 *
 * @param    {String}   name
 *
 * @return   {Array}    The elements found
 */
Scene.setMethod(function findAllNamedElements(name) {

	var selectors,
	    elements = [],
	    entries,
	    element,
	    i,
	    j;

	selectors = [
		'[data-he-name="' + name + '"]',
		'#' + name,
		name,

		// These blocks shouldn't really be assignable so we query them last
		'[data-he-block="' + name + '"]'
	];

	for (i = 0; i < selectors.length; i++) {
		try {
			entries = document.querySelectorAll(selectors[i]);

			if (entries && entries.length) {
				for (j = 0; j < entries.length; j++) {
					elements.push(entries[j]);
				}
			}
		} catch (err) {
			// Ignore
		}
	}

	return elements;
});

/**
 * Get the HTML element of a certain block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name      The name of the block to get
 * @param    {String}   origin    The origin template (name) or parent element
 *
 * @return   {HTMLElement}
 */
Scene.setMethod(function getBlockElement(name, origin) {

	var elements,
	    block;

	if (typeof name == 'object') {
		block = name;
		name = block.name;

		if (!origin && block.scope_id) {
			origin = document.getElementById(block.scope_id);
		}
	}

	elements = this.findAllNamedElements(name);

	if (!elements.length && block && block.renderer && block.renderer.dialog_open) {
		elements = this.findAllNamedElements(block.renderer.dialog_open);
	}

	if (!origin) {
		if (elements[0]) {
			return elements[0];
		} else {
			return false;
		}
	}

	let element,
	    i;

	for (i = 0; i < elements.length; i++) {
		element = elements[i];

		if (typeof origin == 'string') {
			if (el.dataset.heOrigin != origin) {
				continue;
			}
		} else if (!origin.contains(element)) {
			continue;
		}

		return element;
	}

	return false;
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
 * Get or set a cookie value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
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
		cookies = Bound.String.decodeCookies(document.cookie);
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

	document.cookie = Bound.String.encodeCookie(name, value, options);
});

/**
 * Get the scene id from a cookie or create one
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
Scene.setMethod(function getSceneId() {

	if (!this.scene_id) {
		let start_time,
		    cookies,
		    config,
		    list,
		    key;

		// Get all the available cookies
		cookies = this.cookie();

		// Prepare an array
		list = [];

		// Get the closest start time as possible
		start_time = Bound.Object.path(window, 'performance.timing.responseStart') || (Date.now() - ~~Blast.performanceNow());

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
		Bound.Array.sortByPath(list, 1, 'difference');

		// The first one should be the correct one
		if (list[0]) {
			let entry = list[0];
			this.scene_id = entry.config.id;

			// Now delete the cookie
			this.cookie(entry.key, null);
		} else {
			this.scene_id = Classes.Crypto.randomHex(8) || Classes.Crypto.pseudoHex();
		}

		this.scene_data = {};
	}

	return this.scene_id;
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
		return this.scene_data;
	}

	if (arguments.length == 1) {
		return this.scene_data[name];
	}

	this.scene_data[name] = value;
});

/**
 * Initialize the helpers
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Renderer}   renderer
 */
Scene.setMethod(function initHelpers(renderer) {

	var helper,
	    key;

	for (key in Hawkejs.helpers) {
		helper = Hawkejs.helpers[key];

		if (helper[INITIALIZED]) {
			continue;
		}

		helper[INITIALIZED] = true;

		if (helper.onScene != null) {
			helper.onScene(this, renderer);
		}
	}
});

/**
 * Register the server-side render on the client.
 * Client-side renders only execute the generalPostRender method.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
Scene.setMethod(function registerServerRender(renderer, was_delayed) {

	var that = this;

	if (was_delayed) {
		// Fix any elements that were undried before the dom was ready
		Classes.Hawkejs.Element.Element.fixPrematureUndriedElements(this, renderer);
	}

	this.initHelpers(renderer);

	if (typeof _hawkejs_static_expose != 'undefined') {
		Object.assign(this.exposed, Bound.JSON.undry(_hawkejs_static_expose));
	}

	// Store the exposed variables
	Object.assign(this.exposed, renderer.expose_to_scene);

	// Delay this method if the document is not ready yet
	if (!this.ready) {
		return this.afterOnce('ready', this.registerServerRender.bind(this, renderer, true));
	}

	let history_state,
	    url;

	if (renderer.theme) {
		this.general_renderer.theme = renderer.theme;
	}

	if (!renderer.base_time) {
		renderer.base_time = Date.now();
	}

	if (renderer.request) {
		url = renderer.request.url;
	}

	// Create a history_state object
	history_state = {
		instance : {
			payload : renderer,
			url     : url
		}
	};

	history_state.dried = Bound.JSON.dry(history_state.instance);

	// Store this as the first state
	this.history_states.push(history_state);

	// If there was an internal redirect, change the url to reflect it
	if (this.exposed.redirected_to) {
		// @TODO: clean this up
		history.pushState(null, null, this.exposed.redirected_to);
	}

	Blast.emit('hawkejs_registered');

	Fn.parallel(false, function loadScripts(next) {
		// Get scripts
		that.handleRendererScripts(renderer).done(next);
	}, function loadStyles(next) {
		// Get styles
		that.handleRendererStyles(renderer).done(function handledStyles(err) {

			if (err) {
				console.error('Failed to handle styles:', err);
			}

			next();
		});
	}, function done(err) {

		if (err != null) {
			throw err;
		}

		that.attachHistoryListener();

		// General handling of links, titles, emitting events, ...
		that.generalPostRender(renderer);

		// Increase the rendercount
		that.render_count++;
	});
});

/**
 * Attach the history popstate listener to the window
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.2
 */
Scene.setMethod(function attachHistoryListener() {

	var hash = location.hash,
	    that = this;

	// Listen to the "popstate" event,
	// which happends when the back or forward button is pressed,
	// but also when a hashchange happens
	window.addEventListener('popstate', function onPopstate(e) {

		var renderer,
		    content,
		    payload,
		    i;

		if (!that.allow_back_button) {
			console.log('Back button has been disabled, staying on', document.URL);
			history.pushState(null, null, document.URL);
			return;
		}

		// If the state is found, we can use that to recreate the page
		if (e.state) {

			// Get the content
			content = e.state.content;

			// Parse the JSON content
			content = Bound.JSON.undry(content);

			// @TODO: implement better way of getting rid of dialogs & remove event
			if (content.payload && content.payload.base_time) {
				for (i = that.dialog_wrappers.length - 1; i >= 0; i--) {
					if (that.dialog_wrappers[i].dataset.added >= content.payload.base_time) {
						that.dialog_wrappers[i].remove();
						that.emit('dialog_close');
						that.emit({type: 'remove', category: 'dialog'});
					}
				}
			}

			Fn.series(false, function preRenderEvent(next) {
				that.emit('preHistory', content, next);
			}, function renderPayload(next) {
				renderer = hawkejs.render(content.payload, next);
			}, function afterRender(next) {
				that.applyRenderResult(renderer, content.payload, next);
			}, function finished(err) {
				if (err) {
					throw err;
				}
				that.emit('postHistory', content, renderer);
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
			for (i = 0; i < that.dialog_wrappers.length; i++) {
				that.dialog_wrappers[i].remove();
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
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Pledge}
 */
Scene.setMethod(function emitCreated(renderer) {

	var tasks = [],
	    name;

	// Set the template this body comes from
	tasks.push(this.setBodyOrigin(renderer));

	// Emit an event for every new inserted block
	tasks.push(this._emitNewBlocks(renderer));

	// Emit an event for every block that gets new content
	tasks.push(this._emitNewContent(renderer));

	if (renderer.main_template.name) {
		name = renderer.main_template.name;
	} else {
		name = renderer.main_template;
	}

	this.emit({
		type     : 'rendered',
		template : name
	}, renderer.variables, renderer);

	return Fn.series(tasks);
});

/**
 * Set the template this body comes from
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Pledge}
 */
Scene.setMethod(function setBodyOrigin(renderer) {

	if (document.body.dataset.origin) {
		return Classes.Pledge.resolve();
	}

	let template = renderer.last_template;

	if (!template) {
		console.warn('No last_template found');
		return Classes.Pledge.resolve();
	}

	let that = this,
	    block_name = template.main_block_name,
	    type,
	    data;

	// Make sure history was not explicitly disabled
	if (renderer.history !== false && renderer.queued_templates) {
		let template = renderer.queued_templates[renderer.queued_templates.length - 1];

		// @TODO: This currently sets the last template,
		// but it should be the entry template

		// Set the last set template
		document.body.dataset.heLastTemplate = template.name;

		// Set the name
		//document.body.dataset.heLastName = template.main_block_name;
	}

	type = {
		type     : 'create',
		category : 'block',
		name     : block_name,
		template : template.name,
		default  : false,
		root     : true
	};

	data = {
		name     : type.name,
		template : type.template,
		default  : false
	}

	let pledge = new Classes.Pledge();

	renderer.waitForScripts().then(function scriptsHaveLoaded() {
		that.emit(type, document.body, renderer.variables, data);
		pledge.resolve();
	});

	return pledge;
});

/**
 * Get the block category of an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.1
 *
 * @param    {HTMLElement}   el
 *
 * @return   {String}
 */
Scene.setMethod(function getElementBlockCategory(el) {

	var category;

	if (!el) {
		throw new Error('No element was given');
	}

	if (el.dataset.heType) {
		category = el.dataset.heType;
	} else if (el.tagName == 'HE-DIALOG') {
		category = 'dialog';
	} else if (el.classList.contains('x-hawkejs')) {
		category = 'element';
	} else {
		category = 'block';
	}

	return category;
});

/**
 * Emit newly created blocks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Pledge}
 */
Scene.setMethod(function _emitNewBlocks(renderer) {

	var that = this,
	    elements = document.querySelectorAll('[data-he-name]'),
	    category,
	    tasks = [],
	    i;

	for (i = 0; i < elements.length; i++) {
		let el = elements[i];

		if (el[SEEN_BLOCK]) {
			continue;
		}

		el[SEEN_BLOCK] = true;

		category = this.getElementBlockCategory(el);

		let type = {
			type     : 'create',
			category : category,
			name     : el.dataset.heName,
			template : el.dataset.heTemplate,
			theme    : el.dataset.theme || 'default',
			entry    : el.dataset.heEntryTemplate
		};

		let data = {
			name      : type.name,
			template  : type.template,
			variables : renderer.variables
		};

		tasks.push(function doEmit(next) {
			that.emit(type, el, renderer.variables, data);
			next();
		});
	}

	if (!tasks.length) {
		return Pledge.resolve();
	}

	tasks.unshift(this.loadScripts(this.scripts));

	return Fn.series(tasks);
});


/**
 * Emit an event for every block that gets new content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.3
 *
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Pledge}
 */
Scene.setMethod(function _emitNewContent(renderer) {

	let that = this,
	    block,
	    list = [];

	for (block of renderer.blocks) {

		let category,
		    name = block.name,
		    el;

		if (block.scope_id) {
			let parent = document.getElementById(block.scope_id);

			if (!parent) {
				continue;
			}

			el = that.getBlockElement(block, parent);

			if (!el) {
				continue;
			}

		} else {
			el = that.getBlockElement(block);
		}

		let variables = block.variables || renderer.variables;

		// If we couldn't find the block, it was not created
		if (!el) {

			el = document.getElementById(name);

			if (el) {
				block.template = null;
			} else {
				continue;
			}
		}

		category = this.getElementBlockCategory(el);

		type = {
			type     : 'set',
			category : category,
			name     : name,
			template : el.dataset.heTemplate || block.template,
			entry    : el.dataset.heEntryTemplate,
			theme    : el.dataset.theme || 'default'
		};

		if (category == 'dialog') {
			this._insertDialog(type, el, variables, block);
		}

		// Don't emit just yet
		list.push({
			category  : category,
			type      : type,
			el        : el,
			variables : variables,
			block     : block
		});
	}

	return Fn.series(this.loadScripts(this.scripts), function requiredScripts() {
		var entry,
		    i;

		// Emit dialogs first
		for (i = 0; i < list.length; i++) {
			entry = list[i];
			that.emit(entry.type, entry.el, entry.variables, entry.block);
		}
	});
});

/**
 * Handle scripts after a render has finished
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Pledge}
 */
Scene.setMethod(function handleRendererScripts(renderer) {

	var that = this,
	    scripts;

	scripts = renderer.scripts || [];

	scripts.forEach(function eachScript(parameters, index) {
		// Register all the scripts
		that._queueScript.apply(that, parameters);
	});

	// Load all queued scripts
	return this.loadScripts(this.scripts);
});

/**
 * Queue a script for loading in the current scene,
 * should only be called by Scene itself.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Array}    instructions
 * @param    {Object}   options
 */
Scene.setMethod(function _queueScript(instructions, options) {

	var that = this,
	    should_be_added = true;

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
		options.id = Bound.Object.checksum(options.instructions);
	}

	// First go over every script to see if it is unique
	this.scripts.every(function everyScript(item, key) {

		if (options.id == item.id || Bound.Object.alike(options.instructions, item.instructions)) {
			if (options.reload) {
				item.reload = true;
			}

			should_be_added = false;

			// Stop "every" loop
			return false;
		}
	});

	if (should_be_added) {
		this.scripts.set(options.id, options, options.weight);
	}
});

/**
 * Load the given scripts
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Array|Deck}   scripts
 *
 * @return   {Pledge}
 */
Scene.setMethod(function loadScripts(scripts) {

	var that  = this,
	    tasks = [],
	    i;

	scripts.forEach(function eachScriptGroup(script, key, index) {

		if (typeof script.loadcount != 'number') {
			script.loadcount = 0;
		}

		// Schedule request if loadcount is zero or reload is wanted
		if (script.loadcount && !script.reload) {
			return;
		}

		let handler;

		if (script.series) {
			handler = Fn.series;
		} else {
			handler = Fn.parallel;
		}

		let subtasks = [],
		    j;

		for (j = 0; j < script.instructions.length; j++) {
			let instruction = script.instructions[j];

			subtasks.push(function getInstruction(next) {
				that.getScript(instruction).done(next);
			});
		}

		tasks.push(function doLoadInstructions(next) {

			handler(false, subtasks, function doneLoadingInstructions() {

				// Set reload to false
				script.reload = false;

				// Increase the loadcount
				script.loadcount++;

				next(null, true);
			});
		});
	});

	return Fn.parallel(false, tasks);
});

/**
 * Set the title of this page
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   title
 */
Scene.setMethod(function setPageTitle(title) {

	if (title && title.constructor && title.constructor.name == 'I18n') {
		let that = this;

		title.getContent(function gotTitleContent(err) {

			if (err) {
				console.error('Error setting page title:', err);
				return;
			}

			that._setPageTitle(title);
		});
	} else {
		this._setPageTitle(title);
	}
});

/**
 * Actually set the page title
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   title
 */
Scene.setMethod(function _setPageTitle(title) {

	if (typeof title != 'string') {
		title = String(title);

		// Ignore the default object to string conversions
		if (title.indexOf('[object ') > -1) {
			return;
		}
	}

	title = Bound.String.stripTags(title);
	title = Bound.String.encodeHTML(title);

	this.title_element.innerHTML = title;
});

/**
 * Load a script
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.4
 *
 * @param    {Object}   options
 * @param    {Boolean}  force      Force a reload if already loaded?
 *
 * @return    {Pledge}
 */
Scene.setMethod(function getScript(options, force) {

	var that = this,
	    path,
	    name;

	if (typeof options == 'string') {
		name = path = options;
		options = null;
	} else if (Array.isArray(options)) {
		path = options;
	} else {
		path = options.path || options.source || options.src || options.instructions;
		name = options.name;
	}

	// Handle arrays of scripts in series
	if (Array.isArray(path)) {
		let tasks = [];

		path.forEach(function eachScript(path) {
			tasks.push(function loadScriptPath(next) {
				that.getScript(path, force).done(next);
			});
		});

		return Fn.series(false, tasks);
	}

	let is_url;

	if (path) {
		// Normalize the path
		if (path.slice(0, 4) === 'http') {
			// Do nothing, path is a regular url
			is_url = true;
		} else if (path[0] == '/') {
			if (path[1] == '/') {
				is_url = true;
			} else {
				path = Bound.String.beforeLast(this.hawkejs.root_path, '/') + path;
			}
		} else {
			path = this.hawkejs.root_path + this.hawkejs.script_path + path;
		}

		// Only add the .js suffix if it's a local file (and not a full url)
		if (!is_url && !Bound.String.endsWith(path, '.js')) {
			path += '.js';
		}

		if (!is_url && this.hawkejs.app_version) {
			path += '?v=' + this.hawkejs.app_version;
		}
	}

	// See if it has already been loaded
	if (!force && (loaded_paths[path] || loaded_names[name])) {
		return Classes.Pledge.resolve(true);
	}

	if (loading_paths[path] || loading_names[name]) {
		return loading_paths[path] || loading_names[name];
	}

	if (!path) {
		return Pledge.reject(new Error('Did not find a script path to require'));
	}

	// Create the actual element
	let script = document.createElement('script'),
	    pledge = new Classes.Pledge();

	// Set the source attribute
	script.src = path;

	// Indicate we've started loading this script
	loading_paths[path] = pledge;
	loading_names[name] = pledge;

	// Set the onload event
	script.onload = function onScriptLoad() {
		loaded_paths[path] = true;
		loaded_names[name] = true;

		// Emit an event
		that.emit({type: 'script', name: name}, name, path);

		pledge.resolve(true);
	};

	// Listen for errors
	script.onerror = function onScriptError(err) {
		pledge.reject(err);
	};

	// Add it to the head
	document.head.appendChild(script);

	return pledge;
});

/**
 * Handle styles after a viewRender is finished
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
Scene.setMethod(function handleRendererStyles(renderer) {

	var styles = renderer.styles;

	if (!Array.isArray(styles) || styles.length === 0) {
		return Classes.Pledge.resolve();
	}

	var that = this,
	    tasks = [];

	styles.forEach(function eachStyle(parameters, index) {

		// Empty arrays mean no styles need to be loaded
		if (!parameters[0] || !parameters[0].length) {
			return;
		}

		tasks.push(function doStyle(next) {
			that.enableStyle(parameters[0], parameters[1]).done(next);
		});
	});

	// Unlike scripts, styles should be loaded parallel.
	// The execution should start directly,
	// and not at the top of the event queue.
	// This is needed to prevent FOUC.
	return Fn.parallel(false, tasks);
});

/**
 * Enable a style
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.1
 *
 * @param    {String}   instructions   The id or path to the script
 * @param    {Object}   options
 */
Scene.setMethod(function enableStyle(instructions, options) {

	var that = this,
	    block_name;

	if (typeof options === 'string') {
		block_name = options;
	}

	if (!options || typeof options !== 'object') {
		options = {};

		if (block_name) {
			options.origin_block = block_name;
		}
	}

	// Handle inline styles
	if (options.inline) {
		let name = instructions[0],
		    style = document.querySelector('[data-style-name="' + name + '"]');

		if (!style) {
			style = document.createElement('style');
			style.setAttribute('type', 'text/css');
			style.dataset.styleName = name;
			style.innerHTML = options.source;
			document.head.appendChild(style);
		}

		style.removeAttribute('disabled');

		return Classes.Pledge.resolve();
	}

	// Handle arrays of styles in parallel
	if (Array.isArray(instructions) && instructions.length) {
		let tasks = [];

		instructions.forEach(function eachStyle(instruction, index) {
			tasks[index] = function onLoaded(next) {
				that.enableStyle(instruction, options).done(next);
			};
		});

		if (tasks.length == 0) {
			return Classes.Pledge.resolve()
		}

		// Run the tasks in parallel, but force them to start directly,
		// and not at the top of the event queue.
		// This is needed to prevent FOUC.
		return Fn.parallel(false, tasks);
	}

	// At this point 'instructions' will no longer be an array
	let path = instructions,
	    url = Classes.RURL.parse(path, this.hawkejs.root_path + this.hawkejs.style_path);

	if (!url.hostname || url.usedBaseProperty('hostname')) {
		if (this.hawkejs.app_version) {
			url.param('v', this.hawkejs.app_version);
		}

		if (!Bound.String.endsWith(url.pathname, '.css')) {
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

	let data = this.styles[path],
	    pledge = new Classes.Pledge();

	// Register this style under the given block
	block_name = options.origin_block || 'manual';

	data.blocks[block_name] = true;

	// Create the element if we haven't done so already
	if (!data.element) {

		// See if this element is already somewhere on the page
		let style = document.querySelector('link[href="' + path + '"]');

		if (!style) {
			// Create the style element
			style = document.createElement('link');

			// Set the needed attributes
			style.setAttribute('rel', 'stylesheet');
			style.setAttribute('href', path);

			// Add onload callback
			style.onload = function onStyleLoad() {
				pledge.resolve();
			};

			style.onerror = function onStyleError(event) {
				pledge.reject(new Error('Failed to load style "' + path + '"'));
			};

			// Add it to the document
			document.head.appendChild(style);
		} else {
			pledge.resolve();
		}

		data.element = style;

		// Remember this path has been loaded
		loaded_paths[path] = true;
	} else {
		pledge.resolve();
	}

	// If this style was disabled in the past, re-enable it
	data.element.removeAttribute('disabled');
	data.element.disabled = false;

	return pledge;
});

/**
 * Disable a style
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   instructions   The id or path to the script
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
			path = this.hawkejs.root_path + path;
		}
	} else {
		path = this.hawkejs.root_path + this.hawkejs.style_path + path;
	}

	if (!Bound.String.endsWith(path, '.css')) {
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
 * General post-render handling
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.3
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
Scene.setMethod(function generalPostRender(renderer) {

	var that = this,
	    old_block,
	    element,
	    assign,
	    block,
	    name;

	// If the title is not null
	if (renderer.page_title != null) {
		this.setPageTitle(renderer.page_title);
	}

	// Copy over the initial assign options
	// (Mainly for the css className option)
	for (name in renderer.assigns) {
		this.assigns[name] = renderer.assigns[name];
	}

	for (block of renderer.blocks) {

		// Get the new block
		name = block.name;

		// Get the space where this block will be assigned
		assign = this.assigns[name];

		if (!assign) {
			continue;
		}

		// Get the previously assigned block
		old_block = assign.block;

		// Store the new block
		assign.block = block;
		assign.element.block = block;

		// Get the actual block element
		element = this.getBlockElement(name);

		if (!element) {
			continue;
		}

		// Always make sure the initial assign classname is added
		if (assign.options && assign.options.className) {
			Hawkejs.addClasses(element, assign.options.className);
		}

		// If the old block assigned classnames, remove those
		if (old_block && old_block.options && old_block.options.className) {
			Hawkejs.removeClasses(element, old_block.options.className);
		}

		// If the newblock has classes, add those
		if (block && block.options && block.options.className && block.options.content != 'push') {
			Hawkejs.addClasses(element, block.options.className);
		}
	}

	// Emit the created events
	this.emitCreated(renderer);
});

/**
 * Make all links & forms use AJAX
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.2
 * @version  2.0.0
 */
Scene.setMethod(function ajaxify() {

	const that = this;

	if (document.body[AJAXIFIED]) {
		return;
	}

	document.body[AJAXIFIED] = true;

	// Listen for all clicks
	document.body.addEventListener('click', function onClick(event) {

		if (event.defaultPrevented) {
			return;
		}

		// Get the element with the actual link on it
		const element = Blast.Collection.Element.prototype.queryUp.call(event.target, '[href],[data-he-link]');

		if (!element) {
			return;
		}

		that.onLinkClick(element, event);
	});

	// Listen for all form submits (even ones)
	document.body.addEventListener('submit', function onSubmit(event) {

		if (event.target.nodeName != 'FORM' || event.defaultPrevented) {
			return;
		}

		const form = event.target;

		// Do nothing if no valid action was found
		if (!that.getValidInternalAction(form) || form.dataset.heLink == 'false') {
			return;
		}

		that.onFormSubmit(form, event);
	});
});

/**
 * Get a valid internal link href
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String|HTMLElement}   input
 *
 * @return   {String}
 */
Scene.setMethod(function _getValidInternalLink(input, property) {

	var link,
	    val;

	if (typeof input == 'string') {
		link = input;
	} else if (input) {
		// Get the actual attribute value
		// (because the "href" property returns a full url)
		val = input.getAttribute(property);

		link = input[property] || input.dataset[property] || val;
	}

	// If an "action" link is wanted, we should fallback to the current location
	if (!link && property == 'action') {
		link = window.location.href;
	}

	if (!link) {
		return '';
	}

	if (link[0] == '/') {
		if (link[1] != '/') {
			// Regular internal path found
			return link;
		}
	} else if (link[0] == '#') {
		return link;
	} else if (val && val[0] == '#') {
		return val;
	}

	if (link.indexOf('javascript:') === 0) {
		return '';
	}

	let url = Blast.Classes.RURL.parse(link, window.location);

	// Make sure it's a HTTP(s) link
	if (url.protocol && url.protocol.indexOf('http') == -1) {
		return '';
	}

	if (url.hostname != window.location.hostname) {
		return '';
	}

	// If the protocol of the current page is HTTPS,
	// and the link refers to HTTP, force it to become a HTTPS request
	// (Or else an error will be thrown)
	if (url.protocol == 'http:' && window.location.protocol == 'https:') {
		url.protocol = 'https:';
	}

	return link;
});

/**
 * Get a valid internal href link
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String|HTMLElement}   input
 *
 * @return   {String}
 */
Scene.setMethod(function getValidInternalHref(input) {
	return this._getValidInternalLink(input, 'href');
});

/**
 * Get a valid internal action link
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String|HTMLElement}   input
 *
 * @return   {String}
 */
Scene.setMethod(function getValidInternalAction(input) {
	return this._getValidInternalLink(input, 'action');
});

/**
 * Detect a double click
 * 
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.2
 * @version  2.0.2
 *
 * @param    {*}        request
 * @param    {Number}   min_duration
 */
Scene.setMethod(function detectDoubleClick(request, min_duration) {

	if (!request) {
		return false;
	}

	let time_started = request.time_started;

	if (!time_started && request.request) {
		time_started = request.request.time_started;
	}

	if (!time_started) {
		return false;
	}

	if (!min_duration) {
		min_duration = 1000;
	}

	let difference = Date.now() - time_started;

	if (difference < min_duration) {
		return true;
	}

	return false;
});

/**
 * Method that is called when a link is clicked
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.2
 *
 * @param    {HTMLElement}   element
 * @param    {HTMLEvent}     e
 */
Scene.setMethod(function onLinkClick(element, e) {

	if (e.defaultPrevented) {
		return;
	}

	this.emit('clicked_link', element, e);

	if (e.defaultPrevented) {
		return;
	}

	// Get the target of the link
	let target = element.getAttribute('target');

	if (target && target != '_self') {
		return;
	}

	if (element.dataset.heLink == 'false') {
		return;
	}

	// Get the actual link
	let href = this.getValidInternalHref(element);

	if (!href) {
		return;
	}

	const that = this;

	// Set the focus to the element we just clicked on.
	// This is important for VoiceOver & other screenreaders
	Classes.Element.prototype.forceFocus.call(element, {preventScroll: true});

	// Prevent the browser from handling the link
	if (e) {
		e.preventDefault();
	}

	if (href && href[0] == '#') {

		if (element.classList.contains('js-he-close-dialog')) {
			let dialog = element.closest('he-dialog');

			if (dialog) {
				dialog.close();
			}

			if (href == '#') {
				return;
			}
		};

		if (href.length > 1) {
			return this.scrollTo(href);
		}
	}

	let options = {},
	    segment;

	// See if the history has been turned of client-side
	if (element.dataset.heHistory == 'false') {
		options.history = false;
	}

	// See if scroll is enabled
	if (element.dataset.heScroll == 'false') {
		options.scroll = false;
	}

	if (element.dataset.heSegment) {
		if (element.dataset.heSegment == 'break') {
			// Ignore
		} else {
			// @TODO: better implementation and segment route checking
			segment = element.closest('[data-segment-route]');
		}
	}

	// Limit the change to this element
	if (segment) {
		options.history = false;
		options.root = segment;
	}

	// Set the element we clicked on as the source_element
	options.source_element = element;

	// Ignore double clicks
	if (this.detectDoubleClick(element[ACTIVE_REQUEST])) {
		return;
	}

	let pledge = this.openUrl(href, options, function done(err) {

		// Unset the active request if it's still the same
		if (element[ACTIVE_REQUEST] === pledge) {
			element[ACTIVE_REQUEST] = null;
		}

		if (err) {
			if (typeof this.errorHandler == 'function') {
				this.errorHandler(err, {type: 'openUrl', options: options, url: href});
			} else {
				console.error(err);
			}

			return;
		}

		if (element.classList.contains('js-he-close-dialog')) {
			let dialog = element.closest('he-dialog');

			if (dialog) {
				dialog.close();
			}
		}
	});

	element[ACTIVE_REQUEST] = pledge;
});

/**
 * Mark an element as being busy
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {HTMLElement}   element
 * @param    {Boolean}       busy
 */
Scene.setMethod(function markElementBusy(element, busy) {

	if (busy == null) {
		busy = true;
	}

	if (busy) {
		element.classList.add('he-busy');
	} else {
		element.classList.remove('he-busy');
		element.removeAttribute('data-he-retry-at');
	}
});

/**
 * Method that is called when a form is submitted
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.3
 *
 * @param    {HTMLElement}   form
 * @param    {HTMLEvent}     e
 * @param    {Object}        options
 */
Scene.setMethod(function onFormSubmit(form, e, options) {

	// Get the actual link
	let action = this.getValidInternalAction(form);

	if (!action) {
		return;
	}

	// Get the target of the form
	let target = form.getAttribute('target');

	if (target && target != '_self') {
		return;
	}

	if (form.dataset.heLink == 'false') {
		return;
	}

	let form_data = this.serializeForm(form),
	    method    = form.getAttribute('method'),
	    that      = this;

	if (!options) {
		options = {
			render_error : true
		};
	}

	// Prevent the browser from refreshing the page
	if (e) {
		e.preventDefault();
	}

	// See if the history has been turned of client-side
	if (form.dataset.history == 'false' || form.dataset.heHistory == 'false') {
		options.history = false;
	}

	// See if scroll is enabled
	if (form.dataset.heScroll == 'false') {
		options.scroll = false;
	}

	if (!method || method.toLowerCase() == 'post') {
		options.post = form_data;
	} else {
		options.get = form_data;
	}

	// Set the form we're submitting as the source_element
	options.source_element = form;

	// Ignore double clicks
	if (this.detectDoubleClick(form[ACTIVE_REQUEST])) {
		return;
	}

	let pledge = this.openUrl(action, options, function done(err) {

		// Unset the active request if it's still the same
		if (form[ACTIVE_REQUEST] === pledge) {
			form[ACTIVE_REQUEST] = null;
		}

		if (err) {
			return console.error(err);
		}

		if (form.classList.contains('js-he-close-dialog')) {
			let dialog = form.closest('.js-he-dialog-wrapper');

			if (dialog) {
				dialog.close();
			}
		}
	});

	form[ACTIVE_REQUEST] = pledge;

	return pledge;
});

/**
 * Serialize a form and return an object
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String|HTMLElement}    form
 *
 * @return   {Object}
 */
Scene.setMethod(function serializeForm(_form) {

	var skip_types = ['file', 'reset', 'submit', 'button'],
	    named_elements,
	    form_val,
	    element,
	    result,
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

	if (typeof form[Hawkejs.GET_FORM_DATA] == 'function') {
		result = form[Hawkejs.GET_FORM_DATA]();
	}

	if (!result && typeof form[Hawkejs.SERIALIZE_FORM] == 'function') {
		result = form[Hawkejs.SERIALIZE_FORM]();
	}

	if (!result) {

		result = new FormData(form);
		named_elements = form.querySelectorAll('[name]');

		for (i = 0; i < named_elements.length; i++) {
			element = named_elements[i];
			name = element.getAttribute('name');

			if (!name) {
				continue;
			}

			// Checkboxes & radio buttons can only be added when they are "checked"
			if (element.nodeName == 'INPUT') {
				if (element.type == 'checkbox' || element.type == 'radio') {
					if (!element.checked) {
						continue;
					}
				}
			}

			form_val = result.get(name);
			value = element.value;

			if (!result.has(name) || (form_val == '' && form_val !== value)) {
				result.set(name, value);
			}
		}
	}

	return result;
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
		bottom : parent.bottom - child.bottom,
		height : child.height,
		left   : child.left - parent.left,
		right  : parent.right - child.right,
		top    : child.top - parent.top,
		width  : child.width,
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
 * @version  2.0.1
 *
 * @param    {HTMLElement}   container
 * @param    {HTMLElement}   toElement
 * @param    {Object}        options
 *
 * @return   {Pledge}
 */
Scene.setMethod(function scrollTo(container, toElement, options) {

	var that = this,
	    duration,
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
			return Blast.Classes.Pledge.resolve();

		case 1:
			if (this.exposed && this.exposed.default_scrollto_duration) {
				duration = this.exposed.default_scrollto_duration;
			} else {
				duration = 250;
			}

			toElement = container;
			container = null;
			break;

		case 2:
			if (typeof toElement == 'string' || toElement instanceof HTMLElement) {
				// Keep it as is
			} else {
				options = toElement;
				toElement = container;
				container = null;
			}
			break;
	}

	if (typeof options == 'number') {
		duration = options;
		options = {};
	} else if (!options) {
		options = {};
	} else {
		duration = options.duration;
	}

	if (duration == null) {
		if (this.exposed && this.exposed.default_scrollto_duration) {
			duration = this.exposed.default_scrollto_duration;
		} else {
			duration = 250;
		}
	}

	if (options.duration == null) {
		options.duration = duration;
	}

	if (typeof toElement == 'string') {
		toElement = document.querySelector(toElement);
	}

	if (typeof container == 'string') {
		container = document.querySelector(container);
	}

	if (!container) {
		container = Classes.Element.prototype.getScrollContainer.call(toElement);
	}

	rect = this.getRelativeBoundingClientRect(container, toElement);

	if (!rect) {
		return Blast.Classes.Pledge.resolve();
	}

	// Used to use container.scrollTop, but that doesn't work for body
	if (container == document.body.parentElement) {
		to = container.clientTop + rect.top;
	} else {
		to = container.scrollTop + rect.top;
	}

	if (options.padding) {
		to += options.padding;
	}

	// @TODO: Implement #isFirefox in Protoblast
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

			if (!options.retry) {
				options.retry = 1;
			} else {
				options.retry++;
			}

			if (options.retry == 6) {
				// Do nothing, give up
			} else if (options.retry == 5) {
				Blast.nextTick(function onNextTick() {
					that.scrollTo(document.body, toElement, options);
				});
			} else {
				that.scrollTo(document.body, toElement, options);
			}

			return Blast.Classes.Pledge.resolve();
		}
	}

	let pledge = new Blast.Classes.Pledge(),
	    current_time,
	    start_time,
	    end_time,
	    val;

	// Set the element we're scrolling to
	this.scrolling_to_element = toElement;

	start = container.scrollTop;
	change = to - start;

	function animateScroll(now) {

		if (start_time == null) {
			start_time = now;
			end_time = start_time + duration;
			current_time = 0;
		} else {
			current_time = ~~(now - start_time);
		}

		val = Bound.Math.easeOutQuart(current_time, start, change, duration);

		container.scrollTop = val;

		if (now > end_time) {
			that.scrolling_to_element = null;
			pledge.resolve();
		} else {
			window.requestAnimationFrame(animateScroll);
		}
	};

	window.requestAnimationFrame(animateScroll);

	return pledge;
});

/**
 * Move the browser focus to a specific element.
 * Especially used after an ajax page load
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.4
 * @version  2.0.3
 *
 * @param    {Element|Hawkejs.Renderer}   element   Optional element
 */
Scene.setMethod(function moveBrowserFocus(element) {

	// Detect renderer instance
	if (element && element.expose_to_scene != null) {
		let renderer = element,
		    blocks,
		    block,
		    i;

		element = null;

		if (renderer.focus_block) {
			block = renderer.blocks.get(renderer.focus_block);

			if (block) {
				element = this.getBlockElement(block);
			}
		} else {

			// Get all created blocks
			blocks = renderer.blocks.getAll();

			Bound.Array.sortByPath(blocks, 'block_id');

			for (i = 0; i < blocks.length; i++) {
				block = blocks[i];

				element = this.getBlockElement(block);

				if (element) {
					break;
				}
			}
		}

		if (!element) {
			return;
		}

		// If we appended to the block, see if we can move to an appended element
		if (block.options.append) {
			element = Hawkejs.getFirstElement(block.lines) || element;
		}
	}

	if (element) {
		let options;

		// If we're already scrolling to something,
		// make sure that setting the focus to the element
		// doesn't override that
		if (this.scrolling_to_element) {
			options = {
				preventScroll: true
			};
		}

		Classes.Element.prototype.forceReadableFocus.call(element, options);
	}
});

/**
 * Call the callback when items of the given query appears
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
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
		elements = Bound.Array.cast(query);
	} else {
		if (options.live) {
			if (query.indexOf('.') > -1 || query.indexOf('#') > -1) {
				throw new Error('Live appearances require a single classname');
			}

			elements = document.getElementsByClassName(query);
			live = true;
		} else {
			elements = Bound.Array.cast(document.querySelectorAll(query));
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