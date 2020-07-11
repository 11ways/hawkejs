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
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Markdown.setStatic(function toCode(options) {

	var source = '',
	    html,
	    line,
	    i = options.line_index + 1;

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

	let markdown = new Blast.Classes.Hawkejs.Markdown(source);

	html = markdown.start();

	console.log('_______')
	console.log(html)

	let code = options.hawkejs.interpretTemplate(html, 'md_int', '"md_int"');

	console.log('CODE:', code);

	let result = {
		name      : 'markdown',
		code      : '<% ' + code + ' %>',
		new_index : i + 1
	};

	console.log('MD toCode:', options);
	console.log('Source:', source)

	return result;
});

/**
 * Return closing code for use in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Markdown.setStatic(function toCloseCode(options) {
	console.log('MD toClose:', options)
});