module.exports = function(Hawkejs, Blast) {

	var ArrayProperties,
	    name,
	    i;

	/**
	 * BlockBuffers are array-like objects
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {ViewRender}   viewRender
	 */
	function BlockBuffer(viewRender, name) {

		// The parent viewRender instance
		this.viewRender = viewRender;

		// The parent hawkejs instance
		this.hawkejs = viewRender.hawkejs;

		// The optional name of this block
		this.name = name || 'nameless-' + Date.now();

		// The finished HTML (after all async work is done)
		this.html = '';
	}

	Blast.inherits(BlockBuffer, Array);

	

	/**
	 * Return the finished HTML or the current lines joined with an empty string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	BlockBuffer.prototype.toString = function toString(){

		if (this.html) {
			return this.html;
		}

		console.log('Got string too soon of block "' + this.name + '"');
		console.trace();

		return this.join('');
	};

	/**
	 * Make splice return a new BlockBuffer
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	BlockBuffer.prototype.splice = function splice(index, howMany) {

		// Splice this BlockBuffer, get a simple array as a result
		var spliced,
		    result,
		    args,
		    i;

		switch (arguments.length) {
			case 1:
				spliced = Array.prototype.splice.call(this, index);
				break;
			case 2:
				spliced = Array.prototype.splice.call(this, index, howMany);
				break;
			case 3:
				spliced = Array.prototype.splice.call(this, index, howMany, arguments[2]);
				break;
			default:
				args = new Array(arguments.length);
				for (i = 0; i < args.length; i++) {
					args.push(arguments[i]);
				}
				spliced = Array.prototype.splice.apply(context, args);
		}

		// Create a new BlockBuffer
		result = new BlockBuffer(this.viewRender, this.name + '-splice-' + index);

		// Inject the spliced elements
		for (i = 0; i < spliced.length; i++) {
			result.push(spliced[i]);
		}

		return result;
	};

	/**
	 * Since blocks could contain placeholders (that get content asynchronously)
	 * we need a special function to join them
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Function} callback
	 */
	BlockBuffer.prototype.joinBuffer = function joinBuffer(callback) {

		var that  = this,
		    tasks,
		    line,
		    i;

		// Return previously generated HTML
		if (this.html) {
			return Blast.setImmediate(function cachedHTML() {
				callback(null, that.html);
			});
		}

		tasks = [];

		// Iterate over the lines to find any placeholders
		for (i = 0; i < this.length; i++) {
			line = this[i];

			if (line instanceof Hawkejs.Placeholder) {
				(function IIFE(line) {
					tasks[tasks.length] = function waitForPlaceholder(next) {

						line.getContent(function getLineContent(err, result) {

							if (err) {
								that.hawkejs.handleError(line.errName, line.errLine, err);
							}

							next();
						});
					};
				}(line));
			}
		}

		Blast.Bound.Function.parallel(tasks, function doneAsyncJoining(err) {

			var html = '',
			    length = that.length;

			if (err) {
				return callback(err);
			}

			// Join the buffer array entries into a single string
			for (i = 0; i < length; i++) {
				if (typeof that[i] === 'string') {
					html += that[i];
				} else {
					if (that[i] instanceof Hawkejs.Placeholder) {
						html += that[i].getResult();
					} else {
						html += that[i];
					}
				}
			}

			// Set the finished HTML
			that.html = html;

			callback(null, html);
		});
	};

	Hawkejs.BlockBuffer = BlockBuffer;
};
