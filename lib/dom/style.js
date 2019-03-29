/**
 * Server-side Style class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Style = Fn.inherits(null, 'Hawkejs', function Style(element) {
	this.element = element;
	this.styles = new Hawkejs.NamedNodeMap();
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

	if (!this.styles.length) {
		return '';
	}

	let result = '',
	    style,
	    key;

	for (key in this.styles._items) {
		style = this.styles._items[key];

		if (!style) {
			continue;
		}

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
	this.styles._setKeyVal(name, value);
});

/**
 * Get a style property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Style.setMethod(function getProperty(name) {
	return this.styles._items[name];
});