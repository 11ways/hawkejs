const R = Hawkejs.Parser.Parser.rawString;

/**
 * The builder class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
const Builder = Fn.inherits(null, 'Hawkejs.Parser', function Builder(hawkejs) {

	this.hawkejs = hawkejs;

	this.functions = [];
	this.current = null;
	this.root = this.createFunctionBody('root');

	this.template_name = null;

	// Properties used during compilation
	this._functions_to_compile = null;
	this._root_subroutine = null;
});

/**
 * Create a new function
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
Builder.setMethod(function createFunctionBody(type, info) {

	let entry = {
		id        : this.functions.length,
		parent    : this.current,
		content   : [],
		type      : type,
		info      : info || null,
		name      : null,
	};

	if (type == 'root') {
		entry.name = 'compiledView';
	} else {
		entry.name = 'cpv_' + type + '_';

		if (info) {
			entry.name += Bound.String.slug(info, '_') + '_';
		}

		entry.name += entry.id;
	}

	this.functions.push(entry);

	this.current = entry;

	return entry;
});

/**
 * Close the current function
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 */
Builder.setMethod(function closeFunction() {
	this.current = this.current.parent;
});

/**
 * Add 
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.2
 * @version  2.1.6
 *
 * @param    {Object}   entry
 */
Builder.setMethod(function add(entry, original_entry) {

	if (original_entry) {
		entry.line_start = original_entry.line_start;
		entry.line_end = original_entry.line_end;
	}

	this.current.content.push(entry);
});

/**
 * Open a statement, but do not add a body
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {string}   name
 * @param    {Array}    args
 * @param    {Object}   options   The original parser options
 *
 * @return   {Object}
 */
Builder.setMethod(function openStatement(name, args, options) {

	let entry = {
		type          : 'open_statement',
		name          : name,
		args          : args,
		function_body : null,
	};

	this.add(entry);

	return entry;
});

/**
 * Add a statement
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {string}   name
 * @param    {Array}    args
 * @param    {Object}   options   The original parser options
 *
 * @return   {Object}
 */
Builder.setMethod(function addStatement(name, args, options) {

	let entry = this.openStatement(name, args, options);

	if (!options.statement || options.statement.has_body !== false) {
		this.createFunctionBody('statement', name);
		entry.function_body = this.current;
	}

	return entry;
});

/**
 * Close overlapping element bodies
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 */
Builder.setMethod(function closeOverlappingElementBodies() {

	let current = this.current,
	    result = false;

	do {

		// In most cases, it is allowed that statements open an element without
		// closing it. For example: {% if true %}<p>{% /if %}`
		// If that is the case, the element should be marked as such
		if (current.type == 'element') {
			current.entry.has_overlapping_statements = true;
			current = current.parent;
			result = true;
			continue;
		}

		break;
	} while (current);

	if (result) {
		this.current = current;
	}

	return result;
});

/**
 * Close a statement
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 */
Builder.setMethod(function closeStatement(name, args, options) {

	let current = this.current;

	do {

		// In most cases, it is allowed that statements open an element without
		// closing it. For example: {% if true %}<p>{% /if %}`
		// If that is the case, the element should be marked as such
		if (current.type == 'element') {
			current.entry.has_overlapping_statements = true;
			current = current.parent;
			continue;
		}

		// We'll assume a close statement is allowed for any branch
		if (current.type == 'branch') {
			current = current.parent;
			break;
		}

		if (current.type == 'statement') {

			if (current.info != name) {
				throw new SyntaxError('Tried to close "' + name + '" statement, but found "' + current.info + '"');
			}

			current = current.parent;
			break;
		}

		break;

	} while (current);

	this.current = current;

	this.add({type: 'close_statement', name});
});

