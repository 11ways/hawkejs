/**
 * The Subroutine class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
const Subroutine = Fn.inherits(null, 'Hawkejs.Parser', function Subroutine(hawkejs) {

	this.hawkejs = hawkejs;

	this.name = '';
	this.code = '';
	this.args = null;

	this.required_subroutines = new Set();
});

/**
 * Require another subroutine
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Subroutine}   subroutine
 */
Subroutine.setMethod(function requires(subroutine) {
	this.required_subroutines.add(subroutine);
});

/**
 * Get the compiled code of this subroutine
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
Subroutine.setMethod(function toString() {
	let result = 'function ' + this.name + '(';

	result += '__render, __template, vars, helper';

	if (this.args && this.args.length) {
		result += ', ' + this.args.join(', ');
	}

	result += ') {';

	result += '\n';
	result += this.code;
	result += '\n}\n';

	return result;
});

/**
 * Append code
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {string}   code
 */
Subroutine.setMethod(function append(code) {
	this.code += code;
});

/**
 * Add call
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {string}   path_to_method
 * @param    {Array}    args
 * @param    {boolean}  close
 */
Subroutine.setMethod(function appendCall(path_to_method, args, close) {

	this.append(path_to_method + '(');

	if (args && args.length) {
		let arg,
		    i;

		for (i = 0; i < args.length; i++) {
			arg = Hawkejs.Parser.Parser.uneval(args[i]);

			if (!arg) {
				arg = 'null';
			}

			if (i > 0) {
				arg = ',' + arg;
			}

			this.append(arg);
		}
	}

	if (close !== false) {
		this.append(');');
	}
});

/**
 * Append code that might need to be wrapped in a try block
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}    entry
 */
Subroutine.setMethod(function appendCode(entry) {

	let wrap_code = false,
	    code = entry.code;

	if (this.hawkejs.try_template_expressions) {

		// Make sure code blocks are complete
		if (Bound.String.count(code, '{') == Bound.String.count(code, '}')) {

			// Make sure opening braces come before closing ones
			// Equal sign is used when there are none, so they're both -1
			if (code.indexOf('{') <= code.indexOf('}')) {
				wrap_code = true;
			}
		}
	}

	code = this.hawkejs.rewriteVariableReferences(code);

	if (wrap_code) {
		code = 'try {\n' + '/*start_try_block*/' + '\n' + code + '/*end_try_block*/}\n' + 'catch (err) {';
		code += '__render.hawkejs.handleError(__render, __render.errName, __render.errLine, err);'
		code += '}';
	}

	this.append(code);
});

/**
 * See if we need to break
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.17
 * @version  2.2.17
 */
Subroutine.setMethod(function checkBreak() {
	this.append('if (typeof _$expression == "object" && _$expression.break) return;');
});