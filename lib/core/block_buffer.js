/**
 * BlockBuffers are array-like objects
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   viewRender
 * @param    {String}             name
 * @param    {Object}             options
 */
const BlockBuffer = Fn.inherits('Hawkejs.Base', function BlockBuffer(renderer, name, options) {

	// The parent renderer instance
	this.renderer = renderer;

	// The optional name of this block
	this.name = name || 'nameless-' + Date.now();

	// The template this block was defined in
	this.origin = renderer.current_template;

	// Is this block done?
	this.done = false;

	// Optional options
	this.options = options || {};

	// Element attributes
	this.attributes = this.options.attributes || {};

	// Block counter
	this.block_id = renderer.getId('block');

	// The elements of this buffer
	this.elements = [];

	// The lines of this buffer
	this.lines = [];

	// Other instances that share this name
	this.other_instances = [];
});

BlockBuffer.setDeprecatedProperty('joinBuffer', 'assemble');

/**
 * The rendered HTML
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
BlockBuffer.setProperty('html', null);

/**
 * Is this the main block of the entire render?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
BlockBuffer.setProperty(function is_main() {
	return this.name == this.renderer.main_block_name;
});

/**
 * Is this the root block of the current template?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 *
 * @type     {Boolean}
 */
BlockBuffer.setProperty(function is_template_root() {

	if (!this.start_template) {
		return false;
	}

	return this.name == this.start_template.main_block_name;
});

/**
 * Get the id of the element that should be considered the "root",
 * if it is set at all
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
BlockBuffer.setProperty(function scope_id() {
	return this.renderer.scope_id;
});

/**
 * Get the length of this block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @type     {Number}
 */
BlockBuffer.setProperty(function length() {
	return this.lines.length;
}, function setLength(length) {
	return this.lines.length = length;
});

/**
 * Get the variables used during rendering
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Object}
 */
BlockBuffer.setProperty(function variables() {

	if (this._variables) {
		return this._variables;
	}

	if (this.start_template) {
		return this.start_template.rendered_variables;
	}
}, function setVariables(variables) {
	return this._variables = variables;
});

/**
 * Has this block been assembled yet?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @type     {Boolean}
 */
