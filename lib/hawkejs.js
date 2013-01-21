if (ClientSide === undefined) var ClientSide = false;

// Noclient>
var cheerio = require('cheerio');
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
	if (!object.$) object.$ = cheerio.load(object.html);
	return object.$;
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

var ejs = require('ejs');

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
 * @version  2013.01.19
 */
var Hawkejs = function Hawkejs () {

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
 * Where can the browser download the file?
 */
hp._clientBrowserPath = false;

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
			//console.log('EJS client file not found at ' + fptest);
		}
	}
	
	if (ejsStat) {
		// Read those 3 files
		var clientfile = fs.readFileSync(clientpath, 'utf-8');
		var mainfile = fs.readFileSync(mainpath, 'utf-8');
		var ejsfile = fs.readFileSync(ejspath, 'utf-8');
		
		var clientfilename = 'hawkejs-client-side.js';
		
		var servercodefound = false;
		
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
				var txbegin = mainfile.substring(0, scbegin);
				var txend = mainfile.substring(scend + 12);
				mainfile = txbegin + txend;
				
				// Reset the servercodefound to false
				servercodefound = false;
			}
			
			// We do not type in the actual noclient tag, because it'll be matched
			var scbegin = mainfile.indexOf('// ' + 'Noclient>');
			var scend = mainfile.indexOf('// ' + '<Noclient');
			
			if (scbegin > -1 && scend > -1) servercodefound = true;
			
		} while (servercodefound);
		
		var data = clientfile;
		
		data += mainfile;
		
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
		
		fs.writeFile(path.resolve(filepath, clientfilename), data, 'utf-8');
		
		// Indicate we have browser suport
		hp._clientBrowserPath = publicpath + '/' + clientfilename;
		
		hp._client = true;
	} else {
		console.error('Could not enable client side Hawkejs support!');
	}
}

/**
 * Some middleware we will use to extract interesting information
 * from the request, and insert them into the settings object
 * for the render function to use later.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.20
 * @version  2013.01.20
 *
 * @param    {object}    req    The request object
 * @param    {object}    res    The response object
 * @param    {function}  next   The express callback
 */
hp.middleware = function middleware (req, res, next) {
	
	// Prepare a hawkejs object
	var h = {};
	
	//  Add the request & response object
	h.req = req;
	h.res = res;

	// Add the original url
	h.originalUrl = req.originalUrl;
	
	// Is this an ajax call? Defaults to false
	h.ajax = false;
	
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
	
	// Test setting
	h.ajax = true;
	
	// Add the string this route had to match against
	h.matchSource = req.route.path;
	
	// Add this string's converted regex
	h.matchRegex = req.route.regexp;
}
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
	
	if (!this._baseDir) {
		// Get the base view directory
		this._baseDir = options.settings.views;
	}
	
	// Get the filename
	var filename = path.replace(this._baseDir + '/', '');
	
	// Get the view/element name (filename without extension)
	var elementname = filename.replace('.ejs', '');

	var result = this.render(elementname, options);
	
	callback(null, result);
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
hp.__express = function (path, options, callback) {
	hp.renderFile(path, options, callback);
};


/**
 * Store templates in here
 * @type  {object}
 */
hp.templates = {};

/**
 * Render a template
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.17
 * @version  2013.01.20
 */
