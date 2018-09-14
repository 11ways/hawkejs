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
 * Get the current item
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
Tokens.setMethod(function current() {
	return this.source[this.index];
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

	for (i = this.index; i < this.source.length; i++) {
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
		for (i = this.index; i < this.source.length; i++) {
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

	while (this.index < this.source.length) {
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
 * @param    {String}
 */
Tokens.setMethod(function getArguments() {

	var result = [],
	    current,
	    token;

	do {
		token = this.current();

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