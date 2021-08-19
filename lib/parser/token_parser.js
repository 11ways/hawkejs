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
 * @version  2.1.6
 */
TokenParser.setMethod(function next() {

	var result = false,
	    entry,
	    i;

	this.index++;

	for (i = this.index; i < this.length; i++) {
		entry = this.source[i];

		if (entry.type != 'whitespace') {
			this.index = i;
			result = this.source[this.index];
			break;
		}
	}

	return result;
});

/**
 * Go to the previous non-whitespace value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.2
 * @version  2.1.6
 */
TokenParser.setMethod(function previous() {

	var result = false,
	    entry,
	    i;

	this.index--;

	for (i = this.index; i >= 0; i--) {
		entry = this.source[i];

		if (entry.type != 'whitespace') {
			this.index = i;
			result = this.source[this.index];
			break;
		}
	}

	return result;
});

/**
 * Go to the given index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.1.6
 *
 * @param    {Number|String}   command
 *
 * @return   {Boolean}
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

/**
 * See if the given token value exists in following tokens
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   value
 *
 * @return   {Boolean}
 */
TokenParser.setMethod(function hasValue(command) {

	let i;

	for (i = this.index; i < this.length; i++) {

		if (this.source[i].value == command) {
			return true;
		}
	}

	return false;
});

/**
 * Get the source string of the given range
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.6
 * @version  2.1.6
 *
 * @param    {number}   start
 * @param    {number}   end
 *
 * @return   {string}
 */
TokenParser.setMethod(function sliceSource(start, end) {

	let result = '',
	    token,
	    i;

	for (i = start; i < end; i++) {
		token = this.source[i];
		result += token.value;
	}

	return result;
});