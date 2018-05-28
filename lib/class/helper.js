/**
 * The Helper Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.3
 *
 * @param    {ViewRender}   view
 */
var Helper = Blast.Collection.Function.inherits('Informer', 'Hawkejs.Helper', function Helper(view) {

	if (!view && typeof hawkejs != 'undefined') {
		view = new Hawkejs.ViewRender(hawkejs);
	}

	// Set the view render instance
	this.view = view;
});

/**
 * Register the helper
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 */
Helper.constitute(function registerHelper() {

	var name = Blast.Bound.String.beforeLast(this.name, 'Helper') || this.name;

	Hawkejs.Hawkejs.helpers[name] = this;
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
 * @version  1.2.0
 */
Helper.setMethod(function parseURL(href, origin) {

	var result;

	// If it already is a Url object, don't change anything
	if (href && typeof href == 'object' && href.constructor && href.constructor.name == 'Url') {
		return href;
	}

	// Get the internal urlOrigin setting, if it's available
	if (!origin && this.view) {
		origin = this.view.internal('urlOrigin');
	}

	result = Blast.Collection.URL.parse(href, origin);

	return result;
});

/**
 * Create and return a placeholder
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
Helper.setMethod(function placeholder(options, fnc) {
	return this.view.placeholder(options, fnc);
});