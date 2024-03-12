/**
 * The "Each" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
const Each = Hawkejs.Expression.getClass('Each');

// Each statements have special arguments
Each.setHasArguments(true);

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.19
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Each.setStatic(function parseArguments(options) {

	let tokens = options.tokens;

	if (!tokens.hasValue('as')) {
		return;
	}

	let result = {
		expression : tokens.getExpressionForEach(),
		as_key     : null,
		as         : null,
		where      : null,
	};

	// Go to the AS keyword
	tokens.goTo('as');
	tokens.next();

	if (tokens.hasValue(',')) {
		result.as_key = tokens.getVariable(1).path[0];
		tokens.next();
	}

	result.as = tokens.getVariable(1).path[0];

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
Each.setMethod(function execute() {

	let base_vars,
	    variable,
	    as_name,
	    as_key,
	    values,
	    length,
	    keys;

	let options = this.options[0];

	if (options && options.expression) {

		variable = this.parseExpression(options.expression, this.vars);

		if (!variable) {
			return this;
		}

		// Extract the values
		({keys, values, length} = Hawkejs.splitIntoKeysAndValues(variable));

		if (!length) {
			return this;
		}

		// Get the names we should give the keys (optional) and value
		as_name = options.as;
		as_key = options.as_key;

		if (options.where) {
			({keys, values, length} = this.applyWhere(options.where, keys, values, as_name, as_key));
		}

		if (!length) {
			return this;
		}
	} else if (this.vars._$each_var != null) {
		variable = this.vars._$each_var
		as_name = this.vars._$each_as;
		values = this.vars._$each_values;
		keys = this.vars._$each_keys;
	} else if (this.parent && this.parent.constructor.name == 'With') {
		base_vars = this.parent.prepareVars();
		variable = base_vars._$each_var;
		values = base_vars._$each_values;
		as_name = base_vars._$each_as;
		keys = base_vars._$each_keys;
	}

	if (!base_vars) {
		base_vars = this.vars;
	}

	if (variable && keys.length) {
		let vars,
		    i;

		for (i = 0; i < keys.length; i++) {

			if (this.break) {
				return this;
			}

			vars = Object.create(base_vars);
			vars.$index = i;
			vars.$key = keys[i];

			if (as_key) {
				vars[as_key] = vars.$key;
			}

			vars.$value = values[i];
			vars[as_name] = values[i];
			this.execExpressionFunction(this.fnc, vars);
		}
	} else if (this.branches && this.branches.else) {
		this.execExpressionFunction(this.branches.else.fnc, base_vars);
	}

	return this;
});