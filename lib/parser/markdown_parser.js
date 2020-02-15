/**
 * Markdown parser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
var Markdown = Fn.inherits('Hawkejs.Base', function Markdown(source) {
	this.source = source;
	Markdown.super.call(this, source);
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
});