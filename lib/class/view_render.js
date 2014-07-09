module.exports = function(Hawkejs) {

	var async = Hawkejs.async;

	/**
	 * The ViewRender class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	function ViewRender(parent, scene) {

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

		if (scene) {
			this.scene = scene;
		} else {
			this.scene = new Hawkejs.Scene(parent);
		}
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

		var blockName = name + '__main__',
		    helpers   = {},
		    that      = this,
		    tasks     = [],
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

		for (key in this.hawkejs.helpers) {
			helpers[key] = new this.hawkejs.helpers[key](this);
		}

		if (main && !this.variables) {
			this.variables = variables;
		}

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

			if (main) {
				that.extensions.forEach(function(extension) {
					tasks[tasks.length] = function(next) {
						that.execute(extension, variables, false, function() {
							next();
						});
					};
				});
			}

			async.parallel(tasks, function(err) {

				that.running--;

				if (callback) {
					callback();
				}

				that.checkFinish();
			});
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
		this.times[name].start = process.hrtime();
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
		end = process.hrtime(this.times[name].start);

		// Calculate the duration in nanoseconds
		this.times[name].duration = end[0] * 1e9 + end[1];

		console.log("Compiled execution of " + name + " took %d milliseconds", ~~(this.times[name].duration/1000)/1000);
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

		if (String(callback).indexOf('»»') > -1) {
			var debug = true;
		}

		if (!block) {
			// The block could not be found, so return an empty string
			return callback(null, '');
		}

		// Iterate over the lines to find any placeholders
		for (i = 0; i < block.length; i++) {
			line = block[i];

			if (line instanceof Hawkejs.Placeholder) {
				(function(line) {
					tasks[tasks.length] = function waitForPlaceholder(next) {

						line.getContent(function(err, result) {

							if (err) {
								that.hawkejs.handleError(line.errName, line.errLine, err);
							}

							next();
						});
					};
				}(line));
			}
		}

		// Now execute the tasks, where all the placeholder content will be fetched
		async.parallel(tasks, function(err) {

			var html = '',
			    length = block.length;

			if (err) {
				return callback(err);
			}

			// Join the block array entries into a single string
			for (i = 0; i < length; i++) {
				if (typeof block[i] === 'string') {
					html += block[i];
				} else {
					if (block[i] instanceof Hawkejs.Placeholder) {
						html += block[i].getResult();
					} else {
						html += block[i];
					}
				}
			}

			callback(null, html);
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

			// Load jQuery first
			html = '<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>\n';

			// See if a fallback is present
			if (that.hawkejs.jqueryPath) {
				html += '<script>window.jQuery || document.write(\'<script src="' + that.hawkejs.jqueryPath + '">\x3C/script>\')</script>\n';
			}

			// Load the hawkejs client file
			html += '<script src="' + that.hawkejs.root + that.hawkejs.clientPath + '"></script>\n';

			// Load the scene
			html += '<script>hawkejs.loadScene(' + JSON.stringify(settings) + ', ' + that.scene.toSource() + ');</script>\n';

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
			this.blocks[block] = [];
		}

		this.blocks[block].push(content);
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
		this.print(new Hawkejs.BlockPlaceholder(this, name));
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

	ViewRender.prototype.script = function script(path, options) {
		this.scene.addScript(path, options);
	};

	// Inherit Hawkevents
	for (var key in Hawkejs.Hawkevents.prototype) {
		ViewRender.prototype[key] = Hawkejs.Hawkevents.prototype[key];
	}

	Hawkejs.ViewRender = ViewRender;
};