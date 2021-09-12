/**
 * The "Print" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
const Print = Hawkejs.Expression.getClass('Print');

// Print statements do not have a body
Print.setHasBody(false);

// Print statements have arguments
Print.setHasArguments(true);

/**
 * Do the given pieces match this expression?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}
 */
Print.setStatic(function matches(options) {
	return (options.type == '=' || options.type == 'print');
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  2.0.2
 */
Print.setMethod(function execute() {

	let value = this.parseExpression(this.options, this.vars);

	if (value != null) {
		this.view.print(value);
	}
});