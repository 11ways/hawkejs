var Fn = Blast.Bound.Function;

/**
 * String Parser class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.3.2
 *
 * @param    {String|Array}   source
 */
var StringParser = Fn.inherits('Hawkejs.Parser', function String(source) {
	String.super.call(this, source);
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