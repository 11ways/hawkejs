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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Block.setStatic(function parseArguments(options) {

	let result = options.tokens.getExpression();

	return result;
});

/**
 * Execute the block statement
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
Block.setMethod(function execute() {

	let variable = this.parseExpression(this.options, this.vars);

	console.log('Starting...', variable);

	this.view.start(variable);
	this.view.execExpressionFunction(this.fnc, this.vars);
	this.view.end(variable);

	console.log('Ending...', variable)

});