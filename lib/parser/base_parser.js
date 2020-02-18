/**
 * Generic Parser class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {String|Array}   source
 */
var Parser = Fn.inherits(null, 'Hawkejs.Parser', function Parser(source) {
	this.source = source;
	this.index = 0;
});

/**
 * Get the length of the source
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Number}
 */
Parser.setProperty(function length() {
	return this.source.length;
});

/**
 * Get the current item
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 */
Parser.setProperty(function current() {
	return this.source[this.index];
});

/**
 * Look at the next character
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Parser.setProperty(function peek_next() {
	return this.peekNext(1);
});

/**
 * Have we reached the end?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Parser.setProperty(function is_eof() {
	return this.index >= this.length;
});

/**
 * Peek in a specific amount
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Number}   index
 */
Parser.setMethod(function peekNext(increment) {

	if (increment == null) {
		increment = 1;
	}

	return this.source[this.index + increment];
});

/**
 * Get specific entry
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Number}   index
 */
Parser.setMethod(function at(index) {
	return this.source[index];
});

/**
 * Go to the next non-whitespace value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Parser.setMethod(function goToNext() {
	return this.next();
});

/**
 * Go to the given index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Number|String}   command
 */
Parser.setMethod(function goTo(command) {

	var entry,
	    i;

	if (typeof command == 'number') {
		this.index = command;
		return true;
	} else {
		throw new Error('Unable to goTo non-numeric index');
	}

	return false;
});