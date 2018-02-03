var ViewRender,
    Utils = Blast.Bound,
    log   = Hawkejs.Hawkejs.logHandler,
    toc   = 0,
    Fn    = Utils.Function;

/**
 * The ViewRender class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 *
 * @param    {Hawkejs}   parent
 * @param    {Boolean}   nested
 */
ViewRender = Fn.inherits('Informer', 'Hawkejs', function ViewRender(parent, nested) {

	// The parent hawkejs instance
	this.hawkejs = parent;

	// The root renderer (itself by default)
	this.renderRoot = this;

	// Blocks
	this.blocks = {};

	// Dialogs
	this.dialogs = [];

	// Blockchain
	this.chain = [];

	// Current block
	this.currentBlock = '';

	// The block to use as a main block
	this.mainBlock = '';

	// Wanted extensions
	this.extensions = [];

	// Has this render begun?
	this.hasBegun = false;

	// Has this render finished?
	this.hasFinished = false;

	// Is any io running?
	this.running = 0;

	// Template times
	this.times = {};

	// The set title for this page (null means 'change nothing')
	this.pageTitle = null;

	// Script blocks
	this.scriptBlocks = [];

	// Style blocks
	this.styleBlocks = [];

	// Script files
	this.scripts = [];

	// Style files
	this.styles = [];

	// Head tags
	this.headTags = [];

	// Assigns
	this.assigns = {};

	// The template diversion, if given
	this.diversion = null;

	// The main template name
	this.mainTemplate = null;

	// The template we rendered last
	this.lastTemplate = null;

	// The template currently rendering (reset after each render)
	this.currentTemplate = null;

	// Options for the current execution
	this.currentOptions = null

	// Variables to use in the views (added using `set`)
	this.variables = {};

	// Server-side variables
	this.server_variables = {};

	// Variables to expose to the scene (added using `expose`)
	this.exposeToScene = {};

	// Info on the request
	this.request = null;

	// Is this going to be rendered on the client?
	// We don't know this until the req object has been inspected
	this.clientRender = null;

	// When set to false, links inside this view will not be ajaxifier
	this.enableClientRender = true;

	// Allow x-hawkejs elements by default
	this.allowXHawkejs = true;

	// Client side events to emit
	this.inlineEvents = [];

	// Function scopes
	this.functionScopes = [];

	// Live bindings
	this.live_bindings = {};

	// Collection of placeholders
	this.placeholders = [];

	// Prefix id numbers
	this.prefix_id_numbers = {};

	// The base number for block ids
	if (Blast.isNode) {
		this.baseId = 'serverside';
	} else {
		this.baseId = Date.now();
	}

	this.scene = false;

	// Emit this new ViewRender instance on the Hawkejs instance
	if (!nested) {
		this.hawkejs.emit({type: 'viewrender', status: 'init'}, this);
	}
});

// Keep track of amount of `implements` made,
// this number is used as an id
ViewRender.setProperty('idCount', 0);
ViewRender.setProperty('implementCount', 0);
ViewRender.setProperty('printElementCount', 0);

/**
 * Create helpers on-the-fly
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setProperty('helpers', function getHelpers() {

	if (!this._helpers) {
		this.initHelpers();
	}

	return this._helpers;
});

/**
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.3
 */
ViewRender.setMethod(function toJSON() {

	var result = {
		variables: this.variables,
		enableClientRender: this.enableClientRender,
		exposeToScene: this.exposeToScene,
		live_bindings: this.live_bindings,
		inlineEvents: this.inlineEvents,
		mainTemplate: this.mainTemplate,
		lastTemplate: this.lastTemplate,
		focusBlock: this.focusBlock,
		pageTitle: this.pageTitle,
		headTags: this.headTags,
		request: this.request,
		assigns: this.assigns,
		blocks: this.blocks,
		baseId: this.baseId,
		theme: this.theme,
		history: this.history
	};

	if (this.scriptBlocks.length) {
		result.scriptBlocks = this.scriptBlocks;
	}

	if (this.styleBlocks.length) {
		result.styleBlocks = this.styleBlocks;
	}

	if (this.scripts.length) {
		result.scripts = this.scripts;
	}

	if (this.styles.length) {
		result.styles = this.styles;
	}

	return result;
});

/**
 * Increment IO runcount
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.2
 * @version  1.1.2
 */
ViewRender.setMethod(function incrementIo() {
	this.running++;

	if (this.renderRoot !== this) {
		this.renderRoot.running++;
	}
});

/**
 * Decrement IO runcount
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.2
 * @version  1.1.2
 */
ViewRender.setMethod(function decrementIo() {
	this.running--;

	if (this.renderRoot !== this) {
		this.renderRoot.running--;
	}
});

/**
 * Register function scopes and variables
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Number}   level       The level of the funciton
 * @param    {String}   name        The optional name of the function
 * @param    {Object}   variables   The variable arguments of the function
 */
ViewRender.setMethod(function regFnSc(level, name, variables) {

	if (level < (this.functionScopes.length - 1)) {
		this.functionScopes.length = level + 1;
	}

	this.functionScopes[level] = {
		name: name,
		variables: variables
	};
});

/**
 * Toggle x-hawkejs element wrappers
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Boolean}   value   True by default
 *
 * @return   {Boolean}
 */
ViewRender.setMethod(function allowWrappers(value) {
	if (value == null) {
		value = true;
	}

	this.allowXHawkejs = value;

	return this.allowXHawkejs;
});

/**
 * Prepare content of all items
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.0
 * @version  1.2.0
 *
 * @param    {Object}   obj
 * @param    {Function} callback
 */
ViewRender.setMethod(function prepareContent(obj, callback) {

	var that = this,
	    tasks = [];

	Blast.Bound.Object.walk(obj, function eachValue(val, key, parent) {

		if (!val || typeof val != 'object') {
			return false;
		}

		if (typeof val.getContent != 'function') {
			return;
		}

		tasks.push(function doGetContent(next) {
			val.getContent(function gotContent(err) {

				var result;

				if (err) {
					return next();
				}

				if (typeof val.toHawkejsString == 'function') {
					result = val.toHawkejsString(that);
					parent[key] = val;
				}

				next();
			});
		});

		// getContent was found, so don't do children
		return false;
	}, 2);

	Fn.parallel(tasks, callback);
});

