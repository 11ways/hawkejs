/**
 * Server-side Attribute class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Attribute = Blast.Bound.Function.inherits(null, 'Hawkejs', function Attribute(name, value) {
	if (name) {
		this.name = name;

		if (typeof value == 'undefined') {
			this.value = '';
		} else {
			this.value = String(value);
		}
	}
});

/**
 * Server-side Style class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Style = Blast.Bound.Function.inherits(null, 'Hawkejs', function Style(element) {
	this.element = element;
	this.styles = [];
});

/**
 * Get the CSS Text
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @type     {String}
 */
Style.setProperty(function cssText() {

	var result = '',
	    style,
	    i;

	for (i = 0; i < this.styles.length; i++) {
		style = this.styles[i];
		result += style.name + ':' + style.value + ';';
	}

	return result;
}, function setCssText(value) {

	var pieces,
	    index,
	    style,
	    value,
	    key,
	    i;

	// Clear out the styles array
	this.styles.length = 0;

	// Split the string into pieces
	pieces = value.split(';');

	// Iterate over the pieces
	for (i = 0; i < pieces.length; i++) {
		style = pieces[i];

		// Get the colon index
		index = style.indexOf(':');

		// Yes, 0
		if (index > 0) {
			key = style.slice(0, index).trim();
			value = style.slice(index + 1).trim();

			this.setProperty(key, value);
		}
	}
});

/**
 * Set a style property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Style.setMethod(function setProperty(name, value) {
	this.element._setProperty(this.styles, {name: name, value: value});
});

/**
 * Get a style property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Style.setMethod(function getProperty(name) {
	return this.element._getProperty(this.styles, n);
});