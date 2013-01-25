if (ClientSide === undefined) var ClientSide = false;

// Noclient>
var uglify = require('uglify-js')
var cheerio = require('cheerio');
//var ce = require('cloneextend');
var jQuery = require('jquery');
var path = require('path');
var ent = require('ent');
var fs = require('fs');

/**
 * Cheerio/jQuery wrapper functions.
 * Uses Cheerio on the server side,
 * jQuery on the client side.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.21
 * @version  2013.01.21
 */
var µ = {};

/**
 * Get a cheerio object,
 * create it if needed
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.21
 */
µ.getObject = function (object) {
	if (!object.$) {
		object.$ = cheerio.load(object.html);
		object.$root = object.$(object.$.root());
	}
	return object.$;
}

/**
 * Clone a cheerio object
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.24
 * @version  2013.01.24
 */
µ.clone = function(object) {
	
	// Version 1: +/- 565 ops/s
	// We used to get and re-parse the html, but that was the old clone way
	var clone = cheerio.load(object.html);

	// Version 2: +/- 573 ops/s
	//µ.getObject(object);
	//
	//var _root = {};
	//
	//// Copies the element, but not by reference.
	//// Still copies sub objects & arrays by reference, though
	//for (var i in object.$._root) {
	//	_root[i] = object.$._root[i];
	//}
	//
	//var clone = object.$;
	//
	//// Overwrite the root
	//clone._root = _root;
	
	// Version 3: +/- 492 ops/s
	//µ.getObject(object);
	//var clone = cheerio.load(object.$.root());
	
	// Version 4: +/- 570 ops/s
	// Using cloneextend
	//µ.getObject(object);
	//var clone = ce.clone(object.$);

	return clone;
}

/**
 * Turn the element into an object
 */
µ.objectify = function (object, $origin) {
	
	if ($origin) {	
		return $origin(object);
	} else {
		return cheerio.load(object);
	}
}

/**
 * Get the HTML
 */
µ.getHtml = function ($object) {
	return $object.html();
}

/**
 * Perform a selection
 */
µ.select = function ($object, selector) {
	return $object(selector);
}
// <Noclient

/**
 * JSON parse an attribute
 *
 * @param    {object}   $object     The jquery/cheerio object
 * @param    {string}   attribute   The attribute to parse
 *
 * @returns  {object}
 */
µ.parseAttr = function parseAttr ($object, attribute) {
	var jsoncode = $object.attr(attribute);
	return JSON.parse(jsoncode);
}

/**
 * Push to an attribute array
 * 
 * @param    {object}   $object     The jquery/cheerio object
 * @param    {string}   attribute   The attribute to parse
 * @param    {string}   value       The value to push
 *
 * @returns  {integer}  The new length of the array
 */
µ.pushAttr = function pushAttr ($object, attribute, value) {
	
	var array = µ.parseAttr($object, attribute);
	
	if (!(array instanceof Array)) {
		array = [];
	}
	
	var len = array.push(value);
	$object.attr(attribute, JSON.stringify(array));
	
	return len;
}

var ejs = require('ejs');

/**
 * A simple log shim function
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.22
 * @version  2013.01.23
 */
