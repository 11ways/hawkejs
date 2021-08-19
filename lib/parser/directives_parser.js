var tokenize_options,
    forbidden;

tokenize_options = {
	blocks: [
		{
			name  : 'expressions',
			open  : '{%',
			close : '%}',
			strip_delimiter : true,
		},
		{
			name  : 'code',
			open  : '<%',
			close : '%>'
		},
		{
			name  : 'comment',
			open  : '{#',
			close : '#}'
		},
		{
			name      : 'safeprint',
			open      : '{{',
			close     : '}}',
			multiline : false
		}
	]
};

/**
 * Directive parser class:
 * Parses hawkejs directives
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String|Array}   source
 * @param    {Object}         options
 */
var Dparser = Fn.inherits('Hawkejs.Parser.Token', function Directives(source, options) {

	if (typeof options == 'string') {
		options = {name: options};
	}

	if (!options) {
		options = {};
	}

	this.name = options.name;
	this.hawkejs = options.hawkejs;
	this.allow_code = options.allow_code;

	let _tokenize_options;

	if (this.allow_code === false) {
		_tokenize_options = {};
	} else {
		_tokenize_options = tokenize_options;
	}

	if (!Array.isArray(source)) {
		try {
			source = Bound.String.tokenizeHTML(source, _tokenize_options);
		} catch (err) {
			let message = err.message,
			    new_err;

			if (this.name) {
				message += ' in ' + this.name;
			}

			new_err = new Error(message);
			new_err.stack = err.stack;

			throw new_err;
		}
	}

	Directives.super.call(this, source);
});

/**
 * Compile an array of attribute values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array}   values
 *
 * @return   {String}
 */
Dparser.setMethod(function compileDirectiveValues(values) {

	var result = '[',
	    value,
	    i;

	for (i = 0; i < values.length; i++) {
		value = values[i];

		if (i > 0) {
			result += ', ';
		}

		result += '{name: ' + JSON.stringify(value.name) + ', ';

		if (value.context) {
			result += 'context: ' + JSON.stringify(value.context) + ', ';
		}

		if (value.method) {
			result += 'method: ' + JSON.stringify(value.method) + ', ';
		}

		result += 'value: ' + this.compileAttributeValue(value.value) + '}';
	}

	result += ']';

	return result;
});

/**
 * Compile the given attribute value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {String}
 */
Dparser.setMethod(function compileAttributeValue(val) {

	var result;

	if (!val) {
		result = '""';
	} else {
		if (val.type == 'string') {
			result = JSON.stringify(val.value);
		} else if (val.type == 'code') {
			result = val.value.slice(2, -2);
		} else if (val.type == 'concat') {
			let entry,
			    i;

			result = '[';

			for (i = 0; i < val.value.length; i++) {
				entry = val.value[i];

				if (i) {
					result += ', ';
				}

				if (entry.type == 'expressions') {
					result += entry.value;
				} else if (entry.type == 'code') {
					let code;

					if (entry.value[2] == '=') {
						code = entry.value.slice(3, -2);
					} else {
						code = entry.value.slice(2, -2);
					}

					if (code.indexOf('print(') > -1) {
						code = '__render.returnPrint(function(print){' + code + '})';
					}

					result += code;
				} else {
					result += JSON.stringify(entry.value);
				}
			}

			result += "].join('')"

		} else {
			// Simple strings or identifier?
			result = val.value;
		}
	}

	return result;
});

/**
 * Convert the source to ejs
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.1.6
 *
 * @return   {String}
 */
