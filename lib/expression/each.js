/**
 * The "Each" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Each = Hawkejs.Expression.getClass('Each');

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
	    vars,
	    keys,
	    i;

	if (this.options && this.options.variable) {
		variable = this.getValueByPath(this.options.variable);
		as_name = this.options.as;
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
		for (i = 0; i < keys.length; i++) {
			vars = Object.create(base_vars);
			vars.$index = i;
			vars.$key = keys[i];
			vars.$value = variable[keys[i]];
			vars[as_name] = variable[keys[i]];
			this.view.execExpressionFunction(this.fnc, vars);
		}
	} else if (this.branches && this.branches.else) {
		this.view.execExpressionFunction(this.branches.else.fnc, base_vars);
	}

	return this;
});