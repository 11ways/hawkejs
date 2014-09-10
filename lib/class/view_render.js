module.exports = function(Hawkejs, Blast) {

	var async = Hawkejs.async,
	    Utils = Blast.Bound,
	    dry   = require('json-dry');

	/**
	 * The ViewRender class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	function ViewRender(parent) {

		// Call event emitter constructor
		Blast.Classes.Informer.call(this);

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

		// The variables
		this.variables = null;

		// Info on the request
		this.request = null;

		this.scene = false;
	};

	Blast.inherits(ViewRender, Blast.Classes.Informer);

	/**
	 * Convert to JSON
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.prototype.toJSON = function toJSON() {

		var result = {
			mainTemplate: this.mainTemplate,
			lastTemplate: this.lastTemplate,
			variables: this.variables,
			request: this.request,
			blocks: this.blocks
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
	};

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
	ViewRender.prototype.command = function command(cmd, args) {
		if (this.hawkejs.commands[cmd]) {
			this.hawkejs.commands[cmd].apply(this, args);
		}
	};

	/**
	 * Start a block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName
	 */
	ViewRender.prototype.start = function start(blockName) {
		this.currentBlock = blockName;
		this.chain.push(blockName);
	};

	/**
	 * End a block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName
	 */
	ViewRender.prototype.end = function end(blockName) {

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
	};

	/**
	 * Begin the render with the wanted template.
	 * Entry point for rendering
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name        The template name to render
	 * @param    {Object}   variables   The veriables to pass to the template
	 * @param    {Boolean}  main        Is this the main template?
	 * @param    {Function} callback    Optional callback to run after execution
	 */
	ViewRender.prototype.beginRender = function beginRender(templateName, variables, callback) {

		var that = this;

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
		this.variables = variables;

		// Store the main template name
		this.mainTemplate = templateName;

		// Return early if this is meant for the browser, but remain asynchronous
		if (this.clientRender && Blast.isNode) {

			Blast.setImmediate(function sendingData() {
				// Send JSON data if this is meant to be rendered in the browser
				that.res.set({ 'content-type': 'application/json; charset=utf-8' });
				return callback(null, dry.stringify(that), false);
			});

			return;
		}

		// Execute the template code, and schedule the callback
		this.execute(templateName, variables, true, function afterExec() {
			that.finish(function afterFinish(err, html) {
				that.afterRender(err, html, callback);
			});
		});
	};

	/**
	 * Function that will be called after the render is completed
	 * and all templates have finished.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.prototype.afterRender = function afterRender(err, html, callback) {

		if (!this.hasFinished) {
			this.hasFinished = true;

			this.emit('renderFinished');
			this.emitCreated();
		}

		if (callback) callback(err, html);
	};

	/**
	 * Start execute the code of a template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name        The template name to render
	 * @param    {Object}   variables   The veriables to pass to the template
	 * @param    {Boolean}  changeMain  Change the main template block name?
	 * @param    {Function} callback    Optional callback to run after execution
	 */
	ViewRender.prototype.execute = function execute(name, variables, changeMain, callback) {

		var blockName,
		    helpers,
		    that      = this,
		    key,
		    i;

		this.running++;

		if (typeof variables === 'function') {
			callback = variables;
			variables = {};
		}

		if (typeof changeMain === 'function') {
			callback = changeMain;
			changeMain = true;
		}

		if (typeof variables === 'boolean') {
			changeMain = variables;
			variables = {};
		}

		blockName = name + '__main__';
		helpers = {};

		// Continue with the rest for server-side renders on node,
		// or client-side renders on the browser
		for (key in this.hawkejs.helpers) {
			helpers[key] = new this.hawkejs.helpers[key](this);
		}

		// Get the compiled template function
		this.hawkejs.getCompiled(name, function gotCompiledTemplate(err, fnc) {

			if (err) {
				return that.hawkejs.handleError(that.errName, that.errLine, err);
			}

			// Set the template we're currently rendering
			that.currentTemplate = name;

			// The first block is the complete content of the template itself
			that.start(blockName);

			// Execute the compiled template
			try {
				fnc.call(that, variables, helpers);
			} catch (err) {
				that.hawkejs.handleError(that.errName, that.errLine, err);
			}

			// End the template's main block
			that.end(blockName);

			// Set the previous template
			that.lastTemplate = that.currentTemplate;

			// Reset the current template
			that.currentTemplate = '';

			if (changeMain) {
				that.mainBlock = blockName;
			}

			// Do any extensions that need to be done
			that.doExtensions(variables, callback);
		});
	};

	/**
	 * Set the start time for the given template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The template name that has started rendering
	 */
	ViewRender.prototype.timeStart = function timeStart(name) {

		if (!this.times[name]) {
			this.times[name] = {};
		}

		// Set the start time
		this.times[name].start = Blast.hrtime();
	};

	/**
	 * Set the end time for the given template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name    The template name that has ended rendering
	 */
	ViewRender.prototype.timeEnd = function timeEnd(name) {

		var end;

		if (!this.times[name]) {
			throw new Error('Illegal timeEnd call for template ' + name);
		}

		// Get the end time
		end = Blast.hrtime(this.times[name].start);

		// Calculate the duration in nanoseconds
		this.times[name].duration = end[0] * 1e9 + end[1];

		//console.log("Compiled execution of " + name + " took %d milliseconds", ~~(this.times[name].duration/1000)/1000);
	};

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
	ViewRender.prototype.setErr = function setErr(name, line) {
		this.errLine = line;
		this.errName = name;
	};

	/**
	 * See if any IO is still running.
	 * If there is not, do the finish callbacks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.prototype.checkFinish = function checkFinish() {

		var args;

		if (this.running) {
			return;
		}

		this.emitOnce('ioDone');
	};

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
	ViewRender.prototype.finish = function finish(blockName, callback) {

		var tasks = [],
		    that  = this,
		    block,
		    line,
		    i;

		// Don't do anything while IO is still running
		if (this.running) {

			this.after('ioDone', function() {
				that.finish(blockName, callback);
			});

			return;
		}


		if (typeof blockName === 'function') {
			callback = blockName;
			blockName = undefined;
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

		// Join the block's buffer
		block.joinBuffer(function joinedBuffer(err, html) {

			if (err) {
				return callback(err);
			}

			callback(null, html, true);
		});
	};

	/**
	 * Extend another template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   layout
	 */
	ViewRender.prototype.extend = function extend(layout) {
		this.extensions.push(layout);
	};

	/**
	 * Put the hawkejs client foundation here
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewRender.prototype.foundation = function foundation() {

		var that = this,
		    placeholder = new Hawkejs.Placeholder(this);

		placeholder.setGetContent(function(done) {

			var settings,
			    html;

			settings = {
				open: that.hawkejs.open,
				close: that.hawkejs.close,
				root: that.hawkejs.root,
				withRenderContext: that.hawkejs.withRenderContext
			};

			console.log('\n»»»»»»»»»»»»»»»»»»»»»»»»»»»»»');
			console.log('Getting foundation content!');
			//console.log(that);
			console.log(that.constructor.name)
			console.log('««««\n\n');


			// Load jQuery first
			html = '<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>\n';

			// See if a fallback is present
			if (that.hawkejs.jqueryPath) {
				html += '<script>window.jQuery || document.write(\'<script src="' + that.hawkejs.jqueryPath + '">\x3C/script>\')</script>\n';
			}

			// Load the hawkejs client file
			html += '<script src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';

			// Set the hawkejs settings
			html += '<script>hawkejs.loadSettings(' + dry.stringify(settings) + ');';

			// Register the render
			html += 'hawkejs.registerRender(' + dry.stringify(that) + ');</script>\n';

			done(null, html);
		});

		this.print(placeholder);
	};

	/**
	 * Print content to the given block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   content
	 */
	ViewRender.prototype.print = function print(content, block) {

		if (!block) {
			block = this.currentBlock || '__main__';
		}

		if (!this.blocks[block]) {
			this.blocks[block] = new Hawkejs.BlockBuffer(this, block);
		}

		return this.blocks[block].push(content);
	};

	/**
	 * Add an anchor
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}   href
	 */
	ViewRender.prototype.add_link = function add_link(href, options) {

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
	};

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
	ViewRender.prototype.assign = function assign(name, extra) {

		// Create the new placeholder
		var placeholder = new Hawkejs.BlockPlaceholder(this, name),
		    id = this.print(placeholder);

		// Store it in the assigns object
		this.assigns[name] = placeholder;

		// Set the block where this placeholder is in
		placeholder.block = this.blocks[this.currentBlock || '__main__'];

		// See where this placeholder starts in the block
		placeholder.blockLineStart = id;
	};

	/**
	 * Specifically end an 'assign' block
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 */
	ViewRender.prototype.assign_end = function assign_end(name) {

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
	};

	/**
	 * Render an element and print it out
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   elementName    The element to render
	 * @param    {Object}   variables
	 */
	ViewRender.prototype.implement = function implement(elementName, variables) {

		var that = this,
		    placeholder,
		    subRender;

		placeholder = new Hawkejs.Placeholder(this);

		subRender = new ViewRender(that.hawkejs);
		subRender.implement = true;
		subRender.execute(elementName, variables || that.variables, true);

		// Only finish this block when getContent is called
		placeholder.setGetContent(function(next) {
			subRender.finish(function(err, result) {
				next(err, result);
			});
		});

		that.print(placeholder);
	};

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
	ViewRender.prototype.async = function async(fnc) {

		var that = this,
		    placeholder;

		placeholder = new Hawkejs.Placeholder(this, function(next) {
			fnc(function getResult(err, result) {
				next(err, result);
			});
		});

		that.print(placeholder);
	};

	/**
	 * Indicate this script is needed for this render
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   path       Path of the script
	 * @param    {Object}   options
	 */
	ViewRender.prototype.script = function script(path, options) {

		if (!options || typeof options !== 'object') {
			options = {};
		}

		// Remember where this script came from
		options.originBlock = this.currentBlock;

		this.scripts.push([path, options]);
	};

	/**
	 * Indicate this style is needed for this render
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   path       Path of the style
	 * @param    {Object}   options
	 */
	ViewRender.prototype.style = function style(path, options) {

		if (!options || typeof options !== 'object') {
			options = {};
		}

		// Remember where this style came from
		options.originBlock = this.currentBlock;

		this.styles.push([path, options]);
	};

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
	ViewRender.prototype.emitCreated = function emitCreated() {



		
	};

	Hawkejs.ViewRender = ViewRender;
};