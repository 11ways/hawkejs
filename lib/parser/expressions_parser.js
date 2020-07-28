var IN_LITERAL = Symbol('literal'),
    IN_ARGUMENTS = Symbol('arguments'),
    IN_OPTIONS = Symbol('options');

/**
 * Expressions parser class:
 * Parses hawkejs expressions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {String|Array}   source
 */
var Eparser = Fn.inherits('Hawkejs.Parser.Token', function Expressions(source) {

	if (!Array.isArray(source)) {
		source = Fn.tokenize(source, true);
	}

	Expressions.super.call(this, source);
});

/**
 * Parse a single line
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.2
 * @version  2.0.2
 *
 * @param    {String}   line
 *
 * @return   {Object}
 */
Eparser.setStatic(function compileLine(line) {

	let config;

	if (typeof line == 'string') {
		config = {};
	} else {
		config = line;
		line = config.line;
	}

	if (typeof line == 'object') {
		line = line.content;
	}

	line = line.trim();

	// Tokenize the line
	let tokens = new Hawkejs.Parser.Expressions(line);

	let line_index = config.index,
	    ejs_count = config.ejs_count,
	    wrap_ejs = config.wrap_ejs,
	    current = config.current,
	    options,
	    result = config.result || [],
	    added = false,
	    close,
	    type,
	    temp,
	    key;

	for (key in Hawkejs.Expression) {

		if (typeof Hawkejs.Expression[key] != 'function') {
			continue;
		}

		if (typeof Hawkejs.Expression[key].parse != 'function') {
			continue;
		}

		if (tokens.at(0).value == '/') {
			type = tokens.at(1).value;
			close = true;
			tokens.goTo(3);
		} else {
			type = tokens.at(0).value;
			tokens.goTo(2);
			close = false;
		}

		options = {
			type       : type,
			close      : close,
			tokens     : tokens,
			source     : line,
			current    : current,
			wrap_ejs   : wrap_ejs,
			line_index : line_index,
			lines      : config.lines,
			hawkejs    : config.hawkejs
		};

		temp = Hawkejs.Expression[key].parse(options);

		if (temp !== false) {
			temp.parent = current;
			temp.options = options;

			// Are we closing a certain branch?
			if (temp.close || temp.name[0] == '/') {
				if (current) {
					// Is the current active "branch" actually
					// a closing branch (like {% /something %})?
					// If so, throw an error
					if (current.options.close) {
						throw new Error('A closing branch can not be the current active branch, but found: "' + current.options.source + '"');
					} else if (current.parent) {
						current = current.parent;
					}
				}
			} else if (!temp.void) {
				// Only non-void tags are set current
				current = temp;
			}

			result.push(temp.code);
			added = true;

			// Has the index changed?
			// (Markdown blocks pull in stuff of their own)
			if (temp.new_index) {
				line_index = temp.new_index - 1;
			}

			break;
		}
	}

	if (!added) {
		tokens.index = 0;
		line = '__render.parseExpression(' + JSON.stringify(tokens.getExpression()) + ', vars)';

		if (config.wrap_method) {
			line = '__render.' + config.wrap_method + '(' + line + ')';
		}

		if (!ejs_count && wrap_ejs !== false) {
			line = '<% ' + line + ' %>';
		}

		result.push(line);
	}

	return {
		current : current,
		index   : line_index,
		result  : result,
	};
});

/**
 * Get variable
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Array}
 */
Eparser.setMethod(function getVariable(amount) {

	var entry,
	    result   = [],
	    variable = [];

	while (this.index < this.length) {
		entry = this.source[this.index];
		this.index++;

		if (entry.type == 'whitespace') {

			// Whitespace after earlier variable? Then we're done
			if (variable.length) {
				break;
			}

			continue;
		}

		if (entry.type == 'name') {
			variable.push(entry.value);
		} else if (entry.type == 'punct' && entry.value == '.') {
			continue;
		} else {
			this.index--;
			break;
		}
	}

	if (variable.length) {
		result.push(variable);
	}

	if (amount == 1) {
		return result[0];
	}

	return result;
});

