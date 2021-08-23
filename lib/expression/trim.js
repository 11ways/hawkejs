/**
 * The "Trim" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
const Trim = Hawkejs.Expression.getClass('Trim');

// Trim statements do not have a body
Trim.setHasBody(false);

// Trim statements have special tokens as arguments
Trim.setHasArguments(true);

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Trim.setStatic(function parseArguments(options) {

	let result = {
		blank : false,
		left  : false,
		right : false,
	};

	if (options.tokens.hasValue('blank')) {
		result.blank = true;
	} else {
		result.left = options.tokens.hasValue('left');
		result.right = options.tokens.hasValue('right');
	}

	return result;
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Trim.setStatic(function toCode(builder, subroutine, entry) {

	let options = entry.args && entry.args[0],
	    code = '__render.current_block.';

	if (options.blank) {
		code += 'trimBlankElements(';
	} else {
		code += 'trim(';

		if (options.left || options.right) {
			code += options.left + ', ' + options.right;
		}
	}

	code += ');';

	subroutine.append(code);
});