/**
 * Get a unique string for use as ID
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 *
 * @param    {String}   prefix
 *
 * @return   {String}
 */
ViewRender.setMethod(function getId(prefix) {

	if (!prefix) {
		return 'h' + this.baseId + '-' + this.renderRoot.idCount++;
	}

	if (!this.prefix_id_numbers[prefix]) {
		this.prefix_id_numbers[prefix] = 0;
	}

	return prefix + '-' + this.prefix_id_numbers[prefix]++;
});

/**
 * Execute a command
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   cmd
 * @param    {Array}    args
 */
ViewRender.setMethod(function command(cmd, args) {
	if (this.hawkejs.commands[cmd]) {
		try {
			this.hawkejs.commands[cmd].apply(this, args);
		} catch (err) {
			this.print('<!-- Error found: ' + err + ' -->');
			this.hawkejs.handleError(this, this.errName, this.errLine, err);
		}
	}
});

/**
 * Return a well-formed url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setMethod(function url(url) {

	var absolute = url[0] == '/',
	    protocol = (url[0] == '/' && url[1] == '/');

	if (!protocol) {
		if (absolute) {
			url = this.hawkejs.root + url.slice(1);
		} else {
			url = this.hawkejs.root + url;
		}
	}

	return url;
});

/**
 * Add a data attribute to the current block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   blockName
 */
ViewRender.setMethod(function attribute(name, value) {

	var block = this.blocks[this.currentBlock];

	if (block == null) {
		throw new Error('Tried to set attribute "' + name + '", but no block is available');
	}

	block.attributes[name] = value;
});

/**
 * Create a block:
 * Create a new BlockBuffer if it doesn't exist already.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.1
 *
 * @param    {String}   blockName
 * @param    {Object}   options
 */
ViewRender.setMethod(function createBlock(blockName, options) {

	var result = this.blocks[blockName];

	if (!options) {
		options = {};
	}

	// Just Create the block if it doesn't exist already
	if (result == null) {
		result = this.blocks[blockName] = new Hawkejs.BlockBuffer(this, blockName, options);
	} else if (result.options.created_manually) {
		// Use manually created block as if it were new
	} else if (options.startCall) {
		blockName = blockName + '__expanded__';
		return this.createBlock(blockName, {ancestor: result});
	}

	return result;
});

/**
 * Clear a block.
 * Existing content in a block will be removed.
 * Including blocks on the client side.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   blockName
 */
ViewRender.setMethod(function clear(blockName) {

	var block;

	// Creat the block (if it doesn't exist yet)
	if (this.blocks[blockName]) {
		block = this.blocks[blockName];
		block.length = 0;
	} else {
		block = this.createBlock(blockName);
	}

	return block;
});

/**
 * Emit events from the view.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   type
 */
ViewRender.setMethod(function view_emit(type) {

	var args,
	    data,
	    i;

	args = new Array(arguments.length);

	for (i = 0; i < arguments.length; i++) {
		args[i] = arguments[i];
	}

	data = {
		args: args,
		template: this.currentTemplate.name,
		block: this.currentBlock
	};

	this.inlineEvents.push(data);
});

/**
 * Start a block:
 * Create a new BlockBuffer if it doesn't exist already,
 * and make it the current active one (grab any further outputs).
 * If the block was already made, do nothing.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   blockName
 * @param    {Object}   options
 */
ViewRender.setMethod(function start(blockName, options) {

	var block;

	if (!options) {
		options = {};
	}

	options.startCall = true;

	if (this.dialogOpen) {
		blockName = this.dialogOpen + '_' + blockName;
	}

	// Create the block (if it doesn't exist yet)
	block = this.createBlock(blockName, options);

	// The block could have changed its name
	blockName = block.name;

	// Set the current active block name
	this.currentBlock = blockName;
	this.chain.push(blockName);

	if (block.startTemplate == null) {
		block.startTemplate = this.currentTemplate;
	}

	// Store the variables as they were when this block started
	if (!block.variables) {
		block.variables = Utils.Object.assign({}, this.variables);
	}

	return block;
});

/**
 * End a block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   blockName
 */
ViewRender.setMethod(function end(blockName) {

	var index;

	if (blockName) {

		if (this.dialogOpen) {
			blockName = this.dialogOpen + '_' + blockName;
		}

		index = this.chain.lastIndexOf(blockName);

		if (index > -1) {
			// If the block was found, remove it and everything after
			this.chain.splice(index);
		} else {
			// If the block wasn't found, just remove the last block
			this.chain.pop();
		}

	} else {
		this.chain.pop();
	}

	this.currentBlock = this.chain[this.chain.length-1];
});

/**
 * Make this the target of a dialog
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setMethod(function makeDialog() {
	this.dialog = true;
	this.dialogOpen = 'dialog-' + this.getId();
});

/**
 * Show a dialog
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.0
 * @version  1.2.0
 */
ViewRender.setMethod(function showDialog(name, variables, options) {

	var placeholder;

	if (!variables) {
		variables = {};
	}

	if (!options) {
		options = {};
	}

	// Force a new render scope
	options.newscope = true;

	// Don't print the placeholder
	options.print = false;

	// Make sure the placeholder content is wrapped
	options.wrap = true;

	// Get the placeholder
	placeholder = this.implement(name, options, variables);

	// Add dialog stuff to the wrapper
	placeholder.element.classList.add('js-he-dialog');
	placeholder.element.dataset.type = 'dialog';
	placeholder.element.dataset.role = 'dialog';

	this.dialogs.push(placeholder);
});