/**
 * Add a statement branch
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {string}   name
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Builder.setMethod(function addBranch(name, options = {}) {

	let entry = {
		type           : 'open_branch',

		// The name of the branch
		name           : name,

		// Certain arguments this branch might require
		args           : options.args,

		// The name of the statement being branched of
		statement_name : options.statement_name,

		// Void branches have no closing tag
		is_void        : options.is_void,

		// Nested branches don't close the main statement
		is_nested      : options.is_nested,

		function_body  : null,
	};

	this.closeOverlappingElementBodies();

	// Non-nested branches actually end the main statement
	// For example: in an {% if %}{% else %}{% /if %},
	// the `else`` branch closes the main `if` statement,
	// and `/if` closes the `else` branch
	if (!options.is_nested) {
		this.closeFunction();
	}

	this.add(entry);

	this.createFunctionBody('branch', name);

	entry.function_body = this.current;

	return entry;
});

/**
 * Close a statement branch
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {string}   name
 *
 * @return   {Object}
 */
Builder.setMethod(function closeBranch(name) {

	this.closeOverlappingElementBodies();

	this.closeFunction();

	this.add({type: 'close_branch', name});
});

/**
 * Add an error
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {string}   message
 * @param    {Object}   entry
 */
Builder.setMethod(function addError(type, message, entry) {
	this.add({
		type    : 'error',
		error   : type,
		message : message,
	});
});

/**
 * Get the current block or element (whichever comes first)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @return   {*}
 */
Builder.setMethod(function getCurrentBlockOrElement() {

	let current = this.current,
	    result;

	while (current) {

		if (current.type == 'element') {
			result = current;
			break;
		}

		current = current.parent;
	}

	return result;
});

/**
 * A reference has been seen
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Array}   path
 */
Builder.setMethod(function seenReference(path) {

	let current = this.getCurrentBlockOrElement();

	if (!current) {
		console.log('Failed to find block or element for reference: ' + path.join('.'));
		return;
	}

	current.entry.create_separate_subroutine = true;

});

/**
 * Open a new element tag
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   entry
 */
Builder.setMethod(function addElement(entry) {

	let node_name = entry.tag_name.toUpperCase();

	// @TODO: If elements should get separate subroutines
	// (like in the case of reference variables maybe?)
	// this should be changed to true later in the code!
	entry.create_separate_subroutine = false;

	this.current.content.push(entry);

	if (Hawkejs.Hawkejs.VOID_ELEMENTS[node_name]) {
		return;
	}

	this.createFunctionBody('element', node_name);

	entry.function_body = this.current;
	this.current.entry = entry;
});

/**
 * Close an element tag
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   entry
 */
Builder.setMethod(function closeElement(entry) {

	let node_name = entry.tag_name.toUpperCase();

	if (this.current.type != 'element') {
		// Overlapping element/statements can in theory be allowed
	} else if (this.current.info != node_name) {

		if (Hawkejs.Hawkejs.VOID_ELEMENTS[node_name]) {
			// Ignore closing void tags
			return
		} else {
			let message = 'Tried to close ' + node_name + ', but found ' + this.current.info + ' instead';
			this.addError('html', message, entry);
		}
	}

	let close_tag = this.current.content.length == 0;

	if (!close_tag && (!this.current.entry || !this.current.entry.create_separate_subroutine)) {
		close_tag = true;
	}

	if (this.current.type == 'element') {
		this.current = this.current.parent;
	}

	if (close_tag) {
		this.add({type: 'close_tag', name: node_name});
	}

});

/**
 * Create the code
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @return   {string}
 */
Builder.setMethod(function toCode() {

	this._subroutines = [];
	this._functions_to_compile = new Map();
	this._root_subroutine = this._createSubroutine(this.root);

	this._compileBody(this._root_subroutine, this.root);

	let functions = {},
	    result = '',
	    header = '',
	    sr;

	for (sr of this._subroutines) {
		functions[sr.name] = R(sr.name);
		result += '\n\n';
		result += sr.toString();
	}

	result = '(' + Hawkejs.Parser.Parser.uneval(functions) + ');\n' + result;

	return result;
});

/**
 * Create a subroutine, but do not process the contents yet
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   body
 * @param    {Array}    args
 *
 * @return   {Hawkejs.Parser.Subroutine}
 */
Builder.setMethod(function _createSubroutine(body, args) {

	let subroutine = new Hawkejs.Parser.Subroutine(this.hawkejs);

	subroutine.name = body.name;
	subroutine.args = args;

	this._subroutines.push(subroutine);

	return subroutine;
});

