/**
 * The Helper Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
const Helper = Blast.Collection.Function.inherits('Hawkejs.Base', 'Hawkejs.Helper', function Helper(renderer) {

	if (!renderer && typeof hawkejs != 'undefined') {
		renderer = new Hawkejs.Renderer(hawkejs);
	}

	// Set the renderer instance
	this.renderer = renderer;
});

Hawkejs.helpers = {};

Helper.setDeprecatedProperty('view',        'renderer');
Helper.setDeprecatedProperty('view_render', 'renderer');

/**
 * Register each new helper class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.3
 * @version  2.0.0
 */
Helper.constitute(function registerHelper() {

	if (this.name == 'Helper') {
		return;
	}

	let name = Bound.String.beforeLast(this.name, 'Helper') || this.name;

	if (Hawkejs.helpers[name]) {
		return;
	}

	Hawkejs.helpers[name] = this;

	let that = this,
	    view_symbol = Symbol(name);

	Hawkejs.HelperCollection.setProperty(name, function getHelper() {

		if (!this[view_symbol]) {
			this[view_symbol] = new that(this.renderer);
		}

		return this[view_symbol];
	});
});

/**
 * Print out something
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
Helper.setMethod(function print(data) {
	this.renderer.print(data);
});

/**
 * Generate an RURL instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
Helper.setMethod(function parseURL(href, origin) {

	var result;

	// If it already is some kind of URL object, parse it again
	if (href && typeof href == 'object') {
		return Classes.RURL.parse(href, origin);
	}

	// Get the internal urlOrigin setting, if it's available
	if (!origin && this.renderer) {
		origin = this.renderer.internal('urlOrigin');
	}

	result = Classes.RURL.parse(href, origin);

	return result;
});

/**
 * Create a new element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Helper.setMethod(function createElement(name) {
	var element = this.renderer.createElement(name);
	return element;
});