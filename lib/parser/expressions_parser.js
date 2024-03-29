const IN_LITERAL = Symbol('literal'),
      IN_ARGUMENTS = Symbol('arguments'),
      IN_OPTIONS = Symbol('options'),
      IN_PATH_EXPRESSION = Symbol('path_expression'),
      IN_EACH_EXPRESSION = Symbol('each_expression');

/**
 * Expressions parser class:
 * Parses hawkejs expressions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.9
 * @version  2.3.3
 *
 * @param    {String|Array}   source
 * @param    {Builder}        builder
 * @param    {Object}         config
 */
const Eparser = Fn.inherits('Hawkejs.Parser.Token', function Expressions(source, builder, config) {

	if (!Array.isArray(source)) {
		source = Hawkejs.tokenize(source, config);
	}

	this.builder = builder;

	Expressions.super.call(this, source);
});

/**
 * Parse a Hawkejs syntax block
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.6
 * @version  2.3.16
 *
 * @param    {Object|string}   line
 *
 * @return   {Object}
 */
Eparser.setStatic(function compileBlock(config) {

	let source;

	if (typeof config == 'string') {
		source = config;
		config = {};
	} else {
		source = config.line;
	}

	if (typeof source == 'object') {
		source = source.content;
	}

	let literal_count = 0,
	    all_tokens = Hawkejs.tokenize(source),
	    nl_count,
	    lines = [],
	    token,
	    line = [],
	    i;

	for (i = 0; i < all_tokens.length; i++) {
		token = all_tokens[i];

		// Keep track of object & array literals
		if (token.type == 'curly' || token.type == 'square') {
			if (token.value == '{' || token.value == '[') {
				literal_count++;
			} else if (token.value == '}' || token.value == ']') {
				literal_count--;
			}
		}

		if (token.type == 'whitespace') {

			// Only push non-starting whitespaces
			if (line.length) {
				line.push(token);
			}

			continue;

		} else if (token.value == ';') {

			if (line.length) {
				lines.push(line);
				line = [];
			}

			continue;
		}

		line.push(token);
	}

	if (line.length) {
		lines.push(line);
	}

	let current_index = config.index,
	    last_parsed,
	    line_config,
	    current = config.current,
	    result = config.result;

	for (i = 0; i < lines.length; i++) {
		line = lines[i];

		line_config = {
			current   : current,
			ejs_count : config.ejs_count,
			hawkejs   : config.hawkejs,
			index     : current_index,
			line      : line,
			lines     : config.lines,
			builder   : config.builder,
		};

		last_parsed = this.compileLine(line_config);

		current = last_parsed.current;

		current_index = last_parsed.index;
		result = last_parsed.result;
	}

	return {
		current : current,
		index   : current_index,
		result  : result,
	};
});

/**
 * Parse a single line
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.2
 * @version  2.3.3
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

	if (!Array.isArray(line)) {
		if (typeof line == 'object') {
			line = line.content;
		}

		line = line.trim();
	}

	// Tokenize the line
	let tokens = new Hawkejs.Parser.Expressions(line, config.builder, config);

	let line_index = config.index,
	    ejs_count = config.ejs_count,
	    wrap_ejs = config.wrap_ejs,
	    current = config.current,
	    options,
	    result = config.result || [],
	    added = false,
	    token,
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

		tokens.index = -1;
		token = tokens.next();

		if (token.value == '/') {
			token = tokens.next();
			type = token.value;
			close = true;
		} else {
			type = token.value;
			close = false;
		}

		token = tokens.next();

		options = {
			type       : type,
			close      : close,
			tokens     : tokens,
			source     : line,
			current    : current,
			wrap_ejs   : wrap_ejs,
			line_index : line_index,
			lines      : config.lines,
			hawkejs    : config.hawkejs,
			builder    : config.builder,
		};

		temp = Hawkejs.Expression[key].parse(options);

		if (temp !== false) {
			temp.parent = current;
			temp.options = options;

			// Are we closing a certain branch?
			if (temp.close || temp.name[0] == '/') {
				if (current) {

					// {% /if %} should actually close a {% else %} branch too
					let double_close = current.name == 'subkeyword';

					// Some branches do have bodies, so don't close those
					if (double_close && temp.name == 'subkeyword') {
						double_close = false;
					}

					// Is the current active "branch" actually
					// a closing branch (like {% /something %})?
					// If so, throw an error
					if (current.options.close) {
						throw new Error('A closing branch can not be the current active branch, but found: "' + current.options.source + '"');
					} else if (current.parent) {
						current = current.parent;
					}

					if (double_close && current.parent) {
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

		config.builder.add({
			type         : 'expression',
			wrap_method  : config.wrap_method,
			expression   : tokens.getExpression(),
		});

	}

	return {
		current : current,
		index   : line_index,
		result  : result,
	};
});

/**
 * Get variable definition
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.3.15
 *
 * @param    {Array}
 */
