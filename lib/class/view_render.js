module.exports = function(Hawkejs) {

	var async = Hawkejs.async;

	/**
	 * The ViewRender class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	function ViewRender(parent) {

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

		this.currentBlock = this.chain.last();
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

		if (name == 'script') {

		} else if (name == 'style') {

		} else {
			this.print(new Hawkejs.BlockPlaceholder(this, name));
		}
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
	 */
	ViewRender.prototype.execute = function execute(name, variables, main) {

		var blockName = name + '__main__',
		    helpers   = {},
		    key,
		    i;

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

		this.start(blockName);

		// Execute the compiled template
		this.hawkejs.templates[name].call(this, variables, helpers);

		this.end(blockName);

		this.mainBlock = blockName;

		if (main) {
			for (i = 0; i < this.extensions.length; i++) {
				this.execute(this.extensions[i], variables);
			}
		}
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
		    block,
		    line,
		    i;

		if (typeof blockName === 'function') {
			callback = blockName;
			blockName = undefined;
		}

		if (!blockName) {
			blockName = this.mainBlock;
		}

		// Get the block to finish
		block = this.blocks[blockName];

		// Iterate over the lines to find any placeholders
		for (i = 0; i < block.length; i++) {
			line = block[i];

			if (line instanceof Hawkejs.Placeholder) {
				(function(line) {
					tasks[tasks.length] = function waitForPlaceholder(next) {
						line.getContent(function(err, result) {
							next(err);
						});
					};
				}(line));
			}
		}

		// Now execute the tasks
		async.parallel(tasks, function(err, result) {

			var html = '';

			if (err) {
				return callback(err);
			}

			for (i = 0; i < block.length; i++) {
				line = block[i];

				if (typeof line === 'string') {
					html += line;
				} else {
					if (line instanceof Hawkejs.Placeholder) {
						html += line.result;
					} else {
						html += line;
					}
				}
			}

			callback(null, html);
		});

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
		    placeholder;

		placeholder = new Hawkejs.Placeholder(this, function(next) {
			var subRender = new ViewRender(that.hawkejs);


			subRender.execute(elementName, variables || that.variables, true);

			subRender.finish(function(err, result) {
				next(err, result);
			});
		});

		that.print(placeholder);
	};

	ViewRender.prototype.script = function script(path, options) {

		

	};

	Hawkejs.ViewRender = ViewRender;
};