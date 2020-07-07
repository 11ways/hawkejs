/**
 * The "extend" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
var Extend = Hawkejs.Expression.getClass('Block', 'Extend');

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
Extend.setStatic(function toCode(options) {

	let result,
	    args = this.parseArguments(options);

	options.args = args;

	result = '<% extends(' + JSON.stringify(options.args) + ') -%>';

	return {
		name : 'extend',
		code : result,
		void : true
	};
});