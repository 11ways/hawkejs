/**
 * The "Markdown" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Markdown = Hawkejs.Expression.getClass('Markdown');

// Markdown statements *can* have a body, but we'll handle it manually
Markdown.setHasBody(false);

/**
 * Add builder instructions
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.3.7
 *
 * @param    {Object}   options
 *
 * @return   {boolean}
 */
Markdown.setStatic(function toBuilder(options) {

	let args = options.tokens.getExpression();

	let result = {
		name : 'markdown',
		void : null,
	};

	if (args && args.length) {

		options.builder.openStatement(this.name, args, options);

		// Markdown statements with options don't have closing tags
		result.void = true;
	} else {

		let source_end = '',
		    content,
		    source = '',
		    html,
		    line,
		    i = options.line_index + 1;

		// The contents have also been parsed,
		// so put everything together in 1 big string
		for (; i < options.lines.length; i++) {
			line = options.lines[i];

			content = line.content || line.value;

			if ((line.type == 'expressions' || line.type == 'inside') && content.trim() == '/markdown') {
				source_end = line.source || '';
				break;
			}

			source += line.source;
		}

		options.builder.add({type: 'source', source: source + source_end});

		// Parse the contents as markdown
		let markdown = new Blast.Classes.Hawkejs.Markdown(Bound.String.dedent(source));
		html = markdown.start();

		options.builder.startGroup();

		// Only parse the HTML code (do not parse ejs or hwk syntax)
		let parser = new Hawkejs.Parser.Directives(html, {
			allow_code : false,
		});

		parser.build({
			builder      : options.builder,
			line_offset  : options.line_index,
		});

		options.builder.stopGroup();

		result.void = false;
		result.new_index = i + 1;
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