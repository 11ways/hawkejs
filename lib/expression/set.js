/**
 * The "Set" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.6
 * @version  2.1.6
 */
const Set = Hawkejs.Expression.getClass('Set');

// Set statements do not have a body
Set.setHasBody(false);

// Set statements have special arguments
Set.setHasArguments(true);

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Set.setStatic(function parseArguments(options) {

	let tokens = options.tokens,
	    variable = tokens.getVariable()[0].path;

	tokens.goTo('=');
	tokens.next();

	let result = {
		variable   : variable,
		expression : tokens.getExpression(),
	};

	return result;
});

/**
 * Add this expression's JavaScript code to the current subroutine
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.6
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Set.setStatic(function toCode(builder, subroutine, entry) {

	let options = entry.args[0],
	    piece,
	    code = '',
	    path = 'vars',
	    i;

	for (i = 0; i < options.variable.length; i++) {
		piece = options.variable[i];
		path += '.' + piece;

		if (i == options.variable.length - 1) {
			// Last piece
			code += path + ' = ';
		} else {
			code += 'if (!' + path + ') ' + path + ' = {};\n';
		}
	}

	subroutine.append(code);

	// Can't use wrapExpression like this
	//subroutine.add(Hawkejs.Parser.Parser.wrapExpression(options.expression));

	subroutine.appendCall('__render.parseExpression', [
		options.expression,
		Hawkejs.Parser.Parser.rawString('vars')
	]);
});