/**
 * Do not modify history
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setMethod(function noHistory() {
	this.history = false;
});

/**
 * Initialize all the helpers for this instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setMethod(function initHelpers() {

	var key;

	this._helpers = {};

	// Create all the helpers now
	// @todo: Initialize only used helpers
	for (key in Hawkejs.Hawkejs.helpers) {

		// Skip (old, pre v1.0.0) helpers
		if (typeof Hawkejs.Hawkejs.helpers[key] !== 'function') {
			continue;
		}

		this._helpers[key] = new Hawkejs.Hawkejs.helpers[key](this);
	}
});

/**
 * Begin the render with the wanted template.
 * Entry point for rendering
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.3
 *
 * @param    {String|Array}   names       The template to render (first found)
 * @param    {Object}         variables   The veriables to pass to the template
 * @param    {Boolean}        main        Is this the main template?
 * @param    {Function}       callback    Optional callback to run after execution
 */
ViewRender.setMethod(function beginRender(names, variables, callback) {

	var that = this,
	    templates,
	    err,
	    key;

	if (typeof variables === 'function') {
		callback = variables;
		variables = {};
	}

	if (this.hasBegun) {
		err = new Error('ViewRender already rendering, create new instance');
	}

	if (names == null) {
		err = new Error('No templates were given to render');
	}

	if (err != null) {
		if (callback == null) {
			throw err;
		} else {
			return callback(err);
		}
	}

	// Once this ViewRender has begun rendering something,
	// it should not be used to render any other templates
	this.hasBegun = true;

	// Store the variables
	Utils.Object.assign(this.variables, variables);

	templates = new Hawkejs.Templates(this, names, {diversion: this.diversion});

	// Store the main template name
	this.mainTemplate = templates;

	// Emit an event that we're going to render
	// These can block, so do it in a parallel way
	Fn.parallel(function emitHawkejsBegin(next) {
		that.hawkejs.emit({type: 'viewrender', status: 'begin', client: !!that.clientRender}, that, next);
	}, function emitViewrenderBegin(next) {
		that.emit('begin', templates, next);
	}, function done(event_errors) {

		if (event_errors) {
			return callback(event_errors);
		}

		// Clone the variables, use the toHawkejs method if available
		that.variables = Blast.Collection.JSON.clone(that.variables, 'toHawkejs', [that]);

		// Also clone the exposed variables
		that.exposeToScene = Blast.Collection.JSON.clone(that.exposeToScene, 'toHawkejs', [that]);

		// Return early if this is meant for the browser, but remain asynchronous
		if (that.clientRender && Blast.isNode) {

			var result;

			// Send JSON data if this is meant to be rendered in the browser
			that.res.setHeader('content-type', 'application/json-dry; charset=utf-8');

			// Remove the baseId, the client will have to reset that themselves
			that.baseId = null;

			// Dry the data
			result = Blast.Collection.JSON.dry(that);

			that.emit('dry_response', result);
			that.emitDone(false);

			return callback(null, result, false);
		}

		// Initialize all the helpers
		that.initHelpers();

		that.emit('executing', templates);

		// @todo: allow multiple template options

		// Execute the template code, and schedule the callback
		that.execute(templates, that.variables, true, function afterExec() {

			that.emit('finishing');

			that.finish(function afterFinish(err, html) {

				if (err != null) {
					return callback(err);
				}

				that.afterRender(err, html, callback);
			});
		});

	});
});

/**
 * Function that will be called after the render is completed
 * and all templates have finished.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setMethod(function afterRender(err, html, callback) {

	if (!this.hasFinished) {
		this.hasFinished = true;

		// Emit created events
		this.emitDone(true);
	}

	if (callback) callback(err, html);
});

/**
 * Start execute the code of a template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Templates}  templates   The templates object, of which
 *                                    the first available will be rendered
 * @param    {Object}     variables   The veriables to pass to the template
 * @param    {Object}     options
 * @param    {Function}   callback    Optional callback to run after execution
 */
ViewRender.setMethod(function execute(templates, variables, options, callback) {

	var blockName,
	    that      = this,
	    key,
	    i;

	this.incrementIo();

	if (typeof variables === 'function') {
		callback = variables;
		variables = {};
	}

	if (typeof options === 'function') {
		callback = options;
		options = {};
	} else if (typeof options === 'boolean') {
		options = {changeMain: options};
	}

	if (typeof variables === 'boolean') {
		options = {changeMain: variables};
		variables = {};
	}

	if (options.changeMain == null) {
		options.changeMain = true;
	}

	that.emit('compilingTemplates', templates);

	// Get the compiled template function
	templates.getCompiled(function gotCompiledTemplate(err, fnc, template) {

		var baseName,
		    name;

		that.emit('compiledTemplates', templates);

		if (err) {
			that.hawkejs.handleError(that, templates, 'pre', err);
		} else {

			// Get the name of the found template
			name = template.sourceName;
			blockName = name + '__main__';
			baseName = blockName;

			if (options.blockNameModifier != null) {
				blockName += options.blockNameModifier;
			}

			// Set the template we're currently rendering
			that.currentTemplate = template;

			// Set the options for the current execution
			that.currentOptions = options;

			// The first block is the complete content of the template itself
			that.start(blockName);

			that.emit('executingTemplate', name, template);

			// Set the currently used variables
			that.currentVariables = variables;

			// Execute the compiled template
			try {
				fnc.call(that, variables, that.helpers);
			} catch (err) {
				that.hawkejs.handleError(that, that.errName, that.errLine, err);
			}

			// End the template's main block
			that.end(blockName);

			// Set the previous template
			that.lastTemplate = that.currentTemplate;

			// Reset the current template
			that.currentTemplate = false;

			// Reset the current options
			that.currentOptions = null;

			if (options.changeMain) {
				that.mainBlockBaseName = baseName;
				that.mainBlock = blockName;
			}
		}

		that.emit('executedTemplate', name, template);

		// Do any extensions that need to be done
		that.doExtensions(variables, callback);
	});
});

/**
 * Set the start time for the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name    The template name that has started rendering
 */
ViewRender.setMethod(function timeStart(name) {

	if (!this.times[name]) {
		this.times[name] = {};
	}

	// Set the start time
	this.times[name].start = Blast.hrtime();
});

