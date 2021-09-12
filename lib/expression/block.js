/**
 * The "Block" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 */
var Block = Hawkejs.Expression.getClass('Block');

// Blocks should have at least 2 tokens
Block.setMinimumTokens(2);

// Blocks have arguments
Block.setHasArguments(true);

/**
 * Execute the block statement
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
Block.setMethod(function execute() {

	let variable = this.parseExpression(this.options, this.vars);

	this.view.start(variable);
	this.execExpressionFunction(this.fnc);
	this.view.end(variable);

});