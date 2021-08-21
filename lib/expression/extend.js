const R = Hawkejs.Parser.Parser.rawString;

/**
 * The "extend" expression
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Extend = Hawkejs.Expression.getClass('Block', 'Extend');

// Extend statements do not have a body
Extend.setHasBody(false);

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Extend.setStatic(function toCode(builder, subroutine, entry) {
	subroutine.appendCall('__template.extends', [Hawkejs.Parser.Parser.wrapExpression(entry.args), R('vars')]);
});