/**
 * The "Markdown" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
var Markdown = Hawkejs.Expression.getClass('Markdown');

/**
 * Parse the given line if it matches
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Markdown.setStatic(function toCode(options) {

	let content,
	    result,
	    args = options.tokens.getExpression();

	if (args && args.length) {

		result = '<% (__render.startExpression("' + this.name + '", ';

		if (args && typeof args == 'object') {
			result += JSON.stringify(args);
		} else {
			result += args;
		}

		result += ', vars).close()) -%>';

		result = {
			name : 'markdown',
			code : result,
			void : true
		};

	} else {
		let source = '',
		    html,
		    line,
		    i = options.line_index + 1;

		// The contents have also been parsed,
		// so put everything together in 1 big string
		for (; i < options.lines.length; i++) {
			line = options.lines[i];

			content = line.content || line.value;

			if ((line.type == 'expressions' || line.type == 'inside') && content.trim() == '/markdown') {
				break;
			}

			source += line.source;
		}

		// Parse the contents as markdown
		let markdown = new Blast.Classes.Hawkejs.Markdown(Blast.Bound.String.dedent(source));
		html = markdown.start();

		// Only parse the HTML code (do not parse ejs or hwk syntax)
		let code = options.hawkejs.parseTemplateElements(html, {allow_code: false});

		result = {
			name      : 'markdown',
			code      : code,
			new_index : i + 1,
		};
	}

	return result;
});

/**
 * Execute the code for variable-based markdown
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.1.4
 */
Markdown.setMethod(function execute() {

	let config = this.getArgumentObject('source'),
	    source = config.source;

	if (!source) {
		return;
	}

	if (config.transpose) {
		let transpose = parseInt(config.transpose);

		if (transpose != 0) {
			source = source.replace(/^(#+)(\s+\S)/gm, (match, hashes, rest) => {

				let amount = 0;

				if (transpose > 0) {
					while (amount < transpose) {
						if (hashes.length >= 6) {
							break;
						}

						amount++;
						hashes += '#';
					}
				} else if (transpose < 0) {
					while (amount > transpose) {
						if (hashes.length == 1) {
							break;
						}

						amount--;
						hashes = hashes.slice(1);
					}
				}

				return hashes + rest;
			});
		}
	}

	let result = Hawkejs.marked(source);

	this.view.print(result);
});