/**
 * Set the end time for the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name    The template name that has ended rendering
 */
ViewRender.setMethod(function timeEnd(name) {

	var end;

	if (!this.times[name]) {
		throw new Error('Illegal timeEnd call for template ' + name);
	}

	// Get the end time
	end = Blast.hrtime(this.times[name].start);

	// Calculate the duration in nanoseconds
	this.times[name].duration = end[0] * 1e9 + end[1];

	// If an error occurs, it's outside of the view
	this.errName = 'post';

	//console.log("Compiled execution of " + name + " took %d milliseconds", ~~(this.times[name].duration/1000)/1000);
});

/**
 * Set error information
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name    The template being rendered
 * @param    {Number}   line    The line nr in the original ejs file
 */
ViewRender.setMethod(function setErr(name, line) {
	this.errLine = line;
	this.errName = name;
});

/**
 * Set the theme to use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name    The theme name
 */
ViewRender.setMethod(function setTheme(name) {
	this.theme = name;
});

/**
 * Set the focus on a given block,
 * the browser will scroll there upon ajax navigation
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name    The optional block name
 */
ViewRender.setMethod(function setFocus(name) {

	if (!name) {

		if (this.currentOptions && this.currentOptions.assignedId) {
			name = this.currentOptions.assignedId;
		} else {
			name = this.currentBlock;
		}
	}

	// If this is a subrender (implement/print_element) bubble it up
	if (this.renderRoot != this) {
		return this.renderRoot.setFocus(name);
	}

	this.focusBlock = name;
});

/**
 * See if any IO is still running.
 * If there is not, do the finish callbacks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setMethod(function checkFinish() {

	var args;

	if (this.running) {
		return;
	}

	this.emitOnce('ioDone');

	if (this.renderRoot != this) {
		this.renderRoot.checkFinish();
	}
});

/**
 * Finish the wanted block and pass the rendered content to the callback
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.2
 *
 * @param    {String}   blockName    The blockName to finish (default mainBlock)
 * @param    {Function} callback
 *
 * @return   {BlockBuffer}
 */
ViewRender.setMethod(function finish(blockName, callback) {

	var tasks = [],
	    that  = this,
	    block,
	    line,
	    i;

	if (typeof blockName === 'function') {
		callback = blockName;
		blockName = undefined;
	}

	// Don't do anything while IO is still running
	if (this.running) {

		this.afterOnce('ioDone', function afterIO() {
			that.finish(blockName, callback);
		});

		return;
	}

	if (!blockName) {
		blockName = this.mainBlock;
	}

	// Get the block to finish
	block = this.blocks[blockName];

	if (!block) {
		// The block could not be found, so return an empty string
		return callback(null, '', false);
	}

	this.emit('finishing_block', blockName);

	// Join the block's buffer
	block.joinBuffer(function joinedBuffer(err, html, block) {

		that.emit('finished_block', blockName);

		if (err) {
			return callback(err);
		}

		callback(null, html, true, block);
	});

	return block;
});

/**
 * Expand into another template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   names
 */
ViewRender.setMethod(function expands(names) {
	this.extensions.push(new Hawkejs.Templates(this, names));
});

/**
 * Create an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.1
 *
 * @param    {String}   nodeName
 * @param    {Object}   options
 */
ViewRender.setMethod(function createElement(nodeName, options) {

	var element = new Hawkejs.Hawkejs.createElement(nodeName);

	// Set the viewrender on the new element
	element.viewRender = this;

	if (options) {
		if (options.content) {
			element.innerHTML = options.content;
		}

		if (options.className) {
			element.className = options.className;
		}

		if (options.attributes) {
			Hawkejs.Hawkejs.setAttributes(element, options.attributes);
		}
	}

	return element;
});

/**
 * Create an element builder instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   tagName
 * @param    {Object}   options
 */
ViewRender.setMethod(function buildElement(nodeName, options) {
	console.log('-- ElementBuilder is deprecated!! --', nodeName, options);
	return this.createElement(nodeName, options);
});

/**
 * Get a super block's content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setMethod(function get_super_block(name, options) {

	var that = this,
	    placeholder = new Hawkejs.Placeholder(this),
	    super_name = name + '__expanded__';

	if (options == null) {
		options = {};
	}

	placeholder.setGetContent(function getSuperContent(done) {
		if (that.blocks[super_name]) {
			that.blocks[super_name].joinBuffer(done);
		} else {
			done(null, '');
		}
	});

	return placeholder;
});

/**
 * Put the hawkejs client foundation here
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.0
 */
