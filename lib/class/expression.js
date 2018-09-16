var Fn = Blast.Bound.Function;

/**
 * Base Hawkejs Expression class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Expression = Fn.inherits(null, 'Hawkejs.Expression', function Expression(view) {
	this.view = view;
});

/**
 * The type name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Expression.prepareStaticProperty(function type_name() {
	return Blast.Bound.String.underscore(this.name);
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

	if (!Blast.Classes.Hawkejs.Expression[name]) {
		Fn.inherits(parent, Fn.create(name, function ExpressionConstructor(view) {
			ExpressionConstructor.wrapper.super.call(this, view);
		}));
	}

	return Blast.Classes.Hawkejs.Expression[name];
});

/**
 * Do the given pieces match this expression?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {Boolean}
 */
Expression.setStatic(function matches(options) {
	return this.type_name == options.type;
});

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
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

	result.class = this;

	return result;
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
 * It has been closed
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Expression.setMethod(function close() {
	this.execute();
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
 * @version  1.2.9
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

	this.branches[name] = {
		pieces: pieces,
		fnc   : fnc
	};

	if (this['onBranch_' + name]) {
		this['onBranch_' + name](pieces, fnc);
	}

	return this;
});

/**
 * Some flow keywords
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Subkeyword = Expression.getClass('Subkeyword');

/**
 * Do the given pieces match this expression?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}
 */
Subkeyword.setStatic(function matches(options) {

	switch (options.type) {
		case 'multiple':
		case 'single':
		case 'none':
		case 'else':
		case 'all':
			return true;
	}

	return false;
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
Subkeyword.setStatic(function toCode(options) {

	var result,
	    name,
	    code;

	name = options.type;

	if (options.current.name == 'with' || options.current.name == 'while') {
		code = '<% _$expression';
	} else {
		code = '<% })';
	}

	code += '.branch("' + options.type + '", null, function subtemplate(vars) {';

	code += ' -%>';

	result = {
		name : name,
		code : code
	};

	return result;
});

/**
 * Return closing opening code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Subkeyword.setStatic(function toCloseCode(options) {
	var code = '<% }) /* /' + options.type + ' */ ';

	code += '; if (_$expression.break) return; -%>'

	return code;
});

/**
 * The "Macro" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Macro = Expression.getClass('Macro');

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

/**
 * The "Break" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Break = Expression.getClass('Break');

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
Break.setStatic(function toCode(options) {

	var result,
	    named,
	    code;

	code = '<% ';

	named = options.tokens.current();

	if (named) {
		named = named.value;

		if (named) {
			code += '_$expression.breakOut("' + named + '");';
		} else {
			code += '_$expression.breakOut()';
		}
	}

	code += ' return %>';

	result = {
		name : 'break',
		code : code,
		void : true
	};

	return result;
});

/**
 * The "Print" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Print = Expression.getClass('Print');

/**
 * Do the given pieces match this expression?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}
 */
Print.setStatic(function matches(options) {
	return (options.type == '=' || options.type == 'print');
});

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
Print.setStatic(function toCode(options) {

	var var_name,
	    tokens = options.tokens,
	    result,
	    param,
	    paths,
	    args,
	    arg,
	    i;

	result = '<% ';

	if (tokens.current().value == 'macro') {
		tokens.next();
		tokens.next();

		param = tokens.getVariable()[0].join('.');

		args = tokens.getArguments();

		if (args && args.length) {
			var_name = '_$macro_' + Date.now();
			result += var_name + ' = Object.create(vars);';

			for (i = 0; i < args.length; i++) {
				arg = args[i];
				result += var_name + '[' + JSON.stringify(arg.name) + ']';
				result += ' = ' + arg.value + ';';
			}
		} else {
			var_name = 'vars';
		}

		result += 'vars._$macros[' + JSON.stringify(param) + '](' + var_name + ')';
	} else {
		paths = options.tokens.getVariable()[0].join('.');
		result += 'print(' + paths + ')';
	}

	result += ' %>';

	return {
		name : 'print',
		code : result,
		void : true
	};
});

/**
 * The "With" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var With = Expression.getClass('With');

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
With.setStatic(function parseArguments(options) {

	var tokens = options.tokens,
	    result = {};

	// Get the variable to use
	result.variable = tokens.getVariable();

	// Go to the AS keyword
	tokens.goTo('as');
	tokens.next();

	result.as = tokens.getVariable(1)[0];

	if (tokens.goTo('where')) {
		tokens.next();
		result.where = tokens.getVariable(1);

		if (result.where) {
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
 * @version  1.2.9
 *
 * @param    {String}  name
 * @param    {Array}   pieces
 */
