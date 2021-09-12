/**
 * The "Break" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
const Break = Hawkejs.Expression.getClass('Break');

// Break statements can have arguments
Break.setHasArguments(true);

// Break statements do not have a body
Break.setHasBody(false);

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Break.setStatic(function toCode(builder, subroutine, entry) {

	let expression_args = Bound.Array.cast(entry.args);

	let args = [Hawkejs.Parser.Parser.wrapExpression(expression_args)];

	subroutine.appendCall('_$expression.breakOut', args);
	subroutine.append('return;');
});