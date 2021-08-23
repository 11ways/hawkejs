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
 * Turn data into valid JavaScript
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   data
 *
 * @return   {string}
 */
Parser.setStatic(function uneval(data) {

	const S = JSON.stringify;

	if (!data || typeof data != 'object') {
		return S(data);
	}

	let result = '',
	    i;

	if (Array.isArray(data)) {

		result = '[';

		for (i = 0; i < data.length; i++) {
			if (i > 0) {
				result += ',';
			}

			result += uneval(data[i]);
		}

		result += ']';
	} else {

		if (data.$rawString) {
			return data.$rawString;
		}

		if (data.$wrap) {
			result = data.$wrap + '(';

			for (i = 0; i < data.$args.length; i++) {
				if (i) result += ',';
				result += uneval(data.$args[i]);
			}

			result += ')';

			return result;
		}

		let keys = Object.keys(data);

		result = '{';

		for (i = 0; i < keys.length; i++) {

			if (i > 0) {
				result += ',\n';
			}

			result += S(keys[i]) + ':' + uneval(data[keys[i]]);
		}

		result += '}';
	}

	return result;
});

/**
 * Wrap a string for use in uneval
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {string}   text
 *
 * @return   {Object}
 */
Parser.setStatic(function rawString(text) {
	return {$rawString: text};
});

/**
 * Wrap an expression
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Parser.setStatic(function wrapExpression(options) {

	options = Bound.Array.cast(options);

	// If it's a simple primitive value we don't have to wrap anything
	if (options.length == 1 && options[0].value != null) {
		return options[0].value;
	}

	return {
		$wrap: '__render.parseExpression',
		$args: [options, Parser.rawString('vars')],
	};
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