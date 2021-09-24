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
	],
	skip_empty_custom_tokens: true,
};

/**
 * Directive parser class:
 * Parses hawkejs directives
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.1
 *
 * @param    {String|Array}   source
 * @param    {Object}         options
 */
const Dparser = Fn.inherits('Hawkejs.Parser.Token', function Directives(source, options) {

	if (typeof options == 'string') {
		options = {name: options};
	}

	if (!options) {
		options = {};
	}

	this.name = options.template_name;
	this.hawkejs = options.hawkejs;
	this.allow_code = options.allow_code;
	this.options = options;

	let _tokenize_options;

	if (this.allow_code === false) {
		_tokenize_options = {
			skip_empty_custom_tokens: true,
		};
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
 * Is only HTML allowed?
 * (Parsing can be more lenient in that case)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.1
 * @version  2.2.1
 *
 * @type     {boolean}
 */
Dparser.setProperty(function only_html_allowed() {

	if (this.options) {
		return this.options.html_only;
	}

	return false;
});

/**
 * Build the template
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.1
 *
 * @param    {Object}   options
 *
 * @return   {Hawkejs.Parser.Builder}
 */
Dparser.setMethod(function build(options) {

	let current_hawkejs_statement,
	    line_offset = 0,
	    reset_trim,
	    builder,
	    grouped = [],
	    do_trim = false,
	    entry,
	    i;

	if (options) {
		builder = options.builder;
		line_offset = options.line_offset || 0;
	}

	if (!builder) {
		builder = new Hawkejs.Parser.Builder(this.hawkejs);
		builder.template_name = this.name;
	}

	if (!builder.directives_parser) {
		builder.directives_parser = this;
	}

	while (!this.is_eof) {
		entry = this.parseCurrent();

		if (!entry) {
			break;
		}

		grouped.push(entry);
	}

	for (i = 0; i < grouped.length; i++) {
		entry = grouped[i];
		reset_trim = true;

		if (line_offset) {
			if (entry.line_start != null) {
				entry.line_start += line_offset;
			}

			if (entry.line_end != null) {
				entry.line_end += line_offset;
			}
		}

		if (entry.type == 'open_tag') {
			builder.addElement(entry);
		} else if (entry.type == 'close_tag') {
			builder.closeElement(entry);
		} else if (entry.type == 'text') {

			// No need to print empty strings
			if (entry.value == '') {
				continue;
			}

			if (!do_trim || (do_trim && entry.value.trim())) {
				builder.add(entry);
			}
		} else if (entry.type == 'code') {

			let to;

			// The closing `%>` token is technically optional,
			// so make sure we don't cut of actual code
			if (entry.value.slice(-2) == '%>') {
				to = -2;
			}

			let code = entry.value.slice(2, to);

			if (code.slice(-1) == '-') {
				do_trim = true;
				reset_trim = false;
				code = code.slice(0, -1);
			}

			if (code[0] == '=') {
				builder.add({type: 'print', code: code.slice(1)}, entry);
			} else {
				builder.add({type: 'ejs', code}, entry);
			}
		} else if (entry.type == 'expressions') {

			let config = {
				current : current_hawkejs_statement,
				index   : i,
				lines   : grouped,
				line    : entry.value,
				hawkejs : this.hawkejs,
				builder : builder,
			};

			let compiled = Hawkejs.Parser.Expressions.compileBlock(config);

			i = compiled.index;
			current_hawkejs_statement = compiled.current;

		} else if (entry.type == 'safeprint') {

			let compiled = Hawkejs.Parser.Expressions.compileLine({
				line        : entry.value.slice(2, -2),
				wrap_method : 'printSafe',
				builder     : builder,
			});

		} else if (entry.type == 'comment') {
			// Ignore comments
		} else {
			throw new Error('Failed to parse the hawkejs source of type "' + entry.type + '": ' + entry.value)
		}

		if (reset_trim) {
			do_trim = false;
		}
	}


	return builder;
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