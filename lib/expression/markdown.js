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
 * @version  2.1.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Markdown.setStatic(function toCode(options) {

	let result,
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

			if (line.type == 'inside' && line.content.trim() == '/markdown') {
				break;
			}

			if (line.type == 'inside') {
				source += '{%' + line.content + '%}';
			} else {
				source += line.content;
			}
		}

		// Parse the contents as markdown
		let markdown = new Blast.Classes.Hawkejs.Markdown(source);
		html = markdown.start();

		// Only parse the HTML code (do not parse ejs or hwk syntax)
		let code = options.hawkejs.parseTemplateElements(html);

		code = '<% ' + options.hawkejs.addPrintCommands(code, true) + ' %>';

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

	if (config.transpose > 0) {
		let hash = Blast.Bound.String.multiply('#', config.transpose + 1);
		source = source.replace(/^#/gm, hash);
	}

	let result = Hawkejs.marked(source);

	this.view.print(result);
});