ViewRender.setMethod(function foundation(options) {

	var that = this,
	    placeholder = new Hawkejs.Placeholder(this);

	if (options == null) {
		options = {};
	}

	placeholder.setGetContent(function getFoundationContent(done) {

		var settings,
		    metas,
		    html,
		    dry;

		// Wait for the other placeholders to finish
		that.waitForOtherPlaceholders(placeholder, function otherPlaceholdersDone(err) {

			var page_title,
			    element,
			    config,
			    style,
			    title,
			    link,
			    tag,
			    key,
			    i,
			    j;

			if (err) {
				console.error(err);
			}

			Fn.parallel(function getTitle(next) {

				if (typeof that.pageTitle == 'string') {
					page_title = Utils.String.stripTags(that.pageTitle);
					page_title = Utils.String.encodeHTML(page_title);

					title = '<title>' + page_title + '</title>\n';
					return next();
				}

				if (that.pageTitle && that.pageTitle.constructor && that.pageTitle.constructor.name == 'I18n') {
					that.pageTitle.getContent(function gotTitleContent(err) {

						if (err) {
							title = '<title></title>\n';
							return next();
						}

						page_title = Utils.String.stripTags(that.pageTitle.toHawkejsString(that));
						page_title = Utils.String.encodeHTML(page_title);

						title = '<title>' + page_title + '</title>\n';
						next();
					});
					return;
				}

				title = '<title></title>\n';
				return next();
			}, function getHeadtags(next) {

				metas = '';

				if (!that.headTags.length) {
					return next();
				}

				that.prepareContent(that.headTags, function done(err) {

					var element,
					    tag,
					    i;

					if (err) {
						return next(err);
					}

					for (i = 0; i < that.headTags.length; i++) {
						tag = that.headTags[i];

						// Create the element
						element = that.createElement(tag.name);

						for (key in tag.attr) {
							// Set the attributes
							element.setAttribute(key, tag.attr[key]);
						}

						// Set the content if specified
						if (tag.content) {
							element.setContent(tag.content);
						}

						metas += element.outerHTML + '\n';
					}

					next();
				});
			}, function getHtml(next) {

				settings = {
					open: that.hawkejs.open,
					close: that.hawkejs.close,
					root: that.hawkejs.root,
					scriptPath: that.hawkejs.scriptPath,
					stylePath: that.hawkejs.stylePath,
					withRenderContext: that.hawkejs.withRenderContext,
					global_protoblast: options.protoblast
				};

				html = '';

				// Get the serialized settings & view variables
				dry = Utils.JSON.dry([that.variables, settings, that]);

				// Load the hawkejs client file according to the strategy
				if (that.hawkejs.strategy == 'defer') {
					html += '<script defer src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';
				} else if (that.hawkejs.strategy == 'preventing' && that.has_bottom) {
					html += '<script async defer src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';
				}

				// Set the hawkejs settings
				html += '<script>window._initHawkejs = ' + dry.replace(/\<\/script/g, '</s" + "cript') + ';</script>\n';

				// Add the styles to the html, to prevent a FOUC
				for (i = 0; i < that.styles.length; i++) {
					config = that.styles[i][1];

					for (j = 0; j < that.styles[i][0].length; j++) {
						style = that.styles[i][0][j];

						if (style[0] == '/') {
							link = style;
						} if (style.indexOf('https:') == 0 || style.indexOf('http:') == 0) {
							link = style;
						} else {
							link = that.hawkejs.root + that.hawkejs.stylePath + style;
							link = Utils.String.postfix(link, '.css');
						}

						if (config.theme && config.theme != 'default') {
							link += '?theme=' + config.theme;
						}

						html += '<link href="' + link + '" rel="stylesheet">\n';
					}
				}

				// Load the hawkejs client file according to the blocking strategy
				if (that.hawkejs.strategy == 'blocking' || !that.has_bottom) {
					html += '<script src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';
				}

				if (Hawkejs.Hawkejs.inline_css) {
					html += '<style>' + Hawkejs.Hawkejs.inline_css + '</style>';
				}

				next();

			}, function finished(err) {

				if (err) {
					return done(err);
				}

				done(null, title + metas + html);
			});
		});
	});

	this.print(placeholder);
});

/**
 * Place to put extra stuff, like dialog html
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ViewRender.setMethod(function bottom() {

	var that = this,
	    placeholder = new Hawkejs.Placeholder(this);

	this.has_bottom = true;

	placeholder.setGetContent(function setBottom(done) {

		var settings,
		    tasks,
		    html,
		    dry;

		html = '<x-hawkejs class="js-he-bottom" style="position:fixed;left:-100vw;">';
		tasks = [];

		that.dialogs.forEach(function eachDialog(dialog) {
			tasks.push(function doDialog(next) {
				dialog.getContent(function gotContent(err, dialog_html) {

					if (err) {
						return next(err);
					}

					html += '\n' + dialog_html;
					next();
				});
			});
		});

		Fn.parallel(tasks, function finishedDialogs(err) {

			if (err) {
				return done(err);
			}

			html += '</x-hawkejs>\n';

			// If the client-file strategy is to prevent the ready event,
			// we need to download the script synchronously at the bottom
			// if it isn't ready yet
			if (that.hawkejs.strategy == 'preventing') {
				html += '<script>';
				html += 'if (!window.hawkejs) {';
				html += "document.write('<scr' + 'ipt src=" + JSON.stringify(that.hawkejs.root + that.hawkejs.clientPath) + "></scr' + 'ipt>');";
				html += '}';
				html += '</script>';
			}

			done(null, html);
		});
	});

	this.print(placeholder);
});

/**
 * Set the title for the page
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   title
 */
ViewRender.setMethod(function set_title(title) {
	this.pageTitle = title;
});

/**
 * Add css class to the current block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.2
 * @version  1.1.2
 *
 * @param    {String}   class_name
 */
ViewRender.setMethod(function add_class(class_name) {

	var block = this.blocks[this.currentBlock];

	if (!block) {
		return;
	}

	if (!block.options.className) {
		block.options.className = '';
	} else {
		block.options.className += ' ';
	}

	block.options.className += class_name;
});

/**
 * Print content to the given block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   content
 */
ViewRender.setMethod(function print(content, block) {

	if (content == null) {
		return;
	}

	if (!block) {
		block = this.currentBlock || '__main__';
	}

	if (!this.blocks[block]) {
		this.blocks[block] = new Hawkejs.BlockBuffer(this, block);
	}

	return this.blocks[block].push(content);
});

/**
 * Add an anchor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {String}   href
 */
ViewRender.setMethod(function add_link(href, options) {

	var classList = [],
	    content,
	    source,
	    anchor = this.createElement('a'),
	    html,
	    name,
	    i;

	if (!options || typeof options !== 'object') {
		options = {};
	}

	// Set the optional id
	options.id && (anchor.id = options.id);

	// Add CSS classes
	classList.push('js-he-link');

	if (options.class) {
		classList = classList.concat(options.class.split(' '));
	}

	options.name && anchor.setAttribute('name', options.name);
	anchor.setAttribute('title', options.title||options.name);

	if (options.history === false) {
		anchor.setAttribute('data-history', false);
	}

	// Store the original href
	source = href;

	// Fill in possible url values
	href = Utils.String.fillPlaceholders(href, options.urlvars);

	// And set the anchor link
	anchor.setAttribute('href', href);

	for (name in options.attributes) {

		if (name == 'class' || name == 'className') {
			classList = classList.concat(options.attributes[name].split(' '));
		} else {
			anchor.setAttribute(name, options.attributes[name]);
		}
	}

	// Get the content of the anchor
	content = (options.content || '') || anchor.getAttribute('title') || href;

	// Add all the CSS classes
	for (i = 0; i < classList.length; i++) {
		name = classList[i];

		if (!name) {
			continue;
		}

		anchor.classList.add(name);
	}

	html = '';

	if (options.prepend) html += options.prepend;
	if (content) html += content;
	if (options.append) html += options.append;

	if (options.escape) {
		anchor.innerText = html;
	} else {
		anchor.innerHTML = html;
	}

	return anchor;
});