hp.render = function render (template, variables) {
	
	var t = new Timer();
	
	// If hawkejs is one of the variables (set during our middleware)
	// get some more info from the req & res variables
	if (variables.hawkejs) this._extractReqData(variables);

	var checkTemplate = this.getTemplate(template);

	if (!checkTemplate) {
		console.error('Hawkejs template "' + template + '" does not exist');
		return '';
	}
	
	if (variables === undefined) {
		variables = {};
	}
	
	// Create a new, clean payload
	// This will travel along with all the element renders
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
	
	// Elements (other templates, like expansions & implementations)
	payload.request.elements = {};
	
	// Tags to be injected are stored here
	payload.request.tags = {};
	
	// Also create a link to the variables in the payload,
	// even though we'll also add them one level further down
	payload.scope.variables = variables;
	
	// Add an object in the scope to store temporary stuff
	payload.scope.temp = {};
	
	/**
	 * Extend the payload:
	 * - First add all the variables to the root of the object
	 * - Only THEN do we add the helpers
	 * => This way no variable can override a helper
	 *    This also means certain variables can't be set in the root
	 */
	jQuery.extend(payload, variables, this.helpers);
	
	// This variable will be used to check for infinite loops
	var doCounter = 0;
	
	// Intermediate result in the do
	var doResult = {html: '', instructions: []};
	
	// The render stack
	var doStack = [template];
	
	// The template name to render
	var doTemplate;
	
	// Make sure we don't repeat ourselves:
	// Element that have already been rendered get an entry here
	var doNotRepeat = {};
	
	// Start rendering templates
	do {
		
		// Get the template to render
		doTemplate = doStack.shift();
		
		// Increase the counter
		doCounter++;
		
		// Get the template
		var templateSource = this.getTemplate(doTemplate);
		
		// Render the template
		doResult = this._EjsRender(templateSource, payload);

		for (var i in doResult.instructions) {
			
			var iEName = doResult.instructions[i];
			
			// If this element hasn't been rendered already,
			// add it to the todo list
			if (doNotRepeat[iEName] === undefined) {
				doStack.push(doResult.instructions[i]);
			}
		}
		
		// Store the result in the elements object
		payload.request.elements[doTemplate] = doResult.html;
		
		// Indicate this element has been rendered
		doNotRepeat[doTemplate] = true;
		
	} while (doStack.length && doCounter < 500);
	
	if (doCounter > 100) console.error('Possible infinite loop detected while rendering template "' + template + '"');
	
	console.log('Rendering ' + template + ' took ' + t.get() + 'ms for all EJS to finish');
	
	// The elements are strings, but the blocks still need joining
	// Also: create a workable element
	for (var i in payload.request.blocks) {
		
		// Get the block
		var block = payload.request.blocks[i];
		
		// Join the html, using newline as a separator
		var blockHtml = block.buf.join('\n');
		
		// Store the html back into the item
		payload.request.blocks[i] = {html: blockHtml, $: false, name: i};
	}
	
	// Prepare the element objects
	for (var i in payload.request.elements) {
		
		// Get the element
		var el = payload.request.elements[i];
		
		payload.request.elements[i] = {html: el, $: false, name: i}
	}
	
	// Store the element we originally requested
	var requested = payload.request.elements[template];
	
	// Prepare the finished element
	var $result = µ.getObject(requested);

	// Expand the elements with other elements if wanted
	if (payload.request.expand.length) {
		
		for (var i in payload.request.expand) {
			
			var elementName = payload.request.expand[i];
			var expansionElement = payload.request.elements[elementName];
			
			$result = this._postEjsRender(expansionElement, payload);
		}
		
	} else {

		// No expansions were requested, so just finalize the original element
		$result = this._postEjsRender(requested, payload);
		
	}
	
	// If this isn't an ajax call, and client side support is enabled,
	// inject the hawkejs-client-side.js file
	if (this._client /*&& !variables.hawkejs.ajax*/) {
		this._addScript({path: this._clientBrowserPath}, $result);
	}
	
	// Inject tags (scripts, styles)
	for (var i in payload.request.tags) {
		
		var tag = payload.request.tags[i];
		
		if (tag.type == 'script') {
			this._addScript(tag, $result);
		} else if (tag.type == 'style') {
			this._addStyle(tag, $result);
		}
		
	}
	
	console.log('Rendering ' + template + ' took ' + t.get() + 'ms');
	
	// The 'true' is only for the client side
	return µ.getHtml($result, true);
}

/**
 * After the EJS render has finished,
 * we need to implement some of our Hawkejs magic
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.20
 *
 * @param    {object}   layoutObject   The layout object
 * @param    {object}   payload        The payload
 */
hp._postEjsRender = function _postEjsRender (layoutObject, payload) {

	// Insert implementations
	// This function is also called inside _insertBlock()!
	this._insertImplementation(µ.getObject(layoutObject), payload);
	
	// Insert blocks into spaces
	this._insertBlock(µ.getObject(layoutObject), payload);
	
	// Return the element
	return layoutObject.$;
	
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

	var $spaces = µ.select($origin, '[data-hawkejs-implement]');
	
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
			var $clone = µ.objectify(b.html);
			
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
 * @version  2013.01.19
 *
 * @param    {Cheerio}   $origin   The origin element
 * @param    {Object}    payload   The payload
 */
hp._insertBlock = function _insertBlock ($origin, payload) {

	var $spaces = µ.select($origin, '[data-hawkejs-space]');
	
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
			
			$this.html(µ.getHtml($clone));
		}
	}
}

/**
 * Add a script to the element
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.20
 *
 * @param    {object}   script    The script object
 * @param    {Cheerio}  $element  The element to insert it into
 *
 * @returns  {Cheerio}            The modified Cheerio object
 */
