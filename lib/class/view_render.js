module.exports = function(Hawkejs, Blast) {

	var ViewRender,
	    Utils = Blast.Bound,
	    dry   = require('json-dry'),
	    log   = Hawkejs.logHandler;

	/**
	 * The ViewRender class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender = Blast.Classes.Informer.extend(function ViewRender(parent, nested) {

		// The parent hawkejs instance
		this.hawkejs = parent;

		// Blocks
		this.blocks = {};

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

		// Assigns
		this.assigns = {};

		// The main template name
		this.mainTemplate = null;

		// The template we rendered last
		this.lastTemplate = null;

		// The template currently rendering (reset after each render)
		this.currentTemplate = null;

		// Variables to use in the views (added using `set`)
		this.variables = {};

		// Variables to expose to the scene (added using `expose`)
		this.exposeToScene = {};

		// Info on the request
		this.request = null;

		// Is this going to be rendered on the client?
		// We don't know this until the req object has been inspected
		this.clientRender = null;

		// When set to false, links inside this view will not be ajaxifier
		this.enableClientRender = true;

		// Helper instances
		this.helpers = {};

		this.scene = false;

		// Emit this new ViewRender instance on the Hawkejs instance
		if (!nested) {
			this.hawkejs.emit({type: 'viewrender', status: 'init'}, this);
		}
	});

	// Keep track of amount of `implements` made,
	// this number is used as an id
	ViewRender.setProperty('implementCount', 0);

	/**
	 * Convert to JSON
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.setMethod(function toJSON() {

		var result = {
			enableClientRender: this.enableClientRender,
			exposeToScene: this.exposeToScene,
			mainTemplate: this.mainTemplate,
			lastTemplate: this.lastTemplate,
			pageTitle: this.pageTitle,
			variables: this.variables,
			request: this.request,
			blocks: this.blocks,
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
	 * Execute a command
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   cmd
	 * @param    {Array}    args
	 */
	ViewRender.setMethod(function command(cmd, args) {
		if (this.hawkejs.commands[cmd]) {
			this.hawkejs.commands[cmd].apply(this, args);
		}
	});

	/**
	 * Start a block.
	 * Does nothing if the block already exists.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName
	 */
	ViewRender.setMethod(function start(blockName) {

		if (this.blocks[blockName] != null) {
			return false;
		}

		this.currentBlock = blockName;
		this.chain.push(blockName);

		return true;
	});

	/**
	 * End a block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName
	 */
	ViewRender.setMethod(function end(blockName) {

		var index;

		if (blockName) {

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
	 * Begin the render with the wanted template.
	 * Entry point for rendering
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String|Array}   names       The template to render (first found)
	 * @param    {Object}         variables   The veriables to pass to the template
	 * @param    {Boolean}        main        Is this the main template?
	 * @param    {Function}       callback    Optional callback to run after execution
	 */
	ViewRender.setMethod(function beginRender(names, variables, callback) {

		var that = this,
		    key;

		log(0, 'Started rendering', names);

		if (typeof variables === 'function') {
			callback = variables;
			variables = {};
		}

		if (this.hasBegun) {
			return callback(new Error('ViewRender already rendering, create new instance'));
		}

		// Once this ViewRender has begun rendering something,
		// it should not be used to render any other templates
		this.hasBegun = true;

		// Store the variables
		Object.assign(this.variables, variables);

		// Store the main template name
		this.mainTemplate = names;

		// Emit an event that we're going to render
		this.hawkejs.emit({type: 'viewrender', status: 'begin', client: this.clientRender}, this);
		this.emit('begin', this);

		// Return early if this is meant for the browser, but remain asynchronous
		if (this.clientRender && Blast.isNode) {

			log(0, 'Deferring render of', names, 'back to client');

			Blast.setImmediate(function sendingData() {
				// Send JSON data if this is meant to be rendered in the browser
				that.res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
				return callback(null, Blast.Collection.JSON.dry(that), false);
			});

			return;
		}

		// Clone the variables
		this.variables = Blast.Collection.JSON.undry(Blast.Collection.JSON.dry(this.variables));

		// Create all the helpers now
		// @todo: Initialize only used helpers
		for (key in Hawkejs.helpers) {

			// Skip (old, pre v1.0.0) helpers
			if (typeof Hawkejs.helpers[key] !== 'function') {
				continue;
			}

			this.helpers[key] = new Hawkejs.helpers[key](this);
		}

		log(1, 'Executing', names);

		// @todo: allow multiple template options

		// Execute the template code, and schedule the callback
		this.execute(names, this.variables, true, function afterExec() {

			log(1, 'Executed main template code of', names, ', requesting finish');

			that.finish(function afterFinish(err, html) {
				log(1, 'Render that began with', names, 'has finished. HTML length is', html.length);
				that.afterRender(err, html, callback);
			});
		});
	});

	/**
	 * Function that will be called after the render is completed
	 * and all templates have finished.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.setMethod(function afterRender(err, html, callback) {

		if (!this.hasFinished) {
			this.hasFinished = true;

			this.emit('renderFinished');
			this.emitCreated();
		}

		log(0, 'All renders have finished, calling back with HTML length of', html.length);

		if (callback) callback(err, html);
	});

	/**
	 * Start execute the code of a template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   names       The template names to render (first available)
	 * @param    {Object}   variables   The veriables to pass to the template
	 * @param    {Object}   options
	 * @param    {Function} callback    Optional callback to run after execution
	 */
	ViewRender.setMethod(function execute(names, variables, options, callback) {

		var blockName,
		    that      = this,
		    key,
		    i;

		this.running++;

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

		log(4, 'Looking for templates', names);

		// Get the compiled template function
		this.hawkejs.getCompiled(names, function gotCompiledTemplate(err, fnc) {

			var name;

			if (err) {
				log(4, 'Failed to get compiled templates', names, 'with error', err);
				return that.hawkejs.handleError(that, names, 'pre', err);
			}

			// Get the name of the found template
			name = fnc.templateName;
			blockName = name + '__main__';

			if (options.blockNameModifier != null) {
				blockName += options.blockNameModifier;
			}

			// Set the template we're currently rendering
			that.currentTemplate = name;

			// The first block is the complete content of the template itself
			that.start(blockName);

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
			that.currentTemplate = '';

			if (options.changeMain) {
				that.mainBlock = blockName;
			}

			// Do any extensions that need to be done
			that.doExtensions(variables, callback);
		});
	});

	/**
	 * Set the start time for the given template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The theme name
	 */
	ViewRender.setMethod(function setTheme(name) {
		this.theme = name;
	});

	/**
	 * See if any IO is still running.
	 * If there is not, do the finish callbacks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.setMethod(function checkFinish() {

		var args;

		if (this.running) {
			return;
		}

		this.emitOnce('ioDone');
	});

	/**
	 * Finish the wanted block and pass the rendered content to the callback
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName    The blockName to finish (default mainBlock)
	 * @param    {Function} callback
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
			this.after('ioDone', function afterIO() {
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
			log(5, 'Could not find block', blockName, ', returning empty string');
			// The block could not be found, so return an empty string
			return callback(null, '', false);
		}

		log(5, 'Requesting join of entire block', blockName);

		// Join the block's buffer
		block.joinBuffer(function joinedBuffer(err, html) {

			if (err) {
				log(4, 'Joined block', blockName, ', but got error:', err);
				return callback(err);
			}

			log(4, 'Finished joining block', blockName, ', HTML length:', html.length);

			callback(null, html, true);
		});
	});

	/**
	 * Expand into another template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   layout
	 */
	ViewRender.setMethod(function expands(layout) {
		this.extensions.push(layout);
	});

	/**
	 * Put the hawkejs client foundation here
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.setMethod(function foundation() {

		var that = this,
		    placeholder = new Hawkejs.Placeholder(this);

		placeholder.setGetContent(function(done) {

			var settings,
			    html;

			settings = {
				open: that.hawkejs.open,
				close: that.hawkejs.close,
				root: that.hawkejs.root,
				scriptPath: that.hawkejs.scriptPath,
				stylePath: that.hawkejs.stylePath,
				withRenderContext: that.hawkejs.withRenderContext
			};

			// Set the hawkejs settings
			html = '<script>window._initHawkejs = [' + dry.stringify(settings) + ', ' + dry.stringify(that) + '];</script>\n';

			// Load the hawkejs client file
			html += '<script src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';

			done(null, html);
		});

		this.print(placeholder);
	});

	/**
	 * Set the title for the page
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   title
	 */
	ViewRender.setMethod(function set_title(title) {
		this.pageTitle = title;
	});

	/**
	 * Print content to the given block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   content
	 */
	ViewRender.setMethod(function print(content, block) {

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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}   href
	 */
	ViewRender.setMethod(function add_link(href, options) {

		var content,
		    source,
		    anchor = Hawkejs.ElementBuilder.create('a');

		if (!options || typeof options !== 'object') {
			options = {};
		}

		// Set the optional id
		anchor.id = options.id;

		// Add CSS classes
		anchor.addClass('js-he-link');
		anchor.addClass(options.class);

		anchor.attr('name', options.name);
		anchor.attr('title', options.title||options.name);

		// Store the original href
		source = href;

		// Fill in possible url values
		href = Utils.String.fillPlaceholders(href, options.urlvars);

		// And set the anchor link
		anchor.attr('href', href);

		// Get the content of the anchor
		content = (options.content || '') || anchor.attr('title') || href;

		anchor.setContent([options.prepend, content, options.append], options.escape);

		return this.print(anchor);

		if (options.match) {
			
			// Add the source href
			options.match.sourceHref = sourceHref;
			
			if (options.match.fullHref) {
				delete options.match.fullHref;
				options.match.sourceHref = href;
			}
			
			// @todo: match stuff for menus
			//this._add_match_options(options.id, options.match);
		}
	});

	/**
	 * Assign a block here,
	 * also used for 'script' and 'style' blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 */
	ViewRender.setMethod(function assign(name, extra) {

		// Create the new placeholder
		var placeholder = new Hawkejs.BlockPlaceholder(this, name),
		    id = this.print(placeholder);

		// Store it in the assigns object
		this.assigns[name] = placeholder;

		// Set the block where this placeholder is in
		placeholder.block = this.blocks[this.currentBlock || '__main__'];

		// See where this placeholder starts in the block
		placeholder.blockLineStart = id;
	});

	/**
	 * Specifically end an 'assign' block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Array|String}  elementNames    The element to render
	 * @param    {Object}        options
	 * @param    {Object}        variables
	 */
	ViewRender.setMethod(function implement(elementNames, options, variables) {

		var that = this,
		    placeholder,
		    phOptions,
		    renderer,
		    manner;

		if (!Array.isArray(elementNames)) {
			elementNames = [elementNames];
		} else {
			elementNames = Utils.Array.flatten(elementNames);
		}

		placeholder = new Hawkejs.Placeholder(this);

		if (options == null) {
			options = {};
		}

		// The content of a template to implement should not change the main block
		if (options.changeMain == null) {
			options.changeMain = false;
		}

		variables = Object.assign({}, this.variables, variables || options.variables);

		// Wrap the implemented template in an x-hawkejs element by default
		if (options.wrap == null) {
			options.wrap = true;
		}

		if (!options.newscope) {
			renderer = this;
			manner = 'implement';

			// Construct the placeholder options object
			phOptions = {
				changeMain: options.changeMain,

				// In order to implement the same template multiple times,
				// it will need a unique blockname
				blockNameModifier: this.implementCount++
			};
		} else {
			renderer = new ViewRender(that.hawkejs, true);
			renderer.variables = variables;
			renderer.scripts = this.scripts;
			renderer.styles = this.styles;
			renderer.exposeToScene = this.exposeToScene;
			manner = 'print_element';

			phOptions = {};
		}

		// Start executing the wanted element
		renderer.execute(elementNames, variables, phOptions);

		// Only finish this block when getContent is called
		placeholder.setGetContent(function getPlaceholderContent(next) {

			var elementName,
			    blockName,
			    i;

			// Get the correct blockname to use
			for (i = 0; i < elementNames.length; i++) {
				elementName = elementNames[i];
				blockName = elementName + '__main__';

				if (phOptions.blockNameModifier != null) {
					blockName += phOptions.blockNameModifier;
				}

				if (renderer.blocks[blockName] != null) {
					break;
				}
			}

			if (phOptions.changeMain) {
				blockName = renderer.mainBlock;
			}

			renderer.finish(blockName, function getBlockHtml(err, result) {

				var element,
				    html;

				if (options.wrap) {
					element = Hawkejs.ElementBuilder.create('x-hawkejs');

					element.data('type', 'block');
					element.data('name', blockName);
					element.data('implement', elementName);
					element.data('origin', placeholder.origin);
					element.data('manner', manner);
					element.addClass('js-he-newblock');
					element.setContent(result);
					html = ''+element;
				} else {
					html = result;
				}

				next(err, html);
			});
		});

		this.print(placeholder);
	});

	/**
	 * Render an element in a new ViewRender scope and print it out.
	 * Any blocks defined inside the view can not be used outside of it.
	 * Styles and scripts will also be ignored.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Array|String}  elementNames    The element to render
	 * @param    {Object}        variables
	 */
	ViewRender.setMethod(function print_element(elementNames, variables) {
		this.implement(elementNames, {newscope: true}, variables);
	});

	/**
	 * Execute asynchronous code
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   elementName    The element to render
	 * @param    {Object}   variables
	 */
	ViewRender.setMethod(function async(fnc) {

		var that = this,
		    placeholder;

		placeholder = new Hawkejs.Placeholder(this, function(next) {
			fnc(function getResult(err, result) {
				next(err, result);
			});
		});

		that.print(placeholder);
	});

	/**
	 * Indicate this script is needed for this render
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
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

		instructions = Blast.Bound.Array.cast(instructions);

		// Remember where this script came from
		options.originBlock = this.currentBlock;
		options.originTemplate = this.currentTemplate;

		this.scripts.push([instructions, options]);
	});

	/**
	 * Indicate this style is needed for this render
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
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

		instructions = Blast.Bound.Array.cast(instructions);

		// Remember where this style came from
		options.originBlock = this.currentBlock;
		options.originTemplate = this.currentTemplate;

		this.styles.push([instructions, options]);
	});

	/**
	 * Set the variable to be used inside the view.
	 * Or get if only a name is given.
	 *
	 * Caution: variables are always sent to the client and can even be
	 * accessed in post-render callbacks, they are just not kept around.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	 * Store the value in the client's scene.
	 * Or get if only a name is given.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
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
			if (hawkejs && hawkejs.scene) {
				return hawkejs.scene.exposed[name];
			}

			return;
		}

		this.exposeToScene[name] = value;
	});

	/**
	 * Emit events for all created blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   path       Path of the style
	 * @param    {Object}   options
	 */
	ViewRender.setMethod(function emitCreated() {

	});

	Hawkejs.ViewRender = ViewRender;
};