/**
 * Assign a block here,
 * also used for 'script' and 'style' blocks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 *
 * @param    {String}   name
 *
 * @return   {BlockPlaceholder}
 */
ViewRender.setMethod(function assign(name, options) {

	// Create the new placeholder
	var placeholder = new Hawkejs.BlockPlaceholder(this, name, options),
	    id = this.print(placeholder);

	// Store it in the assigns object
	this.assigns[name] = placeholder;

	// Set the block where this placeholder is in
	placeholder.block = this.blocks[this.currentBlock || '__main__'];

	// See where this placeholder starts in the block
	placeholder.blockLineStart = id;

	return placeholder;
});

/**
 * Specifically end an 'assign' block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
ViewRender.setMethod(function assign_end(name) {

	// Get the placeholder
	var placeholder = this.assigns[name],
	    between;

	if (!placeholder || placeholder.closed) {
		return;
	}

	// Take the content after the first 'assign' call from the buffer
	between = placeholder.block.splice(placeholder.blockLineStart);

	placeholder.defaultContent = between;

	// Indicate this has been closed specifically
	placeholder.closed = true;
});

/**
 * Render an element in the current ViewRender scope
 * and print it out.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 *
 * @param    {Array|String}  elementNames    The element to render
 * @param    {Object}        options
 * @param    {Object}        variables
 */
ViewRender.setMethod(function implement(elementNames, options, variables) {

	var that = this,
	    existing_wrapper,
	    placeholder,
	    templates,
	    phOptions,
	    renderer,
	    manner,
	    hinder,
	    id;

	templates = new Hawkejs.Templates(this, elementNames);

	if (options == null) {
		options = {};
	}

	// The content of a template to implement should not change the main block
	if (options.changeMain == null) {
		options.changeMain = false;
	}

	// Wrap the implemented template in an x-hawkejs element by default
	if (options.wrap == null) {
		options.wrap = true;
	}

	variables = Utils.Object.assign({}, this.variables, variables || options.variables);

	// If the wrapper is a custom element,
	// see if it has a hawkejs_id, and use that if it does
	if (options.wrap && options.wrap.nodeName) {
		existing_wrapper = true;

		if (options.wrap.hawkejs_id) {
			id = options.wrap.hawkejs_id;
		}
	}

	if (!id) {
		id = this.getId();
	}

	if (!options.newscope) {
		renderer = this;
		manner = 'implement';

		// Construct the placeholder options object
		phOptions = {
			changeMain: options.changeMain,

			// In order to implement the same template multiple times,
			// it will need a unique blockname
			blockNameModifier: this.implementCount++,
			assignedId: id
		};
	} else {
		renderer = new ViewRender(that.hawkejs, true);

		renderer.assignedId = id;

		// Initialize all the helpers
		renderer.initHelpers();

		// Set the root renderer
		renderer.renderRoot = this.renderRoot;

		// Link the placeholder arrays
		renderer.placeholders = this.placeholders;

		// Script & style should be shared
		renderer.scripts = this.scripts;
		renderer.styles = this.styles;

		// Same for variables that need to be exposed
		renderer.exposeToScene = this.exposeToScene;

		// And for live bindings
		renderer.live_bindings = this.live_bindings;

		// Needed just for name references
		renderer.currentTemplate = this.currentTemplate;

		// Set the theme
		renderer.theme = this.theme;

		renderer.variables = variables;
		renderer.server_variables = that.server_variables;

		manner = 'element';

		phOptions = {};
	}

	// Add info to the root renderer
	this.renderRoot.blocks[id] = {
		id: id,
		variables: variables
	};

	// Create the placeholder
	placeholder = new Hawkejs.Placeholder(renderer, {wrap: options.wrap, className: options.className});

	// Set the id
	placeholder.id = id;

	// Create a hinder object (a basic promise-like object)
	hinder = Fn.hinder(false, function executeTemplates(done) {

		// Start executing the wanted element
		renderer.execute(templates, variables, phOptions, function afterRender() {

			var block,
			    key;

			that.renderRoot.blocks[id].origin = templates.active;

			// Blocks created in a new scope need to be added to the root renderer,
			// otherwise those blocks won't get emitted
			if (options.newscope) {
				for (key in renderer.blocks) {

					// Main blocks will get emitted, don't duplicate them
					if (Utils.String.endsWith(key, '__main__')) {
						continue;
					}

					block = renderer.blocks[key];
					block.in_scope = id;

					that.renderRoot.blocks[id + '_' + key] = block;
				}
			}

			// This hinder is done
			done();
		});
	});

	// Only finish this block when getContent is called
	placeholder.setGetContent(function getPlaceholderContent(next) {

		var elementName,
		    blockName,
		    baseName,
		    i;

		// Do this after the execution is done
		hinder.push(function finishing() {

			if (templates.active == null) {
				return next(new Error('No template was found for ' + manner + ' placeholder: "' + elementNames + '"'));
			}

			elementName = templates.active.sourceName;

			if (phOptions.changeMain) {
				blockName = renderer.mainBlock;
				baseName = renderer.mainBlockBaseName;
			} else {
				baseName = blockName = elementName + '__main__';

				if (phOptions.blockNameModifier != null) {
					blockName += phOptions.blockNameModifier;
				}
			}

			renderer.finish(blockName, function getBlockHtml(err, result, found, block) {

				var element = placeholder.element,
				    classes,
				    html,
				    key,
				    i;

				if (options.wrap) {

					if (id) {
						element.setAttribute('id', id);
					}

					// Set block attributes
					if (block && block.attributes) {
						for (key in block.attributes) {
							element.setAttribute(key, block.attributes[key]);
						}
					}

					if (block && block.options.className) {
						classes = block.options.className.split(' ');

						for (i = 0; i < classes.length; i++) {
							element.classList.add(classes[i]);
						}
					}

					// These aren't regular "blocks", they should not be
					// updated on client-side render
					if (!element.dataset.type) {
						element.dataset.type = manner;
					}

					// The name of the block
					element.dataset.name = baseName;

					// The origin of the placeholder is the target of this element
					if (placeholder.origin) {
						element.dataset.target = placeholder.origin.name;
					}

					// The template name the content comes from (not the source name)
					// We used to set the template as the one that was being implemented,
					// but what when the implemented template extends?
					//element.dataset.template = templates.active.name;
					element.dataset.template = block.startTemplate.name;
					element.setAttribute('data-entry-template', templates.active.name);

					// The theme that was used for the template
					element.dataset.theme = templates.active.activeTheme;

					element.classList.add('js-he-newblock');

					if (existing_wrapper) {
						html = result;
					} else {
						element.innerHTML = result;
						html = element.outerHTML;
					}
				} else {
					html = result;
				}

				next(err, html);
			});
		});
	});

	if (options.print !== false) {
		this.print(placeholder);
	}

	return placeholder;
});

