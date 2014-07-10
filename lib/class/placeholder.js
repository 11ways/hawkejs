module.exports = function(Hawkejs) {

	/**
	 * Placeholders allow us to asynchronously insert content into a render
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Placeholder = Hawkejs.create(function Placeholder() {

		/**
		 * Create a new placeholder, with a function to execute
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {ViewRender} parent
		 * @param    {Function}   fnc
		 */
		this.init = function init(parent, fnc) {

			// The ViewRender instance
			this.parent = parent;

			// We've jsut created it, so it's not finished
			this.finished = false;

			// Store all the callbacks that want content here
			this.callbacks = [];

			// The result is empty at first
			this.result = '';

			// The err is null
			this.err = null;

			// Get current error information
			this.errLine = parent.errLine;
			this.errName = parent.errName;

			// A function to run when getContent is called?
			this.onGetContent = false;

			// Has onGetContent been called?
			this.onGetContentCalled = false;

			// Start the main function if one is already provided
			if (fnc) fnc(this.callback.bind(this));
		};

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
		this.callback = function callback(err, result) {

			var i;

			this.finished = true;

			if (err) {
				result = ''; // Maybe set an error message here?
				this.err = err;
			}

			this.result = result;

			for (i = 0; i < this.callbacks.length; i++) {
				this.callbacks[i](err, result);
			}

			this.callbacks.length = 0;
		};

		/**
		 * Execute the given function only when getContent is called
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.setGetContent = function setGetContent(fnc) {
			this.onGetContent = fnc;
		};

		/**
		 * Retrieve the content of this placeholder through this function
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.getContent = function getContent(callback) {

			if (this.finished) {
				return callback(this.err, this.result);
			}

			this.callbacks.push(callback);

			if (typeof this.onGetContent == 'function' && !this.onGetContentCalled) {
				this.onGetContentCalled = true;
				this.onGetContent(this.callback.bind(this));
			}
		};

		/**
		 * Return the result
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.getResult = function getResult() {
			return this.result;
		};

	});

	/**
	 * The placeholder for blocks
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var BlockPlaceholder = Placeholder.extend(function BlockPlaceholder() {

		/**
		 * Initialize the placeholder
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {String}   blockName    The blockName
		 */
		this.init = function init(parent, blockName) {

			var that = this;

			// The name of the block
			this.name = blockName;

			// Closed is only true when a specific 'assign_end' is called
			this.closed = false;

			// The default content
			this.defaultContent = undefined;

			this.parent('init', null, parent, function(next) {
				parent.finish(blockName, function(err, result, exists) {

					var html;

					console.log('>>>>>>>>>>>>>>')
					console.log(err, result);

					html = '<x-hawkejs data-type="block" data-name="' + blockName + '"';

					// The result is an empty string because the block didn't exists
					if (!exists) {
						html += ' data-default-content';

						if (that.defaultContent) {
							result = that.defaultContent.join('');
						}
					}

					html += '>';
					html += (result||'');
					html += '</x-hawkejs>';

					next(err, html);
				});
			});
		};

	});

	Hawkejs.Placeholder = Placeholder;
	Hawkejs.BlockPlaceholder = BlockPlaceholder;
};