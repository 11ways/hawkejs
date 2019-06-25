/**
 * Scopes are used during compiling
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Scopes = Fn.inherits(null, 'Hawkejs', function Scopes() {

	// The actual array of scopes
	this.scopes = [];

	// How many curls are open?
	this.open_curls = 0;

	// Are we expecting a function token?
	this.expecting_function = false;

	// Is a function opening?
	this.opening_function = false;

	// Are we waiting for the opening argument parens?
	this.opening_arguments = false;

	// Is a parenthesis open?
	this.open_parens = 0;

	// Are we declaring something?
	this.declaring = '';

	// Is a for-loop opening?
	this.opening_for = false;

	// Are we waiting for the for loop parens?
	this.opening_for_parens = false;

	// For vars
	this.for_vars_queue = null;
});

/**
 * The current scope
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Scopes.setProperty(function current_scope() {
	return this.scopes[this.scopes.length - 1];
});

/**
 * The current function scope
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Scopes.setProperty(function current_function_scope() {

	var scope,
	    i;

	for (i = this.scopes.length - 1; i >= 0; i--) {
		scope = this.scopes[i];

		if (scope.type == 'function') {
			return scope;
		}
	}
});

/**
 * Add a specific scope
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}  type
 * @param    {Array}   vars
 */
Scopes.setMethod(function addScope(type, vars) {

	var scope = {
		type       : type || 'default',
		vars       : vars || [],
		open_curls : this.open_curls
	};

	this.scopes.push(scope);

	if (this.for_vars_queue && this.for_vars_queue.length) {
		let i;

		for (i = 0; i < this.for_vars_queue.length; i++) {
			scope.vars.push(this.for_vars_queue[i]);
		}

		this.for_vars_queue = null;
	}
});

/**
 * Close the current scope
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Scopes.setMethod(function closeScope() {
	var scope = this.scopes.pop();
});

/**
 * Rename variable references
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array}   vars
 */
Scopes.setMethod(function addFunctionScope(vars) {
	this.addScope('function', vars);
});

/**
 * Register a `var` variable
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Scopes.setMethod(function registerVar(name) {
	this.current_function_scope.vars.push(name);
});

/**
 * Register a `let` variable
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Scopes.setMethod(function registerLet(name) {
	if (this.for_vars_queue) {
		this.for_vars_queue.push(name);
	} else {
		this.current_scope.vars.push(name);
	}
});

/**
 * Register a `const` variable
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Scopes.setMethod(function registerConst(name) {
	if (this.for_vars_queue) {
		this.for_vars_queue.push(name);
	} else {
		this.current_scope.vars.push(name);
	}
});

/**
 * Register a declaration
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Scopes.setMethod(function registerDeclaration(name) {

	switch (this.declaring) {
		case 'var':
			return this.registerVar(name);

		case 'let':
			return this.registerLet(name);

		case 'const':
			return this.registerConst(name);
	}

});

/**
 * Is the given name declared in this scope?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Scopes.setMethod(function isDeclared(name) {

	var scope,
	    i;

	// A let or const inside the parens of a for should be seen as declared
	if (this.opening_for && this.for_vars_queue) {
		if (this.for_vars_queue.indexOf(name) > -1) {
			return true;
		}
	}

	for (i = 0; i < this.scopes.length; i++) {
		scope = this.scopes[i];

		if (scope.vars && scope.vars.length && scope.vars.indexOf(name) > -1) {
			return true;
		}
	}

	return false;
});

/**
 * Should the given name be ignored?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Scopes.setMethod(function shouldIgnoreName(name) {

	if (this.isDeclared(name)) {
		return true;
	}

	if (name == 'console') {
		return true;
	}

	if (typeof Blast.Classes[name] !== 'undefined') {
		return true;
	}
});

/**
 * Register token value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   token
 */
Scopes.setMethod(function processToken(token) {

	var needs_processing = true,
	    value = token.value,
	    type = token.type,
	    name = token.name;

	if (type == 'whitespace') {
		return;
	}

	if (type == 'curly') {
		if (value === '{') {
			this.open_curls++;

			if (this.expecting_function) {
				this.addFunctionScope();
			} else {
				this.addScope();
			}

			return;

		} else if (value === '}') {
			this.open_curls--;
			this.closeScope();
			return;
		}
	}

	if (type == 'keyword') {
		if (value === 'function' || value == 'catch') {
			// "catch" scopes aren't functions, but it'll work
			this.opening_function = true;
			return;
		}
	}

	if (this.opening_function) {
		if (type == 'name') {

			if (!this.opening_arguments) {
				this.current_scope.name = value;
			}

			this.registerVar(value);
			return;
		}

		if (type == 'parens') {
			if (value == ')') {
				this.opening_function = false;
				this.expecting_function = false;
				this.opening_arguments = false;
			} else {
				this.opening_arguments = true;
			}

			return;
		}
	}

	if (type == 'parens') {
		if (value == '(') {
			this.open_parens++;

			if (this.opening_for) {
				this.opening_for_parens = true;
				this.for_vars_queue = [];
			}
		} else {
			this.open_parens--;

			if (this.opening_for) {
				this.opening_for_parens = false;
			}
		}
	}

	if (this.declaring) {
		if (type == 'name') {
			this.registerDeclaration(value);
			return;
		}

		if (name == 'comma' || name == 'assign' || !name) {
			return;
		}

		if (name == 'semicolon') {
			this.declaring = false;
			return;
		}
	}

	if (type == 'keyword') {

		// In case a for does not have a block attached to it
		if (this.opening_for && !this.opening_for_parens) {
			this.opening_for = false;
		}

		if (value == 'var' || value == 'let' || value == 'const') {
			this.declaring = value;
			return;
		} else {
			this.declaring = false;

			if (value == 'for') {
				this.opening_for = true;
				return;
			}
		}
	}

	return token;
});