/**
 * Set the update_url of a hawkejs element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}          path
 */
ViewRender.setMethod(function update_url(path) {

	var block = this.blocks[this.currentBlock];

	if (block) {
		block.attributes['data-update-url'] = path;
	}
});

/**
 * Create an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.2
 *
 * @param    {String}   name
 */
ViewRender.setMethod(function create_element(name) {

	var result = this.hawkejs.constructor.createElement(name);

	if (result.setIdentifier) {

		// Set the id
		result.setIdentifier(this.getId());

		if (!this.renderRoot.variables.__he_elements) {
			this.renderRoot.variables.__he_elements = [];
		}

		this.renderRoot.variables.__he_elements.push(result);
	}

	// Allow the custom element to use this view
	result.hawkejs_view = this;

	return result;
});

/**
 * Event content switching
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}          states
 */
ViewRender.setMethod(function live_event(name, callback) {

	return this.registerLive({
		id: name,
		type: 'event',
		callback: callback
	});

});

/**
 * Live data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}          path
 * @param    {Function}        callback
 */
ViewRender.setMethod(function live(path, callback) {

	var path_pieces = path.split('.'),
	    parent_pieces,
	    element_id,
	    parent,
	    config,
	    value,
	    vars,
	    html,
	    id;

	vars = this.currentVariables || this.variables;

	// Get the value for immediate printing
	value = Blast.Bound.Object.path(vars, path_pieces);

	// Get the parent item
	if (path_pieces.length > 1) {
		// Get the path to the parent (the given path without the last piece)
		parent_pieces = path_pieces.slice(0, -1);

		// Get the parent
		parent = Blast.Bound.Object.path(vars, parent_pieces);
	} else {
		// If the path is only 1 piece long, the parent and value are the same
		parent = value;
	}

	// Get the id of the object
	if (parent) {
		id = parent._id || parent.id;
	}

	return this.registerLive({
		id: id,
		path: path,
		type: 'record',
		value: value,
		callback: callback
	});
});

/**
 * Register live binding
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.2
 *
 * @param    {Object}   options
 */
ViewRender.setMethod(function registerLive(options) {

	var that = this,
	    placeholder,
	    block_name,
	    element_id,
	    config,
	    block;

	// Create the placeholder
	placeholder = new Hawkejs.Placeholder(this);

	// Get a unique id for the html element
	element_id = this.getId();

	// Construct the block name
	block_name = '_live_' + element_id;

	if (!options.id) {
		options.id = '';
	}

	if (!options.path) {
		options.path = '';
	}

	// Print the placeholder
	this.print(placeholder);

	// Start the new block
	block = this.start(block_name);

	// Add a property to the function indicating this is the first execution
	options.callback.initial = true;

	// Execute the callback
	options.callback(options.value);

	// End the block
	this.end(block_name);

	// Set the placeholder getter function
	placeholder.setGetContent(function getContent(next) {
		block.joinBuffer(function gotBuffer(err, html) {

			var element;

			if (err) {
				return next(err);
			}

			// Create the he-bound element
			element = that.createElement('he-bound');

			// Set the id
			element.id = element_id;

			// Set the data-id
			element.dataset.id = options.id;

			// Set the path
			element.dataset.path = options.path;

			// Set the inner content
			element.innerHTML = html;

			// Add optional classes
			Hawkejs.addClasses(element, block.options.className);

			next(null, element.outerHTML);
		});
	});

	// If no listening id is given, don't register
	if (!options.id) {
		return;
	}

	if (!this.live_bindings[options.id]) {
		this.live_bindings[options.id] = [];
	}

	config = {
		type: options.type, // 'record' or 'event'
		element_id: element_id,
		callback: ''+options.callback,
		variables: this.currentVariables || this.variables,
		path: options.path,
		id: options.id,
		scope: this.functionScopes.slice(0)
	};

	this.live_bindings[options.id].push(config);
});

/**
 * Render an element in a new ViewRender scope and print it out.
 * Any blocks defined inside the view can not be used outside of it.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {Array|String}  elementNames    The element to render
 * @param    {Object}        variables
 * @param    {Object}        options
 */
ViewRender.setMethod(function print_element(elementNames, variables, options) {

	if (!options) {
		options = {};
	}

	// Force a new render scope
	options.newscope = true;

	if (variables && variables.wrap != null) {
		options.wrap = variables.wrap;
	}

	return this.implement(elementNames, options, variables);
});

/**
 * Execute asynchronous code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 *
 * @param    {String}   elementName    The element to render
 * @param    {Object}   variables
 */
