const R = Hawkejs.Parser.Parser.rawString;

/**
 * The "Run" expression runs a macro
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.4
 * @version  2.2.4
 */
const Run = Hawkejs.Expression.getClass('Run');

// Run should have at least 2 tokens
Run.setMinimumTokens(1);

// Run can have arguments
Run.setHasArguments(true);

// Run statements do not have a body
Run.setHasBody(false);

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.4
 * @version  2.2.4
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Run.setStatic(function parseArguments(options) {

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

	let result = {
		identifier : identifier,
		args       : args,
	};

	return result;
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.4
 * @version  2.2.4
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Run.setStatic(function toCode(builder, subroutine, entry) {

	let config = entry.args[0];

	let macro_name = 'cpv_macro_' + config.identifier;

	let args = [
		'Run',
		config.args,
		R('vars'),
		R(macro_name)
	];

	subroutine.appendCall('__render.startExpression', args, false);
	subroutine.append(').close();');
});

/**
 * Execute the code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.4
 * @version  2.2.4
 */
Run.setMethod(function execute() {

	let vars = this.vars.createShim();

	if (this.options && this.options.length) {
		let new_variables = this.getObjectLiteralValue(this.options, this.vars);
		vars = this.vars.overlay(new_variables);
	} else {
		vars = this.vars.createShim();
	}

	this.execExpressionFunction(this.fnc, vars);

	return this;
});