/**
 * The "Set" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.6
 * @version  2.1.6
 */
const Set = Hawkejs.Expression.getClass('Set');

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.6
 * @version  2.1.6
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Set.setStatic(function toCode(options) {

	let tokens = options.tokens,
	    variable = tokens.getVariable(),
	    piece,
	    code = '<% ',
	    path = 'vars',
	    i;

	for (i = 0; i < variable.length; i++) {
		piece = variable[i];

		path += '.' + piece;

		if (i == variable.length - 1) {
			// Last piece
			code += path + ' = ';
		} else {
			code += 'if (!' + path + ') ' + path + ' = {};';
		}
	}

	// Go to the = keyword
	tokens.goTo('=');
	tokens.next();

	let expression = tokens.getExpression();

	code += '__render.parseExpression(' + JSON.stringify(expression) + ', vars);';

	code += ' %>';

	return {
		name : 'set',
		code : code,
		void : true
	};
});