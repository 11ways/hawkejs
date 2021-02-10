const Obj = Bound.Object;

/**
 * Base Hawkejs Expression class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 */
var Expression = Fn.inherits(null, 'Hawkejs.Expression', function Expression(view) {

	// The renderer instance
	this.view = view;

	this.options = null;
	this.vars = null;
	this.fnc = null;

	if (view.expression_chain) {
		this.parent = view.expression_chain[view.expression_chain.length - 1];
	}
});

/**
 * The type name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Expression.prepareStaticProperty(function type_name() {
	return Bound.String.underscore(this.name);
});

/**
 * The closing tag name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Expression.prepareStaticProperty(function close_name() {
	return '/' + this.type_name;
});

/**
 * Set the minimum amount of tokens this should contain
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Expression.setStatic(function setMinimumTokens(amount) {
	this.minimum_tokens = amount;
});

/**
 * Get or create a certain expression class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Expression.setStatic(function getClass(parent, name) {

	if (arguments.length == 1) {
		name = parent;
		parent = 'Hawkejs.Expression';
	} else {
		parent = 'Hawkejs.Expression.' + parent;
	}

	if (!Classes.Hawkejs.Expression[name]) {
		Fn.inherits(parent, Fn.create(name, function ExpressionConstructor(view) {
			ExpressionConstructor.wrapper.super.call(this, view);
		}));
	}

	return Classes.Hawkejs.Expression[name];
});

Hawkejs.Expression.getClass = Expression.getClass;

/**
 * Do the given pieces match this expression?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Boolean}
 */
Expression.setStatic(function matches(options) {

	var result = this.type_name == options.type,
	    token;

	if (options.close !== true) {
		// Block types should be followed by nothing or a whitespace
		if (result && (token = options.tokens.at(1))) {
			result = token.type == 'whitespace';
		}

		if (result && this.minimum_tokens != null) {
			result = options.tokens.length >= this.minimum_tokens;
		}
	}

	return result;
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Boolean|Object}
 */
Expression.setStatic(function parse(options) {

	var result;

	if (!this.matches(options)) {
		return false;
	}

	if (options.close) {
		result = this.toCloseCode(options);

		if (typeof result == 'string') {
			result = {
				name  : this.type_name,
				code  : result,
				close : true
			};
		}
	} else {
		result = this.toCode(options);

		if (typeof result == 'string') {
			result = {
				name  : this.type_name,
				code  : result
			};
		}
	}

	if (!result) {
		return false;
	}

	result.class = this;

	return result;
});

/**
 * Parse an expression and return the value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.3
 * @version  1.3.3
 *
 * @param    {ViewRender}  view
 * @param    {Array}       tokens   An array of tokens
 * @param    {Object}      vars     An object of variables
 */
Expression.setStatic(function parseExpression(view, tokens, vars) {
	var instance = new this(view);
	return instance.parseExpression(tokens, vars);
});

/**
 * Return opening code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Expression.setStatic(function toCode(options) {

	var code,
	    args;

	code = '<% (__render.startExpression("' + this.name + '", ';

	if (this.parseArguments) {
		args = this.parseArguments(options);
	} else {
		args = 'null';
	}

	if (args && typeof args == 'object') {
		code += JSON.stringify(args);
	} else {
		code += args;
	}

	code += ', vars, function subtemplate(vars, _$expression) { -%>';

	return code;
});

/**
 * Return closing code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Expression.setStatic(function toCloseCode(options) {
	return '<% }).close()) /* ' + this.close_name + ' */ -%>';
});

/**
 * Get a value by its path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Array}   path
 * @param    {Object}  variables
 */
Expression.setMethod(function getValueByPath(path, variables) {

	if (variables == null) {
		variables = this.vars;
	}

	let result = Obj.path(variables, path);

	// See if we need to look for helper values
	if (result === undefined) {
		result = Obj.path(this.view.helpers, path);
	}

	return result;
});

/**
 * It has been closed
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.1.3
 */
Expression.setMethod(function close() {

	let result = this.execute();

	if (this.view) {
		let index = this.view.expression_chain.indexOf(this);

		if (index > -1) {
			// Remove the expression (and anything left following it)
			// from the chain
			this.view.expression_chain.splice(index);
		}
	}

	return result;
});

