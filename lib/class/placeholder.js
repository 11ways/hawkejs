module.exports = function HawkejsPlaceholder(HawkejsNS, Blast) {

	var Hawkejs = HawkejsNS.Hawkejs,
	    log = Hawkejs.logHandler;

	/**
	 * Placeholders allow us to asynchronously insert content into a render
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.2
	 *
	 * @param    {ViewRender} renderer
	 * @param    {Object}     options
	 * @param    {Function}   fnc
	 */
	var Placeholder = Blast.Collection.Function.inherits('Informer', 'Hawkejs', function Placeholder(renderer, options, fnc) {

		var that = this;

		if (typeof options === 'function') {
			fnc = options;
			options = {};
		}

		if (options == null) {
			options = {};
		}

		// Store the options
		this.options = options;

		// The ViewRender instance
		this.renderer = this.parent = renderer;

		// Register this placeholder
		renderer.placeholders.push(this);

		// The origin template
		this.origin = renderer.currentTemplate;

		// We've jsut created it, so it's not finished
		this.finished = false;

		// Store all the callbacks that want content here
		this.callbacks = [];

		// The result is empty at first
		this.result = '';

		// The err is null
		this.err = null;

		// Get current error information
		this.errLine = renderer.errLine;
		this.errName = renderer.errName;

		// A function to run when getContent is called?
		if (!this.onGetContent) {
			this.onGetContent = false;
		}

		// Has onGetContent been called?
		this.onGetContentCalled = false;

		// What tag should this placeholder use
		this.tag_name = options.tag_name || 'x-hawkejs';

		// Does this use an existing wrapper?
		this.existing_wrapper = false;

		if (options.wrap) {
			if (options.wrap.nodeName) {
				this.element = options.wrap;
				options.wrap = true;
				this.existing_wrapper = true;
			} else {
				this.element = renderer.createElement(this.tag_name);
			}

			this.element.classList.add('x-hawkejs');

			Hawkejs.addClasses(this.element, options.className);
		}

		// Start the main function if one is already provided
		if (fnc) {
			Blast.nextTick(function doOnNextTick() {
				fnc(function placeholderCallbackFnc(err, result) {
					that.callback(err, result);
				});
			});
		}
	});

	/**
	 * Should this item ever be concatenated,
	 * return something useful instead of "[object Object]"
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Placeholder.setMethod(function toString() {

		var result;

		if (this.finished) {
			result = this.result;
		} else if (this.renderer.allowXHawkejs) {
			result = '<' + this.tag_name + ' data-type="placeholder">Placeholder</' + this.tag_name + '>';
		} else {
			result = '';
		}

		return result;
	});

	/**
	 * Return object for json-ifying
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.3.0
	 * @version  1.3.0
	 */
	Placeholder.setMethod(function toJSON() {

		var result = {},
		    key;

		for (key in this) {
			// Don't add the resulting html
			if (key == 'result') {
				continue;
			}

			result[key] = this[key];
		}

		return result;
	});

	/**
	 * Wait for this to finish or timeout
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.2
	 * @version  1.2.2
	 *
	 * @param    {Number}     timeout
	 * @param    {Function}   callback
	 */
	Placeholder.setMethod(function whenFinishedOrTimeout(timeout, callback) {

		var that = this;

		if (typeof timeout == 'function') {
			callback = timeout;
			timeout = 5;
		}

		// Make sure the callback gets executed only once
		callback = Blast.Collection.Function.regulate(callback);

		this.afterOnce('finished', function() {
			callback();
		});

		// It's possible this placeholder is created, but never called.
		// In that case we can timeout it
		if (!this.onGetContentCalled) {
			setTimeout(function checkTimeout() {
				if (!that.onGetContentCalled) {
					callback();
				}
			}, timeout);
		}
	});

	/**
	 * The result will be returned through this callback
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.2
	 *
	 * @param    {Object}   err
	 * @param    {String}   result
	 */
	Placeholder.setMethod(function callback(err, result) {

		var i;

		this.finished = true;

		if (err) {
			result = '<!-- ERROR -->';
			this.err = err;
		}

		this.result = result;

		while (this.callbacks.length) {
			this.callbacks.shift()(err, result);
		}

		this.emit('finished');
	});

	/**
	 * Execute the given function only when getContent is called
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Placeholder.setMethod(function setGetContent(fnc) {
		this.onGetContent = fnc;
	});

	/**
	 * Retrieve the content of this placeholder through this function
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Placeholder.setMethod(function getContent(callback) {

		var that = this;

		if (this.finished) {
			return callback(this.err, this.result);
		}

		this.callbacks.push(callback);

		if (typeof this.onGetContent == 'function' && !this.onGetContentCalled) {
			this.onGetContentCalled = true;

			this.onGetContent(function placeholderCallbackFnc(err, result) {

				if (result && typeof result != 'string' && typeof result.getContent == 'function') {
					return result.getContent(function done() {
						that.callback(err, result);
					});
				}

				that.callback(err, result);
			});
		}
	});

	/**
	 * Return the result
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Placeholder.setMethod(function getResult() {
		return this.result;
	});

	/**
	 * The placeholder for blocks
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.2
	 *
	 * @param    {String}   blockName    The blockName
	 */
	var BlockPlaceholder = Placeholder.extend(function BlockPlaceholder(parent, blockName, _options) {

		var that = this,
		    options;

		options = Blast.Bound.Object.assign({wrap: true}, _options);

		// If className is strictly true, use blockname as classname
		if (options.className === true) {
			options.className = blockName;
		}

		// The name of the block
		this.name = blockName;

		// Closed is only true when a specific 'assign_end' is called
		this.closed = false;

		// The default content
		this.defaultContent = undefined;

		// Are we using the default content?
		this.usingDefaultContent = false;

		BlockPlaceholder.super.call(this, parent, options, function initedBlockPlaceholder(next) {

			parent.finish(blockName, function finishedBlockPlaceholder(err, blockResult, exists) {

				var tasks = {},
				    block = parent.blocks[blockName] || {};

				if (!exists && that.defaultContent) {
					tasks.defaultContentHtml = function joinDefaultContentBuffer(next) {
						that.defaultContent.joinBuffer(next);
					};
				}

				Blast.Bound.Function.parallel(tasks, function doneJoiningBlockPlaceholder(err, taskResult) {

					var element = that.element,
					    result,
					    name;

					// "block" means it's an "assign"
					element.dataset.type = 'block';

					// The name of the block we're adding
					element.dataset.name = blockName;

					if (that.origin) {
						// The origin of the placeholder is the target of this block
						element.dataset.target = that.origin.name;
					}

					if (block.startTemplate) {

						// The template name the content comes from (not the source name)
						element.dataset.template = block.startTemplate.name;

						// The theme that was used for the template
						element.dataset.theme = block.startTemplate.activeTheme;
					}

					element.classList.add('js-he-newblock');

					if (block.options && block.options.className && block.options.content != 'push') {
						Hawkejs.addClasses(element, block.options.className);
					}

					for (name in block.attributes) {
						if (name == 'class') {
							if (block.options.content != 'push') {
								Hawkejs.addClasses(element, block.attributes['class']);
							}
							continue;
						}

						element.setAttribute(name, block.attributes[name]);
					}

					if (!exists) {
						element.dataset.defaultContent = 'true';

						if (taskResult.defaultContentHtml) {
							that.usingDefaultContent = true;
							blockResult = taskResult.defaultContentHtml;
						}
					}

					if (that.renderer.allowXHawkejs) {
						element.innerHTML = blockResult;
						result = element.outerHTML;
					} else {
						result = ''+blockResult;
					}

					next(err, result);
				});
			});
		});
	});

	/**
	 * Element placeholder
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.3.2
	 * @version  1.3.2
	 *
	 * @param    {ViewRender} renderer
	 * @param    {Object}     options
	 */
	var ElementPlaceholder = Placeholder.extend(function ElementPlaceholder(renderer, options) {

		// Child content
		this.children = [];

		ElementPlaceholder.super.call(this, renderer, options);
	});

	/**
	 * Push a line
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.3.2
	 * @version  1.3.2
	 */
	ElementPlaceholder.setMethod(function push(line) {
		this.children.push(line);
	});

	/**
	 * Execute the given function only when getContent is called
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.3.2
	 * @version  1.3.2
	 */
	ElementPlaceholder.setMethod(function onGetContent(callback) {
		callback(null, 'A')
	});


};