ViewRender.setMethod(function async(fnc) {

	var that = this,
	    placeholder;

	placeholder = new Hawkejs.Placeholder(this, function getAsyncValue(next) {
		fnc(function getResult(err, result) {
			next(err, result);
		});
	});

	that.print(placeholder);

	return placeholder;
});

/**
 * Indicate this script is needed for this render
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {String|Array}  instructions   Where / what script to get
 * @param    {Object}        options
 */
ViewRender.setMethod(function script(instructions, options) {

	var id;

	if (typeof options == 'string') {
		id = options;
	}

	if (!options || typeof options !== 'object') {
		options = {};
	}

	if (!options.id) {
		id = options.id;
	}

	instructions = Utils.Array.cast(instructions);

	// Remember where this script came from
	options.originBlock = this.currentBlock;
	options.originTemplate = this.currentTemplate;
	options.theme = this.theme;

	this.scripts.push([instructions, options]);
});

/**
 * Indicate this style is needed for this render
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {String|Array}   instructions   Where / what style to get
 * @param    {Object}         options
 */
ViewRender.setMethod(function style(instructions, options) {

	var id;

	if (typeof options == 'string') {
		id = options;
	}

	if (!options || typeof options !== 'object') {
		options = {};
	}

	if (!options.id) {
		id = options.id;
	}

	instructions = Utils.Array.cast(instructions);

	// Remember where this style came from
	options.originBlock = this.currentBlock;
	options.originTemplate = this.currentTemplate;
	options.theme = this.theme;

	this.styles.push([instructions, options]);
});

/**
 * Add a tag to the head element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   tag_name
 * @param    {Object}   attributes
 * @param    {String}   content
 */
ViewRender.setMethod(function head_tag(tag_name, attributes, content) {

	if (typeof attributes == 'string') {
		content = attributes;
		attributes = null;
	}

	this.headTags.push({name: tag_name, attr: attributes, content: content});
});

/**
 * Add a meta tag
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   attributes
 */
ViewRender.setMethod(function meta_tag(attributes) {
	this.head_tag('meta', attributes);
});

/**
 * Set the variable to be used inside the view.
 * Or get if only a name is given.
 *
 * Caution: variables are always sent to the client and can even be
 * accessed in post-render callbacks, they are just not kept around.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
ViewRender.setMethod(function set(name, value) {

	if (arguments.length == 1) {
		return this.variables[name];
	}

	this.variables[name] = value;
});

/**
 * Set this variable to be used inside the view,
 * but mostly for internal things, so prefix it.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
ViewRender.setMethod(function internal(name, value) {

	name = '__' + name;

	if (arguments.length == 1) {
		return this.variables[name];
	}

	this.variables[name] = value;
});

/**
 * Set this variable to be used on the server side only
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.1
 * @version  1.1.1
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
ViewRender.setMethod(function server_var(name, value) {

	name = '__' + name;

	if (arguments.length == 1) {
		return this.server_variables[name];
	}

	this.server_variables[name] = value;
});

/**
 * Store the value in the client's scene.
 * Or get if only a name is given.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
ViewRender.setMethod(function expose(name, value) {

	if (arguments.length == 1) {

		// Look inside the viewrender first
		if (typeof this.exposeToScene[name] !== 'undefined') {
			return this.exposeToScene[name];
		}

		// If the item hasn't been found yet, look in the scene
		if (typeof hawkejs != 'undefined' && hawkejs && hawkejs.scene) {
			return hawkejs.scene.exposed[name];
		}

		return;
	}

	this.exposeToScene[name] = value;
});

/**
 * Emit events signaling this view renderer is done
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Boolean}   has_rendered   False if client will render
 */
ViewRender.setMethod(function emitDone(has_rendered) {

	if (has_rendered == null) {
		has_rendered = true;
	}

	if (has_rendered) {
		// Emit the finished event on the view rendered
		this.emit('renderFinished');

		// Emit the finished event on hawkejs itself
		this.hawkejs.emit('renderFinished', this);
	}

	// Emit the done event on hawkejs itself
	this.hawkejs.emit('viewrenderDone', this);
});

/**
 * Wait for other placeholders to have finished
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.2
 * @version  1.2.2
 *
 * @param    {Placeholder}   placeholder   Placeholders to exclude
 */
ViewRender.setMethod(function waitForOtherPlaceholders(exclude_placeholder, callback) {

	var that = this,
	    last_seen = -1,
	    count = 0;

	if (typeof exclude_placeholder == 'function') {
		callback = exclude_placeholder;
		exclude_placeholder = undefined;
	}

	exclude_placeholder = Blast.Bound.Array.cast(exclude_placeholder);

	this.afterOnce('ioDone', function afterIO() {

		var tasks = [];

		that.placeholders.forEach(function eachPlaceholder(placeholder, index) {

			// Skip placeholders already seen
			if (index < last_seen) {
				return;
			}

			last_seen = index;

			// Skip placeholders in the exclude array
			if (exclude_placeholder.indexOf(placeholder) > -1) {
				return;
			}

			// Skip placeholders that have already finished
			if (placeholder.finished) {
				return;
			}

			tasks.push(function whenDone(next) {
				placeholder.whenFinishedOrTimeout(next);
			});
		});

		Fn.parallel(tasks, function firstDone(err) {

			if (err) {
				return callback(err);
			}

			// If there are no new placeholders, end here
			if (that.placeholders.length == last_seen + 1) {
				return callback();
			}

			// Limit to 3 retries
			if (count > 3) {
				return callback();
			}

			count++;
			Blast.setImmediate(afterIO);
		});
	});
});

/**
 * Create and return a placeholder
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.2
 * @version  1.2.2
 */
ViewRender.setMethod(function placeholder(options, fnc) {

	var placeholder;

	if (typeof options == 'function') {
		fnc = options;
		options = null;
	}

	// Create a new placeholder
	placeholder = new Hawkejs.Placeholder(this, options);

	// Set the content function
	placeholder.setGetContent(fnc);

	return placeholder;
});

Hawkejs.ViewRender = ViewRender;