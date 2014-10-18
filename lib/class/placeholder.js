module.exports = function HawkejsPlaceholder(Hawkejs, Blast) {

	var log = Hawkejs.logHandler;

	/**
	 * Placeholders allow us to asynchronously insert content into a render
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {ViewRender} renderer
	 * @param    {Object}     options
	 * @param    {Function}   fnc
	 */
	var Placeholder = Blast.Collection.Function.inherits(function Placeholder(renderer, options, fnc) {

		var that = this;

		if (typeof options === 'function') {
			fnc = options;
			options = {};
		}

		if (options == null) {
			options = {};
		}

		// The ViewRender instance
		this.renderer = this.parent = renderer;

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
		this.onGetContent = false;

		// Has onGetContent been called?
		this.onGetContentCalled = false;

		if (options.wrap === true) {
			this.element = Hawkejs.ElementBuilder.create('x-hawkejs');
		}

		// Start the main function if one is already provided
		if (fnc) fnc(function placeholderCallbackFnc(err, result) {
			that.callback(err, result);
		});
	});

	/**
	 * Should this item ever be concatenated,
	 * return something useful instead of "[object Object]"
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Placeholder.setMethod(function toString(){

		if (this.finished) {
			return this.result;
		}

		log(2, 'Prematurely called toString of placeholder');

		return '<x-hawkejs data-type="placeholder">Placeholder</x-hawkejs>';
	});

	/**
	 * The result will be returned through this callback
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}   err
	 * @param    {String}   result
	 */
	Placeholder.setMethod(function callback(err, result) {

		var i;

		this.finished = true;

		if (err) {
			result = ''; // Maybe set an error message here?
			this.err = err;
		}

		this.result = result;

		while (this.callbacks.length) {
			this.callbacks.shift()(err, result);
		}

		log(8, 'Finished all callbacks for Placeholder content of', this.errName + ':' + this.errLine);
	});

	/**
	 * Execute the given function only when getContent is called
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Placeholder.setMethod(function setGetContent(fnc) {
		this.onGetContent = fnc;
	});

	/**
	 * Retrieve the content of this placeholder through this function
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Placeholder.setMethod(function getContent(callback) {

		var that = this;

		log(8, 'Getting Placeholder content of', this.errName + ':' + this.errLine, '');

		if (this.finished) {
			log(9, 'Already finished', this.errName + ':' + this.errLine, ', returning callback');
			return callback(this.err, this.result);
		}

		log(9, 'Scheduling callback for Placeholder content of ', this.errName + ':' + this.errLine);
		this.callbacks.push(callback);

		if (typeof this.onGetContent == 'function' && !this.onGetContentCalled) {
			this.onGetContentCalled = true;

			this.onGetContent(function placeholderCallbackFnc(err, result) {
				that.callback(err, result);
			});
		} else {
			if (this.onGetContentCalled) {
				log(9, 'onGetContentCalled was true for for Placeholder content of', this.errName + ':' + this.errLine);
			} else {
				log(9, 'Something else went wrong with onGetContent', this.errName + ':' + this.errLine);
			}
		}
	});

	/**
	 * Return the result
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Placeholder.setMethod(function getResult() {
		return this.result;
	});

	/**
	 * The placeholder for blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   blockName    The blockName
	 */
	var BlockPlaceholder = Placeholder.extend(function BlockPlaceholder(parent, blockName) {

		var that = this;

		// The name of the block
		this.name = blockName;

		// Closed is only true when a specific 'assign_end' is called
		this.closed = false;

		// The default content
		this.defaultContent = undefined;

		// Are we using the default content?
		this.usingDefaultContent = false;

		BlockPlaceholder.super.call(this, parent, {wrap: true}, function initedBlockPlaceholder(next) {

			log(5, 'Requesting parent finish of block', blockName, '(' + that.errName + ':' + that.errLine + ')');

			parent.finish(blockName, function finishedBlockPlaceholder(err, blockResult, exists) {

				var tasks = {},
				    block = parent.blocks[blockName] || {};

				if (!exists && that.defaultContent) {
					tasks.defaultContentHtml = function joinDefaultContentBuffer(next) {
						that.defaultContent.joinBuffer(next);
					};
				}

				log(5, 'Finishing block', blockName, '(' + that.errName + ':' + that.errLine + ')');

				Blast.Bound.Function.parallel(tasks, function doneJoiningBlockPlaceholder(err, taskResult) {

					var element = that.element,
					    name;

					// Level is not correct
					log(5, 'Joined placeholder block', blockName, ', creating x-hawkejs element', '(' + that.errName + ':' + that.errLine + ')');

					// "block" means it's an "assign"
					element.data('type', 'block');

					// The name of the block we're adding
					element.data('name', blockName);

					if (that.origin) {
						// The origin of the placeholder is the target of this block
						element.data('target', that.origin.name);
					}

					if (block.startTemplate) {

						// The template name the content comes from (not the source name)
						element.data('template', block.startTemplate.name);

						// The theme that was used for the template
						element.data('theme', block.startTemplate.activeTheme);
					}

					element.addClass('js-he-newblock');

					for (name in block.attributes) {
						if (name == 'class') {
							element.addClass(block.attributes[name]);
							continue;
						}

						element.data(name, block.attributes[name]);
					}

					if (!exists) {
						element.data('default-content', 'true');

						if (taskResult.defaultContentHtml) {
							that.usingDefaultContent = true;
							blockResult = taskResult.defaultContentHtml;
						}
					}

					element.setContent(blockResult);

					next(err, element+'');
				});
			});
		});
	});

	Hawkejs.Placeholder = Placeholder;
	Hawkejs.BlockPlaceholder = BlockPlaceholder;
};