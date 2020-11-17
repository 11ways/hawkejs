/**
 * The "include" expression
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.1
 * @version  2.1.1
 */
var Include = Hawkejs.Expression.getClass('Block', 'Include');

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.1
 * @version  2.1.1
 *
 * @param    {Array}   pieces
 *
 * @return   {String}
 */
Include.setStatic(function toCode(options) {

	let result,
	    args = this.parseArguments(options);

	options.args = args;

	result = '<% include(' + JSON.stringify(options.args) + ') -%>';

	return {
		name : 'include',
		code : result,
		void : true
	};
});