With.setMethod(function execute() {

	var variable,
	    target,
	    paths,
	    vars,
	    name,
	    temp,
	    i;

	// Get the possible paths
	paths = this.options.variable;

	for (i = 0; i < paths.length; i++) {
		// Get the variable
		variable = Blast.Bound.Object.path(this.vars, paths[i]);

		if (variable && variable.length) {
			break;
		}
	}

	// Do we need to filter the variable?
	if (this.options.where && variable && variable.length) {
		target = [];

		for (i = 0; i < variable.length; i++) {
			temp = Blast.Bound.Object.path(variable[i], this.options.where);

			if (temp) {
				if (!Array.isArray(temp) || temp.length) {
					target.push(variable[i]);
				}
			}
		}

		variable = target;
	}

	if (this.constructor.type_name == 'while' && (!variable || !variable.length)) {
		return;
	}

	this.variable = variable;

	// Initialize the contents
	this.fnc.call(this.view, this.vars, this);
});

/**
 * Prepare iteration vars
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
With.setMethod(function prepareVars() {

	var vars = Object.create(this.vars);

	vars._$each_as = this.options.as;
	vars._$each_var = this.variable;

	return vars;
});

/**
 * On the none branch
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
With.setMethod(function onBranch_none(options, fnc) {

	if (!this.variable || !this.variable.length) {
		fnc.call(this.view, this.vars);
	}

});

/**
 * On the all branch
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
With.setMethod(function onBranch_all(options, fnc) {

	var vars;

	if (!this.variable || !this.variable.length) {
		return;
	}

	vars = this.prepareVars();

	fnc.call(this.view, vars, this);
});

/**
 * On the "single" branch
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
With.setMethod(function onBranch_single(options, fnc) {

	var vars;

	if (!this.variable || this.variable.length != 1) {
		return;
	}

	vars = Object.create(this.vars);
	vars[this.options.as] = this.variable[0];

	fnc.call(this.view, vars, this);
});

/**
 * On the "multiple" branch
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}     options
 * @param    {Function}   fnc
 */
With.setMethod(function onBranch_multiple(options, fnc) {

	var vars;

	if (this.variable && this.variable.length > 1) {
		vars = this.prepareVars();
		fnc.call(this.view, vars, this);
	}
});

/**
 * The "While" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var While = Expression.getClass('With', 'While');

/**
 * The "Each" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Each = Expression.getClass('Each');

/**
 * Execute the code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {String}  name
 * @param    {Array}   pieces
 */
Each.setMethod(function execute() {

	var variable,
	    as_name,
	    vars,
	    i;

	if (this.options && this.options.variable) {
		variable = Blast.Bound.Object.path(this.vars, this.options.variable)
		as_name = this.options.as;
	} else {
		variable = this.vars._$each_var;
		as_name = this.vars._$each_as;
	}

	if (variable && variable.length) {
		for (i = 0; i < variable.length; i++) {
			vars = Object.create(this.vars);
			vars[as_name] = variable[i];
			this.fnc.call(this.view, vars);
		}
	} else if (this.branches && this.branches.else) {
		this.branches.else.fnc.call(this.view, this.vars);
	}

	return this;
});

/**
 * The "If" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var If = Expression.getClass('If');

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
If.setStatic(function parseArguments(options) {

	var result = parseExpression(options.tokens);

	return result;
});

/**
 * Execute the code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {String}  name
 * @param    {Array}   pieces
 */
If.setMethod(function execute() {

	var variable = parseArgs(this.options, this.vars),
	    vars,
	    i;

	if (variable && (variable === true || (variable.length == null || variable.length))) {
		this.fnc.call(this.view, this.vars);
	} else if (this.branches && this.branches.else) {
		this.branches.else.fnc.call(this.view, this.vars);
	}

	return this;
});

/**
 * The "Block" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Block = Expression.getClass('Block');

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Array}   pieces
 *
 * @return   {String}
 */
