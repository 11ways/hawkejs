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

	var result = '';

	//while (!this.is_eof) {

	//}

	return result;
});