var Fn = Blast.Bound.Function,
    INDEX = Symbol('index'),
    SUBSTR = Symbol('substr');

let patterns = {
	name       : /^!?[a-zA-Z_][\w:\-\.]*/,
	whitespace : /^\s+/,
	attribute  : /^[a-zA-Z_][\w:\-\.]*/,
	string     : [/^"(?:(?:\\\n|\\"|[^"\n]))*?"/, /^'(?:(?:\\\n|\\'|[^'\n]))*?'/],

	// Identifiers actually shouldn't start with a number, but we use it for attribute values
	identifier : /^[-_a-zA-Z0-9\u00A0-\u10FFFF]+/,
	varpath    : /^([a-zA-Z_\$][a-zA-Z_\$0-9]*\.?)*/
};


/**
 * Html Parser class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {String}   source
 */
var Parser = Fn.inherits('Hawkejs.Tokens', function HtmlParser(source) {
	this.source = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	this.result = [];

	this.index = 0;

	this.tokenize();
});

/**
 * Look at the next character
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Parser.setProperty(function peek_next() {
	return this.source[this.index + 1] || '';
});

/**
 * The text after the current index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Parser.setProperty(function index() {
	return this[INDEX];
}, function setIndex(index) {
	this[INDEX] = index;
	this[SUBSTR] = null;

	return index;
});

/**
 * The text after the current index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Parser.setProperty(function substring() {
	return this[SUBSTR] === null ? (this[SUBSTR] = this.source.substr(this.index)) : this[SUBSTR];
});

/**
 * Tokenize the input
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 */
Parser.setMethod(function tokenize() {

	do {
		this.parseNext();
	} while (!this.is_eof);

});

/**
 * Push a token
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {Object}   obj
 */
Parser.setMethod(function push(obj) {

	if (this.text_start != null) {
		this.result.push({
			type  : 'text',
			value : this.source.slice(this.text_start, this.text_end)
		});

		this.text_start = null;
		this.text_end = null;
	}

	this.result.push(obj);
});

/**
 * Parse the next item
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Parser.setMethod(function parseNext() {

	var handled = false,
	    peek;

	if (this.current == '<') {

		if (this.open_tag_name == 'script') {
			peek = this.peek(8).toLowerCase();

			if (peek == '</script') {
				this.parseCloseTag();
				handled = true;
			}
		} else {
			peek = this.peek(2);

			if (peek == '<%') {
				this.parseCode('%>');
				handled = true;
			} else if (peek == '</') {
				this.parseCloseTag();
				handled = true;
			} else if (peek == '<!' && this.peek(4) == '<!--') {
				this.parseComment();
				handled = true;
			} else if (this.peek_next.trim()) {
				// Valid opener?
				this.parseOpenTag();
				handled = true;
			}
		}
	} else if (this.current == '{') {
		if (this.peek_next == '%') {
			this.parseCode('%}');
			handled = true;
		}
	}

	if (!handled) {

		if (!this.text_start) {
			this.text_start = this.index;
		}

		this.index++;

		this.text_end = this.index;
	}

});

/**
 * Parse a code block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Parser.setMethod(function parseCode(close_str, type) {

	var start = this.index,
	    end = this.goTo(close_str);

	if (end === false) {
		end = this.length;
		this.index = this.length;
	} else {
		end = this.index + close_str.length;
		this.index = end;
	}

	this.push({
		type  : type || 'code',
		value : this.source.slice(start, end)
	});
});

/**
 * Parse a html comment
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Parser.setMethod(function parseComment() {
	this.parseCode('-->', 'comment');
});

/**
 * Parse an open tag
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Parser.setMethod(function parseOpenTag() {

	var tag_name;

	this.push({
		type  : 'open_bracket',
		value : '<'
	});

	this.index++;

	tag_name = this.readRegex(patterns.name);

	this.open_tag_name = tag_name;

	this.push({
		type  : 'tag_name',
		value : tag_name
	});

	if (this.testPatterns('whitespace')) {

		if (this.current == ':') {
			this.push({
				type  : 'directive_start',
				value : ':'
			});

			this.index++;

			this.testPatterns('varpath');
		}

		this.parseAttributes();
	}

	if (this.current == '/') {
		this.push({
			type  : 'forward_slash',
			value : '/'
		});

		this.index++;
	}

	if (this.current != '>') {
		throw new Error('Could not find closing bracket');
	}

	this.push({
		type  : 'close_bracket',
		value : '>'
	});

	this.index++;
});

/**
 * Parse a close tag
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Parser.setMethod(function parseCloseTag() {

	this.open_tag_name = null;

	this.push({
		type  : 'open_bracket',
		value : '<'
	});

	this.push({
		type  : 'forward_slash',
		value : '/'
	});

	this.index += 2;

	this.push({
		type  : 'tag_name',
		value : this.readRegex(patterns.name)
	});

	this.testPatterns('whitespace')

	if (this.current != '>') {
		throw new Error('Could not find closing bracket');
	}

	this.push({
		type  : 'close_bracket',
		value : '>'
	});

	this.index++;
});

/**
 * Parse tag contents
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @return   {Object}
 */
Parser.setMethod(function parseAttributes() {

	var last;

	do {
		last = this.index;

		this.testPatterns('whitespace');

		if (this.testPatterns('attribute')) {
			this.testPatterns('whitespace');

			if (this.current == '=') {
				this.push({
					type  : 'equals',
					value : '='
				});

				this.index++;

				this.testPatterns(['string', 'identifier']);
			}
		} else if (this.current == '<') {
			if (this.peek(2) == '<%') {
				return this.parseCode();
			} else {
				throw new SyntaxError('Invalid token "' + this.current + '"');
			}
		}

		if (this.current == '>') {
			break;
		}

		if (this.peek(2) == '/>') {
			break;
		}

	} while (this.index > last && !this.is_eof);

});

/**
 * Test patterns
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @return   {Object}
 */
Parser.setMethod(function testPatterns(types) {

	var selection,
	    result,
	    key,
	    i;

	if (!types) {
		selection = patterns;
	} else {
		selection = {};

		if (typeof types == 'string') {
			types = [types];
		}

		for (i = 0; i < types.length; i++) {
			key = types[i];
			selection[key] = patterns[key];
		}
	}

	for (key in selection) {
		result = this.readRegex(patterns[key]);

		if (result) {
			this.push({
				type  : key,
				value : result
			});

			return true;
		}
	}

	return false;
});

/**
 * Read regex
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {RegExp}   rx
 */
Parser.setMethod(function readRegex(rx) {

	var result,
	    i;

	if (Array.isArray(rx)) {
		for (i = 0; i < rx.length; i++) {
			result = this.readRegex(rx[i]);

			if (result.length) {
				break;
			}
		}

		return result;
	}

	if (!rx) {
		throw new Error('Invalid regex given');
	}

	result = (rx.exec(this.substring) || [''])[0];

	if (result.length) {
		this.index += result.length;
	}

	return result;
});

/**
 * Go to the given index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {Number|String}   command
 */
Parser.setMethod(function goTo(command) {

	if (typeof command == 'number') {
		this.index = command;
		return true;
	}

	let index = this.source.indexOf(command, this.index);

	if (index == -1) {
		return false;
	}

	this.index = index;
	return true;
});

/**
 * Get an amount of characters
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {Number}   count
 */
Parser.setMethod(function peek(count) {
	count = count || 1;
	return this.source.substr(this.index, count);
});

/**
 * Get an amount of characters
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {Number}   count
 */
Parser.setMethod(function read(count) {

	if (count === 0) {
		return '';
	}

	count = count || 1;

	let next = this.peek(count);
	this.index += count;

	if (this.index > this.length) {
		this.index = this.length;
	}

	return next;
});

/**
 * Convert the tokens
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @return   {String}
 */
Parser.setMethod(function convert() {

	var result = '';


	return this.source;
});