/**
 * Compile a body
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Subroutine}   subroutine
 * @param    {Object}                      body
 */
Builder.setMethod(function _compileBody(subroutine, body) {

	let entry;

	for (entry of body.content) {
		this._compileEntry(subroutine, entry);
	}

});

/**
 * Compile to string builder
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Hawkejs.Parser.Subroutine}   subroutine
 * @param    {Object}                      entry
 */
Builder.setMethod(function _compileEntry(subroutine, entry) {

	if (entry.line_start != null) {
		subroutine.append('\n');
		subroutine.append('/*source_line_nr:' + entry.line_start + ':start*/');
		subroutine.append('\n');
		subroutine.appendCall('__render.setErr', [this.template_name, entry.line_start]);
	}

	subroutine.append('\n');

	if (entry.type == 'text') {
		subroutine.appendCall('__render.printUnsafe', [entry.value]);
	} else if (entry.type == 'open_tag') {

		let args = [entry.tag_name];

		let options = this._compileElementOptions(entry);

		let create_separate_subroutine = entry.create_separate_subroutine;

		if (create_separate_subroutine && entry.function_body && entry.function_body.content.length) {
			let sr_body = this._createSubroutine(entry.function_body, ['_$expression']);

			if (!options) {
				options = {body: null};
			}

			options.body = R(sr_body.name);

			this._compileBody(sr_body, entry.function_body);

			subroutine.requires(sr_body);
		}

		args.push(options);

		subroutine.appendCall('__render.printElement', args);

		if (!create_separate_subroutine && entry.function_body) {
			this._compileBody(subroutine, entry.function_body);
		}
	} else if (entry.type == 'close_tag') {
		subroutine.appendCall('__render.closeElement', [entry.tag_name]);
	} else if (entry.type == 'ejs') {
		subroutine.appendCode(entry);
	} else if (entry.type == 'print') {
		let code = this.hawkejs.rewriteVariableReferences(entry.code);
		subroutine.appendCall('__render.print', [R(code)]);
	} else if (entry.type == 'expression') {

		if (entry.wrap_method) {
			subroutine.append('__render.' + entry.wrap_method + '(');
		}

		subroutine.appendCall('__render.parseExpression', [entry.expression, R('vars')], false);

		if (entry.wrap_method) {
			subroutine.append('));');
		} else {
			subroutine.append(');');
		}
	} else if (entry.type == 'open_statement') {

		let Statement = Hawkejs.Expression[entry.name];

		if (!Statement) {
			throw new Error('Unable to find "' + entry.name + '" statement');
		}

		entry.args = Bound.Array.cast(entry.args);

		Statement.toCode(this, subroutine, entry);

	} else if (entry.type == 'close_statement') {

		let Statement = Hawkejs.Expression[entry.name];

		if (!Statement) {
			throw new Error('Unable to find "' + entry.name + '" statement');
		}

		entry.args = Bound.Array.cast(entry.args);

		Statement.toCloseCode(this, subroutine, entry);

	} else if (entry.type == 'open_branch') {
		entry.args = Bound.Array.cast(entry.args);
		Hawkejs.Expression.Subkeyword.toCode(this, subroutine, entry);
	} else if (entry.type == 'close_branch') {
		entry.args = Bound.Array.cast(entry.args);
		Hawkejs.Expression.Subkeyword.toCloseCode(this, subroutine, entry);
	} else if (entry.type == 'error') {
		subroutine.append('throw new Error(' + JSON.stringify(entry.message) + ');');
	} else {
		throw new SyntaxError('Unable to parse ' + entry.type + ' entry');
	}

});

/**
 * Compile element options
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   entry
 *
 * @return   {string}
 */
