var Fn = Blast.Bound.Function,
    tokenize_options,
    forbidden;

tokenize_options = {
	blocks: {
		expressions : {
			open  : '{%',
			close : '%}'
		},
		code : {
			open  : '<%',
			close : '%>'
		}
	}
};

forbidden = {};
forbidden[Blast.HTML_TOKENIZER_STATES.STRING_S] = true;
forbidden[Blast.HTML_TOKENIZER_STATES.STRING_D] = true;

tokenize_options.blocks.expressions.forbidden = forbidden;
tokenize_options.blocks.code.forbidden = forbidden;

/**
 * Directive parser class:
 * Parses hawkejs directives
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {String|Array}   source
 */
var Dparser = Fn.inherits('Hawkejs.Parser.Token', function Directives(source) {

	if (!Array.isArray(source)) {
		source = Blast.Bound.String.tokenizeHTML(source, tokenize_options);
	}

	Directives.super.call(this, source);
});

/**
 * Convert the source to ejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {String}
 */
Dparser.setMethod(function convert() {

	var has_attributes,
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

	for (i = 0; i < grouped.length; i++) {
		entry = grouped[i];

		if (entry.type == 'open_tag') {
			result += '<% _print_element(' + JSON.stringify(entry.tag_name);

			has_attributes = !Blast.Bound.Object.isEmpty(entry.attributes);

			if (has_attributes || entry.directives) {
				result += ', {';

				if (has_attributes) {
					result += 'attributes: {';
					j = 0;

					for (key in entry.attributes) {
						attr = entry.attributes[key];
						val = attr.value;

						if (j) {
							result += ', ';
						}

						result += JSON.stringify(attr.name) + ': ';

						if (!val) {
							result += '""';
						} else {
							if (val.type == 'code') {
								result += val.value.slice(2, -2);
							} else {
								// Simple strings or identifier?
								result += val.value;
							}
						}

						j++;
					}

					result += '}';
				}

				if (entry.directives) {
					if (entry.attributes) {
						result += ', ';
					}

					result += 'directives: ' + JSON.stringify(entry.directives);
				}

				result += '}';
			}

			result += ') %>';
		} else if (entry.type == 'text' || entry.type == 'code' || entry.type == 'expressions') {
			result += entry.value;
		} else if (entry.type == 'close_tag') {
			result += '<% _close_element(' + JSON.stringify(entry.tag_name) + ') %>';
		}
	}

	return result;
});

/**
 * Parse next
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Dparser.setMethod(function parseCurrent() {

	var current = this.current,
	    result,
	    next = this.peek_next;

	if (!current) {
		return;
	}

	result = {};

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
				throw new SyntaxError('Could not find expected close bracket');
			}

			this.next();
		} else if (next.type == 'forward_slash') {

			// Set the index to the forward slash token
			this.index++;

			result.type = 'close_tag';
			result.tag_name = this.next().value;

			// The close bracket
			this.next();

			// Next to parse
			this.next();
		}
	} else if (current.type == 'text' || current.type == 'expressions' || current.type == 'code' || current.type == 'comment') {
		result = current;
		this.next();
	} else {
		throw new Error('Unable to handle "' + current.type + '" type');
	}

	return result;
});

/**
 * Parse attributes inside the current open tag
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   result
 */
Dparser.setMethod(function parseAttributes(result) {

	var next = this.next(),
	    entry,
	    temp;

	if (!result.attributes) {
		result.attributes = {};
	}

	while (next && (next.type == 'attribute' || next.type == 'directive_start')) {

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

		entry = {
			name : next.value
		};

		next = this.next();

		if (next.type == 'equals') {
			next = this.next();
			entry.value = next;
		} else {
			entry.value = '';

			// Negate the .next() call to follow
			this.index--;
		}

		result.attributes[entry.name] = entry;

		next = this.next();
	}
});