var Fn = Blast.Bound.Function;

/**
 * Directive parser class:
 * Parses hawkejs directives
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {String|Array}   source
 */
var Dparser = Fn.inherits('Hawkejs.Parser.Token', function Directives(source) {

	if (!Array.isArray(source)) {
		source = Blast.Classes.Hawkejs.Parser.HtmlTokenizer.tokenize(source);
	}

	Directives.super.call(this, source);
});

/**
 * Convert the source to ejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @return   {String}
 */
Dparser.setMethod(function convert() {

	var grouped = [],
	    result = '',
	    entry,
	    attr,
	    val,
	    key,
	    i,
	    j;

	// Group the tokens
	while (!this.is_eof) {
		entry = this.parseCurrent();

		if (!entry) {
			break;
		}

		grouped.push(entry);
	}

	console.log('Grouped:', grouped);

	for (i = 0; i < grouped.length; i++) {
		entry = grouped[i];

		console.log('Entry:', i, entry);

		if (entry.type == 'open_tag') {
			result += '<% print_element_placeholder(' + JSON.stringify(entry.tag_name);

			if (entry.attributes) {
				result += ', {attributes: {';
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
						// String or code, whatever
						result += val.value;
					}

					j++;
				}

				result += '}}';
			}

			result += ') %>';
		} else if (entry.type == 'text') {
			result += entry.value;
		} else if (entry.type == 'close_tag') {
			result += '<% close_element_placeholder(' + JSON.stringify(entry.tag_name) + ') %>';
		}
	}

	return result;
});

/**
 * Parse next
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
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
	} else if (current.type == 'text') {
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
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {Object}   result
 */
Dparser.setMethod(function parseAttributes(result) {

	var next = this.next(),
	    entry;

	if (!result.attributes) {
		result.attributes = {};
	}

	while (next && next.type == 'attribute') {
		entry = {
			name : next.value
		};

		next = this.next();

		if (next.type == 'equals') {
			next = this.next();
			entry.value = next;
		} else {
			continue;
		}

		result.attributes[entry.name] = entry;

		next = this.next();
	}
});