/**
 * Break out
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Expression.setMethod(function breakOut(name) {

	// Indicate this has been broken out of
	this.break = true;

});

/**
 * Branch to a specific subkeyword
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.1.4
 *
 * @param    {String}  name
 * @param    {Array}   pieces
 */
Expression.setMethod(function branch(name, pieces, fnc) {

	if (this.break) {
		return;
	}

	if (!this.branches) {
		this.branches = {};
	}

	let entry = {
		pieces: pieces,
		fnc   : fnc
	};

	if (name == 'case') {

		if (!this.branches.cases) {
			this.branches.cases = [];
		}

		this.branches.cases.push(entry);

	} else if (name == 'elseif') {
		if (!this.branches.elseif) {
			this.branches.elseif = [];
		}

		this.branches.elseif.push(entry);
	} else {
		this.branches[name] = entry;
	}

	if (this['onBranch_' + name]) {
		this['onBranch_' + name](pieces, fnc);
	}

	return this;
});

/**
 * Parse expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.2
 *
 * @param    {Array}   tokens   An array of tokens
 * @param    {Object}  vars     An object of variables
 *
 * @return   {*}
 */
Expression.setMethod(function parseExpression(tokens, vars, call_chain) {

	if (!tokens) {
		return tokens;
	}

	let have_a_value,
	    have_b_value,
	    did_operator,
	    operator,
	    result,
	    token,
	    op,
	    a,
	    b,
	    c,
	    i;

	for (i = 0; i < tokens.length; i++) {
		token = tokens[i];
		did_operator = false;

		if (token.keyword == 'not') {
			if (tokens[i+1]) {
				// Invert the (probably falsy) invert of THIS not keyword
				// Because of this not-not works as expected
				tokens[i+1].invert = !token.invert;
			}

			continue;
		}

		if (token.keyword == 'or') {
			if (this.isTruthy(result)) {
				return result;
			}

			// An OR "collapses" the values we're looking for
			// (The second variable after an OR is not the "b" value,
			// but an alternative A value)
			have_a_value = false;

			continue;
		}

		if (token.keyword == 'and') {
			if (!this.isTruthy(result)) {
				return result;
			}

			have_a_value = false;

			continue;
		}

		if (!have_a_value) {
			have_a_value = true;
			have_b_value = false;
			operator = null;

			a = this.getTokenValue(token, vars);

			if (token.invert) {
				a = !this.isTruthy(a);
			} else if (token.invert === false) {
				a = !!this.isTruthy(a);
			}

			result = a;
		} else if (call_chain) {

			if (token.length > 1) {
				throw new Error('Unexpected call chain token length');
			} else {
				token = token[0];
			}

			did_operator = true;
			a = result = this.callPathWithArgs([{value: a}].concat(token.call), token.arguments, vars);
		} else if (!operator) {

			if (token.variable) {
				throw new SyntaxError('Unexpected token: variable `' + token.variable.join('.') + '`');
			}

			operator = token;
			op = operator.keyword;
		} else {
			b = this.getTokenValue(token, vars);
			have_b_value = true;

			if (token.invert) {
				b = !this.isTruthy(b);
			} else if (token.invert === false) {
				b = !!this.isTruthy(b);
			}
		}

		if (op == 'empty') {
			if (typeof a == 'string') {
				result = Blast.Bound.String.isEmptyWhitespace(a);
			} else {
				result = Obj.isEmpty(a);
			}
			did_operator = true;
		} else if (op == 'emptyhtml') {
			if (typeof a == 'string') {
				result = Blast.Bound.String.isEmptyWhitespaceHTML(a);
			} else {
				result = Obj.isEmpty(a);
			}
			did_operator = true;
		} else if (!have_b_value) {
			continue;
		}

		if (did_operator) {
			// Already did operator code
		} else if (op == 'neq') {
			result = a != b;
		} else if (op == 'eq') {
			result = a == b;
		} else if (op == 'starts with') {
			if (a == null) {
				result = false;
			} else {
				if (typeof a != 'string') {
					a = String(a);
				}

				result = a.indexOf(b) == 0;
			}
		} else if (op == 'gt') {
			result = a > b;
		} else if (op == 'ge') {
			result = a >= b;
		} else if (op == 'lt') {
			result = a < b;
		} else if (op == 'le') {
			result = a <= b;
		} else if (op == 'plus') {
			result = a + b;
		} else if (op == 'minus') {
			result = a - b;
		} else if (op == 'multiply') {
			result = a * b;
		} else if (op == 'divide') {
			result = a / b;
		} else if (op) {
			throw new Error('Unknown operator "' + op +'"');
		} else {
			result = a;
		}

		if (operator.invert) {
			result = !this.isTruthy(result);
		}

		// The operator has been executed,
		// the result becomes the "A" value
		// and we're waiting for a new operator & "B" value
		a = result;
		operator = false;
		have_b_value = false;
	}

	return result;
});