BlockBuffer.setProperty(function is_assembled() {

	if (this._assemble_pledge) {
		return !!this._assemble_pledge._ended;
	}

	return false;
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @return   {BlockBuffer|Object}
 */
BlockBuffer.setStatic(function unDry(obj) {

	let renderer;

	if (Blast.isBrowser && typeof hawkejs != 'undefined' && hawkejs.scene) {
		renderer = hawkejs.scene.general_renderer;
	} else {
		renderer = new Hawkejs.Renderer();
	}

	let result = new BlockBuffer(renderer, obj.name, obj.options);

	result.origin = obj.origin;
	result.variables = obj.variables;
	result.block_id = obj.block_id;
	result.in_scope = obj.in_scope;

	if (obj.lines) {
		result.lines = obj.lines;
	}

	return result;
});

/**
 * Clone the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Hawkejs.Variables}
 */
BlockBuffer.setMethod(function toHawkejs(wm) {

	if (!wm) {
		wm = new WeakMap();
	}

	let options = Bound.JSON.clone(this.options, 'toHawkejs', wm);

	let result = new BlockBuffer(this.renderer, this.name, options);

	// Other values might reference this document too,
	// make sure it doesn't clone the same document twice
	wm.set(this, result);

	result.origin = this.origin;
	result.done = this.done;
	result.attributes = Bound.JSON.clone(this.attributes, 'toHawkejs', wm);
	result.block_id = this.block_id;
	result.variables = Bound.JSON.clone(this.variables, 'toHawkejs', wm);
	result._assemble_pledge = this._assemble_pledge;

	// @TODO: Should the elements be cloned too?
	result.elements = this.elements.slice(0);
	result.lines = this.lines.slice(0);

	return result;
});

/**
 * Return the object to use for JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
BlockBuffer.setMethod(function toJSON() {

	var result = {};

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
 * Prepare the block for drying
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.3
 * @version  2.1.3
 */
BlockBuffer.setMethod(function toDry() {

	let data = this.toJSON();

	if (!this.renderer || !this.renderer.blocks.has(this.name)) {
		data.lines = this.lines;
	}

	return {
		value : data,
	};
});

/**
 * Push a line
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  2.2.3
 *
 * @param    {String|Object}   line
 *
 * @return   {Number}          The index of the pushed line
 */
BlockBuffer.setMethod(function push(line) {

	if (line == null) {
		line = '';
	}

	let length = this.elements.length;

	line = this.makeNode(line);

	// This line is a direct child of the block itself,
	// so we have to push it to the lines array
	if (!length) {

		if (line && typeof line == 'object') {
			// Needed for the Template#waitForOtherTemplates() call
			line[Hawkejs.BLOCK] = this;
		}

		return this.lines.push(line);
	}

	let last = this.elements[length - 1];

	last.append(line);
});

/**
 * Make sure the line is a valid node
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.2.9
 *
 * @param    {Object}   line
 *
 * @return   {Node}
 */
BlockBuffer.setMethod(function makeNode(line) {

	let type = typeof line;

	if (type == 'number' || type == 'boolean') {
		line = String(line);
		type = 'string';
	}
	
	if (type == 'string') {
		if (Blast.isNode) {
			line = new Hawkejs.Text(line);
		}
	} else if (line) {

		if (line.nodeType == null) {
			if (Hawkejs.needsToDoAsyncWork(line)) {
				let placeholder = this.renderer.createElement('he-placeholder');
				placeholder.subject_line = line;
				line = placeholder;
			} else {
				line = String(line);
			}
		} else if (line.hawkejs_renderer && line.hawkejs_renderer.root_renderer != this.renderer.root_renderer) {
			// Addopt elements from other renderers
			this.renderer.adoptElement(line);
		}
	}

	return line;
});

/**
 * Add an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.4.0
 *
 * @param    {ElementPlaceholder}   placeholder
 */
BlockBuffer.setMethod(function pushElement(placeholder) {

	var index = this.push(placeholder);

	this.elements.push(placeholder);

	return index;
});

/**
 * Return debugbar info
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.2.2
 */
BlockBuffer.setMethod(function toDebugbar() {
	return 'Blockbuffer of "' + this.name + '" in template "' + this.origin.name + '"';
});

/**
 * Return the finished HTML or the current lines joined with an empty string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.3.2
 */
BlockBuffer.setMethod(function toString() {

	if (this.html != null) {
		return this.html;
	}

	return this.toHTML();
});

/**
 * Return the HTML content of this block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.3
 */
BlockBuffer.setMethod(function toHTML() {

	if (this[Hawkejs.SERIALIZING]) {
		return '<!-- Infinite loop detected -->';
	}

	if (!this._assemble_pledge || !this._assemble_pledge._ended) {
		throw new Error('Unable to return HTML of this block: it has not yet been assembled');
	}

	this[Hawkejs.SERIALIZING] = true;

	let html = '',
	    length = this.lines.length,
	    trim_right,
	    trim_left,
	    classname,
	    line,
	    i;

	// Join the buffer array entries into a single string
	for (i = 0; i < length; i++) {
		line = Hawkejs.getTextContent(this.lines[i], this.renderer);

		if (this.has_trim) {

			if (trim_right || this.shouldTrimLeftAt(i)) {

				if (!trim_right) {
					html = Bound.String.trimRight(html);
				}

				line = Bound.String.trimLeft(line);

				if (line) {
					trim_right = false;
				}
			}

			if (trim_right || this.shouldTrimRightAt(i)) {
				line = Bound.String.trimRight(line);
				trim_right = true;
			} else if (trim_right && line) {
				trim_right = false;
			}
		}

		html += line;

		if (this.has_trim_blank && this.trim_blanks[i + 1]) {
			if (Bound.String.isEmptyWhitespaceHTML(html)) {
				html = '';
			}
		}
	}

	this[Hawkejs.SERIALIZING] = false;

	return html;
});

/**
 * Return an array of elements & strings of this block
 * This is how elements are prepared in the browser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.3
 *
 * @return   {Array}
 */
BlockBuffer.setMethod(function toElements() {

	if (!this._assemble_pledge || !this._assemble_pledge._ended) {
		throw new Error('Unable to return HTML of this block: it has not yet been assembled');
	}

	let result = [],
	    length = this.lines.length,
	    line,
	    i;

	for (i = 0; i < length; i++) {

		// Make sure the line is a node (or an array of nodes)
		line = Hawkejs.getElementContent(this.lines[i], this.renderer);

		if (line) {
			if (Array.isArray(line) || (line.constructor == Blast.Globals.NodeList)) {
				let entry,
				    j;

				for (j = 0; j < line.length; j++) {
					entry = line[j];

					// Only normalize this if it's an element, and not a textnode
					if (entry && entry.nodeType == 1) {
						Hawkejs.normalizeChildren(entry, this.renderer);
					}

					result.push(entry);
				}

				continue;
			} else if (line.nodeType == 1) {
				Hawkejs.normalizeChildren(line, this.renderer);
			}
		}

		result.push(line);
	}

	return result;
});

/**
 * Make splice return a new BlockBuffer
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.3.3
 */
BlockBuffer.setMethod(function splice(index, howMany) {

	// Splice this BlockBuffer, get a simple array as a result
	var spliced,
	    result,
	    args,
	    i;

	args = [];

	for (i = 0; i < arguments.length; i++) {
		args.push(arguments[i]);
	}

	spliced = Array.prototype.splice.apply(this.lines, args);

	// Create a new BlockBuffer
	result = new BlockBuffer(this.renderer, this.name + '-splice-' + index);

	result.lines = spliced;

	return result;
});

/**
 * Assemble & get the HTML result
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
BlockBuffer.setMethod(function assembleHTML() {

	var that = this,
	    pledge = new Pledge();

	this.assemble().done(function assembled(err) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(that.toHTML());
	});
});

/**
 * Assemble all blocks, resolve placeholders
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.1.3
 *
 * @return   {Pledge}
 */
BlockBuffer.setMethod(function assemble() {

	if (!this._assemble_pledge) {
		let that = this;

		this.renderer.root_renderer.emit('assembling_block', this.name);

		this._assemble_pledge = new Classes.Pledge();

		this._assemble().done(function assembled(err) {

			if (err) {
				return that._assemble_pledge.reject(err);
			}

			if (that.other_instances.length && that.options.content == 'push') {
				let i;

				for (i = 0; i < that.other_instances.length; i++) {
					that.lines.push(that.other_instances[i].lines[0]);
				}
			}

			if (Blast.isBrowser) {
				that.resolveBrowserTrims();
			}

			that.renderer.root_renderer.emit('assembled_block', that.name);

			that._assemble_pledge.resolve(that);
		});
	}

	return this._assemble_pledge;
});

/**
 * Do the actual joining
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.2.10
 *
 * @param    {Boolean}  join_others
 *
 * @return   {Pledge}
 */
BlockBuffer.setMethod(function _assemble(join_others) {

	var that = this,
	    tasks,
	    i;

	if (join_others == null) {
		join_others = true;
	}

	if (join_others && this.other_instances.length && this.options.content == 'push') {

		tasks = [];

		tasks.push(function joinMain(next) {
			that._assemble(false).done(next);
		});

		for (i = 0; i < this.other_instances.length; i++) {
			let block = this.other_instances[i];

			tasks.push(function joinOther(next) {

				// Force the "push" option
				block.options.content = 'push';

				block.assemble().done(next);
			});
		}

		return Hawkejs.series(false, tasks, function joinedAll(err, result) {

			if (err) {
				return;
			}

			return that;
		});
	}

	let task_limit = this.renderer.hawkejs.parallel_task_limit;

	// This still has to remain asynchronous, because otherwise unit tests fail
	return Hawkejs.series(function doLineTasks(next) {
		let line_tasks = that.prepareLineTasks();

		if (!line_tasks || line_tasks.length == 0) {
			return next();
		}

		Hawkejs.parallel(false, task_limit, line_tasks, next);
	}, function assembleLines(next) {

		if (that.options.content == 'push') {
			let el = that.renderer.createElement('he-block'),
			    i;

			Hawkejs.addClasses(el, that.options.className);

			for (i = 0; i < that.lines.length; i++) {
				el.append(that.lines[i]);
			}

			that.lines = [el];
		}

		// Inform all elements they're being assembled/retained
		// This might actually ADD new elements!
		Hawkejs.informElementOfAssembly(that.lines, that.renderer);

		// @TODO: will this work for deeply, deeply nested custom elements?
		let more_tasks = Hawkejs.prepareLineTasks(that.lines, that.renderer);

		if (more_tasks.length) {
			Hawkejs.parallel(false, task_limit, more_tasks, next);
		} else {
			next();
		}
	}, function done(err) {

		that.done = true;

		if (err) {
			return;
		}

		return that;
	});
});

/**
 * Query the lines
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.6
 * @version  2.1.6
 *
 * @return   {Array}
 */
BlockBuffer.setMethod(function _queryLines(selector, limit) {

	let result = [],
	    found = 0,
	    line,
	    temp,
	    i;

	for (i = 0; i < this.lines.length; i++) {
		line = this.lines[i];

		if (line && line.nodeType === 1) {

			// See if the line itself matches the query selector
			if (line.matches(selector)) {
				result.push(line);
				found++;
			}

			if (found === limit) {
				break;
			}

			temp = line.querySelectorAll(selector);

			if (temp && temp.length) {
				let i;

				for (i = 0; i < temp.length; i++) {
					result.push(temp[i]);

					if (found === limit) {
						break;
					}
				}
			}
		}

		if (found === limit) {
			break;
		}
	}

	return result;
});

/**
 * Query the lines for a single element
 *
 * @param    {string}   selector
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.6
 * @version  2.1.6
 *
 * @return   {Array}
 */
BlockBuffer.setMethod(function querySelector(selector) {
	return this._queryLines(selector, 1)[0];
});

/**
 * Query the lines for a multiple element
 *
 * @param    {string}   selector
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.6
 * @version  2.1.6
 *
 * @return   {Array}
 */
BlockBuffer.setMethod(function querySelectorAll(selector) {
	return this._queryLines(selector);
});

/**
 * Recursively create tasks for each line
 * that needs to do something asynchronously before it can be rendered.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.1
 *
 * @return   {Array}   The tasks that need to be performed
 */
BlockBuffer.setMethod(function prepareLineTasks() {
	return Hawkejs.prepareLineTasks(this.lines, this.renderer);
});

/**
 * Resolve trims on the browser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
BlockBuffer.setMethod(function resolveBrowserTrims() {

	if (!this.has_trim_blank) {
		return;
	}

	var new_lines = [],
	    test_lines = this.lines,
	    index,
	    stop,
	    line,
	    html,
	    key,
	    i;

	for (key in this.trim_blanks) {
		index = +key;

		for (i = 0; i < test_lines.length; i++) {
			line = test_lines[i];

			if (i > index) {
				new_lines.push(line);
				continue;
			}

			if (typeof line == 'object') {
				html = line.outerHTML;
			} else {
				html = String(line);
			}

			// @TODO: handle placeholders somehow? :/
			// (For now we'll assume placeholders always have content,
			// even though it really does not :()
			if (html.indexOf('he-placeholder')) {
				stop = true;
				break;
			}

			if (Bound.String.isEmptyWhitespaceHTML(html)) {
				new_lines.push('');
			} else {
				stop = true;
				break;
			}
		}

		if (stop) {
			break;
		}

		this.lines = new_lines;
		test_lines = new_lines;
	}

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

	this.push('');
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
	this.push('');
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

/**
 * Set block info on the given element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 *
 * @param    {HTMLElement}   element
 */
BlockBuffer.setMethod(function addInfoToElement(element) {

	let options = this.options,
	    start = this.start_template;

	if (start) {
		element.dataset.heTemplate = start.name;

		if (start.theme && start.theme != 'default') {
			element.dataset.theme = start.theme;
		}
	}

	// Set css class, but only for non-pushed blocks
	if (options.content != 'push') {
		Hawkejs.addClasses(element, options.className);
	}

	if (options.attributes) {
		Hawkejs.setAttributes(element, options.attributes);
	}

	// If the target element is not a named block,
	// set the current block's name in the data-he-block attribute
	// This way it can't be assigned to, but it can be found
	if (!element.dataset.heName) {
		element.dataset.heBlock = this.name;
	}
});