var log = function log (message, separate, level, meta) {
	
	if (!internalHawk._debug) return;
	
	if (level === undefined) level = 'info';
	
	if (separate) console.log ('\n>>>>>>>>>>>>>>>>>>>>>>>>>>');
	console.log(message);
	if (separate) console.log ('<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
}

/**
 * The timer class
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.19
 */
var Timer = function Timer () {
	
	this.begin = new Date().getTime();
	this.end = 0;
	this.result = 0;
}

Timer.prototype.get = function () {
	this.end = new Date().getTime();
	this.result = this.end - this.begin;
	
	return this.result;
}

/**
 * The Hawkejs class
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.23
 */
var Hawkejs = function () {
	
	var thisHawk = this;
	
	// NoClient>
	// Provide the express callback
	this.__express = function (path, options, callback) {
		return thisHawk.renderFile(path, options, callback);
	};
	
	// Provide the middleware function
	this.middleware = function (req, res, next) {
		return thisHawk._middleware(req, res, next);
	};
	// <NoClient
	
}

/**
 * A link to Hawkejs' prototype
 */
var hp = Hawkejs.prototype;

/**
 * Require attempt are cached in here
 */
hp._requireCache = {};

/**
 * The base view dir is here
 */
hp._baseDir = false;

/**
 * Is client side support enabled?
 */
hp._client = false;

/**
 * Is client side rendering enabled?
 */
hp._clientSideRender = false;

/**
 * Where can the browser download the file?
 */
hp._clientBrowserPath = false;

/**
 * Print out logs & debugs?
 */
hp._debug = false;

// Place to store values on the client side
hp.storage = {
	
	// Match instructions
	match: {},
	
	// Previous match states AS instructions
	previous: [],
	
	// Next match states AS instructions
	next: []
};

// Noclient>
/**
 * Enable client-side suport
 * This is a blocking feature, but only runs at server boot
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.20
 * @version  2013.01.20
 *
 * @param    {string}   filepath    The serverpath where we can store the file
 * @param    {string}   publicpath  The public path for the browser
 */
hp.enableClientSide = function enableClientSide (filepath, publicpath) {
	
	// Get the client file path and main file (this file) path
	var clientpath = path.resolve(__dirname, 'hawkejs-client.js');
	var mainpath = path.resolve(__dirname, 'hawkejs.js');
	var ejspath = '';
	
	var paths = require.main.paths.slice(0);
	
	// Look in our plugin's node_modules folder first
	paths.unshift(path.resolve(__dirname, '..', 'node_modules'));
	
	// Look for the ejs code
	for (var i in paths) {
		
		var p = paths[i];
		var fptest = path.resolve(p, 'ejs', 'ejs.js');
		
		try {
			
			var ejsStat = fs.statSync(fptest);
			
			// The file has been found!
			if (ejsStat) {
				ejspath = fptest;
				// Break out of the loop
				break;
			}
			
		} catch (err) {
			log('EJS client file not found at ' + fptest, false, 'error');
		}
	}
	
	if (ejsStat) {
		// Read those 3 files
		var clientfile = fs.readFileSync(clientpath, 'utf-8');
		var mainfile = fs.readFileSync(mainpath, 'utf-8');
		var ejsfile = fs.readFileSync(ejspath, 'utf-8');
		
		var clientfilename = 'hawkejs-client-side.js';
		
		var servercodefound = false;
		
		var data = clientfile;
		
		data += mainfile;
		
		/**
		 * Delete code between these 2 strings
		 * (Where the underscore is actually a space)
		 *
		 * //_Noclient>
		 * Code to be deleted!
		 * //_<Noclient
		 * 
		 */
		do {
			if (servercodefound) {
				var txbegin = data.substring(0, scbegin);
				var txend = data.substring(scend + 12);
				data = txbegin + txend;
				
				// Reset the servercodefound to false
				servercodefound = false;
			}
			
			// We do not type in the actual noclient tag, because it'll be matched
			var scbegin = data.indexOf('// ' + 'Noclient>');
			var scend = data.indexOf('// ' + '<Noclient');
			
			if (scbegin > -1 && scend > -1) servercodefound = true;
			
		} while (servercodefound);
		
		// Set the basedir, for now views must always go in /hawkejs
		data += '\n\nhp._baseDir = \'/hawkejs\';\n';
		
		data += '\n}); // The hawkejs module\n\n';
		
		// Now add the ejs modules
		var ejsBegin = ejsfile.indexOf('require.register("ejs.js", function(module, exports, require){');
		
		// Remove everything before the beginning of the useful ejs file
		ejsfile = ejsfile.substring(ejsBegin);
		
		var ejsEnd = ejsfile.indexOf('return require("ejs");');
		
		// Remove everything after the end (including that bit)
		ejsfile = ejsfile.substring(0, ejsEnd);
		
		data += ejsfile;
		
		// Finish the file
		data += '\n\nreturn require("hawkejs-client-side"); \n})();\n'
		
		if (!this._debug) {
			// Uglify the javascript
			var result = uglify.minify(data, {fromString: true, mangle: false});
			
			data = result.code;
		}
		
		fs.writeFile(path.resolve(filepath, clientfilename), data, 'utf-8');
		
		// Indicate we have browser suport
		this._clientBrowserPath = publicpath + '/' + clientfilename;
		
		// Enable client side suport (ajax calls)
		this._client = true;
		
		// Enable client side render
		this._clientSideRender = true;
		
	} else {
		log('Could not enable client side Hawkejs support!', false, 'error');
	}
}

/**
 * Some middleware we will use to extract interesting information
 * from the request, and insert them into the settings object
 * for the render function to use later.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.20
 * @version  2013.01.23
 *
 * @param    {object}    req    The request object
 * @param    {object}    res    The response object
 * @param    {function}  next   The express callback
 */
hp._middleware = function _middleware (req, res, next) {
	
	// Prepare a hawkejs object
	var h = {};
	
	//  Add the request & response object
	h.req = req;
	h.res = res;

	// Add the original url
	h.originalUrl = req.originalUrl;
	
	// Is this an ajax call? Defaults to false
	h.ajax = false;
	
	// Add comments?
	h.comments = true;
	
	// Enable debugging output?
	h.debug = this._debug;
	
	// Add this object to the local vars
	res.locals({hawkejs: h});
	
	// Fire up the next middleware
	// We have to wait to get some more data
	next();
}

/**
 * Since the first middleware couldn't get all of the data yet,
 * because not all of the middleware had finished yet and it still
 * needed to go through routing, we will extract more now.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.20
 * @version  2013.01.20
 *
 * @param    {object}  variables   The variables passed along with the element
 */
hp._extractReqData = function _extractReqData (variables) {
	
	var h = variables.hawkejs;
	var req = h.req;
	var res = h.res;
	
	// Copy the xhr setting
	h.ajax = req.xhr;
	
	// Add the string this route had to match against
	h.matchSource = req.route.path;
	
	// Add this string's converted regex
	h.matchRegex = req.route.regexp;
}

/**
 * Export the express render function through this simple closure
 *
 * "options" this object from Express will always contain these elements
 *
 * - cache          {boolean}
 * - settings       {object}
 * -- env                 {string}
 * -- json spaces         {integer}
 * -- jsonp callback name {string}
 * -- view engine         {string}
 * -- views               {string}  The path to the views
 * -- x-powered-by        {boolean} If true, express will send this header
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.19
 *
 * @param    {string}    path
 * @param    {object}    options
 * @param    {function}  callback
 */
hp.__express = {};
// <Noclient

/**
 * Render a template based on its path,
 * used for Express integration
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.20
 *
 * @param    {string}    path
 * @param    {object}    options
 * @param    {function}  callback
 */
hp.renderFile = function renderFile (path, options, callback) {
	
	var t = new Timer();
	
	if (!this._baseDir) {
		// Get the base view directory
		this._baseDir = options.settings.views;
	}
	
	// Get the filename
	var filename = path.replace(this._baseDir + '/', '');
	
	// Get the view/element name (filename without extension)
	var elementname = filename.replace('.ejs', '');

	this.render(elementname, options, false, function ($result, sendObject) {
		
		var returnObject = $result;
		
		// If sendObject is false or undefined, we want the html 
		if (!sendObject) returnObject = µ.getHtml($result, true);
		
		// Send the html to the callback
		callback(null, returnObject);
		
		log('Rendering file ' + path + ' took ' + t.get() + 'ms', false, 'info');
	});
	
}

/**
 * Store templates in here
 * @type  {object}
 */
hp.templates = {};

/**
 * Starting point for rendering a template.
 * Prepares all the payload data before actual rendering & DOM modification.
 *
 * This function is NOT called recursively.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.23
 *
 * @param    {string}   template   The name of the template to render
 * @param    {object}   variables  The variabled to use
 * @param    {object}   $update    The object to update (if applicable)
 * @param    {function} callback   The callback to make. If none, sync
 */
hp.render = function render (template, variables, $update, callback) {
	
	// Start the timer
	var t = new Timer();
	
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
	
	var payload = this._preparePayload(variables, forAjax);
	
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
			
			if (tag.type == 'script') {
				thisHawk._addScript(tag, $result);
			} else if (tag.type == 'style') {
				thisHawk._addStyle(tag, $result);
			}
			
		}
		
		// Prepare the return variable for synchronous runs
		if (block) returnObject = $result
		
		if (callback) callback($result, null, payload);
		
	}, block);
	
	log('Rendering "' + template + '" took ' + t.get() + 'ms');
	
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
hp._renderTemplates = function _renderTemplates (template, payload, $updateDoc, callback, block) {

	var thisHawk = this;
	
	var returnValue = false;

	// Do a first render
	this._EjsRender(template, payload, false, function (resultObject) {

		var rHtml = resultObject.html;
		var rInstructions = resultObject.instructions;
		
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
					} else {
						log('Callback has already fired, home found for template "' + template + '"');
					}
				}
			} else {
				log('Update requested, but did not find place to put template "' + template + '"');
			}
			
			// Is there still IO running?
			var IO = !!(payload.__IO.req - payload.__IO.fin);
			
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
			if (!payload.request._renderTemplatesHasCalledBack && !IO) {
				
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
			for (var i = 0; i < payload.request.implement.length; i++){
				
				// Get the top element
				var implementTemplate = payload.request.implement.shift();
				
				thisHawk._EjsRender(implementTemplate, payload, false, afterImplementCall, block);
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
 * @version  2013.01.22
 *
 * @param    {object}   payload
 */
hp._joinBlocksBuffer = function _joinBlocksBuffer (payload) {
	
	// The elements are strings, but the blocks still need joining
	// Also: create a workable element
	for (var i in payload.request.blocks) {
		
		// Get the block
		var block = payload.request.blocks[i];
		
		// Join the html, using newline as a separator
		var blockHtml = block.buf.join('\n');
		
		// Store the html back into the item
		payload.request.blocks[i] = {html: blockHtml, $: false, name: i,
		                             template: block.template,
                                 parentblock: block.parent};
	}
}

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
 * @version  2013.01.23
 *
 * @param    {object}   variables   The variables to inject into the payload
 * @param    {boolean}  forAjax     Is this payload for ajax?
 *
 * @returns   {object}  payload
 */
hp._preparePayload = function _preparePayload (variables, forAjax) {
	
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
	jQuery.extend(payload, variables, passHelpers);
	
	return payload;
}

/**
 * After the EJS render has finished we can start updating the document
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.20
 *
 * @param    {object}   $document      The object to update
 * @param    {object}   payload        The payload
 */
hp.applyChanges = function applyChanges ($document, payload) {

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
	
	// Do url match events
	this._matchLocation($document, payload);
	
	// Return the element
	return $document;
}

/**
 * Perform all the href matching.
 * Also stores the instruction on the client side
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.25
 * @version  2013.01.25
 *
 * @param    {Cheerio}   $origin   The origin element
 * @param    {Object}    payload   The payload
 */
hp._matchLocation = function _matchLocation ($origin, payload) {
	
	// Store the match instructions on the client
	this._extendClientVar('match', payload.request.match, $origin);
	
	if (ClientSide) {
		var matchObject = this.storage.match;
	} else {
		var matchObject = payload.request.match;
	}
	
	// The source page href we are on now
	var here = payload.hawkejs.matchSource;

	// Store the previous status in here
	var previous = {here: here, $this: false, status: {}};
	
	// See if there is an entry for this href
	if (matchObject[here]) {
		
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
hp._applyAttributes = function _applyAttributes ($this, ins, previous) {

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
			
			hp._applyAttributes($this.parent(), value, prevlink);
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
			$this.removeClass();

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
 * @version  2013.01.20
 *
 * @param    {Cheerio}   $origin   The origin element
 * @param    {Object}    payload   The payload
 */
hp._insertImplementation = function _insertImplementation ($origin, payload) {

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
			
			$this.html(µ.getHtml($clone));
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
hp._insertBlock = function _insertBlock ($origin, payload) {

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
			               + 'data-hawkejs="true" data-hawkejs-from-template="'
										 + templatedomname + '">'
										 + µ.getHtml($clone)
										 + '</hawkejs>';
			
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
hp._extendClientVar = function _extendClientVar (name, value, $element) {
	
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
hp._mergeClientVar = function _mergeClientVar (name, value, $element) {
	
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
hp._unshiftClientVar = function _unshiftClientVar (name, value, $element) {
	
	if (ClientSide) {
		if (this.storage[name] === undefined) this.storage[name] = [];
		this.storage[name].unshift(value);
		
		log('Unshifted ' + name);
		log(this.storage[name]);
		
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
hp._pushClientVar = function _pushClientVar (name, value, $element) {
	
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
hp.execOnClient = function execOnClient (functionname, parameters, $element, destination) {
	
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
hp._addScript = function _addScript (script, $element) {

	if (!script.destination) script.destination = 'anywhere';

	var html = '<script type="text/javascript" ';
	
	if (script.path) html += 'src="' + script.path + '" ';
	
	html += '>';
	
	if (script.code) html += script.code;
	
	html += '</script>';
	
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
hp._addStyle = function _addStyle (style, $element) {

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
hp.escape$ = function escape$ (html) {
	
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
hp.unescape$ = function escape$ (html) {
	
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
 * @version  2013.01.20
 *
 * @param    {object}   $element     The element to insert it into
 * @param    {string}   destination  Where it should go
 * @param    {string}   html         The html to inject
 *
 * @returns  {Cheerio}               The modified Cheerio object
 */
hp._addHtml = function _addHtml ($element, destination, html) {
	
	// See where this script has to be added
	if (destination == 'anywhere') {
		destination = 'head';
	} else if (destination == 'bottom') {
		destination = 'body'
	}
	
	// Replace <head> & <body> tags because they are stripped by jquery
	if (ClientSide) html = this.escape$(html);
	
	// Try to get the head element
	var $dest = µ.select($element, destination);
	
	// If nothing was found, take the element itself as destination
	if (!$dest) $dest = $element;

	$dest.append(html);
	
	return $element;
}

/**
 * Render a template with ejs and return the data
 *
 * The asynchronous function getTemplate is called from here
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.23
 *
 * @param    {string}   templatename     The template name
 * @param    {object}   payload          The payload, options, variables, ...
 * @param    {boolean}  fromstring       Render the template from given string
 * @param    {function} callback         The function to callback.
 * @param    {boolean}  block            Disable asynchronous mode?
 */
hp._EjsRender = function _EjsRender (templatename, payload, fromstring, callback, block) {
	
	// Block is always true if there is no callback
	if (!callback) block = true;
	
	// Don't even bother with all this if the template has already been made
	if (payload.request.elements[templatename]) {
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
				template: templatename
			},
			// EJS options
			cache: true,
			filename: templatename
		};
		
		// Create a new object with the payload and merge in the new prive
		var ejsPayload = jQuery.extend({}, payload, prive);
		
		var renderHtml = '';
		
		// Try to render using ejs
		try {
			renderHtml = ejs.render(templateSource, ejsPayload);
		} catch (err) {
			renderHtml = '<hawkejs data-hawkejs="error">Error rendering template</hawkejs>';
			log('The EJS engine encountered an error rendering element ' + templatename, false, 'error');
			log(err, false, 'error');
		}
		
		// Get possible instructions by cloning prive's instructions
		result = {html: renderHtml, instructions: prive.prive.instructions.slice(0)};
		
		// Add the html to the payload request elements object
		payload.request.elements[templatename] = result.html;
		
		if (callback) callback(result);
		
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
hp.getTemplate = function getTemplate (name, payload, callback) {
	
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
				
				var at = new Timer();
				log('Getting "' + name + '" asynchronously ...', false, 'verbose');
				
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
						
						log('Got template "' + name + '" asynchronously in ' + at.get() + 'ms', false, 'verbose');
					});
				} else {
					// Client side
					jQuery.ajax({url: getPath, success: function(result) {
						
						payload.__IO.fin++;
						
						var modcode = thisHawk.storeTemplate(name, result);
						
						callback(modcode);
						
						log('Got template "' + name + '" asynchronously in ' + at.get() + 'ms', false, 'verbose');
					}})
				}
				
				log('... asynchronous call has been made.', false, 'verbose');
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
hp.storeTemplate = function storeTemplate (name, source) {
	
	// Always prepend this code to the template, in order to expose the buffer
	var buffercode = '<% this.buf = buf %><% render_start(buf) %>';
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
hp.loadDirectory = function loadDirectory (path, subdir) {
	
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
 * Template helpers will be defined in here
 * Helpers are run inside the template
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.17
 */
hp.helpers = {};

// Helpers link
var helpers = hp.helpers;

helpers.render_start = function (buf) {
	this.prive.buflink = buf;
}

/**
 * The render has ended, finalise some things
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.21
 */
helpers.render_end = function(buf) {

	var ta = this.prive.assign;

	// Make sure all assigns are closed
	for (var blockname in ta) {
		
		var tab = ta[blockname];
		
		// If this assign wasn't finished
		if (!tab.finished) {
			
			// Get the parent block
			if (tab.parent == '_') {
				var pblock = this.scope.buf;
			} else {
				var pblock = this.request.blocks[tab.parent].buf;
			}
			
			// Prepare the closing tag
			var closing = '</hawkejs>';
			
			// Add comments if allowed
			if (this.hawkejs.comments) {
				closing += '<!-- end block ' + blockname + ' (RE) -->'
			}
			
			// Add the closing tag to the buffer
			pblock[tab.beginline] += closing;
			tab.finished = true;
		}
	}

	// Write the buffer back
	this.prive.buflink = this.scope.buf;
}

/**
 * Create a place where we can store a block in later on
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.20
 *
 * @param    {string}   blockname   The name of the block that should come here
 * @param    {object}   options
 */
helpers.assign = function assign (blockname, options) {
	
	if (options === undefined) options = {};
	
	// Create an alias
	var ta = this.prive.assign;
	
	// Create an entry for this block
	if (ta[blockname] === undefined) {
		ta[blockname] = {
			name: false,
			beginline: false,
			finished: false,
			parent: this.prive.chain[0]
		};
	}
	
	var tab = ta[blockname];
	
	// If we're already working on the assign, do nothing
	if (tab.name) {
		
	} else {
		
		tab.name = blockname;
		
		// Do not use forward slash in attributes
		blockname = blockname.replace('/', '__');
		
		if (options.removewrapper === undefined) options.removewrapper = false;
	
		var div = '';
		
		if (this.hawkejs.comments) {
			div += '<!-- begin block ' + blockname + ' -->';
		}
	
		div += '<hawkejs id="hawkejs-space-' + blockname + '" '
						+ 'data-hawkejs-space="' + blockname + '" '
						+ 'data-remove="' + options.removewrapper + '" '
						+ 'data-hawkejs="true">';
		
		var newLength = this.scope.buf.push(div);
		
		tab.beginline = newLength - 1;
	}
	
}

/**
 * Optional assign_end function.
 * When not used, the assign will be put on 1 single line
 * If used, the part between assign() & assign_end() will
 * be the "standard" text, in case nothing else is filled in
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.20
 *
 * @param    {string}   blockname   The name of the block/space container to end
 * @param    {object}   options
 */
helpers.assign_end = function assign_end (blockname, options) {
	
	if (options === undefined) options = {};
	
	// Create an alias
	var ta = this.prive.assign;
	
	if (ta[blockname] && !ta[blockname].finished) {
		this.scope.buf.push('</hawkejs>');
		if (this.hawkejs.comments) {
			this.scope.buf.push('<!-- end block ' + blockname + ' (AE) -->');
		}
		ta[blockname].finished = true;
	}
	
}

/**
 * Start a block
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.21
 *
 * @param    {string}   blockname   The name of the block we are creating
 * @param    {object}   options
 */
helpers.start = function start (blockname, options) {
	
	if (options === undefined) options = {};
	
	// Get the block we're currently working on
	var parentblockname = this.prive.chain[0];

	this.request.blocks[blockname] = {
		start: true,
		end: false,
		parent: parentblockname,
		template: this.prive.template,
		buf: []
	};
	
	// Clone the original buffer
	this.prive.blocks[parentblockname] = this.scope.buf.slice(0);
	
	// Reset the buf
	this.scope.buf.length = 0;
	
	// Add this block to the chain
	this.prive.chain.unshift(blockname);
}

/**
 * End a block
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.20
 * 
 * @param    {string}   blockname   The name of the block we are finishing
 * @param    {object}   options
 */
helpers.end = function end (blockname, options) {
	
	if (options === undefined) options = {};
	
	// Remove an item from the block chain
	var shift = this.prive.chain.shift();
	
	// Don't remove the starting block
	if (shift == '_') this.prive.chain.unshift('_');
	
	if (blockname === undefined) blockname = shift;
	
	if (blockname != shift) {
		log('We are trying to end a different block than ' + shift, false, 'error');
	}
	
	blockname = shift;
	
	// Return nothing if there was no opening tag
	if (this.request.blocks[blockname] === undefined) {
		return;
	}
	
	this.request.blocks[blockname].end = true;
		
	// Store this buffer in the payload block
	this.request.blocks[blockname].buf = this.scope.buf.slice(0);
	
	var previousblock = this.prive.chain[0];

	this.scope.buf.length = 0;
	
	for (var i in this.prive.blocks[previousblock]) {
		var item = this.prive.blocks[previousblock][i];
		
		this.scope.buf.push(item);
	}
	
}

/**
 * Print out a block right now
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.20
 *
 * @param   {string}   blockname   The name of the block to print out
 * @param   {object}   options
 */
helpers.print_block = function print_block (blockname, options) {
	
	if (options === undefined) options = {};
	
	if (this.request.blocks[blockname] === undefined) {
		log(blockname + ' not found', false, 'info');
		return;
	}
	
	var buf = this.request.blocks[blockname].buf;
	
	// Push every entry from the wanted block buffer to the current buffer
	for (var i in buf) {
		this.scope.buf.push(buf[i]);
	}
	
}

/**
 * Print out an element right now.
 * The element is recursively rendered first.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.20
 *
 * @param    {string}   elementname   The name of the element to print out
 * @param    {object}   options
 */
helpers.print_element = function print_element (elementname, options) {

	if (options === undefined) options = {};

	var html = this.prive.hawkejs.render(elementname, this.scope.variables);
	
	this.scope.buf.push(html);
}

/**
 * Indicate this request needs a script, and add it to it if needed
 *
 * options:
 * - destination  {string}
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.20
 *
 * @param    {string}   scriptpath   The path of the script to add
 * @param    {object}   options
 */
helpers.script = function script (scriptpath, options) {
	
	if (options === undefined) options = {};
	
	// Create an alias to the scripts object
	var s = this.request.tags;
	
	if (options.destination === undefined) options.destination = 'anywhere';
	
	if (s[scriptpath] === undefined) {
		s[scriptpath] = {
			type: 'script',
			path: scriptpath,
			destination: options.destination
		}
	}
}

/**
 * Indicate this request needs a stylesheet, and add it to it if needed
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.20
 *
 * @param    {string}   scriptpath   The path of the script to add
 * @param    {object}   options
 */
helpers.style = function style (stylepath, options) {
	
	if (options === undefined) options = {};
	
	// Create an alias to the scripts object
	var s = this.request.tags;
	
	if (options.destination === undefined) options.destination = 'anywhere';
	
	if (s[stylepath] === undefined) {
		s[stylepath] = {
			type: 'style',
			path: stylepath,
			attributes: options.attributes,
			destination: options.destination
		}
	}
}

/**
 * Simply print out what we are given
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.20
 *
 * @param    {string}   variable   The variable to print
 */
helpers.print = function print (variable) {
	this.scope.buf.push(variable);
}

/**
 * Indicate this element is an expansion
 * of another, given element
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.20
 *
 * @param    {string}   elementname   The element we want to expand into
 * @param    {object}   options
 */
helpers.expands = function expands (elementname, options) {
	
	if (options === undefined) options = {};
	
	// Add this elementname to the expansion array
	// The current element should "expand" this element
	this.request.expand.push(elementname);
	
	// Add it to the local instructions
	// These will be returned when ejs has finished rendering this element
	// And will in turn be rendered, too
	this.prive.instructions.push(elementname);
}

/**
 * Implement another element inside this one
 * Contrary to print_element(), this will hapen later but in this scope
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.20
 * @version  2013.01.22
 *
 * @param    {string}   elementname   The element to print
 * @param    {object}   options
 */
helpers.implement = function implement (elementname, options) {
	
	if (options === undefined) options = {};
	
	if (options.removewrapper === undefined) options.removewrapper = false;
	
	// Parse the element
	this.parse_element(elementname);
	
	// Do not use forward slash in attributes
	elementname = elementname.replace('/', '__');
	
	// Add an object we can put this element in later
	var div = '<hawkejs id="hawkejs-implement-' + elementname + '" '
						+ 'data-hawkejs-implement="' + elementname + '" '
						+ 'data-hawkejs-template="' + elementname + '" '
						+ 'data-hawkejs-from-template="' + elementname + '" '
						+ 'data-remove="' + options.removewrapper + '" '
						+ 'data-hawkejs="true"></hawkejs>';
		
	this.scope.buf.push(div);
}

/**
 * Parse another element in the current scope
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.20
 * @version  2013.01.20
 *
 * @param    {string}   elementname   The element to parse
 * @param    {object}   options
 */
helpers.parse_element = function parse_element (elementname, options) {
	
	if (options === undefined) options = {};
	
	this.request.implement.push(elementname);
	
	// Add it to the local instructions.
	// These will be returned when ejs has finished rendering this element
	// And will in turn be rendered, too
	this.prive.instructions.push(elementname);
	
}

/**
 * Events that need to happen to a DOM object when the given href
 * matches the location of the current page
 *
 * These events are added to the payload.
 *
 * options:
 * - sourceHref    {string}   The href WITHOUT replaced vars (so ":name")
 *
 * @param    {string}   elementid   The name of the element to update
 * @param    {object}   options     The options object
 */
helpers._add_match_options = function _add_match_options (elementid, instructions) {

	// Get the sourceHref we want to match against
	var href = instructions.sourceHref;
	delete instructions.sourceHref;
	
	// If the parent entry isn't an object, delete it!
	if (instructions.parent && typeof instructions.parent != "object") {
		delete instructions.parent;
	}
	
	// Also add the source id to the object
	instructions.sourceId = elementid;

	// Create the match entry if it doesn't exist
	if (this.request.match[href] === undefined) {
		this.request.match[href] = {};
	}
	
	this.request.match[href][elementid] = instructions;
}

/**
 * Add an anchor tag to the buffer
 *
 * options:
 * - name    {string}   The text inside the anchor tag. Uses the href if absent
 * - title   {string}   The title (hover) text. Uses name if absent
 * - id      {string}   The id of the tag. If absent an id is composed.
 * - class   {string}   The classes of the tag. Empty if absent
 * - match   {string}   The express route string to match against (eg /a/:id)
 * - return  {string}   What this function should return. Defaults to 'print'
 * 
 * -- print   = The function will add the html to the buffer and return nothing
 * 
 * -- options = The function will return the options array WITH a new html
 *              property with the resultand WILL NOT add anything to the buffer.
 *              This is useful for building other helpers on top of this one.
 *
 * -- string  = The function will return the html and print out nothing.
 *
 * -- all     = The function will add the html & return the options
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.20
 * @version  2013.01.25
 *
 * @param    {string}   href      The link
 * @param    {object}   options
 *
 * @returns  {object|string}   The options object with the result,
 *                             the html string, or nothing.
 */
helpers.add_link = function add_link (href, options) {

	// Store the original href
	var sourceHref = href;
	
	if (options === undefined) options = {};
	
	if (!options.name) options.name = options.title ? options.title : href;
	if (!options.title) options.title = options.name;
	if (!options.class) options.class = '';
	if (!options.return) options.return = 'print';
	if (!options.urlvars) options.urlvars = {};
	
	// Implement variables in urls
	for (var varName in options.urlvars) {
		href = href.replace(':' + varName, options.urlvars[varName]);
	}
	
	// Always add an id!
	if (!options.id) {
		options.id = 'hawkejs-link-' + this.filename.replace('/', '-') + '-' + href.replace(/[^a-z0-9]/gi,'');
	}
	
	// Name is actually content of the element
	if (!options.content) options.content = options.name;
	
	// Escape the content if needed
	if (options.escape) options.content = ent.encode(options.content);
	
	if (options.match) {
		
		// Add the source href
		options.match.sourceHref = sourceHref;
		
		this._add_match_options(options.id, options.match);
	}
	
	var a = '<a id="' + options.id + '" href="' + href + '" '
	        + 'title="' + ent.encode(options.title) + '" '
					+ 'data-hawkejs="link" ';
	
	if (options.class) a += 'class="' + options.class + '" ';
	
	// Add the text between the anchor, and close the tag
	a += '>' + options.content + '</a>';
	
	// Add the result to the options
	options.html = a;
	
	if (options.return == 'print') this.print(a);
	else if (options.return == 'options') return options;
	else if (options.return == 'string') return a;
	else if (options.return == 'all') {
		this.print(a);
		return options;
	}
}

var internalHawk = new Hawkejs();

// Export the Hawkejs class
module.exports = internalHawk;