/**
 * Get token value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.3.3
 *
 * @param    {Object}  token
 * @param    {Object}  vars     An object of variables
 */
Expression.setMethod(function getTokenValue(token, vars) {

	if (!token) {
		return;
	}

	if (typeof token.value != 'undefined') {
		return token.value;
	}

	if (token.variable) {
		let res = this.getTokenValuePart(token.variable, vars);
		return res;
	}

	if (token.call) {
		return this.callPathWithArgs(token.call, token.arguments, vars);
	}

	if (token.object) {
		return this.getObjectLiteralValue(token.object, vars);
	}

	if (token.array) {
		return this.getArrayLiteralValue(token.array, vars);
	}

	if (Array.isArray(token)) {
		return this.parseExpression(token, vars);
	}
});

/**
 * Get object literal values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.2
 *
 * @param    {Array}   entries   All the key-vals in an array
 * @param    {Object}  vars      An object of variables
 */
Expression.setMethod(function getObjectLiteralValue(entries, vars) {

	var result = {},
	    entry,
	    val,
	    i;

	for (i = 0; i < entries.length; i++) {
		entry = entries[i];

		val = this.parseExpression(entry.value, vars);

		Blast.Bound.Object.setPath(result, entry.key, val);
	}

	return result;
});

/**
 * Get array literal values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array}   entries   All the key-vals in an array
 * @param    {Object}  vars      An object of variables
 */
Expression.setMethod(function getArrayLiteralValue(entries, vars) {

	var result = [],
	    entry,
	    i;

	for (i = 0; i < entries.length; i++) {
		entry = entries[i];
		result.push(this.parseExpression(entry.value, vars));
	}

	return result;
});

/**
 * Get token value as an array
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.3
 * @version  2.1.4
 *
 * @param    {Object}  tokens
 * @param    {Object}  vars     An object of variables
 */
Expression.setMethod(function getTokenValuesArray(tokens, vars) {

	let result = [],
	    groups = [],
	    current,
	    token,
	    i;

	if (tokens == null) {
		tokens = this.options;
	}

	if (vars == null) {
		vars = this.vars;
	}

	for (i = 0; i < tokens.length; i++) {
		token = tokens[i];

		if (!current) {
			current = [];
			groups.push(current);
		}

		if (token.keyword == 'comma') {
			current = null;
			continue;
		}

		current.push(token);
	}

	for (i = 0; i < groups.length; i++) {
		result.push(this.getTokenValue(groups[i], vars));
	}

	return result;
});

/**
 * Get the arguments as an object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.4
 * @version  2.1.4
 *
 * @param    {String}  main_name   The "name" of the main argument
 * @param    {Object}  tokens
 * @param    {Object}  vars        An object of variables
 */
Expression.setMethod(function getArgumentObject(main_name, tokens, vars) {

	let args = this.getTokenValuesArray(tokens, vars);

	if (!args || !args.length) {
		return {};
	}

	let result;

	if (args[0] && typeof args[0] == 'object') {
		result = args[0];
	} else {
		if (args[1] && typeof args[1] == 'object') {
			result = args[1];
		}

		if (result[main_name] == null && args[0] != null) {
			result[main_name] = args[0];
		}
	}

	return result;
});

