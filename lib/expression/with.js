/**
 * The "With" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
const With = Hawkejs.Expression.getClass('With');

// With statements have a body
With.setHasBody(true);

// With statements have arguments
With.setHasArguments(true);

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
With.setStatic(function parseArguments(options) {

	let tokens = options.tokens;

	let result = {
		variable : tokens.getVariable(),
		as       : null,
		where    : null,
	};

	// Go to the AS keyword
	tokens.goTo('as');
	tokens.next();

	let as_var = tokens.getVariable(1);

	if (as_var && as_var.path) {
		as_var = as_var.path[0];
	}

	result.as = as_var;

	if (tokens.goTo('where')) {
		result.where = tokens.getExpression();

		if (result.where && result.where.length) {
			result.where = result.where.slice(1);
		}
	}

	return result;
});

/**
 * Execute the code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.3.19
 *
 * @param    {String}  name
 * @param    {Array}   pieces
 */
With.setMethod(function execute() {

	let variable,
	    vars,
	    i;

	let options = this.options[0];

	// Get the possible paths
	let paths = options.variable;

	// Get the actual variable to work with
	for (i = 0; i < paths.length; i++) {
		// Get the variable
		variable = this.getValueByPath(paths[i]);

		if (variable) {
			break;
		}
	}

	let {keys, values, length} = Hawkejs.splitIntoKeysAndValues(variable);

	// Do we need to filter the variable?
	if (options.where && length) {
		
		let new_keys = [],
		    new_values = [],
		    value;

		for (i = 0; i < length; i++) {
			// Get the current variable
			value = values[i];

			// Create new variable object
			vars = {
				[options.as]: value,
			};

			// Parse the expression
			value = this.parseExpression(options.where, vars);

			if (value) {
				new_keys.push(keys[i]);
				new_values.push(values[i]);
			}
		}

		keys = new_keys;
		values = new_values;
		length = keys.length;
	}

	this.keys = keys;
	this.values = values;

	if (this.constructor.type_name == 'while' && (!variable || !length)) {
		return;
	}

	this.variable = variable;

	// Create a new vars object
	let main_vars = Object.create(this.vars);

	// Add the "$amount" to it
	main_vars.$amount = length;

	// Set some extra variables
	main_vars._$each_as = options.as;
	main_vars._$each_var = this.variable;
	main_vars._$each_values = this.values;
	main_vars._$each_keys = this.keys;

	// And store it as the variables to use
	this.vars = main_vars;

	// Initialize the contents
	this.execExpressionFunction(this.fnc);
});

/**
 * Prepare iteration vars
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 */
With.setMethod(function prepareVars() {

	var vars = Object.create(this.vars);

	return vars;
});

/**
 * On the none branch
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.2.0
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
With.setMethod(function onBranch_none(options, fnc) {

	if (!this.variable || !this.keys.length) {
		this.execExpressionFunction(fnc, this.vars);
	}

});

/**
 * On the all branch
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
With.setMethod(function onBranch_all(options, fnc) {

	if (!this.variable || !this.keys.length) {
		return;
	}

	this.execExpressionFunction(fnc);
});

/**
 * On the "single" branch
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.3.19
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
With.setMethod(function onBranch_single(options, fnc) {

	if (!this.variable || this.keys.length != 1) {
		return;
	}

	let vars = this.prepareVars();
	vars[this.options.as] = this.values[0];

	this.execExpressionFunction(fnc, vars);
});

/**
 * On the "multiple" branch
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
With.setMethod(function onBranch_multiple(options, fnc) {

	if (this.variable && this.keys.length > 1) {
		this.execExpressionFunction(fnc);
	}
});
