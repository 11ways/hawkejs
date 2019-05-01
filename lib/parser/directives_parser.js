var tokenize_options,
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
//forbidden[Blast.HTML_TOKENIZER_STATES.STRING_S] = true;
//forbidden[Blast.HTML_TOKENIZER_STATES.STRING_D] = true;

tokenize_options.blocks.expressions.forbidden = forbidden;
tokenize_options.blocks.code.forbidden = forbidden;

/**
 * Directive parser class:
 * Parses hawkejs directives
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String|Array}   source
 * @param    {String}         name
 */
var Dparser = Fn.inherits('Hawkejs.Parser.Token', function Directives(source, name) {

	this.name = name;

	if (!Array.isArray(source)) {
		try {
			source = Bound.String.tokenizeHTML(source, tokenize_options);
		} catch (err) {
			let message = err.message,
			    new_err;

			if (name) {
				message += ' in ' + name;
			}

			new_err = new Error(message);
			new_err.stack = err.stack;

			throw new_err;
		}
	}

	console.log(source)

	Directives.super.call(this, source);
});

/**
 * Convert the source to ejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {String}
 */
Dparser.setMethod(function convert() {

	var has_attributes,
	    has_codes,
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
			result += '<% __render.printElement(' + JSON.stringify(entry.tag_name);

			has_attributes = !Bound.Object.isEmpty(entry.attributes);
			has_codes = !!entry.codes;

			if (has_attributes || entry.directives || has_codes) {
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
							if (val.type == 'string') {
								result += JSON.stringify(val.value);
							} else if (val.type == 'code') {
								result += val.value.slice(2, -2);
							} else if (val.type == 'concat') {
								let entry,
								    i;

								result += '[';

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

				if (has_codes) {
					if (entry.directives || entry.attributes) {
						result += ', ';
					}

					result += 'codes: [';

					for (i = 0; i < entry.codes.length; i++) {
						let token = entry.codes[i],
						    code = token.value;

						if (i) {
							result += ', ';
						}

						if (token.type == 'expressions') {
							code = Hawkejs.Hawkejs.prototype.parseSyntax(code, null, false);
						}

						if (code[2] == '=') {
							code = 'print(' + code.slice(3, -2) + ')';
						} else {
							code = code.slice(2, -2);
						}

						result += 'function(print, $0) {' + code + '}';
					}

					result += ']';
				}

				result += '}';
			}

			result += ') %>';
		} else if (entry.type == 'text' || entry.type == 'code' || entry.type == 'expressions') {
			result += entry.value;
		} else if (entry.type == 'close_tag') {
			result += '<% __render.closeElement(' + JSON.stringify(entry.tag_name) + ') %>';
		}
	}

	return result;
});

/**
 * Parse next
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
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
 * @since    2.0.0
 * @version  2.0.0
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

	while (next && (next.type == 'attribute' || next.type == 'directive_start' || next.type == 'code' || next.type == 'expressions')) {

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

		entry = {
			name : next.value
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

		result.attributes[entry.name] = entry;

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