/**
 * Get arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @return   {Array}
 */
Eparser.setMethod(function getArguments() {

	var result = [],
	    current,
	    token;

	do {
		token = this.current

		if (!token) {
			break;
		}

		if (token.type == 'name') {
			if (current) {
				result.push(current);
			}

			current = {
				name : token.value
			};
		} else if (token.name == 'assign') {
			token = this.next();

			current.value = token.value;
			result.push(current);
			current = null;
		}

		if (!this.next()) {
			break;
		}

	} while(true);

	if (current) {
		result.push(current);
	}

	return result;
});

/**
 * Get the array literal that has just started
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Object}
 */
Eparser.setMethod(function getArrayLiteral() {

	var was_comma,
	    result = [],
	    token,
	    key,
	    val;

	do {
		// Get the current token
		token = this.current;

		if (!token || (token.type == 'square' && token.value == ']')) {
			break;
		}

		if (token.name == 'comma') {
			val = [];
			was_comma = true;
			this.goToNext();
		} else {
			val = this.getExpression(0, IN_LITERAL);
			was_comma = false;
		}

		// Already get the next token
		token = this.current;

		// Don't push value for trailing commas!
		if (!was_comma || token.type != 'square') {
			result.push({value: val});
		}

		if (token.type == 'square' && token.value == ']') {
			break;
		}

		if (token.name != 'comma') {
			throw new Error('Expected `]` or `,` in array literal, but got `' + token.value + '`');
		}

	} while (this.goToNext());

	return result;

});

/**
 * Get the object literal that has just started
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Object}
 */
Eparser.setMethod(function getObjectLiteral() {

	var result = [],
	    token,
	    key,
	    val;

	do {
		// Get the current token
		token = this.current;

		if (!token) {
			break;
		}

		// Allow trailing comma's!
		if (token.type == 'curly' && token.value == '}') {
			break;
		}

		if (token.type != 'name') {
			throw new Error('Expected key name in object literal, got ' + token.type);
		}

		key = token.value;
		token = this.goToNext();

		if (token.name != 'colon') {
			throw new Error('Expected colon in object literal, got ' + token.type);
		}

		this.goToNext();
		val = this.getExpression(0, IN_LITERAL);

		result.push({key: key, value: val});

		token = this.current;

		if (token.type == 'curly' && token.value == '}') {
			break;
		}

		if (token.name != 'comma') {
			throw new Error('Expected `}` or `,` in object literal, but got `' + token.value + '`');
		}

	} while (this.goToNext());

	return result;
});

/**
 * Get expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.2
 *
 * @param    {Number}   level
 * @param    {Symbol}   state   Are we in some kind of literal ({}, [])
 *
 * @return   {Object}
 */
