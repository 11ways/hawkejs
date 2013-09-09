// Noclient>
if (ClientSide === undefined) var ClientSide = false;
var uglify = require('uglify-js');
var cheerio = require('cheerio');
var jQuery = require('jquery');
var path = require('path');
var fs = require('fs');
var µ = require('./server-utils');
// <Noclient

/**
 * The hawkejs namespace
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.28
 */
var hawkejs = {};

/**
 * Create a link to the utils
 */
hawkejs.µ = µ;

/**
 * Create a link to jQuery
 */
hawkejs.$ = jQuery;

/**
 * Helpers functions for inside views
 */
hawkejs.helpers = {};

/**
 * Asynchronous helpers that are run after the render
 */
hawkejs.drones = {};

/**
 * Helper files to include
 */
hawkejs._helperFiles = [];

/**
 * Require attempt are cached in here
 */
hawkejs._requireCache = {};

/**
 * The base view dir is here
 */
hawkejs._baseDir = false;

/**
 * Is client side support enabled?
 */
hawkejs._client = false;

/**
 * Is client side rendering enabled?
 */
hawkejs._clientSideRender = false;

/**
 * Where can the browser download the file?
 */
hawkejs._clientBrowserPath = false;

/**
 * Print out logs & debugs?
 */
hawkejs._debug = false;

// Place to store values on the client side
hawkejs.storage = {
	
	// Match instructions
	match: {},
	
	// Previous match states AS instructions
	previous: [],
	
	// Next match states AS instructions
	next: []
};

// Create an event emitter on the client side
if (ClientSide) {
	hawkejs.event = new EventEmitter();
}

/**
 * A simple flow control class
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.8
 * @version  0.0.8
 */
function Flow() {
	this.queue = [];
}

/**
 * Add a function to the flow queue
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.8
 * @version  0.0.8
 */
Flow.prototype.add = function add(fnc, parameters) {
	this.queue.push({fnc: fnc, parameters: parameters});
};

/**
 * Do the flow
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.8
 * @version  0.0.8
 */
Flow.prototype.start = function start(callback) {

	var i, counter = 0, that = this, doneCallback, args;

	doneCallback = function doneCallback() {
		counter++;
		if (that.queue.length == counter) {
			callback();
		}
	};

	for (i = 0; i < this.queue.length; i++) {
		args = this.queue[i].parameters;
		if (!args) args = [];
		args.unshift(doneCallback);

		this.queue[i].fnc.apply(null, args);
	}

	// If there are no functions queued, just do the callback
	if (!this.queue.length) callback();
};

/**
 * Render a template based on its path,
 * used for Express integration
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.8
 *
 * @param    {string}    path
 * @param    {object}    options
 * @param    {function}  callback
 */
hawkejs.renderFile = function renderFile (path, options, callback) {

	if (!this._baseDir) {
		// Get the base view directory
		this._baseDir = options.settings.views;
	}
	
	// Get the filename
	var filename = path.replace(this._baseDir + '/', '');
	
	// Get the view/element name (filename without extension)
	var elementname = filename.replace('.ejs', '');

	this.render(elementname, options, false, function ($result, sendObject, payload) {
		
		var returnObject = $result;

		// If the client is going to render the view, send the object
		if (sendObject) {
			callback(null, returnObject);
			return;
		}

		// If sendObject is false or undefined, we want the html 
		returnObject = µ.getHtml($result, true);
		
		// Send the html to the callback
		callback(null, returnObject);
		
	});
	
}

/**
 * Store templates in here
 * @type  {object}
 */
hawkejs.templates = {};

/**
 * Starting point for rendering a template.
 * Prepares all the payload data before actual rendering & DOM modification.
 *
 * This function is NOT called recursively.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.02.05
 *
 * @param    {string}   template   The name of the template to render
 * @param    {object}   variables  The variabled to use
 * @param    {object}   $update    The object to update (if applicable)
 * @param    {function} callback   The callback to make. If none, sync
 */
hawkejs.render = function render (template, variables, $update, callback) {
	
	// Create an alias back to this
	var thisHawk = this;
	
	// Create return var for asynchronous functions
	var returnObject = false;
	
	// Run in sync/block mode?
	var block = !callback;
	
	// Is this meant to be sent back to the client as ajax?
	// Defaults to false
	var forAjax = false;
	
	// Noclient>
	// If hawkejs is one of the variables (set during our middleware)
	// get some more info from the req & res variables
	// Also: only with the middleware can we support ajax rendering
	if (variables.hawkejs) {
		
		this._extractReqData(variables);

		// See if the client can render this page himself
		if (variables.hawkejs.ajax && this._clientSideRender) {
			forAjax = true;
		}
	}
	// <Noclient
	
	var payload = this._preparePayload(variables, template, forAjax);
	
	if (($update || forAjax) && !payload.hawkejs.renderPart) {
		payload.hawkejs.renderPart = template;
	}
	
	// If it's meant for client side rendering, return the payload
	// to the client
	if (forAjax) {
		
		log('Client is requesting a page he can render himself: "' + template + '"');
		
		// Callback with the payload
		if (callback) callback(payload, true);
		
		return payload;
	}

	// Render the ejs template
	this._renderTemplates(template, payload, $update, function($result) {

		// The elements are strings, but the blocks still need joining
		// Also: create a workable element
		thisHawk._joinBlocksBuffer(payload);
		
		// Prepare the element objects
		for (var i in payload.request.elements) {
			
			// Get the element
			var el = payload.request.elements[i];
			
			payload.request.elements[i] = {html: el, $: false, name: i}
		}
	
		// Expand the elements with other elements if wanted
		// (This is updating existing items)
		if (payload.request.expand.length) {
			
			for (var i in payload.request.expand) {
				
				var elementName = payload.request.expand[i];
				
				var expansionElement = payload.request.elements[elementName];
				
				$result = thisHawk.applyChanges(expansionElement, payload);
			}
			
		} else {
			
			// No expansions were requested, so just finalize the original element
			$result = thisHawk.applyChanges($result, payload);
			
		}

		// If this isn't an ajax call, and client side support is enabled,
		// inject the hawkejs-client-side.js file
		if (thisHawk._client && !variables.hawkejs.ajax) {
			thisHawk._addScript({path: thisHawk._clientBrowserPath}, $result);
		}

		// Inject tags (scripts, styles)
		for (var i in payload.request.tags) {
			
			var tag = payload.request.tags[i];
			
			if (tag.type === 'script') {
				thisHawk._addScript(tag, $result);
			} else if (tag.type === 'style') {
				thisHawk._addStyle(tag, $result);
			}
			
		}

		// Prepare the return variable for synchronous runs
		if (block) returnObject = $result;

		var droneName, flow = new Flow();

		for (droneName in payload.request.drones) {
			if (hawkejs.drones[droneName]) {
				flow.add(hawkejs.drones[droneName], [$result]);
			}
		}
		
		flow.start(function() {
			// Send events for created & destroyed blocks
			hawkejs._sendEvents($result, payload);

			if (callback) callback($result, null, payload);
		});
		
	}, block);
	
	return returnObject;
}

