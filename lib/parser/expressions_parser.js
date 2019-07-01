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
 * Get expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 *
 * @param    {Number}   level
 *
 * @return   {Object}
 */
Eparser.setMethod(function getExpression(level) {

	var variable,
	    has_array,
	    result = [],
	    token,
	    entry,
	    prev;

	if (level == null) {
		level = 0;
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

		if (token.value == '(') {

			if (prev && !prev.keyword && entry) {
				this.goToNext();

				entry.call = entry.variable;
				entry.arguments = this.getExpression(level + 1);
				entry.variable = undefined;
			} else {
				has_array = true;

				// New level
				this.goToNext();
				result.push(this.getExpression(level + 1));
			}

			continue;
		} else if (token.value == ')') {
			// Level has ended
			break;
		}

		switch (token.type) {
			case 'number':
			case 'string':
				result.push({value: this.evaluateJsExpression(token.value)});
				continue;

			case 'keyword':
				if (token.value == 'true') {
					result.push({value: true});
				} else if (token.value == 'false') {
					result.push({value: false});
				} else {
					result.push({keyword: token.value});
				}
				continue;

			case 'punct':
				result.push({keyword: token.name});
				continue;
		}

		switch (token.value) {
			case 'neq':
			case 'eq':
			case 'emptyhtml':
			case 'empty':
			case 'or':
			case 'and':
			case 'not':
			case 'lt':
			case 'gt':
				// Set the "keyword" property to true,
				// in case `previous_token` is used
				token.keyword = true;
				result.push({keyword: token.value});
				continue;

			case 'starts':
			case 'ends':
				this.goToNext();
				this.current.keyword = true;
				result.push({keyword: token.value + ' with'});
				continue;
		}

		variable = this.getVariable(1);

		if (variable && variable.length) {
			result.push({variable: variable});

			// The getVariable method also increased the index
			this.index--;
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