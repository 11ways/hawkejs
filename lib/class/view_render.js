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
		Hawkejs.Hawkevents.call(this);

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

		// The variables
		this.variables = null;

		// Info on the request
		this.request = null;

		this.scene = false;
	};

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
			variables: this.variables,
			request: this.request
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
	 * Start execute the code of a template
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
	ViewRender.prototype.execute = function execute(name, variables, main, callback) {

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

		if (typeof main === 'function') {
			callback = main;
			main = false;
		}

		if (typeof variables === 'boolean') {
			main = variables;
			variables = {};
		}

		if (main && !this.variables) {
			this.variables = variables;
			this.mainTemplate = name;
		}

		// Return early if this is meant for the browser
		if (this.clientRender && Blast.isNode) {

			Blast.setImmediate(function() {

				// Indicate nothing is running
				that.running--;

				if (callback) {
					callback();
				}

				that.checkFinish();
			});

			return;
		}

		blockName = name + '__main__';
		helpers = {};

		// Continue with the rest for server-side renders on node,
		// or client-side renders on the browser
		for (key in this.hawkejs.helpers) {
			helpers[key] = new this.hawkejs.helpers[key](this);
		}

		this.currentTemplate = name;

		this.hawkejs.getCompiled(name, function(err, fnc) {

			if (err) {
				return that.hawkejs.handleError(that.errName, that.errLine, err);
			}

			that.start(blockName);

			// Execute the compiled template
			if (fnc) {
				try {
					fnc.call(that, variables, helpers);
				} catch (err) {
					that.hawkejs.handleError(that.errName, that.errLine, err);
				}
			}

			that.end(blockName);

			that.mainBlock = blockName;

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

			// Send JSON data if this is meant to be rendered in the browser
			if (this.clientRender && Blast.isNode) {
				this.res.set({ 'content-type': 'application/json; charset=utf-8' });
				return callback(null, dry.stringify(this), false);
			}

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
			    clone,
			    html;

			settings = {
				open: that.hawkejs.open,
				close: that.hawkejs.close,
				root: that.hawkejs.root,
				withRenderContext: that.hawkejs.withRenderContext
			};

			// Load jQuery first
			html = '<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>\n';

			// See if a fallback is present
			if (that.hawkejs.jqueryPath) {
				html += '<script>window.jQuery || document.write(\'<script src="' + that.hawkejs.jqueryPath + '">\x3C/script>\')</script>\n';
			}

			// Load the hawkejs client file
			html += '<script src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';

			// Set the hawkejs settings
			html += '<script>hawkejs.loadSettings(' + JSON.stringify(settings) + ');';

			clone = {
				scripts: that.scripts,
				styles: that.styles
			};

			// Register the render
			html += 'hawkejs.registerRender(' + JSON.stringify(clone) + ');</script>\n';

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

		var sourceHref;

		if (!href) href = '';

		// Store the original href
		sourceHref = href;

		if (typeof options === 'undefined') options = {};
		
		if (!options.name) options.name = options.title || href;
		if (typeof options.title === 'undefined') options.title = options.name;
		if (!options.class) options.class = '';
		if (!options.return) options.return = 'print';

		// If urlvars have been given, fill them
		href = Utils.String.fillPlaceholders(href, options.urlvars);

		if (!options.id) {
			options.id = 'hawkejs-link-' + this.currentTemplate.replace(/\//g, '-') + '-' + href.replace(/[^a-z0-9]/gi,'');

			if (!href && options.name) {
				options.id += options.name.replace(/[^a-z0-9]/gi,'');
			}
		}

		// Name is actually content of the element
		if (typeof options.content === 'undefined') options.content = options.title;
		
		// Do not write back to options.content, because sometimes this is byref!
		var content = options.content;

		// If there still is no valid content, use an empty string
		if (!content) {
			content = '';
		}
		
		// Prepend html stuff to the content
		if (options.prepend) {
			
			var prepend = '';
			
			if (typeof options.prepend == 'array' || typeof options.prepend == 'object') {
				for (var i in options.prepend) {
					prepend += options.prepend[i];
				}
			} else {
				prepend = options.prepend;
			}
			
			content = prepend + content;
		}
		
		// Escape the content if needed
		if (options.escape) content = helpers.encode(content);

		// Append to the content
		if (options.append) content += options.append;
		
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

		var a = '<a id="' + options.id + '" href="' + href + '" '
						+ 'title="' + Utils.String.encodeHTML(options.title) + '" '
						+ 'data-hawkejs="link" ';

		a += 'class="' + (options.class||'') + ' js-he-link';
		if (options.attributes && options.attributes['class']) {
			a += options.attributes['class'];
			delete options.attributes['class'];
		}
		a += '" ';

		a += Utils.String.serializeAttributes(options.attributes);
		
		// Add the text between the anchor, and close the tag
		a += '>' + content + '</a>';
		
		// Add the result to the options
		options.html = a;
		
		if (options.return == 'print') this.print(a);
		else if (options.return == 'options') return options;
		else if (options.return == 'string') return a;
		else if (options.return == 'all') {
			this.print(a);
			return options;
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

	// Inherit Hawkevents
	for (var key in Hawkejs.Hawkevents.prototype) {
		ViewRender.prototype[key] = Hawkejs.Hawkevents.prototype[key];
	}

	Hawkejs.ViewRender = ViewRender;
};