module.exports = function hawkejsSceneClass(Hawkejs, Blast) {

	var loadedPaths = {},
	    loadedNames = {},
	    loadingPaths = {},
	    loadingNames = {},
	    Function = Blast.Bound.Function;

	/**
	 * One Scene instance is created on the client side only,
	 * and is valid the entire time the tab is open.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Hawkejs}   parent
	 */
	var Scene = Blast.Classes.Informer.extend(function Scene(parent) {

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

		// The loaded scripts
		this.scripts = new Hawkejs.Blast.Classes.Deck();

		this.styles = {};

		// Exposed variables
		this.exposed = {};

		// Diversion functions
		this.diversions = {};

		this.loadedNames = loadedNames;
		this.loadingPaths = loadingPaths;
		this.loadingNames = loadingNames;

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

		this.enableClientRender = true;

		for (key in Hawkejs.helpers) {
			helper = Hawkejs.helpers[key];

			if (helper.onScene != null) {
				helper.onScene(this);
			}
		}

		this.helpers = {};

		// Listen to readyState changes of the document
		document.addEventListener('readystatechange', onReadystatechange.bind(this));

		// Listen to dialogs
		this.dialogListener();
	});

	/**
	 * Prepare the bottom element property
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Scene.prepareProperty(function bottomElement() {
		return document.getElementsByClassName('js-he-bottom')[0];
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
	 * Register diversion functions
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
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
	 *
	 * @param    {Object}   options
	 */
	Scene.setMethod(function registerRender(options) {

		var that = this;

		if (!this.ready) {
			// Delay this method if the document is not ready yet
			this.afterOnce('ready', this.registerRender.bind(this, options));
			return;
		}

		this.enableClientRender = options.enableClientRender;

		// Expose variables
		Blast.Bound.Object.assign(this.exposed, options.exposeToScene);

		Function.parallel(false, function loadScripts(next) {
			// Get scripts
			that.handleScripts(options, next);
		}, function loadStyles(next) {
			// Get styles
			that.handleStyles(options, next);
		}, function done(err) {

			if (err != null) {
				throw err;
			}

			that.attachHistoryListener();

			// General handling of links, titles, emitting events, ...
			that.generalPostRender(options);

			// Create a view instance
			that.generalView = new Hawkejs.ViewRender(that.hawkejs, true);

			// Inject the server-side viewrender data
			Blast.Bound.Object.assign(that.generalView, options);

			// Init the helpers
			that.generalView.initHelpers();

			// Link the helpers
			that.helpers = that.generalView.helpers;

			// Increase the rendercount
			that.renderCount++;
		});
	});

	/**
	 * Attach the history popstate listener to the window
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Scene.setMethod(function attachHistoryListener() {

		var that = this;

		// Listen to the "popstate" event, a back or forward button press
		window.addEventListener('popstate', function onPopstate(e) {

			var viewRender,
			    content,
			    payload;

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
				// It wasn't found, so we'll just have to re-request the page
				// without adding it to the history again, of course

				// Get the wanted location
				var returnLocation = history.location || document.location;

				// Go there
				// @todo: don't add this to the history again!
				that.openUrl(returnLocation);
			}
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
		    template,
		    scripts,
		    data,
		    type,
		    fnc,
		    el,
		    i;

		scripts = [];

		// Register inline scripts
		for (i = 0; i < renderData.inlineScripts.length; i++) {
			data = renderData.inlineScripts[i];
			eval('fnc = function(el, vars){(' + data.fnc + ').call(this, el, vars)}');
			fnc = fnc.bind(renderData);
			this.once({type: data.type, name: data.block, template: data.template}, fnc);
		}

		if (renderData.inlineEvents) {
			for (i = 0; i < renderData.inlineEvents.length; i++) {
				that.emit.apply(that, renderData.inlineEvents[i].args);
			}
		}

		for (i = 0; i < renderData.scripts.length; i++) {
			scripts = scripts.concat(renderData.scripts[i][0]);
		}

		// Set the template this body comes from
		if (!document.body.getAttribute('data-origin')) {

			template = renderData.lastTemplate;

			blockName = template.name + '__main__';

			// Set the template origin
			document.body.setAttribute('data-template', template.name);

			// Set the name
			document.body.setAttribute('data-name', blockName);

			// Set the active theme
			document.body.setAttribute('data-theme', template.activeTheme);

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

			that.hawkejs.require(scripts, function() {
				that.emit(type, document.body, renderData.variables, data);
			});
		}

		// Emit an event for every new x-hawkejs block added to the DOM
		while (this.newBlocks.length) {

			// Get the first element
			el = this.newBlocks[0];

			type = {
				type     : 'create',
				category : 'block',
				name     : el.getAttribute('data-name'),
				target   : el.getAttribute('data-target'),
				template : el.getAttribute('data-template'),
				theme    : el.getAttribute('data-theme') || 'default',
				default  : el.getAttribute('data-default-content') == 'true'
			};

			data = {
				name     : type.name,
				target   : type.target,
				template : type.template,
				variables: renderData.variables,
				default  : type.default
			};

			// No matter what: remove the js-he-newblock classname,
			// so the element gets removed from the live HTMLCollection
			el.className = el.className.replace(/\bjs-he-newblock(?!-)\b/g, '');

			// Emit the created event
			that.hawkejs.require(scripts, function() {
				that.emit(type, el, renderData.variables, data);
			});
		}

		// Emit an event for every x-hawkejs block that gets new content
		Blast.Bound.Object.each(renderData.blocks, function eachBlock(block, name) {

			var el = that.getBlockElement(name),
			    type,
			    temp,
			    variables,
			    templatename;

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

			type = {
				type     : 'set',
				category : 'block',
				name     : name,
				target   : el.getAttribute('data-target'),
				template : block.template || el.getAttribute('data-template'),
				theme    : el.getAttribute('data-theme') || 'default',
				default  : false
			};

			// Emit the set event
			that.hawkejs.require(scripts, function() {
				that.emit(type, el, variables, block);
			});
		});

		if (renderData.dialogOpen) {
			el = document.getElementById(renderData.dialogOpen);

			if (el) {
				type = {
					type     : 'set',
					category : 'dialog',
					name     : null,
					target   : null,
					template : el.getAttribute('data-template'),
					theme    : el.getAttribute('data-theme') || 'default',
					default  : false
				};

				that.hawkejs.require(scripts, function() {
					that.emit(type, el, renderData.variables);
				});
			}
		}

		that.emit({type: 'rendered', template: renderData.mainTemplate + ''}, renderData.variables, renderData);
	});

	/**
	 * Make an AJAX request
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    options     Options
	 * @param    {Function}  callback    The function to callback to
	 */
	Scene.setMethod(function fetch(href, options, callback) {

		var that = this,
		    useUrl,
		    hajax,
		    post,
		    href,
		    get,
		    url,
		    xhr;

		if (typeof href == 'object' && !(href instanceof Blast.Classes.URL)) {
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

		post = options.post;
		get = options.get;

		// Create an url object
		url = Blast.Classes.URL.parse(href);
		Blast.Bound.URL.addQuery(url, get);

		// Add ajax get parameter
		useUrl = Blast.Classes.URL.parse(href);
		Blast.Bound.URL.addQuery(useUrl, get);

		if (Blast.isIE) {
			hajax = Date.now();
		} else {
			hajax = 1;
		}

		// Add "hajax" GET parameter to fix:
		// * History API storing JSON data as HTML in the cache
		// * IE's stubborn AJAX cache
		Blast.Bound.URL.addQuery(useUrl, 'hajax', hajax);

		// Create the request
		xhr = new XMLHttpRequest();

		// Catch errors
		xhr.addEventListener('error', function transferFailed(e) {
			if (callback) {
				callback(new Error('Transfer failed'));
			}
		}, false);

		// Catch aborts
		xhr.addEventListener('abort', function transferCanceled(e) {
			if (callback) {
				callback(new Error('Transfer aborted'));
			}
		}, false);

		// Set the ajax handler
		xhr.addEventListener('load', function transferComplete(e) {

			var response,
			    reader,
			    result,
			    type;

			response = xhr.response || xhr.responseText;

			// Check for FileReader / Blob supported browsers
			if (typeof FileReader !== 'undefined') {
				reader = new FileReader();

				reader.onloadend = function onReaderLoadend() {
					result = reader.result;

					if (response.type.indexOf('json') > -1) {
						// @todo: add difference between regular & dry json
						result = Blast.Collection.JSON.undry(result);
					}

					callback(null, result, xhr);
				};

				reader.readAsText(xhr.response);
			} else {

				type = xhr.getResponseHeader('content-type') || '';

				if (type.indexOf('json') > -1) {
					result = Blast.Collection.JSON.undry(response);
				}

				callback(null, result, xhr);
			}
		}, false);

		if (post != null) {
			xhr.open('POST', Blast.Bound.URL.toString(useUrl));
		} else {
			xhr.open('GET', Blast.Bound.URL.toString(useUrl));
		}

		// Always get the response as a blob
		xhr.responseType = 'blob';

		xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
		xhr.setRequestHeader('x-hawkejs-request', true);

		if (post != null) {
			xhr.setRequestHeader('content-type', 'application/json');
		}

		// Initialize the request
		Blast.setImmediate(function() {
			if (post != null) {
				xhr.send(JSON.stringify(post));
			} else {
				xhr.send();
			}
		});

		return xhr;
	});

	/**
	 * Browse to a link using AJAX.
	 * The response will be an item this client needs to render.
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    options     Options
	 * @param    {Function}  callback    The function to callback to (with payload)
	 */
	Scene.setMethod(function openUrl(href, options, callback) {

		var that = this,
		    useUrl,
		    hajax,
		    post,
		    href,
		    get,
		    url,
		    xhr;

		if (typeof href == 'object' && !(href instanceof Blast.Classes.URL)) {
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

		post = options.post;
		get = options.get;

		// Create an url object
		url = Blast.Classes.URL.parse(href);
		Blast.Bound.URL.addQuery(url, get);

		// Add ajax get parameter
		useUrl = Blast.Classes.URL.parse(href);
		Blast.Bound.URL.addQuery(useUrl, get);

		if (Blast.isIE) {
			hajax = Date.now();
		} else {
			hajax = 1;
		}

		// Add "hajax" GET parameter to fix:
		// * History API storing JSON data as HTML in the cache
		// * IE's stubborn AJAX cache
		Blast.Bound.URL.addQuery(useUrl, 'hajax', hajax);

		if (options.diversion) {
			Blast.Bound.URL.addQuery(useUrl, 'h_diversion', options.diversion);
		}

		// Create the request
		xhr = new XMLHttpRequest();

		// Catch errors
		xhr.addEventListener('error', function transferFailed(e) {
			if (callback) {
				callback(new Error('Transfer failed'));
			}
		}, false);

		// Catch aborts
		xhr.addEventListener('abort', function transferCanceled(e) {
			if (callback) {
				callback(new Error('Transfer aborted'));
			}
		}, false);

		// Set the ajax handler
		xhr.addEventListener('load', function transferComplete(e) {

			var disposition,
			    downloadUrl,
			    response,
			    fileType,
			    fileBlob,
			    fileName,
			    reader,
			    result,
			    type,
			    a;

			disposition = xhr.getResponseHeader('content-disposition');
			response = xhr.response || xhr.responseText;

			// Intercept file downloads
			if (disposition && disposition.search('attachment') !== -1) {

				// Just browse to it if filereader doesn't exist
				if (typeof FileReader == 'undefined') {
					window.location = href;
					return;
				}

				// Get the filetype
				fileType = xhr.getResponseHeader('content-type');

				// Get the blob
				fileBlob = xhr.response;

				// See if a filename is available
				fileName = /filename="(.*?)"/.exec(disposition);

				if (fileName[1]) {
					fileName = fileName[1];
				} else {
					fileName = href.split('/').pop() || 'download';
				}

				// We don't need to do the anchor trick on IE
				// (It won't work either, access denied)
				if (navigator.msSaveOrOpenBlob != null) {
					return navigator.msSaveOrOpenBlob(fileBlob, fileName);
				}

				downloadUrl = URL.createObjectURL(fileBlob);

				// Create a temporary anchor for manipulating the filename
				a = document.createElement('a');
				document.body.appendChild(a);
				a.style = 'display: none';
				a.href = downloadUrl;

				// Set the filename
				a.download = fileName;

				// Download the file
				a.click();

				window.URL.revokeObjectURL(downloadUrl);

				return;
			}

			// Check for FileReader / Blob supported browsers
			if (typeof FileReader !== 'undefined') {
				reader = new FileReader();

				reader.onloadend = function onReaderLoadend() {

					result = reader.result;

					if (response.type.indexOf('json') > -1) {
						// @todo: add difference between regular & dry json
						result = Blast.Collection.JSON.undry(result);
					}

					that.serverResponse(url, options, result, xhr, callback);
				};

				reader.readAsText(xhr.response);
			} else {

				type = xhr.getResponseHeader('content-type') || '';

				if (type.indexOf('json') > -1) {
					result = Blast.Collection.JSON.undry(response);
				}

				that.serverResponse(url, options, result, xhr, callback);
			}
		}, false);

		if (post != null) {
			xhr.open('POST', Blast.Bound.URL.toString(useUrl));
		} else {
			xhr.open('GET', Blast.Bound.URL.toString(useUrl));
		}

		// Always get the response as a blob
		xhr.responseType = 'blob';

		xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
		xhr.setRequestHeader('x-hawkejs-request', true);

		if (post != null) {
			xhr.setRequestHeader('content-type', 'application/json');
		}

		// Emit the AJAX event before starting the request
		this.emit({type: 'ajax', state: 'begin'}, xhr, url, options, function doAjax() {
			// Initialize the request
			if (post != null) {
				xhr.send(JSON.stringify(post));
			} else {
				xhr.send();
			}
		});
	});

	/**
	 * Browse to a page by modifying window.location
	 * 
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    get         The data to send as GET parameters
	 */
	Scene.setMethod(function reload(url, get) {

		if (url == null) {
			url =  Blast.Collection.URL.parse(window.location.href);
		}

		if (get != null) {
			url.addQuery(get);
		}

		if (typeof console !== 'undefined') {
			console.log('Doing a hard reload to ', url);
		}

		window.location = ''+url;
	});

	/**
	 * Render the AJAX response from the server
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {URL}            url        The requesting URL
	 * @param    {Object}         payload
	 * @param    {XMLHttpRequest} xhr
	 * @param    {Function}       callback
	 */
	Scene.setMethod(function serverResponse(url, options, payload, xhr, callback) {

		var that = this,
		    stateContent,
		    historyUrl,
		    viewRender,
		    fallback;

		// The server might tell us to use a different url for the history
		historyUrl = xhr.getResponseHeader('x-history-url') || url;

		// Make hashes work as expected
		if (url.hash) {
			historyUrl = historyUrl + url.hash;
		}

		if (typeof payload == 'string') {

			fallback = xhr.getResponseHeader('x-fallback-url');

			if (fallback) {
				window.location = fallback;
				return;
			}

			if (callback) {
				callback(new Error('Payload was not an object'), payload);
			}

			return;
		}

		// Make sure there is a baseId
		if (payload.baseId == null) {
			payload.baseId = Date.now();
		}

		// Only create stateContent if it is not explicitly turned off
		if (options.history !== false) {

			// Create a payload clone now
			stateContent = {
				url: historyUrl + '',
				requestUrl: url + '',
				payload: payload
			};

			stateContent = Blast.Collection.JSON.dry(stateContent);
		}

		Function.series(false, function renderPayload(next) {
			viewRender = hawkejs.render(payload, next);

			if (options.diversion) {
				viewRender.diversion = options.diversion;
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

				if (!isChrome && stateData.content.length >= 320000) {
					stateData.zipped = true;
					stateData.content = Blast.Collection.String.compressToUTF16(stateData.content);
				}

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

			if (temp != null) {
				// Scroll to the found element
				hawkejs.scene.scrollTo(temp);
			} else {
				// Scroll to the top
				hawkejs.scene.scrollTo();
			}

			if (callback) callback();
		});
	});

	/**
	 * Apply the client-side render to the current document
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {ViewRender}   viewRender
	 * @param    {Object}       payload
	 * @param    {Function}     callback
	 */
	Scene.setMethod(function applyRenderResult(viewRender, payload, callback) {

		var that = this;

		Function.parallel(false, function loadScripts(next) {
			that.handleScripts(viewRender, next);
		}, function loadStyles(next) {
			that.handleStyles(viewRender, next);
		}, function setAttributes(next) {

			var oldElement,
			    blockName,
			    timerId,
			    element,
			    blocks,
			    block,
			    html;

			blocks = viewRender.blocks;

			// Iterate over every finished block
			for (blockName in blocks) {

				if (viewRender.dialog) {
					if (!Blast.Bound.String.endsWith(blockName, '__main__')) {
						continue;
					}
				}

				// Get the block
				block = blocks[blockName];

				// Get the html
				html = ''+(block||'<b>Error ' + blockName + '</b>');

				if (viewRender.dialog) {

					if (that.bottomElement) {
						element = document.createElement('x-hawkejs');
						element.setAttribute('id', viewRender.dialogOpen);
						element.setAttribute('class', 'js-he-dialog');
						element.setAttribute('data-type', 'dialog');
						that.bottomElement.appendChild(element);
					} else {
						console.log('Bottom not found')
						continue;
					}
				} else {

					// Get the HTMLElement from inside the root
					element = viewRender.getBlockElement(blockName);

					// No element was found for this block, so we're skipping it
					if (!element) {
						continue;
					}
				}

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
			callback(err);
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
	Scene.setMethod(function generalPostRender(viewRender, callback) {

		// If the title is not null
		if (viewRender.pageTitle != null) {
			this.setPageTitle(viewRender.pageTitle);
		}

		// Ajaxify all the anchor links
		this.ajaxify();

		// Emit the created events
		this.emitCreated(viewRender);

		if (callback) callback(null, viewRender);
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

		// Unlike scripts, styles should be loaded parallel.
		// The execution should start directly,
		// and not at the top of the event queue.
		// This is needed to prevent FOUC.
		Function.parallel(false, tasks, callback);
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
					style.onload = function onStyleLoad() {
						callback();
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
		    tasks,
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

		name = path;

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

		if (loadingPaths[path]) {
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
			that.emit({type: 'script', name: name});

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
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.2
	 * @version  1.0.0
	 */
	Scene.setMethod(function ajaxify() {

		var that = this,
		    link,
		    href,
		    i;

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

					var options = {};

					// Prevent the browser from handling the link
					e.preventDefault();

					// Get a possible diversion
					options.diversion = this.getAttribute('data-divert');

					// See if the history has been turned of client-side
					if (this.getAttribute('data-history') == 'false') {
						options.history = false;
					}

					that.openUrl(this.href || this.getAttribute('data-href') || this.getAttribute('href'), options);
				});
			}

			// No matter what: remove the js-he-link classname,
			// so the element gets removed from the live HTMLCollection
			link.classList.remove('js-he-link');
		}
	});

	/**
	 * Get or set a cookie value
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name      The name of the cookie
	 * @param    {Mixed}    value     The value of the cookie
	 * @param    {Object}   options
	 */
	Scene.setMethod(function cookie(name, value, options) {

		var cookies;

		if (arguments.length == 1) {
			// We don't cache cookies, because they can change at any time
			cookies = Blast.Collection.String.decodeCookies(document.cookie);

			return cookies[name];
		}

		if (options == null) options = {};

		// If the value is null or undefined, the cookie should be removed
		if (value == null) {
			options.expires = new Date(0);
		}

		if (typeof options.expires == 'number') {
			options.expires = new Date(options.expires);
		}

		// If no path is given, default to the root path
		if (options.path == null) options.path = '/';

		document.cookie = Blast.Collection.String.encodeCookie(name, value, options);
	});

	/**
	 * Scene specific data
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name      The name of the cookie
	 * @param    {Mixed}    value     The value of the cookie
	 */
	Scene.setMethod(function data(name, value) {

		if (!this.sceneId) {
			this.sceneId = Blast.Classes.Crypto.randomHex(8) || Blast.Classes.Crypto.pseudoHex();
			this.sceneData = {};
		}

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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * Scroll to a certain element
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
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
				container = document.body;
				// Fall through

			case 1:
				duration = 250;
				toElement = container;
				container = document.body;
				break;

			case 2:
				duration = toElement;
				toElement = container;
				container = document.body;
				break;
		}

		if (typeof toElement == 'string') {
			toElement = document.querySelector(toElement);
		}

		if (typeof container == 'string') {
			container = document.querySelector(container);
		}

		rect = this.getRelativeBoundingClientRect(container, toElement);

		// If the top is already 0 nothing needs to happen
		if (rect.top == 0) {
			return;
		}

		to = container.scrollTop + rect.top;

		if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1 || Blast.isIE) {
			if (container == document.body) {
				container = document.documentElement;
			}

			if (toElement == document.body) {
				toElement = document.documentElement;
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

			if(currentTime < duration) {
				setTimeout(animateScroll, increment);
			}
		};

		// Only animate a scroll when the value should actually change
		animateScroll();
	});

	/**
	 * Add the dialog listeners
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Scene.setMethod(function dialogListener() {
		this.on({type: 'set', category: 'dialog'}, function newDialog(el, variables) {

			var wrapper,
			    style;

			style = 'position:fixed;width:100vw;height:100vh;background-color:rgba(0,0,0,0.4);top:0;';

			// Now add flexbox
			style += 'display:flex;flex-flow:row wrap;justify-content:center;'

			// Set flex style for child
			el.setAttribute('style', 'flex:0 0 auto;align-self:center;');

			wrapper = Blast.parseHTML('<x-hawkejs class="js-he-dialog-wrapper" style="' + style + '"></x-hawkejs>');
			wrapper.appendChild(el);

			// Close when the wrapper is clicked
			wrapper.addEventListener('click', function onClick(e) {
				// Only remove the wrapper if it was clicked itself
				if (e.target == wrapper) {
					wrapper.remove();
				}
			});

			document.body.appendChild(wrapper);
		});
	});

	/**
	 * Call the callback when items of the given query appears
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
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
		queue.throttle = 330;

		// Only 1 execution at a time
		queue.limit = 1;

		// Start the queue
		queue.start();

		// Listen to the scroll event
		document.addEventListener('wheel', req);

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
				}
			}

			// Stop all future checks if no elements are left and it's not live
			if (!live && !elements.length) {
				document.removeEventsListener('wheel', req);
				that.removeListener('rendered', req);
				clearInterval(intervalId);
				queue.destroy();
			}
		}

		// Request a check every so many milliseconds
		intervalId = setInterval(req, options.interval);

		// Request the initial check
		req();
	});

	// To get a prettier output in the browser console
	Scene.setMethod(function slice(){});
	Scene.setMethod(function splice(){});

	Hawkejs.Scene = Scene;
};