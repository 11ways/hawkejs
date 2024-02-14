const Obj = Bound.Object,
      R = Hawkejs.Parser.Parser.rawString;

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
	this.setStatic('minimum_tokens', amount);
});

/**
 * Does this statement have a body?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
Expression.setStatic(function setHasBody(value) {
	this.setStatic('has_body', value);
});

/**
 * Does this statement have arguments?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
Expression.setStatic(function setHasArguments(value) {
	this.setStatic('has_arguments', value);
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
			(ExpressionConstructor.super || ExpressionConstructor.wrapper?.super).call(this, view);
		}));
	}

	return Classes.Hawkejs.Expression[name];
});

Hawkejs.Expression.getClass = Expression.getClass;

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Expression.setStatic(function parseArguments(options) {

	let result = options.tokens.getExpression();

	return result;
});

/**
 * Do the given pieces match this expression?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.1.6
 *
 * @param    {Object}   options
 *
 * @return   {Boolean}
 */
Expression.setStatic(function matches(options) {

	let result = this.type_name == options.type;

	if (result && options.close !== true) {

		let index = options.tokens.index;

		options.tokens.index = 0;

		let token = options.tokens.next();

		// If doing something like `block.name`,
		// then the `block` part is not an expression but a variable
		if (token && token.type == 'punct') {
			result = false;
		}

		if (result && this.minimum_tokens != null) {
			result = options.tokens.length >= this.minimum_tokens;
		}

		options.tokens.index = index;
	}

	return result;
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {Boolean|Object}
 */
Expression.setStatic(function parse(options) {

	if (!this.matches(options)) {
		return false;
	}

	let result;

	if (options.close) {
		result = this.toBuilderClose(options);
	} else {
		result = this.toBuilder(options);
	}

	if (!result) {
		return false;
	}

	if (result === true) {
		result = {
			name  : this.type_name,
			close : options.close,
			class : null,
		};
	} else {
		if (result.name == null) {
			result.name = this.type_name;
		}
	}

	result.class = this;

	if (this.has_body === false && result.void == null) {
		result.void = true;
	}

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
 * Add builder instructions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {boolean}
 */
Expression.setStatic(function toBuilder(options) {

	let args;

	if (this.has_arguments) {
		args = this.parseArguments(options);
	}

	options.statement = this;

	options.builder.addStatement(this.name, args, options);

	return true;
});

/**
 * Add builder close instructions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {boolean}
 */
Expression.setStatic(function toBuilderClose(options) {
	options.builder.closeStatement(this.name, null, options);
	return true;
});

/**
 * Add this expression's JavaScript code to the current subroutine
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Expression.setStatic(function toCode(builder, subroutine, entry) {

	let expression_args = Bound.Array.cast(entry.args),
	    args = [entry.name, expression_args, R('vars')];

	if (this.has_body !== false) {
		let sr_body = builder._createSubroutine(entry.function_body, ['_$expression']);
		builder._compileBody(sr_body, entry.function_body);
		subroutine.requires(sr_body);
		args.push(R(sr_body.name));
	}

	subroutine.appendCall('__render.startExpression', args, false);

	if (this.has_body === false) {
		this.toCloseCode(builder, subroutine, entry);
	}
});

/**
 * Return closing code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Builder}     builder
 * @param    {Hawkejs.Parser.Subroutine}  subroutine
 * @param    {Object}                     entry
 */
Expression.setStatic(function toCloseCode(builder, subroutine, entry) {
	subroutine.append(').close();');
});

/**
 * Get a value by its path
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.3.7
 *
 * @param    {Array}   path
 * @param    {Object}  variables
 */
Expression.setMethod(function getValueByPath(path, variables) {

	if (variables == null) {
		variables = this.vars;
	}

	if (path.path) {
		path = path.path;
	}

	if (!path || !path.length) {
		return;
	}

	variables = this.overlayElementVariables(variables, this.view.$0);

	let result = this._getValueByPath(path, variables, variables);

	// See if we need to look for helper values
	if (result === undefined) {
		result = this._getValueByPath(path, this.view.helpers, variables);
	}

	return result;
});


/**
 * Overlay element variables
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 *
 * @param    {Variables}    variables
 * @param    {HTMLElement}  element
 */
Expression.setMethod(function overlayElementVariables(variables, element) {

	if (!element) {
		return variables;
	}

	variables = Hawkejs.Variables.cast(variables, this.view);

	return this._overlayElementVariables(variables, element);
});

/**
 * Overlay element variables
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 *
 * @param    {Variables}    variables
 * @param    {HTMLElement}  element
 */
Expression.setMethod(function _overlayElementVariables(variables, element) {

	let parent = element.parentElement;

	if (parent) {
		variables = this._overlayElementVariables(variables, parent);
	}

	let element_vars = element[Hawkejs.VARIABLES];

	if (!element_vars) {
		return variables;
	}

	return variables.overlay(element_vars);
});

/**
 * Get a value by its path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @param    {Array}   path
 * @param    {Object}  variables
 */
Expression.setMethod(function _getValueByPath(path, variables, main_variables) {

	let current = variables,
	    piece,
	    i;

	for (i = 0; i < path.length; i++) {
		piece = path[i];

		if (typeof piece == 'object') {
			piece = this.parseExpression([piece], main_variables);

			if (i === 0) {
				current = piece;
				continue;
			}
		}

		current = current[piece];

		if (!current) {
			break;
		}
	}

	return current;
});

/**
 * Execute an expression function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.0
 * @version  2.2.0
 */
Expression.setMethod(function execExpressionFunction(fnc, vars) {

	if (!vars) {
		vars = this.vars;
	}

	this.view.execExpressionFunction(fnc, vars, this);
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.2.17
 *
 * @param    {Number}   levels
 */
Expression.setMethod(function breakOut(levels) {

	if (!levels) {
		levels = 1;
	}

	// Indicate this has been broken out of
	this.break = true;
	levels--;

	if (levels && this.parent) {
		this.parent.breakOut(levels);
	}
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

		if (!have_a_value && token.keyword != null) {
			switch (token.keyword) {
				case 'plus':
				case 'minus':
					have_a_value = true;
					a = 0;
					break;
			}
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
			a = result = this.callPathWithArgs([{value: a}].concat(token.call.path), token.arguments, vars);
		} else if (!operator) {

			if (token.variable) {
				let identifier;

				if (typeof token.variable.join == 'function') {
					identifier = token.variable.join('.');
				} else {
					identifier = token.variable;
				}

				throw new SyntaxError('Unexpected token: variable `' + identifier + '`');
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

	let result;

	if (typeof token.value != 'undefined') {
		result = token.value;
	}  else if (token.variable) {
		result = this.getTokenValuePart(token.variable, vars);
	} else if (token.call) {
		result = this.callPathWithArgs(token.call, token.arguments, vars);
	} else if (token.object) {
		result = this.getObjectLiteralValue(token.object, vars);
	} else if (token.array) {
		result = this.getArrayLiteralValue(token.array, vars);
	} else if (Array.isArray(token)) {
		result = this.parseExpression(token, vars);
	}

	return result;
});

/**
 * Set default values from an object literal
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.4
 * @version  2.2.4
 *
 * @param    {Array}   entries   All the key-vals in an array
 */
Expression.setMethod(function setDefaultFromObjectLiteralExpression(entries, vars) {

	let result = this.getObjectLiteralValue(entries, vars);

	for (let key in result) {
		if (this.vars[key] == null) {
			this.vars[key] = result[key];
		}
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
	    path,
	    val,
	    i;

	for (i = 0; i < entries.length; i++) {
		entry = entries[i];

		val = this.parseExpression(entry.value, vars);

		path = entry.key;

		if (typeof path == 'object') {
			path = path.path;
		}

		Blast.Bound.Object.setPath(result, path, val);
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
		} else {
			result = {};
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
 * @version  2.2.6
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

	// Path arrays can be wrapped in an object
	if (path.path) {
		path = path.path;
	}

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
				break;
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
 * @version  2.2.0
 *
 * @param    {Object}  token
 * @param    {Object}  vars     An object of variables
 */
Expression.setMethod(function getTokenValuePart(obj, vars) {

	if (!obj) {
		return;
	}

	let result;

	if (obj.type) {
		// It's a literal value definition
		result = obj.value;
	} else if (Array.isArray(obj)) {
		let i;

		// There are multiple possibilities, find the first non-falsy one
		for (i = 0; i < obj.length; i++) {
			result = this.getTokenValuePart(obj[i], vars);

			if (result) {
				break;
			}
		}
	} else if (obj.path) {
		// It's an actual variable with a path
		result = this.getValueByPath(obj.path, vars);
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