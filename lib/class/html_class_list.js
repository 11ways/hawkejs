module.exports = function hawkHTMLClassList(Hawkejs, Blast) {

	/**
	 * Server-side ClassList class
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	var ClassList = Blast.Bound.Function.inherits(null, 'Hawkejs', function ClassList(element) {
		// If the element already has a classlist, return that
		if (element.classList) {
			return element.classList;
		}

		// The tokens array
		this.tokens = [];

		// The current length
		this.length = 0;
	});

	/**
	 * Set the tokens list
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	ClassList.setMethod(function _setTokens(text) {

		var old_length = this.length,
		    i;

		if (typeof text != 'undefined') {
			if (!Array.isArray(text)) {
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
	 * @version  1.1.0
	 */
	ClassList.setMethod(function toString() {
		return this.tokens.join(' ');
	});

	/**
	 * Add a class
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	ClassList.setMethod(function add(name) {

		name = name.trim();

		// Only add classes that aren't added already
		// This is case sensitive
		if (this.tokens.indexOf(name) == -1) {
			this.tokens.push(name);
		}

		this._setTokens();
	});

	/**
	 * Remove a class
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	ClassList.setMethod(function remove(name) {
		Blast.Bound.Array.clean(this.tokens, name.trim());

		this._setTokens();
	});

	/**
	 * See if the class is already added
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	ClassList.setMethod(function contains(name) {
		return this.tokens.indexOf(name.trim()) > -1;
	});

	/**
	 * Toggle a class
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	ClassList.setMethod(function toggle(name) {

		if (this.contains(name)) {
			this.remove(name);
			return false;
		} else {
			this.add(name);
			return true;
		}
	});

};