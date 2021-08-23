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
 * @version  2.0.0
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
		variable : tokens.getVariable(1),
		as_key   : null,
		as       : null,
		where    : null,
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
 * Get the correct items we can iterate over.
 * Arrays will be returned as-is,
 * but objects with an iterator symbol will be returned as an array
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array|Object}   items
 *
 * @return   {Array|Object}
 */
Each.setMethod(function getIterable(items) {

	if (!items || Array.isArray(items)) {
		return items;
	}

	let generator;

	if (typeof items[Symbol.iterator] == 'function') {
		generator = items[Symbol.iterator]();
	} else if (typeof items.createIterator == 'function') {
		generator = items.createIterator();
	}

	if (generator) {
		let result = [],
		    entry;

		do {
			entry = generator.next();

			if (!entry.done) {
				result.push(entry.value);
			}

		} while (!entry.done)

		items = result;
	}

	return items;
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

	let options = this.options[0];

	if (options && options.variable) {
		variable = this.getIterable(this.getValueByPath(options.variable));
		as_name = options.as;
		as_key = options.as_key;

		if (options.where) {
			variable = this.applyWhere(options.where, variable, as_name, as_key);
		}

		if (!variable) {
			return this;
		}

		keys = Object.keys(variable);
	} else if (this.vars._$each_var != null) {
		variable = this.getIterable(this.vars._$each_var);
		as_name = this.vars._$each_as;
		keys = this.vars._$each_keys;
	} else if (this.parent && this.parent.constructor.name == 'With') {
		base_vars = this.parent.prepareVars();
		variable = this.getIterable(base_vars._$each_var);
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
			this.execExpressionFunction(this.fnc, vars);
		}
	} else if (this.branches && this.branches.else) {
		this.execExpressionFunction(this.branches.else.fnc, base_vars);
	}

	return this;
});