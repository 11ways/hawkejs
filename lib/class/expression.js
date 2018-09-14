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
Expression.setStatic(function getClass(name) {

	if (!Blast.Classes.Hawkejs.Expression[name]) {
		Fn.inherits('Hawkejs.Expression', Fn.create(name, function ExpressionConstructor(view) {
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

	code = '<% (this.startExpression("' + this.name + '", ';

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
	return '<% }).close()) -%>';
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

	if (!this.branches) {
		this.branches = {};
	}

	this.branches[name] = {
		pieces: pieces,
		fnc   : fnc
	};

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
		case 'singular':
		case 'plural':
		case 'none':
		case 'else':
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
	    name;

	name = options.type;

	if (options.current.name == 'with') {
		result = '<% _$expression';
	} else {
		result = '<% })';
	}

	result += '.branch("' + options.type + '", null, function subtemplate(vars) {';

	result += ' -%>';

	return {
		name : name,
		code : result
	};
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
	return '<% }) -%>';
});

/**
 * The "Snippet" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var Snippet = Expression.getClass('Snippet');

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
Snippet.setStatic(function toCode(options) {

	var tokens = options.tokens,
	    code,
	    name,
	    args,
	    arg,
	    i;

	name = tokens.getVariable(1)[0];

	code = '<% if (!vars.__snippets) { vars.__snippets = {} };';
	code += 'vars.__snippets[' + JSON.stringify(name) + '] = function(vars) {';

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
Snippet.setStatic(function toCloseCode(options) {
	return '<% } -%>';
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

	if (tokens.current().value == 'snippet') {
		tokens.next();
		tokens.next();

		param = tokens.getVariable()[0].join('.');

		args = tokens.getArguments();

		if (args && args.length) {
			var_name = '_$snippet_' + Date.now();
			result += var_name + ' = Object.create(vars);';

			for (i = 0; i < args.length; i++) {
				arg = args[i];
				result += var_name + '[' + JSON.stringify(arg.name) + ']';
				result += ' = ' + arg.value + ';';
			}
		} else {
			var_name = 'vars';
		}

		result += 'vars.__snippets[' + JSON.stringify(param) + '](' + var_name + ')';
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
	    paths,
	    vars,
	    name,
	    i;

	// Initialize the contents
	this.fnc.call(this.view, this.vars, this);

	// Get the possible paths
	paths = this.options.variable;

	for (i = 0; i < paths.length; i++) {
		// Get the variable
		variable = Blast.Bound.Object.path(this.vars, paths[i]);

		if (variable && variable.length) {
			break;
		}
	}

	if (!this.branches) {
		return;
	}

	if (!variable || !variable.length) {
		if (this.branches.none) {
			this.branches.none.fnc.call(this.view, this.vars);
		}
	} else if (variable) {
		vars = Object.create(this.vars);
		name = this.options.as;

		if (variable.length == 1) {
			if (this.branches.singular) {
				vars[name] = variable[0];
				this.branches.singular.fnc.call(this.view, vars, this);
			}
		} else {
			if (this.branches.plural) {
				vars._$each_as = name;
				vars._$each_var = variable;

				this.branches.plural.fnc.call(this.view, vars, this);
			}
		}
	}

});

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

	var variable = Blast.Bound.Object.path(this.vars, this.pieces[1]),
	    vars,
	    i;

	if (variable && variable.length) {
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