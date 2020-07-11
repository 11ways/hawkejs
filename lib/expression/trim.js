/**
 * The "Trim" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
var Trim = Hawkejs.Expression.getClass('Trim');

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Trim.setStatic(function toCode(options) {

	var code = '<% this.current_block.',
	    left,
	    right;

	if (options.tokens.hasValue('blank')) {
		code += 'trimBlankElements(';
	} else {
		code += 'trim(';

		left = options.tokens.hasValue('left');
		right = options.tokens.hasValue('right');

		if (left || right) {
			code += left + ', ' + right;
		}
	}

	code += ') %>';

	return {
		name : 'trim',
		code : code,
		void : true
	};
});
