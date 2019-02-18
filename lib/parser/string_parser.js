var Fn = Blast.Bound.Function;

/**
 * String Parser class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.4.0
 *
 * @param    {String|Array}   source
 */
var StringParser = Fn.inherits('Hawkejs.Parser', function String(source) {
	String.super.call(this, source);

	this.result = [];
	this.tokenize();
});

/**
 * Tokenize the given string to an array
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {String}
 *
 * @return   {Array}
 */
StringParser.setStatic(function tokenize(source) {
	var instance = new this(source);
	return instance.result;
});

/**
 * Go to the next non-whitespace value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
StringParser.setMethod(function next() {

	var entry,
	    i;

	this.index++;

	for (i = this.index; i < this.length; i++) {
		entry = this.source[i];

		if (entry.trim()) {
			this.index = i;
			return entry;
		}
	}

	return false;
});