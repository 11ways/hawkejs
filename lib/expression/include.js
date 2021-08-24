/**
 * The "include" expression
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.1
 * @version  2.1.1
 */
const Include = Hawkejs.Expression.getClass('Block', 'Include');

// Include statements do not have a body
Include.setHasBody(false);

// Include statements have arguments
Include.setHasArguments(true);


/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.1
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Include.setStatic(function toCode(builder, subroutine, entry) {

	let args = Bound.Array.cast(Hawkejs.Parser.Parser.wrapExpression(entry.args, true));
	args.unshift(null);

	subroutine.appendCall('__render.include', args);
});