Builder.setMethod(function _compileElementOptions(entry) {

	let has_attributes = !Bound.Object.isEmpty(entry.attributes);

	if (!has_attributes && !entry.directives && !entry.properties && !entry.variables && !entry.codes && !entry.body) {
		return;
	}

	let key,
	    val;

	let data = {
		attributes : null,
		directives : null,
		properties : null,
		variables  : null,
		codes      : null,
		body       : null,
	};

	if (has_attributes) {
		data.attributes = {};

		let attr;

		for (key in entry.attributes) {
			attr = entry.attributes[key];
			data.attributes[attr.name] = this._compileAttributeValue(attr.value);
		}
	}

	if (entry.directives) {
		data.directives = this._compileDirectiveValues(entry.directives);
	}

	if (entry.properties) {
		data.properties = this._compileDirectiveValues(entry.properties);
	}

	if (entry.variables) {
		data.variables = this._compileDirectiveValues(entry.variables);
	}

	if (entry.codes) {
		data.codes = this._compileCodes(entry.codes);
	}

	if (entry.body) {
		data.body = entry.body;
	}

	return data;
});

/**
 * Parse a sub expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   entry
 *
 * @return   {Builder}
 */
Builder.setMethod(function _compileRawExpression(entry) {
	let tokens = new Hawkejs.Parser.Expressions(entry.value);
	let expression = tokens.getExpression();
	return Hawkejs.Parser.Parser.wrapExpression(expression);
});

/**
 * Compile the given attribute value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.0
 *
 * @return   {Object}
 */
Builder.setMethod(function _compileAttributeValue(val) {

	let result = '';

	if (val) {

		if (val.type == 'string') {
			result = val.value;
		} else if (val.type == 'code') {
			let code = val.value.slice(2, -2);

			// Technically, prints are not allowed when assigning an attribute value,
			// but just ignore it
			if (code[0] == '=') {
				code = code.slice(1);
			}

			code = this.hawkejs.rewriteVariableReferences(code);
			result = R(code);
		} else if (val.type == 'concat') {
			let entry,
			    i;

			result = [];

			for (i = 0; i < val.value.length; i++) {
				entry = val.value[i];

				if (entry.type == 'expressions') {
					result.push(this._compileRawExpression(entry));
				} else if (entry.type == 'code') {
					let code;

					if (entry.value[2] == '=') {
						code = entry.value.slice(3, -2);
					} else {
						code = entry.value.slice(2, -2);
					}

					code = this.hawkejs.rewriteVariableReferences(code);

					if (code.indexOf('print(') > -1) {
						code = '__render.returnPrint(print => {' + code + '})';
					}

					result.push(R(code));
				} else {
					result.push(entry.value);
				}
			}

			result = R(Hawkejs.Parser.Parser.uneval(result) + ".join('')");
		} else if (val.type == 'expressions' || val.type == 'safeprint') {

			if (val.type == 'safeprint') {
				val.value = val.value.slice(2, -2);
			}

			result = this._compileRawExpression(val);
		} else {
			result = R(val.value);
		}
	}

	return result;
});

/**
 * Compile an array of attribute values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array}   values
 *
 * @return   {String}
 */
Builder.setMethod(function _compileDirectiveValues(values) {

	let result = [],
	    value,
	    entry,
	    i;

	for (i = 0; i < values.length; i++) {
		value = values[i];

		entry = {
			name     : value.name,
			context  : value.context || null,
			method   : value.method || null,
			value    : this._compileAttributeValue(value.value)
		};

		result.push(entry);
	}

	return result;
});

/**
 * Compile code blocks inside an element tag
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Array}   codes
 *
 * @return   {String}
 */
Builder.setMethod(function _compileCodes(codes) {

	let result = [],
	    token,
	    code,
	    i;

	for (i = 0; i < codes.length; i++) {
		token = codes[i];
		code = token.value;

		if (token.type == 'expressions') {
			throw new Error('Hawkejs expressions are not supported inside an element open tag');
		}

		if (!token.type == 'code') {
			throw new Error('Expected an EJS block, but got "' + token.type + '"');
		}

		if (code[2] == '=') {
			code = 'print(' + code.slice(3, -2) + ')';
		} else {
			code = code.slice(2, -2);
		}

		let scopes = new Hawkejs.Scopes();
		scopes.addFunctionScope(['print', '$0']);
		code = this.hawkejs.rewriteVariableReferences(code, scopes);

		code = '(print, $0) => {' + code + '}';

		result.push(R(code));
	}

	return result;
});