var ArrayProperties,
    BlockBuffer,
    name,
    log = Hawkejs.Hawkejs.logHandler,
    Fn = Blast.Bound.Function,
    i;

/**
 * BlockBuffers are array-like objects
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.4
 *
 * @param    {ViewRender}   viewRender
 * @param    {String}       name
 * @param    {Object}       options
 */
BlockBuffer = Fn.inherits('Array', 'Hawkejs', function BlockBuffer(viewRender, name, options) {

	// The parent viewRender instance
	this.viewRender = viewRender;

	// The parent hawkejs instance
	this.hawkejs = viewRender.hawkejs;

	// The optional name of this block
	this.name = name || 'nameless-' + Date.now();

	// Is this the main block?
	this.isMain = this.name == this.viewRender.mainBlock;

	// The template this block was defined in
	this.origin = viewRender.currentTemplate;

	// The finished HTML (after all async work is done)
	this.html = '';

	// Is this block done?
	this.done = false;

	// Optional options
	this.options = options || {};

	// Element attributes
	this.attributes = this.options.attributes || {};

	// Block counter
	this.block_id = viewRender.getId('block');
});

/**
 * Return debugbar info
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.2.2
 */
BlockBuffer.setMethod(function toDebugbar(){
	return 'Blockbuffer of "' + this.name + '" in template "' + this.origin.name + '"';
});

/**
 * Return the finished HTML or the current lines joined with an empty string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 */
BlockBuffer.setMethod(function toString() {

	var msg;

	if (this.done) {
		return this.html;
	}

	if (typeof console !== 'undefined') {
		msg = 'Got string too soon of block "' + this.name + '"';

		if (this.origin && this.origin.name) {
			msg += ' in template "' + this.origin.name + '"';
		}

		console.warn(msg, this);
		if (console.trace) console.trace();
	}

	return this.join('');
});

/**
 * Return the object to use for JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 */
BlockBuffer.setMethod(function toJSON() {

	var result = Object.create({__source: this});

	result.name = this.name;
	result.origin = this.origin;
	result.variables = this.variables;
	result.options = this.options;
	result.block_id = this.block_id;

	if (this.in_scope) {
		result.in_scope = this.in_scope;
	}

	return result;
});

/**
 * Make splice return a new BlockBuffer
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 */
BlockBuffer.setMethod(function splice(index, howMany) {

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
});

/**
 * Since blocks could contain placeholders (that get content asynchronously)
 * we need a special function to join them
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 *
 * @param    {Function} callback
 */
BlockBuffer.setMethod(function joinBuffer(callback) {

	var that = this,
	    level,
	    tasks,
	    line,
	    i;

	if (this.isMain) {
		level = 3;
	} else {
		level = 6;
	}

	// Return previously generated HTML
	if (this.html) {
		return Blast.setImmediate(function cachedHTML() {
			callback(null, that.html, that);
		});
	}

	tasks = [];

	// Iterate over the lines to find any placeholders
	for (i = 0; i < this.length; i++) {
		line = this[i];

		if (line instanceof Hawkejs.Placeholder || (line != null && line.getContent != null)) {
			(function IIFE(line) {

				if (line instanceof Hawkejs.Placeholder || line.whenFinishedOrTimeout) {
					if (that.viewRender.renderRoot.placeholders.indexOf(line) == -1) {
						that.viewRender.renderRoot.placeholders.push(line);
					}
				}

				tasks[tasks.length] = function waitForPlaceholder(next) {
					try {

						that.viewRender.emit('getLineContent', line);

						line.getContent(function getLineContent(err, result) {

							that.viewRender.emit('gotLineContent', line, err, result);

							if (err) {
								that.hawkejs.handleError(that.viewRender, line.errName, line.errLine, err);
							}

							next();
						});
					} catch (err) {
						that.viewRender.emit('gotLineContent', line, err);

						that.hawkejs.handleError(that.viewRender, line.errName, line.errLine, err);
						next();
					}
				};
			}(line));
		}
	}

	Blast.Bound.Function.parallel(tasks, function doneAsyncJoining(err) {

		var html = '',
		    length = that.length,
		    trim_right = false,
		    line;

		if (err) {
			return callback(err);
		}

		// Join the buffer array entries into a single string
		for (i = 0; i < length; i++) {
			line = Hawkejs.Hawkejs.getTextContent(that[i], that.viewRender);

			if (trim_right || that.shouldTrimLeftAt(i)) {
				html = Blast.Bound.String.trimRight(html);
				line = Blast.Bound.String.trimLeft(line);

				if (line) {
					trim_right = false;
				}
			}

			if (trim_right || that.shouldTrimRightAt(i)) {
				line = Blast.Bound.String.trimRight(line);

				if (!line) {
					trim_right = true;
				} else {
					trim_right = false;
				}
			} else if (trim_right && line) {
				trim_right = false;
			}

			html += line;

			if (that.has_trim_blank && that.trim_blanks[i + 1]) {
				if (Blast.Bound.String.isEmptyWhitespaceHTML(html)) {
					html = '';
				}
			}
		}

		if (that.options.content == 'push') {
			html = '<x-hawkejs class="he-push">' + html + '</x-hawkejs>';
		}

		// Set the finished HTML
		that.html = html;
		that.done = true;

		callback(null, html, that);
	});
});

/**
 * Activate trim at a specific point
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Boolean}   left
 * @param    {Boolean}   right
 */
BlockBuffer.setMethod(function trim(left, right) {

	if (arguments.length == 0) {
		left = true;
		right = true;
	}

	if (!this.has_trim) {
		this.has_trim = true;
		this.trims = {};
	}

	this.trims[this.length] = {
		left  : left,
		right : right
	};
});

/**
 * Trim blank elements before a certain point
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
BlockBuffer.setMethod(function trimBlankElements() {

	if (!this.has_trim_blank) {
		this.has_trim_blank = true;
		this.trim_blanks = {};
	}

	this.trim_blanks[this.length] = true;
});

/**
 * Should we trim on the left at given index?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Number}   index
 *
 * @return   {Boolean}
 */
BlockBuffer.setMethod(function shouldTrimLeftAt(index) {

	if (this.has_trim && this.trims[index] && this.trims[index].left) {
		return true;
	}

	return false;
});

/**
 * Should we trim on the right at given index?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Number}   index
 *
 * @return   {Boolean}
 */
BlockBuffer.setMethod(function shouldTrimRightAt(index) {

	if (this.has_trim && this.trims[index] && this.trims[index].right) {
		return true;
	}

	return false;
});