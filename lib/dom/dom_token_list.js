/**
 * Server-side DOMTokenList class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.2.18
 */
const DOMTokenList = Fn.inherits(null, 'Hawkejs', function DOMTokenList() {

	// The tokens array
	this.tokens = [];

	// The current length
	this.length = 0;
});

/**
 * Return the string value
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.2.18
 * @version  2.2.18
 */
DOMTokenList.setProperty(function value() {
	return this.tokens.join(' ');
}, function setValue(value) {
	this._setTokens(value);
});

/**
 * Set the tokens list
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.20
 */
DOMTokenList.setMethod(function _setTokens(text) {

	var old_length = this.length,
	    i;

	if (typeof text != 'undefined') {
		if (!Array.isArray(text)) {

			if (typeof text != 'string') {
				text = ''+text;
			}

			this.tokens = text.split(' ');
		} else {
			this.tokens = text;
		}

		// Make sure there are no empty classes
		Blast.Bound.Array.clean(this.tokens, '');
	}

	// Set the new length
	this.length = this.tokens.length;

	// Make sure old class names are removed
	if (old_length > this.length) {
		for (i = this.length - 1; i < old_length; i++) {
			this[i] = undefined;
		}
	}

	for (i = 0; i < this.length; i++) {
		this[i] = this.tokens[i];
	}
});

/**
 * Return the string value
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.18
 */
DOMTokenList.setMethod(function toString() {
	return this.value;
});

/**
 * Add a class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.2.16
 */
DOMTokenList.setMethod(function add(...classnames) {

	let name;

	for (name of classnames) {

		if (/\s/.test(name)) {
			throw new Error('The token can not contain whitespace');
		}

		// Only add classes that aren't added already
		// This is case sensitive
		if (this.tokens.indexOf(name) == -1) {
			this.tokens.push(name);
		}
	}

	this._setTokens();
});

/**
 * See if the class is already added
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
DOMTokenList.setMethod(function contains(name) {
	return this.tokens.indexOf(name.trim()) > -1;
});

/**
 * Return the entries
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.2.18
 * @version  2.2.18
 */
DOMTokenList.setMethod(function entries() {
	return this.tokens.entries();
});

/**
 * Return the values
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.2.18
 * @version  2.2.18
 */
 DOMTokenList.setMethod(function values() {
	return this.tokens.values();
});

/**
 * Return an item in the list
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.2.18
 * @version  2.2.18
 */
DOMTokenList.setMethod(function item(index) {
	return this.tokens[index];
});

/**
 * Remove a class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.2.16
 */
DOMTokenList.setMethod(function remove(...classnames) {

	let name;

	for (name of classnames) {
		if (/\s/.test(name)) {
			throw new Error('The token can not contain whitespace');
		}

		Bound.Array.clean(this.tokens, name);
	}

	this._setTokens();
});

/**
 * Replace a token
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.18
 * @version  2.2.18
 */
DOMTokenList.setMethod(function replace(old_token, new_token) {

	if (!this.contains(old_token)) {
		return false;
	}

	this.remove(old_token);
	this.add(new_token);
});

/**
 * Toggle a class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.18
 *
 * @param    {String}   token
 * @param    {Boolean}  force
 */
DOMTokenList.setMethod(function toggle(token, force) {

	if (this.contains(token)) {

		if (!force) {
			this.remove(token);
		}

		return false;
	} else {

		if (force === false) {
			return false;
		}

		this.add(token);
		return true;
	}
});