const R = Hawkejs.Parser.Parser.rawString;

/**
 * The "Macro" expression creates a new subroutine
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.2.4
 */
const Macro = Hawkejs.Expression.getClass('Macro');

// Macros should have at least 2 tokens
Macro.setMinimumTokens(2);

// Macros can have arguments
Macro.setHasArguments(true);

/**
 * Add builder instructions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.4
 * @version  2.2.4
 *
 * @param    {Object}   options
 *
 * @return   {boolean}
 */
Macro.setStatic(function toBuilder(options) {

	let tokens = options.tokens,
	    identifier = tokens.getVariable()[0].path;
	
	if (!identifier || identifier.length != 1) {
		throw new Error('Macro name must be a single identifier');
	}

	identifier = identifier[0];

	let args = tokens.getExpressionOptions();

	if (args) {
		args = args.object;
	}

	let statement = options.builder.addStatement('Macro', args, options);
	
	statement.function_body.name = 'cpv_macro_' + identifier;

	return true;
});

/**
 * Add this expression's JavaScript code to the current subroutine
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.4
 * @version  2.2.4
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Macro.setStatic(function toCode(builder, subroutine, entry) {

	let args = [entry.name, null, R('vars')];

	console.log('fnc:', entry.function_body, entry, entry.args)

	let sr_body = builder._createSubroutine(entry.function_body, ['_$expression']);

	if (entry.args && entry.args.length) {
		sr_body.appendCall('_$expression.setDefaultFromObjectLiteralExpression', [entry.args]);
	}

	builder._compileBody(sr_body, entry.function_body);
	subroutine.requires(sr_body);
	args.push(R(sr_body.name));
});

/**
 * Return closing code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.4
 * @version  2.2.4
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Macro.setStatic(function toCloseCode(builder, subroutine, entry) {
	// No need to place close code
});