hp._addScript = function _addScript (script, $element) {

	if (!script.destination) script.destination = 'anywhere';

	var html = '<script type="text/javascript" src="' + script.path + '"></script>';
	
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
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.18
 *
 * @param    {string}   templatesource   The template code
 * @param    {object}   payload          The payload, options, variables, ...
 */
hp._EjsRender = function _EjsRender (templatesource, payload) {
	
	// A "local" scope object, only to be used during this render
	var prive = {
		prive: {
			blocks: {},
			chain: ['_'],
			instructions: [],
			assign: {},
			hawkejs: this
		}
	};
	
	// The return var
	var result = {html: '', instructions: []};
	
	var t = new Timer();
	
	// Render using ejs
	result.html = ejs.render(templatesource, jQuery.extend({}, payload, prive));
	
	// Get possible instructions by cloning prive's instructions
	result.instructions = prive.prive.instructions.slice(0);
	
	return result;
}

/**
 * If a template hasn't been loaded already, get it
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.19
 *
 * @param    {string}   name    The template name to get
 * @returns  {string}   The template code
 */
hp.getTemplate = function getTemplate (name) {
	
	// See if we already tried to get this template
	if (this._requireCache[name]) {
		
		// We required it before, see if it was found, too
		if (this.templates[name]) {
			return this.templates[name];
		} else {
			// Not found, return empty string
			console.error('Tried to get template that does not exist: ' + name);
			return '';
		}
		
	} else {
		
		// Only attempt to load it if the basedir is set
		if (this._baseDir) {
			
			// We'll read the file synchronous
			try {
				
				// On the server side, we read the file synchronously
				if (!ClientSide) {
					var original = fs.readFileSync(this._baseDir + '/' + name + '.ejs', 'utf-8');
				} else {
					
					// On the client side, we ajax the file synchronously
					// Synchronously, FOR NOW.
					var original = '';
					
					jQuery.ajax({url: this._baseDir + '/' + name + '.ejs',
							success: function(result) {
													 original = result;
											 },
							async:   false
				 });
					
				}

				// Store the template and return the modified code
				return this.storeTemplate(name, original);
			} catch (err) {
				
				console.error('Tried to get template "' + name + '", but was unable to open file');
				
				// Return an empty string
				return '';
				
			}
		
		} else {
			console.error('Tried to get template, but base view dir is not set. Template not loaded: ' + name);
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
			console.error('Hawkejs error while loading directory "' + fullpath + '"');
			console.error(err);
		} else {

			for (var i in files) {
				
				var filename = files[i];
				
				(function(filename) {
					
					// See if it really is a file
					fs.stat(fullpath + '/' + filename, function (err, stat) {
						
						if (err) {
							console.error('Error while loading Hawkejs template, could not stat ' + fullpath + '/' + filename);
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
 */
helpers.render_end = function(buf) {

	var ta = this.prive.assign;
	
	// Make sure all assigns are closed
	for (var blockname in ta) {
		
		var tab = ta[blockname];
		
		// If this assign wasn't finished
		if (!tab.finished) {
			// Add a closing div now
			this.scope.buf[tab.beginline] += '</div>';
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
			finished: false
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
	
		var div = '<div id="hawkejs-space-' + blockname + '" '
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
		this.scope.buf.push('</div>');
		ta[blockname].finished = true;
	}
	
}

/**
 * Start a block
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.18
 * @version  2013.01.20
 *
 * @param    {string}   blockname   The name of the block we are creating
 * @param    {object}   options
 */
helpers.start = function start (blockname, options) {
	
	if (options === undefined) options = {};
	
	this.request.blocks[blockname] = {
		start: true,
		end: false,
		buf: []
	};
	
	// Get the block we're currently working on
	var currentblock = this.prive.chain[0];

	// Clone the original buffer
	this.prive.blocks[currentblock] = this.scope.buf.slice(0);
	
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
		console.error('We are trying to end a different block than ' + shift);
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
		console.log(blockname + ' not found');
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
 * @version  2013.01.20
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
	var div = '<div id="hawkejs-implement-' + elementname + '" '
						+ 'data-hawkejs-implement="' + elementname + '" '
						+ 'data-remove="' + options.removewrapper + '" '
						+ 'data-hawkejs="true"></div>';
		
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
 * Add an anchor tag to the buffer
 *
 * options:
 * - name    {string}   The text inside the anchor tag. Uses the href if absent
 * - title   {string}   The title (hover) text. Uses name if absent
 * - id      {string}   The id of the tag. Empty if absent
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
 * @version  2013.01.20
 *
 * @param    {string}   href      The link
 * @param    {object}   options
 *
 * @returns  {object|string}   The options object with the result,
 *                             the html string, or nothing.
 */
helpers.add_link = function add_link (href, options) {
	
	if (options === undefined) options = {};
	
	if (!options.name) options.name = options.title ? options.title : href;
	if (!options.title) options.title = options.name;
	if (!options.id) options.id = '';
	if (!options.class) options.class = '';
	if (!options.return) options.return = 'print';
	
	var a = '<a href="' + href + '" '
	        + 'title="' + ent.encode(options.title) + '" '
					+ 'data-hawkejs="link" ';
	
	if (options.match) a += 'data-hawkejs-match="' + match + '" ';
	if (options.id) a += 'id="' + ent.encode(options.id) + '" ';
	if (options.class) a += 'class="' + ent.encode(options.class) + '" ';
	
	// Add the text between the anchor, and close the tag
	a += '>' + ent.encode(options.name) + '</a>';
	
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

// Export the Hawkejs class
module.exports = new Hawkejs();