Dparser.setMethod(function convert() {

	var has_attributes,
	    has_codes,
	    current,
	    grouped = [],
	    result = '',
	    entry,
	    attr,
	    val,
	    key,
	    i,
	    j;

	this.grouped = grouped;

	// Group the tokens
	while (!this.is_eof) {
		entry = this.parseCurrent();

		if (!entry) {
			break;
		}

		grouped.push(entry);
	}

	let current_hawkejs_tag,
	    add_end_line;

	current = new Classes.Develry.StringBuilder();
	current.push = current.append;

	for (i = 0; i < grouped.length; i++) {
		entry = grouped[i];

		current.append('<%/*source_line_nr:' + entry.line_start + ':start*/%>');
		add_end_line = true;

		if (entry.type == 'open_tag') {

			current.append('<% __render.setState("PE"); __render.printElement(' + JSON.stringify(entry.tag_name));

			has_attributes = !Bound.Object.isEmpty(entry.attributes);
			has_codes = !!entry.codes;

			if (has_attributes || entry.directives || entry.properties || entry.variables || has_codes) {
				current.append(', {');

				if (has_attributes) {
					current.append('attributes: {');
					j = 0;

					for (key in entry.attributes) {
						attr = entry.attributes[key];
						val = attr.value;

						if (j) {
							current.append(', ');
						}

						current.append(JSON.stringify(attr.name) + ': ');
						current.append(this.compileAttributeValue(val));

						j++;
					}

					current.append('}');
				}

				if (entry.directives) {
					if (has_attributes) {
						current.append(', ');
					}

					current.append('directives: ');
					current.append(this.compileDirectiveValues(entry.directives));
				}

				if (entry.properties) {
					if (has_attributes || entry.directives) {
						current.append(', ');
					}

					current.append('properties: ');
					current.append(this.compileDirectiveValues(entry.properties));
				}

				if (entry.variables) {
					if (has_attributes || entry.directives || entry.properties) {
						current.append(', ');
					}

					current.append('variables: ');
					current.append(this.compileDirectiveValues(entry.variables));
				}

				if (has_codes) {
					if (entry.directives || entry.properties || entry.variables || has_attributes) {
						current.append(', ');
					}

					current.append('codes: [');

					for (j = 0; j < entry.codes.length; j++) {
						let token = entry.codes[j],
						    code = token.value;

						if (j) {
							current.append(', ');
						}

						if (token.type == 'expressions') {
							code = Hawkejs.Hawkejs.prototype.parseTemplateSyntax(code);
						}

						if (code[2] == '=') {
							code = 'print(' + code.slice(3, -2) + ')';
						} else {
							code = code.slice(2, -2);
						}

						current.append('function(print, $0) {' + code + '}');
					}

					current.append(']');
				}

				current.append('}');
			}

			current.append(');');

			current.append('__render.setState(null); %>');

		} else if (entry.type == 'text' || entry.type == 'code') {
			current.append(entry.value);
		} else if (entry.type == 'expressions') {

			let config = {
				current : current_hawkejs_tag,
				index   : i,
				lines   : grouped,
				line    : entry.value,
				result  : current,
				hawkejs : this.hawkejs,
			};

			let compiled = Hawkejs.Parser.Expressions.compileBlock(config);

			i = compiled.index;
			current_hawkejs_tag = compiled.current;

			add_end_line = false;

			let last_compiled_entry = grouped[i];

			if (last_compiled_entry) {
				current.append('<%/*source_line_nr:' + last_compiled_entry.line_end + ':end*/%>');
			}

		} else if (entry.type == 'close_tag') {

			current.append('<% __render.closeElement(' + JSON.stringify(entry.tag_name) + ')');

			if (entry.newlines_skipped) {
				current.append(Bound.String.multiply("\n", entry.newlines_skipped));
			}

			current.append(' %>');
		} else if (entry.type == 'comment') {
			// Remove the comment, but keep newlines (for error reporting)
			let newlines = Bound.String.count(entry.value, "\n");

			if (newlines) {
				current.append(Bound.String.multiply("\n", newlines));
			}
		} else if (entry.type == 'safeprint') {

			let compiled = Hawkejs.Parser.Expressions.compileLine({
				line        : entry.value.slice(2, -2),
				wrap_method : 'printSafe',
			});

			current.append(compiled.result.join(''));

		} else {
			throw new Error('Failed to parse the hawkejs source of type "' + entry.type + '": ' + entry.value)
		}

		if (add_end_line) {
			current.append('<%/*source_line_nr:' + entry.line_end + ':end*/%>');
		}
	}

	result = current.toString();

	return result;
});

/**
 * Parse next
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.6
 */
