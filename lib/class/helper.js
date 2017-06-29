module.exports = function HawkejsHelper(Hawkejs, Blast) {

	/**
	 * The Helper Class
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.2.0
	 *
	 * @param    {ViewRender}   view
	 */
	var Helper = Blast.Classes.Informer.extend(function Helper(view) {

		if (!view && typeof hawkejs != 'undefined') {
			view = new Hawkejs.ViewRender(hawkejs);
		}

		// Set the view render instance
		this.view = view;
	});

	/**
	 * Override the original extend static method
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Function}   newConstructor
	 *
	 * @return   {Function}
	 */
	Helper.setStatic(function extend(newConstructor) {

		var name = Blast.Bound.String.beforeLast(newConstructor.name, 'Helper');

		Hawkejs.helpers[name] = newConstructor;

		return Blast.Collection.Function.inherits(this, newConstructor);
	});

	/**
	 * Print out something to the view
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Helper.setMethod(function print(data) {
		this.view.print(data);
	});

	/**
	 * Generate a URL object
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Helper.setMethod(function parseURL(href, origin) {

		var result;

		// Get the internal urlOrigin setting, if it's available
		origin = origin || this.view.internal('urlOrigin');

		result = Blast.Collection.URL.parse(href, origin);

		return result;
	});

	/**
	 * Create and return a placeholder
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Helper.setMethod(function placeholder(options, fnc) {

		var placeholder;

		if (typeof options == 'function') {
			fnc = options;
			options = null;
		}

		// Create a new placeholder
		placeholder = new Hawkejs.Placeholder(this.view, options);

		// Set the content function
		placeholder.setGetContent(fnc);

		return placeholder;
	});

	Hawkejs.Helper = Helper;
};