/**
 * Call the given variable with the given arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.3
 * @version  2.1.3
 *
 * @param    {Array}   path
 * @param    {Array}   args
 */
Expression.setMethod(function callPathWithArgs(path, args, vars) {

	var options = [this.view.helpers, this.view, Blast.Globals],
	    context,
	    result,
	    temp,
	    fnc,
	    i;

	if (vars) {
		options.unshift(vars);
	}

	if (path.length == 1) {
		for (i = 0; i < options.length; i++) {
			if (typeof options[i][path[0]] == 'function') {
				context = options[i];
				fnc = context[path[0]];
				break;
			}
		}
	} else {
		let class_path = path.slice(0, -1),
		    name = path[path.length - 1];

		// If the class_path is actually an array,
		// we didn't provide a path but an expression
		if (typeof class_path[0] == 'object') {

			temp = this.parseExpression(class_path, vars, true);

			if (temp == null) {
				return undefined;
			}
		}

		for (i = 0; i < options.length; i++) {

			// It's possible we already found the value
			if (i > 0 || temp == null) {
				temp = Obj.path(options[i], class_path);
			}

			if (temp != null && typeof temp[name] == 'function') {
				context = temp;
				fnc = context[name];
			}
		}
	}

	if (!context || !fnc) {
		return undefined;
	}

	args = this.getTokenValuesArray(args, vars);

	result = fnc.apply(context, args);

	return result;
});

/**
 * Get token part
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}  token
 * @param    {Object}  vars     An object of variables
 */
Expression.setMethod(function getTokenValuePart(obj, vars) {

	var result,
	    i;

	if (obj && obj.type) {
		result = obj.value;
	} else if (Array.isArray(obj)) {
		if (Array.isArray(obj[0])) {
			for (i = 0; i < obj.length; i++) {
				result = this.getTokenValuePart(obj[i], vars);

				if (result) {
					break;
				}
			}
		} else {
			result = this.getValueByPath(obj, vars);
		}
	}

	return result;
});

/**
 * Is the given variable truthy?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Mixed}   variable
 *
 * @return   {Boolean}
 */
Expression.setMethod(function isTruthy(variable) {

	var result = false;

	if (variable) {
		if (variable === true || variable.length) {
			result = true;
		} else if (typeof variable == 'object') {
			if (Array.isArray(variable) || typeof variable.length == 'number') {
				// Only truthy if array has values
				result = variable.length > 0;
			} else if (!Obj.isPlainObject(variable) || !Obj.isEmpty(variable)) {
				result = true;
			}
		} else {
			result = true;
		}
	}

	return result;
});

/**
 * Apply a "where" expression on a variable
 * (WARNING: The `With` expression uses a custom implementation)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Object}  where
 * @param    {*}       variable
 * @param    {String}  as
 *
 * @return   {*}
 */
Expression.setMethod(function applyWhere(where, variable, as, as_key) {

	let is_array,
	    result,
	    length,
	    keys,
	    vars,
	    temp,
	    i;

	if (variable) {
		length = variable.length;

		if (typeof length == 'number') {
			is_array = true;
		} else if (typeof variable == 'object') {
			length = Obj.size(variable);
		}
	}

	if (is_array) {
		result = [];
	} else {
		result = {};
	}

	if (is_array) {
		// The keys are numbers if it's an array
		keys = Bound.Array.range(length);
	} else if (!variable) {
		keys = [];
	} else {
		// Get the keys of the object
		keys = Object.keys(variable);
	}

	length = keys.length;

	for (i = 0; i < length; i++) {
		// Get the current variable
		temp = variable[keys[i]];

		// Create new variable object
		vars = {};

		vars[as] = temp;

		if (as_key) {
			vars[as_key] = keys[i];
		}

		// Parse the expression
		temp = this.parseExpression(where, vars);

		if (temp) {
			if (!Array.isArray(temp) || temp.length) {
				if (is_array) {
					result.push(variable[keys[i]]);
				} else {
					result[keys[i]] = variable[keys[i]];
				}
			}
		}
	}

	return result;
});