Block.setStatic(function toCode(options) {

	var result,
	    pieces = options.source.split(' ');

	options.pieces = pieces;
	options.block = pieces[1];

	result = '<% start(' + options.block + ') -%>';

	return result;
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
Block.setStatic(function toCloseCode(options) {
	return '<% end(' + options.current.options.block + ') -%>';
});

/**
 * Parse expressions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Tokens}   tokens
 *
 * @return   {Object}
 */
function parseExpression(tokens, need_left, need_right) {

	var result = {},
	    value = tokens.current_value,
	    got_right_token,
	    invert_next,
	    got_right,
	    group,
	    token,
	    vars;

	if (need_left == null) {
		need_left = true;
	}

	if (value == 'not') {
		result.inverse = true;
		tokens.next();
		value = tokens.current_value;
	}

	if (value == '(') {
		tokens.next();

		if (need_right) {
			group = parseExpression(tokens, false);
			return group;
		} else if (need_left) {
			group = parseExpression(tokens, false, false);

			if (!Blast.Bound.Object.isEmpty(group)) {
				result.left = group;
			}

		} else {
			group = parseExpression(tokens, false);
			result.group = group;
		}

	} else if (value == ')') {
		tokens.next();
		return result;
	}

	token = tokens.current();

	if (!token) {
		return result;
	}

	switch (token.value) {
		case 'and':
		case 'or':
			value = token.value;
			tokens.next();
			result[value] = parseExpression(tokens, false);
			break;
	}

	if (need_left === false && need_right === false) {
		return result;
	}

	if (!need_right && !result.left) {
		vars = tokens.getVariable(1);
		result.left = vars;
	}

	if (!vars) {
		switch (token.type) {
			case 'keyword':
				if (token.value != 'true' && token.value != 'false') {
					break;
				}

			case 'number':
			case 'string':
				token.value = JSON.parse(token.value);

				if (need_right) {
					result = token;
					got_right_token = true;
				} else {
					if (result.left) {
						result.right = token;
						got_right = true;
					} else {
						result.left = token;
						got_right = true;
					}
				}

				tokens.next();
				break;
		}
	}

	if (result.left) {
		token = tokens.current();

		if (!token) {
			return result;
		}

		if (token.type == 'whitespace') {
			tokens.next();
			token = tokens.current();
		}

		if (!token) {
			return result;
		}

		if (token.value == 'not') {
			invert_next = true;
			tokens.next();
			token = tokens.current();
		} else {
			invert_next = false;
		}

		switch (token.value) {
			case 'starts':
			case 'ends':
				tokens.next();
				result.operator = token.value + ' with';
				break;

			case 'emptyhtml':
			case 'empty':
			case 'neq':
			case 'eq':
				result.operator = token.value;
				break;
		}

		if (result.operator) {
			if (invert_next) {
				result.operator = 'not ' + result.operator;
			}

			tokens.next();
			result.right = parseExpression(tokens, false, true);
			got_right = true;
		}
	}

	if (tokens.current_value == ')') {
		tokens.next();
		return result;
	}

	if (!got_right && need_right && !got_right_token) {
		vars = tokens.getVariable(1);
		result = vars;
	}

	value = tokens.current_value;

	switch (value) {
		case 'or':
		case 'and':
			result = {group: result};
			value = tokens.current_value;
			tokens.next();
			result[value] = parseExpression(tokens, false);
			break;
	}

	return result;
}

function parseArgs(args, vars) {

	var left,
	    operator,
	    result,
	    right;

	if (Array.isArray(args)) {
		return getPart(args, vars);
	}

	if (args.group) {
		result = parseArgs(args.group, vars);

		if (!result && args.or) {
			result = parseArgs(args.or, vars);
		} else {

			if (args.and) {
				if (!result) {
					result = false;
				} else {
					result = parseArgs(args.and, vars);
				}
			}
		}

		if (args && args.inverse) {
			return !result;
		}

		return result;
	}

	left = getPart(args.left, vars);

	if (!left && args.or) {
		left = getPart(args.or, vars);
	}

	operator = args.operator;

	if (!operator) {
		if (args.inverse) {
			return !left;
		}

		return left;
	}

	right = getPart(args.right, vars);

	if (operator.slice(0,4) == 'not ') {
		args.inverse = !args.inverse;
		operator = operator.slice(4);
	}

	switch (operator) {
		case 'emptyhtml':
			if (!left) {
				result = true;
			} else {
				result = Blast.Bound.String.isEmptyWhitespaceHTML(left);
			}
			break;

		case 'empty':
			if (typeof left == 'string') {
				result = Blast.Bound.String.isEmptyWhitespace(left);
			} else {
				result = Blast.Bound.Object.isEmpty(left);
			}
			break;

		case 'ends with':
			result = Blast.Bound.String.endsWith(left, right);
			break;

		case 'starts with':
			result = left.indexOf(right) == 0;
			break;

		case 'neq':
			result = left != right;
			break;

		case 'eq':
			result = left == right;
			break;
	}

	if (args.inverse) {
		return !result;
	}

	return result;
}

function getPart(obj, vars) {

	var result,
	    i;

	if (obj && obj.type) {
		result = obj.value;
	} else if (Array.isArray(obj)) {
		if (Array.isArray(obj[0])) {
			for (i = 0; i < obj.length; i++) {
				result = getPart(obj[i], vars);

				if (result) {
					break;
				}
			}
		} else {
			result = Blast.Bound.Object.path(vars, obj);
		}
	} else if (obj && obj.group) {
		result = parseArgs(obj, vars);
	}

	return result;
}