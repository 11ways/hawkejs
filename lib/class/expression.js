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
 * Get the element name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Expression.constitute(function makeName() {
	this.type_name = Blast.Bound.String.underscore(this.name);
	this.close_name = '/' + this.type_name;
});

/**
 * Do the given pieces match this expression?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Expression.setStatic(function matches(pieces) {
	return this.name.toLowerCase() == pieces[0];
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
Expression.setStatic(function parse(pieces, current) {

	var instance;

	if (!this.matches) {
		return false;
	}

	if (!this.matches(pieces)) {
		return false;
	}

	return {
		name : this.name,
		code : '<% (this.startExpression("' + this.name + '", ' + JSON.stringify(pieces) + ', vars, function subtemplate(vars, _$expression) { -%>'
	};
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

	if (name.indexOf('/') == 0) {
		// Only the closer for the main expression (like /with for {% with %})
		// actually executes the block
		if (name == this.constructor.close_name) {
			this.execute();
		}
	} else {
		if (!this.branches) {
			this.branches = {};
		}

		this.branches[name] = {
			pieces: pieces,
			fnc   : fnc
		};
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
 */
Subkeyword.setStatic(function matches(pieces) {

	switch (pieces[0]) {
		case 'singular':
		case 'plural':
		case 'none':
		case 'else':
			return true;

		default:
			return pieces[0].indexOf('/') == 0;
	}

	return false;
});

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
Subkeyword.setStatic(function parse(pieces, current) {

	var result,
	    name;

	if (!this.matches(pieces)) {
		return false;
	}

	name = pieces[0];

	if (current.name == 'With' && name != '/with') {
		result = '<% _$expression';
	} else {
		result = '<% })';
	}

	result += '.branch("' + pieces[0] + '", ' + JSON.stringify(pieces);

	if (name[0] == '/') {
		if (name == '/snippet') {
			result = '<% };'
		} else if ('/' + current.name == name) {
			result += ');'
		} else {
			result += '));'
		}
	} else {
		result += ', function subtemplate(vars) {';
	}

	result += ' -%>';

	return {
		name : name,
		code : result
	};
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
 * @param    {Array}   pieces
 *
 * @return   {String}
 */
Snippet.setStatic(function parse(pieces) {

	var result;

	if (!this.matches(pieces)) {
		return false;
	}

	result = '<% if (!vars.__snippets) { vars.__snippets = {} } %>';
	result += '<% vars.__snippets[' + JSON.stringify(pieces[1]) + '] = function(vars) { %>';

	return {
		name : 'snippet',
		code : result
	}
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
Print.setStatic(function parse(pieces, current) {

	var result,
	    param;

	if (pieces[0] !== '=') {
		return false;
	}

	param = pieces[1];

	result = '<% ';

	if (param.indexOf('snippet:') == 0) {
		param = param.slice(8);
		result += 'vars.__snippets[' + JSON.stringify(param) + '](vars)';
	} else {
		result += 'print(' + param + ')';
	}

	result += ' -%>';

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
	    vars,
	    name,
	    i;

	// Initialize the contents
	this.fnc.call(this.view, this.vars, this);

	// Get the variable
	variable = Blast.Bound.Object.path(this.vars, this.pieces[1]);

	if (!this.branches) {
		return;
	}

	if (!variable || !variable.length) {
		if (this.branches.none) {
			this.branches.none.fnc.call(this.view, this.vars);
		}
	} else if (variable) {
		vars = Object.create(this.vars);
		name = this.pieces[3];

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

	if (this.pieces[1]) {
		variable = Blast.Bound.Object.path(this.vars, this.pieces[1])
		as_name = this.pieces[3];
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
