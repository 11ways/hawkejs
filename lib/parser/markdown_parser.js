/**
 * Markdown parser
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 */
var Markdown = Fn.inherits('Hawkejs.Parser', function Markdown(source) {
	this.source = source;
	Markdown.super.call(this, source);
});

/**
 * Are we currently at the start of a new line?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Markdown.setProperty(function start_of_line() {

	if (this.index > 0) {
		if (this.source[this.index - 1] != '\n') {
			return false;
		}
	}

	return true;
});

/**
 * Are we currently at the end of a line?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Markdown.setProperty(function end_of_line() {

	if (this.is_eof || this.source[this.index + 1] == '\n') {
		return true;
	}

	return false;
});

/**
 * Go to the next value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Markdown.setMethod(function next() {
	this.index++;
	return this.current;
});

/**
 * Convert
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Markdown.setMethod(function start() {

	// Try something with https://github.com/developit/snarkdown/blob/master/src/index.js ?

	//return Hawkejs.marked(this.source);

	console.log('START', this)

	let text_data,
	    result = [],
	    parsed,
	    Rule,
	    name;

	while (!this.is_eof) {

		console.log('Parsing', this.current)


		for (name in Hawkejs.Markdown) {

			if (name == 'Rule') continue;

			Rule = Hawkejs.Markdown[name];

			if (typeof Rule != 'function' || !Rule.matches) {
				continue;
			}

			console.log('Testing', name, Rule)

			if (parsed = Rule.parse(this)) {
				console.log(name, 'matches!', parsed);
				break;
			}
		}

		if (parsed) {
			text_data = null;
			result.push(parsed);
		} else {
			if (!text_data) {
				text_data = {text: ''};
				result.push(text_data);
			}

			text_data.text += this.current;
		}

		this.next();

	}

	console.log('Result:', result)
});