var Fn = Blast.Bound.Function;

/**
 * Tokens class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {String|Array}   source
 */
var Tokens = Fn.inherits(null, 'Hawkejs.Tokens', function Tokens(source) {

	if (!Array.isArray(source)) {
		source = Fn.tokenize(source, true);
	}

	this.source = source;
	this.index = 0;
});

/**
 * Get the length of the source
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 */
Tokens.setProperty(function length() {
	return this.source.length;
});

/**
 * Get the current value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Tokens.setProperty(function current_value() {

	var token = this.current;

	if (!token) {
		return null;
	}

	return token.value;
});

/**
 * Get the current item
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.3.2
 */
Tokens.setProperty(function current() {
	return this.source[this.index];
});

/**
 * Have we reached the end?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Tokens.setProperty(function is_eof() {
	return this.index >= this.length;
});

/**
 * Get specific entry
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Number}   index
 */
Tokens.setMethod(function at(index) {
	return this.source[index];
});

/**
 * Go to the next non-whitespace value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Tokens.setMethod(function goToNext() {
	return this.next();
});

/**
 * Go to the next non-whitespace value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Tokens.setMethod(function next() {

	var entry,
	    i;

	this.index++;

	for (i = this.index; i < this.length; i++) {
		entry = this.source[i];

		if (entry.type == 'whitespace') {
			// Ignore
		} else {
			this.index = i;
			return this.source[this.index];
		}
	}

	return false;
});

/**
 * Go to the given index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Number|String}   command
 */
Tokens.setMethod(function goTo(command) {

	var entry,
	    i;

	if (typeof command == 'number') {
		this.index = command;
		return true;
	} else {
		for (i = this.index; i < this.length; i++) {
			entry = this.source[i];

			if (entry.value == command || entry.name == command) {
				this.index = i;
				return true;
			}
		}
	}

	return false;
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
Tokens.setMethod(function getVariable(amount) {

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
Tokens.setMethod(function getArguments() {

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
 * @version  1.3.3
 *
 * @param    {Number}   level
 *
 * @return   {Object}
 */
Tokens.setMethod(function getExpression(level) {

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

		prev = this.source[this.index - 1];
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
				result.push({value: JSON.parse(token.value)});
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
				result.push({keyword: token.value});
				continue;

			case 'starts':
			case 'ends':
				this.goToNext();
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
Tokens.setMethod(function hasValue(value, type) {

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