Eparser.setMethod(function getVariable(amount) {

	let next,
	    entry,
	    result   = [],
	    variable = [],
	    is_reference = false,
	    i = -1;

	while (this.index < this.length) {
		i++;
		entry = this.source[this.index];
		this.index++;

		if (i == 0 && entry.name == 'bitwise_and') {
			is_reference = true;
			continue;
		}

		if (entry.type == 'whitespace') {

			// Whitespace after earlier variable? Then we're done
			if (variable.length) {
				break;
			}

			continue;
		}

		if (entry.type == 'name' || entry.type == 'number') {
			variable.push(entry.value);
		} else if (entry.type == 'punct' && entry.value == '.') {
			continue;
		} else if (entry.type == 'square' && entry.value == '[') {
			let expr = this.getExpression(0, IN_PATH_EXPRESSION);
			variable.push(expr);
		} else {
			this.index--;
			break;
		}
	}

	if (variable.length) {
		if (is_reference && this.builder) {
			this.builder.seenReference(variable);
		}

		result.push({path: variable, is_reference});
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

		if (!token) {
			continue;
		}

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
 * Get an expression used in an each statement
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.3.19
 * @version  2.3.19
 *
 * @return   {Array}
 */
Eparser.setMethod(function getExpressionForEach() {
	return this.getExpression(0, IN_EACH_EXPRESSION);
});

/**
 * Get expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.3.19
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

		if (token.type == 'whitespace') {
			continue;
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

		if (state == IN_PATH_EXPRESSION && token.value == ']') {
			this.goToNext();
			break;
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

				if (token.name == 'bitwise_and') {
					break;
				}

				// Trying to call something on the value of the expression so far
				if (token.name === 'dot') {
					this.goToNext();

					let call_expression = this.getExpression(level + 1, state);

					let first = call_expression[0],
					    path;

					if (first.call) {
						path = first.call;
					} else if (first.variable) {
						path = first.variable;
					} else {
						throw new Error('Failed to find expression path');
					}

					if (path.path) {
						path = path.path;
					}

					path.unshift(result);
					result = call_expression;

					return result;
				}

				push('keyword', {keyword: token.name});
				continue;
		}

		let lower_value = token.value.toLowerCase();

		if (state === IN_EACH_EXPRESSION) {
			// If we only need to get the first part of an `each` expression,
			// ignore the 'as' or 'where' parts
			if (lower_value == 'as' || lower_value == 'where') {
				break;
			}
		}

		switch (lower_value) {
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
				push('keyword', {keyword: lower_value});
				continue;

			case 'starts':
			case 'ends':
				this.goToNext();
				this.current.keyword = true;
				push('keyword', {keyword: lower_value + ' with'});
				continue;
		}

		// Remember this index
		pre_variable_index = this.index;

		// Try getting a variable path
		variable = this.getVariable(1);

		if (variable && variable.path && variable.path.length) {

			let are_options = false;

			if (this.current && this.current.name == 'assign') {
				are_options = true;
			}

			if (are_options) {

				if (state == IN_OPTIONS) {
					this.index--;
					break;
				}

				this.index = pre_variable_index;

				let options = this.getExpressionOptions(level, state);

				if (result.length) {
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