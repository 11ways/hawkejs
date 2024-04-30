const TAB = '\t';

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
 * @version  2.4.0
 *
 * @param    {Object}   data
 * @param    {number}   level
 *
 * @return   {string}
 */
Parser.setStatic(function uneval(data, level = 0) {

	const S = JSON.stringify;

	if (!data || typeof data != 'object') {
		return S(data);
	}

	const INDENT = Bound.String.multiply(TAB, level),
	      NESTED_INDENT = INDENT + TAB;

	let result = '',
	    i;

	if (Array.isArray(data)) {

		let count = data.length;

		if (count == 0) {
			result = '[]';
		} else if (count == 1 && Bound.Object.isPrimitive(data[0])) {
			result = '[' + S(data[0]) + ']';
		} else {
			result = '[\n' + NESTED_INDENT;

			for (i = 0; i < count; i++) {

				if (i > 0) {
					result += ',' + '\n' + NESTED_INDENT;
				}

				result += uneval(data[i], level + 1);
			}

			result += '\n' + INDENT + ']';
		}
	} else {

		if (data.$rawString) {
			return data.$rawString;
		}

		// These are functions that need to be called
		if (data.$wrap) {
			result = data.$wrap + '(';

			for (i = 0; i < data.$args.length; i++) {
				if (i) result += ',';
				result += uneval(data.$args[i], level + 1);
			}

			result += ')';

			return result;
		}

		let keys = Object.keys(data),
		    count = keys.length;

		if (count == 0) {
			result += '{}';
		} else if (count == 1 && Bound.Object.isPrimitive(data[keys[0]])) {
			result = '{' + S(keys[0]) + ': ' + S(data[keys[0]]) + '}';
		} else {
			result = '{\n' + NESTED_INDENT;

			for (i = 0; i < count; i++) {

				if (i > 0) {
					result += ',\n' + NESTED_INDENT;
				}

				result += S(keys[i]) + ': ' + uneval(data[keys[i]], level + 1);
			}

			result += '\n' + INDENT + '}';
		}
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
 * @version  2.4.0
 *
 * @param    {Object}   options
 * @param    {boolean}  as_args
 * @param    {boolean}  unwrap_optionals
 *
 * @return   {Object}
 */
Parser.setStatic(function wrapExpression(options, as_args, unwrap_optionals = true) {

	options = Bound.Array.cast(options);

	// If it's a simple primitive value we don't have to wrap anything
	if (options.length == 1 && options[0].value != null) {
		return options[0].value;
	}

	let code = 'parseExpression';

	if (as_args) {
		code += 'AsArguments';
	}

	let result = {
		$wrap: '__render.' + code,
		$args: [options, Parser.rawString('vars')],
	};

	if (!unwrap_optionals) {
		result.$args.push(false);
	}

	return result;
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
	if (typeof command == 'number') {
		this.index = command;
		return true;
	} else {
		throw new Error('Unable to goTo non-numeric index');
	}
});