/**
 * Token Parser class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Array}   source
 */
var TokenParser = Fn.inherits('Hawkejs.Parser', function Token(source) {
	Token.super.call(this, source);
});

/**
 * Get the current value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
TokenParser.setProperty(function current_value() {

	var token = this.current;

	if (!token) {
		return null;
	}

	return token.value;
});

/**
 * Get the previous non-whitespace token
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
TokenParser.setProperty(function previous_token() {

	var index = this.index;

	while (index > 0) {
		index--;

		if (this.source[index] && this.source[index].type != 'whitespace') {
			return this.source[index];
		}
	}
});

/**
 * Go to the next non-whitespace value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
TokenParser.setMethod(function next() {

	var entry,
	    i;

	this.index++;

	for (i = this.index; i < this.length; i++) {
		entry = this.source[i];

		if (entry.type == 'whitespace') {
			// Ignore
		} else {
			this.index = i;
			return this.source[this.index];
		}
	}

	return false;
});

/**
 * Go to the given index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Number|String}   command
 */
TokenParser.setMethod(function goTo(command) {

	var entry,
	    i;

	if (typeof command == 'number') {
		this.index = command;
		return true;
	} else {
		for (i = this.index; i < this.length; i++) {
			entry = this.source[i];

			if (entry.value == command || entry.name == command) {
				this.index = i;
				return true;
			}
		}
	}

	return false;
});