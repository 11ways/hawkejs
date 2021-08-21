/**
 * The "Block" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 */
var Block = Hawkejs.Expression.getClass('Block');

// Blocks have at least 2 tokens
Block.setMinimumTokens(2);

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Block.setStatic(function parseArguments(options) {

	var tokens = options.tokens,
	    result;

	if (tokens.source[1] && tokens.source[1].type != 'whitespace') {
		return false;
	}

	tokens.goTo(2);

	// Get the expression
	result = {
		expression : tokens.getExpression()
	};

	return result;
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Array}   pieces
 *
 * @return   {String}
 */
Block.setStatic(function toCode(options) {

	let result,
	    args = this.parseArguments(options);

	options.args = args;

	result = '<% start(' + JSON.stringify(options.args) + ') -%>';

	options.builder.addStatement('start', args, options);

	return result;
});

/**
 * Return closing code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Block.setStatic(function toCloseCode(options) {

	options.builder.closeStatement('start', null, options);

	if (!options.current) {
		console.warn('Failed to find {% block %} name during close!', options);
		return '<% end() -%>';
	}

	return '<% end(' + JSON.stringify(options.current.options.args) + ') -%>';
});