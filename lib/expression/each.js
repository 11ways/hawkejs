/**
 * The "Each" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Each = Hawkejs.Expression.getClass('Each');

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Each.setStatic(function parseArguments(options) {

	let tokens = options.tokens;

	if (!tokens.hasValue('as')) {
		return 'null';
	}

	let result = {
		variable : tokens.getVariable(),
		as_key   : null,
		as       : null,
		where    : null,
	};

	// Go to the AS keyword
	tokens.goTo('as');
	tokens.next();

	if (tokens.hasValue(',')) {
		result.as_key = tokens.getVariable(1)[0];
		tokens.next();
	}

	result.as = tokens.getVariable(1)[0];

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
 * @version  2.0.0
 *
 * @param    {String}  name
 * @param    {Array}   pieces
 */
Each.setMethod(function execute() {

	var base_vars,
	    variable,
	    as_name,
	    as_key,
	    keys,
	    i;

	if (this.options && this.options.variable) {
		variable = this.getValueByPath(this.options.variable);
		as_name = this.options.as;
		as_key = this.options.as_key;

		if (this.options.where) {
			variable = this.applyWhere(this.options.where, variable, as_name, as_key);
		}

		keys = Object.keys(variable);
	} else if (this.vars._$each_var != null) {
		variable = this.vars._$each_var;
		as_name = this.vars._$each_as;
		keys = this.vars._$each_keys;
	} else if (this.parent && this.parent.constructor.name == 'With') {
		base_vars = this.parent.prepareVars();
		variable = base_vars._$each_var;
		as_name = base_vars._$each_as;
		keys = base_vars._$each_keys;
	}

	if (!base_vars) {
		base_vars = this.vars;
	}

	if (variable && keys.length) {
		let vars;

		for (i = 0; i < keys.length; i++) {
			vars = Object.create(base_vars);
			vars.$index = i;
			vars.$key = keys[i];

			if (as_key) {
				vars[as_key] = vars.$key;
			}

			vars.$value = variable[keys[i]];
			vars[as_name] = variable[keys[i]];
			this.view.execExpressionFunction(this.fnc, vars);
		}
	} else if (this.branches && this.branches.else) {
		this.view.execExpressionFunction(this.branches.else.fnc, base_vars);
	}

	return this;
});