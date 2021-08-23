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
 * @since    1.2.9
 * @version  2.0.2
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Print.setStatic(function _toCode(options) {

	var var_name,
	    tokens = options.tokens,
	    result,
	    param,
	    paths,
	    args,
	    arg,
	    i;

	result = '<% ';

	if (tokens.current.value == 'macro') {
		tokens.next();
		tokens.next();

		param = tokens.getVariable()[0].join('.');

		args = tokens.getArguments();

		if (args && args.length) {
			var_name = '_$macro_' + Date.now();
			result += var_name + ' = Object.create(vars);';

			for (i = 0; i < args.length; i++) {
				arg = args[i];
				result += var_name + '[' + JSON.stringify(arg.name) + ']';
				result += ' = ' + arg.value + ';';
			}
		} else {
			var_name = 'vars';
		}

		result += 'vars._$macros[' + JSON.stringify(param) + '](' + var_name + ')';
	} else {
		args = options.tokens.getExpression();

		if (args) {
			result += '(__render.startExpression("' + this.name + '", ';

			if (typeof args == 'object') {
				result += JSON.stringify(args);
			} else {
				result += args;
			}

			result += ', vars).close())';
		}
	}

	result += ' %>';

	return {
		name : 'print',
		code : result,
		void : true
	};
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