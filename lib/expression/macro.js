/**
 * The "Macro" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Macro = Hawkejs.Expression.getClass('Macro');

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Macro.setStatic(function toCode(options) {

	var tokens = options.tokens,
	    code,
	    name,
	    args,
	    arg,
	    i;

	name = tokens.getVariable(1)[0];

	code = '<% if (!vars._$macros) { vars._$macros = {} };';
	code += 'vars._$macros[' + JSON.stringify(name) + '] = function(vars) {';

	args = tokens.getArguments();

	if (args && args.length) {
		for (i = 0; i < args.length; i++) {
			arg = args[i];

			code += 'if (vars[' + JSON.stringify(arg.name) + '] == null) ';
			code += 'vars[' + JSON.stringify(arg.name) + '] = ' + arg.value + ';';
		}
	}

	code += '%>';

	return code;
});

/**
 * Return code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Macro.setStatic(function toCloseCode(options) {
	return '<% } -%>';
});