Dparser.setMethod(function parseCurrent() {

	var current = this.current,
	    result,
	    next = this.peek_next;

	if (!current) {
		return;
	}

	result = {
		// The type of token
		type         : '',

		// Where the source code started & ended
		line_start   : current.line_start,
		line_end     : 0,

		// How many newlines were in the source
		newlines     : 0,

		// The actual source code
		source       : '',
	};

	let start = this.index;

	if (current.type == 'open_bracket' && next) {
		if (next.type == 'tag_name') {
			result.type = 'open_tag';
			result.tag_name = this.next().value;

			this.parseAttributes(result);

			// Ignore self-closing tags
			if (this.current.type == 'forward_slash') {
				this.next();
			}

			if (this.current.type != 'close_bracket') {
				let msg = 'Could not find expected close bracket';

				if (this.name) {
					msg += '\nin ' + this.name + ', ';
				} else {
					msg += '\n';
				}

				msg += 'found "' + this.current.type + '" type instead';

				throw new SyntaxError(msg);
			}

			this.next();
		} else if (next.type == 'forward_slash') {

			// Set the index to the forward slash token
			this.index++;

			result.type = 'close_tag';
			result.tag_name = this.next().value;

			// Skip to the close bracket
			this.goTo('>');

			// Next to parse
			this.next();
		}
	} else if (current.type == 'text' || current.type == 'expressions' || current.type == 'code' || current.type == 'comment' || current.type == 'safeprint') {

		result.source = current.source;
		result.type = current.type;
		result.value = current.value;

		this.next();
	} else {
		throw new Error('Unable to handle "' + current.type + '" type');
	}

	result.source = this.sliceSource(start, this.index);

	if (current.type == 'expressions') {
		result.source = '{%' + result.source + '%}';
	}

	let previous = this.source[this.index - 1];

	result.line_end = previous.line_end;
	result.newlines = result.line_end - result.line_start;

	return result;
});

/**
 * Parse attributes inside the current open tag
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.5
 *
 * @param    {Object}   result
 */
Dparser.setMethod(function parseAttributes(result) {

	var next = this.next(),
	    entry,
	    temp,
	    char,
	    name;

	if (!result.attributes) {
		result.attributes = {};
	}

	while (next && (next.type == 'attribute' || next.type == 'code' || next.type == 'expressions')) {

		if (next.type == 'directive_start') {
			if (!result.directives) {
				result.directives = [];
			}

			next = this.next();

			if (next.type != 'varpath') {
				throw new SyntaxError('Invalid directive name given');
			}

			temp = next.value.split('.');

			if (temp.length == 1) {
				result.directives.push({
					context : temp[0]
				});
			} else {
				result.directives.push({
					context : temp.slice(0, -1),
					method  : temp[temp.length - 1]
				});
			}

			next = this.next();

			continue;
		}

		if (next.type == 'code' || next.type == 'expressions') {

			if (!result.codes) {
				result.codes = [];
			}

			result.codes.push(next);
			next = this.next();
			continue;
		}

		char = next.value[0];
		name = next.value;

		if (char === '!' || char === '#' || char === '+') {
			name = next.value.slice(1);
		}

		entry = {
			name  : name,
			value : null
		};

		next = this.next();


		if (next.type == 'equals') {
			//next = this.next();
			//entry.value = next;
			entry.value = this.parseAttributeValue();
		} else {
			entry.value = '';

			// Negate the .next() call to follow
			this.index--;
		}

		if (char === '!') {
			if (!result.directives) {
				result.directives = [];
			}

			let pieces = name.split('#'),
			    context = pieces[0],
			    method  = pieces[1];

			entry.context = context.split('.');

			if (method) {
				entry.method = method;
			}

			result.directives.push(entry);
		} else if (char === '#') {
			if (!result.properties) {
				result.properties = [];
			}

			result.properties.push(entry);
		} else if (char === '+') {

			if (!result.variables) {
				result.variables = [];
			}

			result.variables.push(entry);
		} else {
			result.attributes[entry.name] = entry;
		}

		next = this.next();
	}

	// Take all the skipped newlines, we'll add these later
	result.newlines_skipped = this.newlines_skipped;
	this.newlines_skipped = 0;
});

/**
 * Parse an attribute value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Object}
 */
Dparser.setMethod(function parseAttributeValue() {

	var next = this.next();

	if (next.type == 'expressions') {
		return next;
	} else if (next.type == 'code') {
		return next;
	} else if (next.type == 'identifier') {
		return {type: 'string', value: next.value};
	}

	if (next.type != 'string_open') {
		throw new Error('Expected a string_open, but got "' + next.type + '"');
	}

	next = this.next();

	let pieces = [],
	    result;

	while (next) {
		if (next.type == 'string_close') {
			break;
		}

		pieces.push(next);
		next = this.next();
	}

	if (pieces.length == 1) {
		return pieces[0];
	}

	return {type: 'concat', value: pieces};
});