/**
 * Render the expansions & implementations.
 * This is the part where I/O could happen
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.23
 * @version  2013.01.23
 *
 * @param    {string}   template   The name of the template to render
 * @param    {object}   variables  The variabled to use
 * @param    {object}   $updateDoc The object to update (if applicable)
 * @param    {function} callback   The callback to make. If none, sync
 */
hawkejs._renderTemplates = function _renderTemplates (template, payload, $updateDoc, callback, block) {

	var thisHawk = this;
	
	var returnValue = false;

	// Do a first render
	this._EjsRender(template, payload, false, function (resultHtml) {

		var rHtml = resultHtml;
		
		var startUpdate = true;
		
		// This function will be called after implementations
		// Even if there were no things to implement
		var afterImplementCall = function() {
			
			// The templatespace we found to put this template in
			var foundTemplateSpace = false;
			
			// Now we look for the elements this template expands,
			// See if it's already available. If it is, we can modify it
			// and start filling in blocks.
			// Which we can also do if no other template is needed!
			if (payload.request.expand.length) {

				// Do not update yet
				startUpdate = false;
				
				// Get the first template
				var expansionTemplate = payload.request.expand.shift();

				// Convert the dom name
				var templateName = expansionTemplate.replace(/\//g, '__');
				
				// Do we have to keep on looking for a template to expand into?
				var keepLooking = true;
				
				// If it is an update, see if we can find the template to expand into there
				if ($updateDoc) {
					var $selection = µ.select($updateDoc, 'hawkejs[data-hawkejs-from-template="' + templateName + '"]');
					keepLooking = !$selection.length;
					
					if (!keepLooking) foundTemplateSpace = templateName;
					
				}
			
				// Keep on looking if we did not find the template we want to expand into
				if (keepLooking) {
					thisHawk._renderTemplates(expansionTemplate, payload, $updateDoc, callback, block);
				} else {
					startUpdate = true;
				}
			}
			
			if (startUpdate) {
				if (foundTemplateSpace) {
					log('We can start updating after finding template "' + templateName + '" to put "' + template + '" in!');
				} else {
					if (!payload.request._renderTemplatesHasCalledBack) {
						log('We probably need a complete new document for template "' + template + '"');
						// There's currently no way to gracefully replace the entire page on the client side,
						// so we must use a page reload
						if (ClientSide) {
							window.location = payload.hawkejs.cleanUrl;
						}

						// This method does not work, as it happens before certain tag names
						// are normalized (like "hawkejshead")
						//if (ClientSide) $('html').html(rHtml);
					} else {
						log('Callback has already fired, home found for template "' + template + '"');
					}
				}
			} else {
				log('Update requested, but did not find place to put template "' + template + '"');
			}
			
			// Is there still IO running?
			var IO = !!(payload.__IO.req - payload.__IO.fin);
			
			// Do we still have to wait for something?
			var wait = !!payload.__Wait.implement;
			
			// Perform the _subrender callback ONLY once!
			// This happens after an existing template element has been found
			// that we can update OR when we have looked for all templates
			// we need to look for, but none have been found.
			// In this last case, the entire document should be recreated
			// (since we have nowhere to put it in)
			// This always happens on the server-side.
			// Technically it could happen on the cliend side, too,
			// when an entirely new base is used, though that still needs to be
			// implemented.
			// @todo: implement total page replacement when nothing can be updated.
			if (!payload.request._renderTemplatesHasCalledBack && !IO && !wait) {
				
				// This will tell other recursive instances not to bother
				payload.request._renderTemplatesHasCalledBack = true;
				
				// If no updateble element is found, create a new document
				if (!$updateDoc || !$updateDoc.length) $updateDoc = µ.objectify(rHtml);
				
				// Callback with the result document
				if (callback) callback($updateDoc);
			}
			
		}
		
		if (payload.request.implement.length) {
			// Do implementations
			for (var i = 0; i <= payload.request.implement.length; i++){
				
				// Get the top element object
				var itOptions = payload.request.implement.shift();
				var itName = itOptions.elementname;
				var itType = itOptions.type;
				
				// If the deep option is a number zero or bigger, add 1
				if (!isNaN(parseInt(itOptions.deep)) && itOptions.deep > -1) {
					itOptions.deep++;
				}
				
				// If the deep option is equal to true, set the deep to -1
				if (itOptions.deep === true) itOptions.deep = -1;
				
				// If the deep option is equal to false, set it to 1 (because it needs to run once)
				if (itOptions.deep === false) itOptions.deep = 1;
				
				// Decrease the implement wait counter
				// This makes sure the final callback doesn't fire before
				// all things have been rendered
				payload.__Wait.implement--;
				
				// Make sure we don't implement a template we're originating from
				if (itName != payload.origin) {
					thisHawk._EjsRender(itName, payload, itOptions, afterImplementCall, block);
				}  else {
					// If we were not allowed to implement this template,
					// and it was the last in line to be rendered,
					// we still have to call the callback function!
					if (!payload.request.implement.length) afterImplementCall();
				}
			}
		} else {
			afterImplementCall();
		}
		
	}, block);
	
	return returnValue;
}

/**
 * Convert all the blocks into workable elements
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.22
 * @version  2013.02.04
 *
 * @param    {object}   payload
 */
hawkejs._joinBlocksBuffer = function _joinBlocksBuffer (payload) {
	
	// The elements are strings, but the blocks still need joining
	// Also: create a workable element
	for (var i in payload.request.blocks) {
		
		// Get the block
		var block = payload.request.blocks[i];
		
		// Join the html, using EMPTYNESS as a separator
		var blockHtml = block.buf.join('');
		
		// Store the html back into the item
		payload.request.blocks[i] = {html: blockHtml, $: false, name: i,
		                             template: block.template,
                                 parentblock: block.parent};
	}
}

/**
 * Bind all functions inside an object to the given scope.
 * This function clones the given object.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.7
 * @version  0.0.7
 *
 * @param    {Object}   object   The object containing the functions
 * @param    {Object}   context  The context to bind the functions to
 *
 * @return   {Object}            The cloned object
 */
hawkejs.bindScope = function bindScope (object, context) {

	var i, result = {};
	
	for (i in object) {
		
		// If this property is a function, bind it
		if (typeof object[i] === 'function') {
			result[i] = object[i].bind(context);

		} else {
			
			// If this property is an object not belonging to the prototype,
			// recursively apply this function to it
			if (Object.prototype.toString.call(object[i]) === "[object Object]"
					&& object.hasOwnProperty(i)) {
				result[i] = bindScope(object[i], context);
			}
		}
	}

	return result;
};

/**
 * Prepare the payload object.
 *
 * The payload contains:
 * - scope    {object}
 * - request  {object}
 *
 * The variables will be injected into the root, as will the helpers.
 * Helpers will overwrite variables with the same name.
 * 
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.21
 * @version  2013.09.10
 *
 * @param    {object}   variables   The variables to inject into the payload
 * @param    {string}   template    The original template name
 * @param    {boolean}  forAjax     Is this payload for ajax?
 *
 * @returns   {object}  payload
 */
hawkejs._preparePayload = function _preparePayload (variables, template, forAjax) {
	
	if (!variables) {
		variables = {
			hawkejs: {}
		};
	}
	
	// Add the hawkejs object if it isn't there. This will
	// mostly be the case for direct (test) calls to the render function
	if (variables.hawkejs === undefined) variables.hawkejs = {};

	// See if we need to enable debugging on the client side
	if (ClientSide && variables.hawkejs.debug) this._debug = true;
	
	// If the __hasBeenPrepared value is set, we don't need to do anything more
	if (variables.__hasBeenPrepared) {
		
		if (variables.__reAddHelpers) {
			$.extend(variables, this.helpers);
			variables.__reAddHelpers = false;
		}
		
		return variables;
	}
	
	var payload = {};
	
	// The buffer will be stored in here
	payload.scope = {};
	payload.request = {};

	// Drones to run after the render
	payload.request.drones = {};
	
	// Expansions of the current element, happen in order
	// (Working element will be inserted into this expansion)
	payload.request.expand = [];
	
	// Elements to be implemented
	// (Implementations will be inserted into the working element)
	payload.request.implement = [];
	
	// Blocks generated inside a template will be stored in here
	payload.request.blocks = {};
	
	// A template update chain, used for partial rendering updates
	payload.request.templateChain = [];
	
	// Elements (other templates, like expansions & implementations)
	payload.request.elements = {};
	
	// Tags to be injected are stored here
	payload.request.tags = {};
	
	// Update instructions when the given location matches our url
	// The client needs to know about this, so it is injected as javascript
	payload.request.match = {};
	
	// Store used items in here
	payload.request.used = {};
	payload.request.used.blocks = {};
	payload.request.used.implementations = {};
	
	// Store destroyed items in here
	payload.request.destroyed = {};
	payload.request.destroyed.blocks = {};
	payload.request.destroyed.implementations = {};
	
	// Store element/block specific code in here
	payload.request.code = {};
	
	// The original template called
	payload.origin = template;
	
	// History saves
	payload.history = {};
	
	// Previous page
	// @todo: implement this!
	payload.history.previous = false;
	payload.history.next = false;
	
	// Also create a link to the variables in the payload,
	// even though we'll also add them one level further down
	payload.scope.variables = variables;
	
	// Add an object in the scope to store temporary stuff
	payload.scope.temp = {};
	
	// Make sure no callbacks are still waiting for an answer
	// before putting out the final result
	payload.__IO = {req: 0, fin: 0};
	
	payload.__Wait = {implement: 0};
	
	// Indicate this payload has already been prepared
	payload.__hasBeenPrepared = true;
	
	// The _renderTemplates function is an asynchronous AND recursive function
	// So we need to make sure this callback doesn't happen twice
	payload._renderTemplatesHasCalledBack = false;
	
	// Indicate we do not need to readd the helpers, even if we're prepared
	payload.__reAddHelpers = false;
	
	var passHelpers = this.helpers;

	// If this payload is meant to be sent back to the client,
	// remove certain stuff AND make sure we do not add helper functions
	if (forAjax) {
		
		// Remove the _locals entry
		delete variables._locals;
		
		// Remove the req & res element
		delete variables.hawkejs.req;
		delete variables.hawkejs.res;
		
		// Reset the has been prepared
		payload.__hasBeenPrepared = false;
		
		// Do not add the helpers
		passHelpers = {};
	}
	
	/**
	 * Extend the payload:
	 * - First add all the variables to the root of the object
	 * - Only THEN do we add the helpers
	 * => This way no variable can override a helper
	 *    This also means certain variables can't be set in the root
	 */
	jQuery.extend(payload, variables, {__helpers: passHelpers});
	
	return payload;
}

/**
 * After the EJS render has finished we can start updating the document
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.8
 *
 * @param    {object}   $document      The object to update
 * @param    {object}   payload        The payload
 */
hawkejs.applyChanges = function applyChanges ($document, payload) {

	// Insert implementations
	// This function is also called inside _insertBlock()!
	this._insertImplementation($document, payload);
	
	// Insert blocks into spaces
	this._insertBlock($document, payload);
	
	// Before doing url matches, revert to the previous state
	if (ClientSide && this.storage.previous.length) {
		// @todo: check for history action (going back/forward)
		this._applyAttributes($document, this.storage.previous[0], false);
	}
	
	// Start adding client scripts, sent from the server but not from a view
	for (var i in payload.hawkejs.clientcode) {
		var t = payload.hawkejs.clientcode[i];
		hawkejs._addScript(t, $document);
	}
	
	// Do url match events
	this._matchLocation($document, payload);
	
	// Now add client scripts sent from views
	this._addViewCode($document, payload);

	// Now apply parent stuff
	this._addParentClass($document);
	
	// Return the element
	return $document;
}

/**
 * Add ascending classes,
 * instructions from the children to the parents.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.8
 */
hawkejs._addParentClass = function _addParentClass($document) {

	var elements = µ.select($document, '[data-add-parent-class]'),
	    element,
	    value,
	    i;

	for (i = 0; i < elements.length; i++) {

		element = elements[i];

		if (ClientSide) {
			value = element.getAttribute('data-add-parent-class');
			$(element).parent().addClass(value);
		} else {
			value = element.attribs['data-add-parent-class'];

			if (element.parent) {
				// Make sure there is a class attribute on the parent
				if (typeof element.parent.attribs['class'] === 'undefined') {
					element.parent.attribs['class'] = '';
				}

				element.parent.attribs['class'] += ' ' + value;
			}
		}
	}
};

/**
 * Send events for created & destroyed blocks & templates
 *
 * @todo: add "implementation" events, now only blocks are sent
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.02.05
 * @version  2013.02.22
 *
 * @param    {object}   $document    The object to update
 * @param    {Object}   payload      The payload
 */
hawkejs._sendEvents = function _addViewCode ($document, payload) {
	
	var d = payload.request.destroyed;
	var u = payload.request.used;
	
	// Get the render variables we'll pass to the event listeners
	var render_variables = jQuery.extend({}, payload.scope.variables);
	
	// Delete certain items that could cause a circular reference
	delete render_variables._locals;
	delete render_variables.hawkejs;
	
	var code = '';

	// Emit an event for every destroyed block
	for (var i in d.blocks) {
		
		var db = d.blocks[i];

		var eventNames = [
			'destroy:block',
			'destroy:block[' + db.name + ']',
			'destroy:template[' + db.old_template + ']-block',
			'destroy:template[' + db.old_template + ']-block[' + db.name + ']',
		];
		
		// @todo: the render_variables are stringified each time, this is a waste of resources
		var params = [db.name, db.new_template, db.old_template, render_variables];
		
		for (var jn in eventNames) {
			var eventName = eventNames[jn];
			
			code += 'hawkejs.event.emitEvent("' + eventName + '", ' + JSON.stringify(params) + ');\n';
			
		}
	}
	
	// Emit an event for every created block
	for (var i in u.blocks) {
		
		var ub = u.blocks[i];
		
		var eventNames = [
			'create:block',
			'create:block[' + ub.name + ']',
			'create:template[' + ub.template + ']-block',
			'create:template[' + ub.template + ']-block[' + ub.name + ']'
		];
		
		var params = [ub.name, ub.template, render_variables];
		
		for (var jn in eventNames) {
			var eventName = eventNames[jn];
			
			code += 'hawkejs.event.emitEvent("' + eventName + '",' + JSON.stringify(params) + ');\n';
			
		}
	}
	
	var c = { type: 'script',
		path: false,
		code: code,
		destination: 'bottom'
	};

	hawkejs._addScript(c, $document);
}

/**
 * Send code from views to the client
 *
 * @todo: finish implementation
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.02.04
 * @version  2013.02.04
 *
 * @param    {Cheerio}   $origin   The origin element
 * @param    {Object}    payload   The payload
 */
hawkejs._addViewCode = function _addViewCode ($origin, payload) {
	
	var u = payload.request.used;
	
}

/**
 * Perform all the href matching.
 * Also stores the instruction on the client side
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.25
 * @version  2013.01.27
 *
 * @param    {Cheerio}   $origin   The origin element
 * @param    {Object}    payload   The payload
 */
hawkejs._matchLocation = function _matchLocation ($origin, payload) {

	// Store the match instructions on the client
	this._extendClientVar('match', payload.request.match, $origin);
	
	if (ClientSide) {
		var matchObject = this.storage.match;
	} else {
		var matchObject = payload.request.match;
	}
	
	// The source page href we are on now
	var hereSource = payload.hawkejs.matchSource;
	
	// The full href we are on now
	var hereFull = payload.hawkejs.originalUrl;

	// What "here" to use
	var here = false;
	if (matchObject[hereSource]) here = hereSource;
	else if (matchObject[hereFull]) here = hereFull;
	
	var matchresult = {};
	
	// See if there is an entry for this href, full or source
	if (matchObject[hereSource]) matchresult = matchObject[hereSource];
	else if (matchObject[hereFull]) matchresult = matchObject[hereFull];
	
	// Store the previous status in here
	var previous = {here: here, $this: false, status: {}};
	
	for (var elementid in matchObject[here]) {
		
		// Create a previous entry
		previous.status[elementid] = {};
		
		// Get the instructions
		var instructions = matchObject[here][elementid];
		
		// Select the destination
		var $this = µ.select($origin, '#' + elementid);
		
		// Store this object if we're on the client side
		if (ClientSide) previous.$this = $this;
		
		// Apply the changes
		this._applyAttributes($this, instructions, previous.status[elementid]);
		
	}
	
	// Store the previous settings on the client
	this._unshiftClientVar('previous', previous, $origin);
	
	// Delete $this, history api doesn't allow it
	var undoMatch = jQuery.extend({}, previous);
	delete undoMatch.$this;
	
	// And also store them in the payload, for history stuff
	payload.request.undoMatch = undoMatch;
}

/**
 * Apply attributes to the given $element
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.25
 * @version  2013.01.25
 *
 * @param    {object}   $this          The document to update
 * @param    {object}   ins            The instructions to execute
 * @param    {object}   previous       Place where previous states can be stored
 *                                     AS instructions
 */
hawkejs._applyAttributes = function _applyAttributes ($this, ins, previous) {

	var instructions = ins;
	
	// If a status entry is available, then this is
	// an array of elementid's we need to apply attributes to
	if (ins && ins.status) {

		// We were passed an entire object of elements to update ...
		for (var elementid in ins.status) {
			
			var givePrev = false;
			
			// Create an entry for this element
			if (previous && !previous[elementid]) {
				previous[elementid] = {};
				givePrev = previous[elementid];
			}
			
			// Select the target
			var $target = µ.select($this, '#' + elementid);
			
			// Recursively apply attributes
			this._applyAttributes($target, ins.status[elementid], givePrev);
		}
		
		// Do not execute the code any further
		return;
	}
	
	// Store the attributes as they are now
	for (var attribute in instructions) {
		
		// Certain attributes do not have to be processed
		if (attribute == 'sourceId') continue;
		
		// Get the new value
		var value = instructions[attribute];
		
		// Recurse when we reach a parent object
		if (attribute == 'parent') {
			
			var prevlink = false;
			
			// Create a previous entry for the parent
			if (previous) {
				previous[attribute] = {};
				prevlink = previous[attribute];
			}
			
			hawkejs._applyAttributes($this.parent(), value, prevlink);
			continue;
		}
		
		if (attribute == 'content') {
			
			var oldVal = $this.text();
			
		} else {
		
			// Get the old value
			var oldVal = $this.attr(attribute);
			
			// If oldVal is undefined, we need to add an empty string
			if (oldVal === undefined) oldVal = ' ';
		}
		
		// Do not replace class, but append
		if (attribute == 'class') {
			
			$this.addClass(value);
			
			// History, however, must remove this class
			if (previous) previous['replaceClass'] = oldVal;
			continue;
			
		} if (attribute == 'replaceClass') {
			
			// Remove all current classes
			// @bug: This doesn't work in jQuery 1.9.1 (though only on our sites..)
			$this.removeClass();
			
			// Use the plain javascript property
			if (typeof $this[0] != 'undefined') {
				$this[0].className = '';
			}

			// Add the new class
			$this.addClass(value);
			
			if (previous) previous['replaceClass'] = oldVal;
			
		} else if (attribute == 'content') {
			$this.html(value);
		} else {
			$this.attr(attribute, value);
		}
		
		// Add it to the previous entry
		if (previous) previous[attribute] = oldVal;
	}

}

/**
 * Fill in all implementation spaces
 * You pass the Cheerio document, and it looks for things inside the payload
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.20
 * @version  2013.02.05
 *
 * @param    {Cheerio}   $origin   The origin element
 * @param    {Object}    payload   The payload
 */
hawkejs._insertImplementation = function _insertImplementation ($origin, payload) {

	var $spaces = µ.select($origin, 'hawkejs[data-hawkejs-implement]');

	// Store the amount of spaces
	var spaceNr = $spaces.length;

	// Go over every space like this (don't use for...in! It goes over properties)
	for (var i = 0; i < spaceNr; i++) {
		
		// Cheeriofy this space
		var $this = µ.objectify($spaces[i], $origin);
		
		var elementname = $this.attr('data-hawkejs-implement');
		
		// Return the forwarsh slash
		elementname = elementname.replace('__', '/');
		
		// If the element exists, fill it in!
		if (payload.request.elements[elementname]) {

			// Create a link to the block
			var b = payload.request.elements[elementname];
			
			// Create a clone of the block we want to insert
			// Because we might need the original block for another space
			var $clone = µ.clone(b); //µ.objectify(b.html);
			//var $clone = µ.objectify(b.html);
			//log($clone, 1);
			//var t = $clone.clone();
			//
			// insert the implementations here, too
			this._insertImplementation($clone, payload);
			
			// Indicate this element has been used during this render
			payload.request.used.implementations[elementname] = {name: elementname};
			
			$this.html(hawkejs.unescape$(µ.getHtml($clone)));
		} else {
			log ('Element space "' + elementname + '" was found in the document, '
				+ 'but no new data was provided. Keeping existing content');
		}
	}
}

/**
 * Fill in all spaces inside an element or block.
 * You pass the Cheerio document, and it looks for things inside the payload
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.21
 *
 * @param    {Cheerio}   $origin   The origin element
 * @param    {Object}    payload   The payload
 */
hawkejs._insertBlock = function _insertBlock ($origin, payload) {

	var $spaces = µ.select($origin, 'hawkejs[data-hawkejs-space]');
	
	// Store the amount of spaces
	var spaceNr = $spaces.length;
	
	// Go over every space like this (don't use for...in! It goes over properties)
	for (var i = 0; i < spaceNr; i++) {
		
		// Cheeriofy this space
		var $this = µ.objectify($spaces[i], $origin);
		
		var blockname = $this.attr('data-hawkejs-space');
		
		// Return the forwarsh slash
		blockname = blockname.replace('__', '/');
		
		// If a block exists, fill it in!
		if (payload.request.blocks[blockname]) {
			
			// Create a link to the block
			var b = payload.request.blocks[blockname];
			
			// If we're on the client side, we have to see what was destroyed
			if (ClientSide) {

				var $destroyed = µ.select($this, 'hawkejs[data-hawkejs-block]');
				
				// Go over every block we're about the destroy
				for (var dd = 0; dd < $destroyed.length; dd++) {
					
					// Create a jQuery object
					var $d = µ.objectify($destroyed[dd], $destroyed);
					
					// Get the blockname
					var dblockname = $d.attr('data-hawkejs-block');
					
					// Get the original templatename
					var dtemplate = $d.attr('data-hawkejs-from-template').replace('__', '/');
					
					payload.request.destroyed.blocks[dblockname] = {
						name: dblockname,
						new_template: b.template,
						old_template: dtemplate
					};
					
				}
				
			}
			
			
			// Create a clone of the block we want to insert
			// Because we might need the original block for another space
			var $clone = µ.objectify(b.html);
			
			// insert the blocks here, too
			this._insertBlock($clone, payload);
			
			// And insert implementations into this block
			this._insertImplementation($clone, payload);
			
			var templatedomname = b.template.replace(/\//g, '__');
			
			// Add this template to the space
			//µ.pushAttr($this, 'data-hawkejs-from-template', b.template);
			
			var injectHtml = '<hawkejs id="hawkejs-insert-block-' + blockname + '" '
			               + 'data-hawkejs="true" data-hawkejs-block="'
										 + blockname + '" data-hawkejs-from-template="'
										 + templatedomname + '">'
										 + hawkejs.unescape$(µ.getHtml($clone))
										 + '</hawkejs>';
			
			// Indicate this block has been used during this render
			payload.request.used.blocks[blockname] = {name: blockname, template: b.template};

			// Add the block content into the space
			$this.html(injectHtml);
		}
	}
}

/**
 * Extend a hawkejs variable on the client side *RECURSIVELY*
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.24
 * @version  2013.01.24
 *
 * @param    {string}   name      The name of the variable
 * @param    {object}   value     The value
 * @param    {object}   $element  doc we can add the script to (if from server)
 */
hawkejs._extendClientVar = function _extendClientVar (name, value, $element) {
	
	if (ClientSide) {
		// Make a deep extend
		$.extend(true, this.storage[name], value);
	} else {
		// This code is sent to the client, he will then do the code above us
		this.execOnClient('hawkejs._extendClientVar', [name, value], $element);
	}
}

/**
 * Merge a hawkejs array on the client side
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.24
 * @version  2013.01.24
 *
 * @param    {string}   name      The name of the variable
 * @param    {object}   value     The value
 * @param    {object}   $element  doc we can add the script to (if from server)
 */
hawkejs._mergeClientVar = function _mergeClientVar (name, value, $element) {
	
	if (ClientSide) {
		$.merge(this.storage[name], value);
	} else {
		// This code is sent to the client, he will then do the code above us
		this.execOnClient('hawkejs._mergeClientVar', [name, value], $element);
	}
}

/**
 * Unshift a value to a hawkejs array on the client side
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.25
 * @version  2013.01.25
 *
 * @param    {string}   name      The name of the variable
 * @param    {object}   value     The value
 * @param    {object}   $element  doc we can add the script to (if from server)
 */
hawkejs._unshiftClientVar = function _unshiftClientVar (name, value, $element) {
	
	if (ClientSide) {
		if (this.storage[name] === undefined) this.storage[name] = [];
		this.storage[name].unshift(value);
		
	} else {
		// This code is sent to the client, he will then do the code above us
		this.execOnClient('hawkejs._unshiftClientVar', [name, value], $element);
	}
}

/**
 * Push a value to a hawkejs array on the client side
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.24
 * @version  2013.01.24
 *
 * @param    {string}   name      The name of the variable
 * @param    {object}   value     The value
 * @param    {object}   $element  doc we can add the script to (if from server)
 */
hawkejs._pushClientVar = function _pushClientVar (name, value, $element) {
	
	if (ClientSide) {
		if (this.storage[name] === undefined) this.storage[name] = [];
		this.storage[name].push(value);
	} else {
		// This code is sent to the client, he will then do the code above us
		this.execOnClient('hawkejs._pushClientVar', [name, value], $element);
	}
}

/**
 * Execute this function on the client, from the server.
 * Basically a simple function call.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.24
 * @version  2013.01.24
 *
 * @param    {string}   functionname      The function to be called
 * @param    {array}    parameters        The parameters to be passed
 * @param    {object}   $element          doc we can add the script to
 * @param    {string}   destination       Where to put the code
 */
hawkejs.execOnClient = function execOnClient (functionname, parameters, $element, destination) {
	
	// Destination is the bottom of the document by default
	if (destination === undefined) destination = 'bottom';
	
	var passParam = '';
	
	// Create the parameters part of the call
	for (var i in parameters) {
		var p = parameters[i];
		
		if (passParam) passParam += ', ';
		
		passParam += JSON.stringify(p);
	}
	
	var code = functionname + '(' + passParam + ');';
	
	// Add the code to the page
	this._addScript({code: code, destination: destination}, $element);
}

/**
 * Add a script to the element
 *
 * script:
 * - path    {string}   Is this a link to a javascript file?
 * - code    {string}   Or is this a code block?
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.24
 *
 * @param    {object}   script    The script object
 * @param    {Cheerio}  $element  The element to insert it into
 *
 * @returns  {Cheerio}            The modified Cheerio object
 */
hawkejs._addScript = function _addScript (script, $element) {

	if (!script.destination) script.destination = 'anywhere';

	var html = '<script type="text/javascript" ';

	html += 'data-destination="' + script.destination + '" ';

	if (script.path) html += 'src="' + script.path + '" ';

	html += '>';

	if (script.code) {
		html += script.code;
	}

	html += '</script>';

	// Always append to the body on the client side, anything else will fail
	if (ClientSide) {
		$element = $('body');
		script.destination = 'append';
	}

	var newElement = this._addHtml($element, script.destination, html);

	return newElement;
}

/**
 * Add a stylesheet to the element
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.19
 *
 * @param    {object}   style     The style object
 * @param    {Cheerio}  $element  The element to insert it into
 *
 * @returns  {Cheerio}            The modified Cheerio object
 */
hawkejs._addStyle = function _addStyle (style, $element) {

	var attributes = ' ';

	for (var name in style.attributes) {

		var value = style.attributes[name];

		attributes += name + '="' + value + '" ';

	}

	var html = '<link type="text/css" rel="stylesheet" href="' + style.path + '"' + attributes + '/>';

	var newElement = this._addHtml($element, style.destination, html);

	return newElement;
}

/**
 * Replace certain html tags because they are stripped by jquery
 * The tags are:
 * - html
 * - head
 * - body
 * - script
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.21
 * @version  2013.01.21
 *
 * @param    {string}   html    The html to escape
 *
 * @returns  {string}           The escaped html
 */
hawkejs.escape$ = function escape$ (html) {
	
	// We won't escape the doctype, but that's useless after a pageload anyway
	
	html = html.replace(/\<html/g, '<hawkejshtml data-hawkejs-shim="html"');
	html = html.replace(/\<\/html/g, '</hawkejshtml');
	html = html.replace(/\<head/g, '<hawkejshead data-hawkejs-shim="head"');
	html = html.replace(/\<\/head/g, '</hawkejshead');
	html = html.replace(/\<body/g, '<hawkejsbody data-hawkejs-shim="body"');
	html = html.replace(/\<\/body/g, '</hawkejsbody');
	
	// Also replace <script> tags, otherwise they could be executed too soon
	html = html.replace(/\<script/g, '<hawkejsscript data-hawkejs-shim="script"');
	html = html.replace(/\<\/script/g, '</hawkejsscript');
	
	return html;
}

/**
 * Unescape escaped jQuery html
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.21
 * @version  2013.01.21
 *
 * @param    {string}   html    The html to escape
 *
 * @returns  {string}           The escaped html
 */
hawkejs.unescape$ = function escape$ (html) {
	
	// Reinsert html, head and body tags
	html = html.replace(/\<hawkejshtml data-hawkejs-shim="html"/g, '<html');
	html = html.replace(/\<\/hawkejshtml/g, '</html');
	html = html.replace(/\<hawkejshead data-hawkejs-shim="head"/g, '<head');
	html = html.replace(/\<\/hawkejshead/g, '</head');
	html = html.replace(/\<hawkejsbody data-hawkejs-shim="body"/g, '<body');
	html = html.replace(/\<\/hawkejsbody/g, '</body');
	
	// Also replace <script> tags, otherwise they could be executed too soon
	html = html.replace(/\<hawkejsscript data-hawkejs-shim="script"/g, '<script');
	html = html.replace(/\<\/hawkejsscript/g, '</script');
	
	return html;
}

/**
 * Inject some html to the element
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.08.18
 *
 * @param    {object}   $element     The element to insert it into
 * @param    {string}   destination  Where it should go
 * @param    {string}   html         The html to inject
 *
 * @returns  {Cheerio}               The modified Cheerio object
 */
hawkejs._addHtml = function _addHtml ($element, destination, html) {

	var addType = 'append';

	var datadest = destination;
	var doselection = true;

	var $dest = false;
	var after = false;

	// See where this script has to be added
	if (destination === 'anywhere') {
		destination = 'head';
	} else if (destination === 'bottom') {
		destination = 'body'
	} else if (destination === 'top') {
		destination = 'head';
		addType = 'prepend';
	} else if (destination === 'append') {
		doselection = false;
	}

	if (doselection) {
		// Try to get the wanted destination
		if (addType === 'prepend') {
			$dest = µ.select($element, '[data-destination="' + datadest + '"]');
			after = true;
		}

		if (!$dest || !$dest.length) {
			after = false;
			$dest = µ.select($element, destination);
		}
	}

	// If nothing was found, take the element itself as destination
	if (!$dest || !$dest.length) $dest = $element;

	if (addType === 'append') {
		if (ClientSide) {
			$dest.append(html);
		} else {
			$dest.html($dest.html() + html);
		}
	} else if (addType === 'prepend') {

		if (after) {
			$dest.after(html);
		} else {
			$dest.prepend(html);
		}
	}

	return $element;
}

/**
 * Inject some html to the element
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.02.05
 *
 * @param    {object}   $element     The element to insert it into
 * @param    {string}   destination  Where it should go
 * @param    {string}   html         The html to inject
 *
 * @returns  {Cheerio}               The modified Cheerio object
 */
hawkejs._addHtmlNew = function _addHtml ($element, destination, html) {
	
	var addType = 'append';
	
	var name = '';
	var doselection = true;
	
	var $im = false;
	var $dest = false;
	
	var after = false;
	var before = false;
	
	var $super = false;
	
	// normalize destination
	switch (destination) {
		
		case 'anywhere':
			name = 'headBottom';
			destination = 'head';
			before = false;
			after = 'headTop';
			addType = 'prepend';
			break;
		
		case 'top':
			name = 'headTop';
			destination = 'head';
			before = 'headBottom';
			after = false;
			break;
		
		case 'middle':
			name = 'bodyTop';
			destination = 'body';
			before = false;
			after = false;
			addType = 'prepend';
			break;
		
		case 'bottom':
			name = 'bodyBottom';
			destination = 'body';
			before = false;
			after = 'bodyTop';
			break;
		
		case 'last':
			name = 'bodyLast';
			destination = 'body';
			before = 'bodyBottom';
			after = false;
			break;
			
	}
	
	// Select the main destination
	$im = µ.select($element, destination);
	
	// If that isn't found, use the given element
	if (!$im.length) {
		$im = $element;
	} else {
		$super = $element;
	}
	
	// Now select the before or after destination
	$dest = µ.select($im, '[data-destination="' + name + '"]', $super);

	if (before) {
		if (!$dest.length) before = false;
	} else if (after) {
		if (!$dest.length) after = false;
	}
	
	// If nothing was found, take the element itself as destination
	if (!$dest || !$dest.length) {
		$dest = $im;
	} else {
		$super = $element;
	}

	if (before) {
		$dest.before(html);
	} else if (after) {
		$dest.after(html);
	} else {
		
		if (addType == 'prepend') {
			$dest.prepend(html);
		} else {
			$dest.append(html);
		}
		
	}
	
	return $element;
}

/**
 * Render a template with ejs and return the data
 *
 * The asynchronous function getTemplate is called from here
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.7
 *
 * @param    {string}   templatename     The template name (or object)
 * @param    {object}   payload          The payload, options, variables, ...
 * @param    {object}   options          Rendering options
 * @param    {function} callback         The function to callback.
 * @param    {boolean}  block            Disable asynchronous mode?
 */
hawkejs._EjsRender = function _EjsRender (templatename, payload, options, callback, block) {
	
	// Set some overloading stuff
	if (typeof options == 'function') {
		block = callback;
		callback = options;
		options = false;
	}
	
	if (!options) {
		options = {};
		options.deep = -1;
		options.fromstring = false;
	} else {
		// Decrease the deep option by one if above zero
		if (options.deep !== undefined && options.deep !== 0) {
			options.deep--;
		}
	}
	
	if (!options.fromstring) options.fromstring = false;
	
	// How did this element get in the render queue?
	var type = 'regular';
	
	if (typeof templatename == 'object') {
		var to = templatename;
		templatename = to.elementname;
		type = to.type;
	}
	
	// Block is always true if there is no callback
	if (!callback) block = true;
	
	// Don't even bother with all this if the template has already been made
	if (payload.request.elements[templatename] && !options.forcerender) {
		log('Tried to start EJS render for already rendered template: ' + templatename, false, 'info');
		
		if (callback) callback(payload.request.elements[templatename]);
		return payload.request.elements[templatename];
	}
	
	// Set the initial result as false (for blocking returns)
	var result = false;
	
	// Create the callback function we can also run synchronously
	var dialEjs = function dialEjs (templateSource) {
		
		// A "local" scope object, only to be used during the ejs render
		var prive = {
			prive: {
				blocks: {},
				chain: ['_'],
				instructions: [],
				assign: {},
				hawkejs: this,
				template: templatename,
				options: options
			},
			// EJS options
			cache: true,
			filename: templatename
		};

		// Shallow copy the new payload
		var ejsPayload = jQuery.extend({}, payload);

		// Bind the helpers to it
		var boundHelpers = hawkejs.bindScope(payload.__helpers, ejsPayload);

		// Create a new object with the payload and merge in the new prive
		jQuery.extend(ejsPayload, boundHelpers, prive);

		var renderHtml = '',
		     showError = false;
		
		// Try to render using ejs
		try {
			renderHtml = ejs.render(templateSource, ejsPayload);
			if (!renderHtml) showError = true;
		} catch (err) {
			showError = true;
			log(err, false, 'error');
		}

		if (showError) {
			renderHtml = '<hawkejs data-hawkejs="error">Error rendering template</hawkejs>';
			log('The EJS engine encountered an error rendering element ' + templatename, false, 'error');
		}
		
		// Get possible instructions by cloning prive's instructions
		result = {html: renderHtml, instructions: prive.prive.instructions.slice(0)};
		
		// Add the html to the payload request elements object
		payload.request.elements[templatename] = result.html;

		if (callback) callback(result.html);
		
		return result;
	}
	
	// Pass a callback to getTemplate?
	var getTemplateCallback = dialEjs;
	if (block) getTemplateCallback = false;
	
	// Get the template
	var templateSource = this.getTemplate(templatename, payload, getTemplateCallback);
	
	if (block) result = dialEjs(templateSource);
	
	return result;
}

/**
 * If a template hasn't been loaded already, get it
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.23
 *
 * @param    {string}   name      The template name to get
 * @param    {object}   payload   The payload
 * @param    {function} callback  The callback to make, if none: sync.
 * 
 * @returns  {string}   The template code
 */
hawkejs.getTemplate = function getTemplate (name, payload, callback) {
	
	// Create an alias for the callbacks
	var thisHawk = this;
	
	// See if we already tried to get this template
	if (this._requireCache[name]) {
		
		// We required it before, see if it was found, too
		if (this.templates[name]) {
			if (callback) callback(this.templates[name]);
			return this.templates[name];
		} else {
			// Not found, return empty string
			log('Tried to get template that does not exist: "' + name + '"', false, 'error');
			if (callback) callback('');
			return '';
		}
		
	} else {
		
		var getPath = this._baseDir + '/' + name + '.ejs';
		
		// Only attempt to load it if the basedir is set
		if (this._baseDir) {
			
			// Synchronous code
			if (!callback) {
				try {
					
					// Get the file with blocking calls
					
					log('Getting "' + name + '" SYNCHRONOUSLY ...', false, 'verbose');
					
					if (!ClientSide) {
						var original = fs.readFileSync(getPath, 'utf-8');
					} else {
						
						var original = '';
						
						jQuery.ajax({url: getPath,
								success: function(result) {original = result;},
								async:   false
					 });
						
					}
					
					log('... SYNCHRONOUS calls are done.', false, 'verbose');
	
					// Store the template and return the modified code
					var modcode = this.storeTemplate(name, original);

					return modcode;
					
				} catch (err) {
					
					log('Tried to get template "' + name + '", but was unable to open file', false, 'error');
					
					// Return an empty string
					return '';
				}
			} else {
				
				// Get the files asynchronously
				payload.__IO.req++;
				
				if (!ClientSide) {
					fs.readFile(getPath, 'utf-8', function (err, result) {
						
						payload.__IO.fin++;
						
						if (err) {
							log('Tried to get template "' + name + '", but was unable to open file', false, 'error');
							callback('');
						}
						
						// Store the template and callback with the modified code
						var modcode = thisHawk.storeTemplate(name, result);
						
						callback(modcode);
					});
				} else {
					// Client side
					jQuery.ajax({url: getPath, success: function(result) {
						
						payload.__IO.fin++;
						
						var modcode = thisHawk.storeTemplate(name, result);
						
						callback(modcode);
						
					}})
				}
			}
		
		} else {
			log('Tried to get template, but base view dir is not set. Template not loaded: ' + name, false, 'error');
			
			if (callback) callback('');
			
			return '';
		}
	}
}

/**
 * Store a template
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.21
 *
 * @param    {string}    name     The template name to store
 * @param    {string}    source   The template code
 * @returns  {string}    The modified template code
 */
hawkejs.storeTemplate = function storeTemplate (name, source) {
	
	// Always prepend this code to the template, in order to expose the buffer
	var buffercode = '<% this.buf = buf %><% render_start(buf, __stack) %>';
	var endcode = '<% render_end(buf) %>';
	
	// On the client side we have to rename certain tags so jQuery won't mess with them
	if (ClientSide) source = this.escape$(source);
	
	// Store the template content in this variable
	this.templates[name] = buffercode + source + endcode;
	
	// Also indicate this file has been loaded already
	this._requireCache[name] = true;
	
	return this.templates[name];
}

/**
 * Load a template directory
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.17
 */
hawkejs.loadDirectory = function loadDirectory (path, subdir) {
	
	// Store it with this subdir
	if (subdir === undefined) subdir = '';
	
	// A link to this object
	var thisHawk = this;
	
	// Set the base dir
	var fullpath = './';
	
	// If the given path is absolute, remove the basedir
	if (path.charAt(0) == '/') fullpath = '';
	
	// If the given path already starts with a dot, also remove the basedir
	if (path.charAt(0) == '.') fullpath = '';
	
	// Now add the given dir
	fullpath += path;
	
	fs.readdir(fullpath, function (err, files){
		
		if (err) {
			log('Hawkejs error while loading directory "' + fullpath + '"', false, 'error');
			log(err, false, 'error');
		} else {

			for (var i in files) {
				
				var filename = files[i];
				
				(function(filename) {
					
					// See if it really is a file
					fs.stat(fullpath + '/' + filename, function (err, stat) {
						
						if (err) {
							log('Error while loading Hawkejs template, could not stat ' + fullpath + '/' + filename, false, 'error');
							throw err;
						} else if (stat.isDirectory()) {
							
							// Recursively load in this directory
							thisHawk.loadDirectory(fullpath + '/' + filename, subdir + filename + '/');
							
						} else if (stat.isFile()) {
						
							// Get the templatename (without the .ejs extension)
							var template = subdir + filename.split('/').reverse()[0].replace('.ejs', '');
						
							fs.readFile(fullpath + '/' + filename, 'utf8', function read (err, data) {
								if (err) {
									throw err;
								} else {
									
									thisHawk.storeTemplate(template, data);
								}
							});
						}
					});
					
				})(filename);
			}
		}
	});
}

/**
 * Create a serialized representation of an object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.8
 * @version  0.0.8
 */
hawkejs.param = function param(object) {

	var ret = [], name;

	for (name in object) {
		ret.push(encodeURIComponent(name) + '=' + encodeURIComponent(object[name]));
	}

	return ret.join('&');
};

/**
 * HTML Encode a string
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.28
 * @version  2013.01.28
 */
hawkejs.µ.encode = function(html){
	return String(html)
		.replace(/&(?!\w+;)/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
};

/**
 * Copyright Andrée Hansson, 2010
 * Use it however you want, attribution would be nice though.
 * Website:        http://andreehansson.se/
 * GMail/Twitter:  peolanha
 *
 * update 4: Leonardo Dutra, http://twitter.com/leodutra
 *
 * @author   Andrée Hansson
 * @since    2010
 *
 * @param   {object}   superObj
 * @param   {object}   extension
 *
 * @returns {object}   A deeply cloned version of the extension object
 */
hawkejs.µ.cloneobject = function(superObj, extension) {
	
	if (superObj && extension) {
		
		var deep = function() {}; // prepare sword
		
		deep.prototype = superObj; // hold it
		
		superObj = new deep; // pull it
		
		return (deep = function(o, ext) { // concentrate
			var k;
			
			for (k in ext) {
				o[k] = typeof ext[k] === 'object' && ext[k] ? deep({}, ext[k]) : ext[k];
			}
			
			return o;
		})(superObj, extension); // push it deep, slicing
	}
	
	return null;
};

/**
 * This clone function can be used for simple objects
 * that need to be JSONified at a later point.
 * Do note: this will remove functions.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.8
 * @version  0.0.8
 *
 * @param    {Object}   original   The original simple object
 * 
 * @return   {Object}              The JSON-cloned object
 */
hawkejs.µ.cloneSafe = function cloneSafe(original) {
	return JSON.parse(JSON.stringify(original));
};

hawkejs.clone = hawkejs.µ.cloneSafe;

var log = µ.log;

var ejs = require('ejs');

// Noclient>
require('./hawkejs-server')(hawkejs);
// <Noclient

// Require the helpers
require('./helpers')(hawkejs);

// Export the Hawkejs class
module.exports = hawkejs;