Eparser.setMethod(function getExpression(level, state) {

	var pre_variable_index,
	    variable_count = 0,
	    variable,
	    has_array,
	    result = [],
	    last_type,
	    token,
	    entry,
	    prev;

	if (level == null) {
		level = 0;
	}

	function push(type, data) {
		last_type = type;
		result.push(data);
	}

	do {
		// Get the current token
		token = this.current;

		if (!token) {
			break;
		}

		// Get the previous non-whitespace token
		prev = this.previous_token;
		entry = result[result.length - 1];

		// Get object literals
		if (token.value == '{') {
			this.goToNext();
			push('literal', {object: this.getObjectLiteral()});
			continue;
		}

		if (token.value == '[') {
			this.goToNext();
			push('literal', {array: this.getArrayLiteral()});
			continue;
		}

		if (token.value == '(') {

			if (prev && !prev.keyword && entry) {
				this.goToNext();

				entry.call = entry.variable;
				entry.arguments = this.getExpression(level + 1, IN_ARGUMENTS);
				entry.variable = undefined;
			} else {
				has_array = true;

				// New level
				this.goToNext();
				push('expression', this.getExpression(level + 1, state));
			}

			continue;
		} else if (token.value == ')') {
			// Level has ended
			break;
		}


		switch (token.type) {
			case 'number':
			case 'string':
				push('literal', {value: this.evaluateJsExpression(token.value)});
				continue;

			case 'keyword':
				if (token.value == 'true') {
					push('literal', {value: true});
				} else if (token.value == 'false') {
					push('literal', {value: false});
				} else if (token.value === null || token.value == 'null') {
					push('literal', {value: null});
				} else {
					push('keyword', {keyword: token.value});
				}
				continue;

			case 'punct':
				if (state === IN_LITERAL && token.name == 'comma') {
					return result;
				}

				// Trying to call something on the value of the expression so far
				if (token.name === 'dot') {
					this.goToNext();

					let call_expression = this.getExpression(level + 1, state);

					call_expression[0].call.unshift(result);
					result = call_expression;

					return result;
				}

				push('keyword', {keyword: token.name});
				continue;
		}

		switch (token.value) {
			case 'where':
			case 'neq':
			case 'eq':
			case 'emptyhtml':
			case 'empty':
			case 'or':
			case 'and':
			case 'not':
			case 'lt':
			case 'gt':
			case 'le':
			case 'ge':
				// Set the "keyword" property to true,
				// in case `previous_token` is used
				token.keyword = true;
				push('keyword', {keyword: token.value});
				continue;

			case 'starts':
			case 'ends':
				this.goToNext();
				this.current.keyword = true;
				push('keyword', {keyword: token.value + ' with'});
				continue;
		}

		// Remember this index
		pre_variable_index = this.index;

		// Try getting a variable path
		variable = this.getVariable(1);

		if (variable && variable.length) {

			let are_options = false;

			if (this.current && this.current.name == 'assign') {
				are_options = true;
			}

			if (are_options) {

				if (state == IN_OPTIONS) {
					this.index--;
					break;
				}

				// @TODO: This might break newline counts?
				this.index = pre_variable_index;

				let options = this.getExpressionOptions(level, state);

				if (variable_count) {
					push('keyword', {keyword: 'comma'});
				}

				push('options', options);
			} else {
				push('variable', {variable: variable});
				variable_count++;

				// The getVariable method also increased the index
				this.index--;
			}
		} else {
			break;
		}

	} while (this.goToNext());

	if (has_array && result.length == 1) {
		return result[0];
	}

	return result;
});

/**
 * Get expression options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.2
 * @version  2.0.2
 *
 * @param    {Number}   level
 * @param    {Symbol}   state   Are we in some kind of literal ({}, [])
 *
 * @return   {Object}
 */
Eparser.setMethod(function getExpressionOptions(level, state) {

	let result = [],
	    variable,
	    token,
	    expr;

	do {
		token = this.current;

		if (!token || token.type != 'name') {
			break;
		}

		variable = this.getVariable(1);

		token = this.current;

		if (token.name != 'assign') {
			throw new SyntaxError('Expected an `assign` token');
		}

		this.index++;

		token = this.current;

		if (!token || token.type == 'whitespace') {
			result.push({key: variable, value: null});
			continue;
		}

		expr = this.getExpression(level, IN_OPTIONS);

		// Make sure to turn empty expressions into null
		if (expr == null || expr.length == 0) {
			expr = null;
		}

		this.index--;

		result.push({key: variable, value: expr});
		//break
	} while (this.goToNext());

	return {object: result};
});

/**
 * Evaluate a JS expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   code
 *
 * @return   {Mixed}
 */
Eparser.setMethod(function evaluateJsExpression(code) {
	return eval('(' + code + ')');
});

/**
 * Look for a specific value in the tokens
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {String}   value
 * @param    {String}   type    Optional type
 *
 * @return   {Boolean}
 */
Eparser.setMethod(function hasValue(value, type) {

	var i;

	for (i = 0; i < this.length; i++) {
		if (type && this.source[i].type != type) {
			continue;
		}

		if (this.source[i].value == value) {
			return true;
		}
	}

	return false;
});