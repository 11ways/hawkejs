/**
 * The "Break" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Break = Hawkejs.Expression.getClass('Break');

/**
 * Add builder instructions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {boolean}
 */
Break.setStatic(function toBuilder(options) {

	let named = options.tokens.next();

	if (named) {
		named = named.value;
	}

	options.builder.addStatement(this.name, args, options);

	return true;
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.1.6
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Break.setStatic(function toCode(options) {

	var result,
	    named,
	    code;

	code = '<% ';

	named = options.tokens.next();

	if (named) {
		named = named.value;

		if (named) {
			code += '_$expression.breakOut("' + named + '");';
		} else {
			code += '_$expression.breakOut()';
		}
	}

	code += ' return %>';

	result = {
		name : 'break',
		code : code,
		void : true
	};

	return result;
});