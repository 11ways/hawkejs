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
		entry.name = type + '_';

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

	let entry = {
		type          : 'open_statement',
		name          : name,
		args          : args,
		function_body : null,
	};

	this.add(entry);

	this.createFunctionBody('statement', name);

	entry.function_body = this.current;

	return entry;
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

	this.closeFunction();

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

	this.closeFunction();

	this.add({type: 'close_branch', name});

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

	this.current.content.push(entry);

	if (Hawkejs.Hawkejs.VOID_ELEMENTS[node_name]) {
		return;
	}

	this.createFunctionBody('element', node_name);

	entry.function_body = this.current;
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
		throw new Error('Tried to close element ' + node_name + ', but found a ' + this.current.type + ' instead');
	}

	if (this.current.info != node_name) {
		throw new Error('Tried to close ' + node_name + ', but found ' + this.current.info + ' instead');
	}

	this.current = this.current.parent;

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
		result += sr;
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
		subroutine.append('/*source_line_nr:' + entry.line_start + ':start*/');
	}

	subroutine.append('\n');

	if (entry.type == 'text') {
		subroutine.appendCall('__render.printUnsafe', [entry.value]);
	} else if (entry.type == 'open_tag') {

		let args = [entry.tag_name];

		let options = this._compileElementOptions(entry);

		let create_separate_subroutine = true;

		if (create_separate_subroutine) {
			let sr_body = this._createSubroutine(entry.function_body);

			if (!options) {
				options = {body: null};
			}

			options.body = R(sr_body.name);

			this._compileBody(sr_body, entry.function_body);

			subroutine.requires(sr_body);
		}

		args.push(options);

		subroutine.appendCall('__render.printElement', args);

		if (!create_separate_subroutine) {
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

		Statement.toCode(this, subroutine, entry);

	} else if (entry.type == 'close_statement') {

		let Statement = Hawkejs.Expression[entry.name];

		if (!Statement) {
			throw new Error('Unable to find "' + entry.name + '" statement');
		}

		Statement.toCloseCode(this, subroutine, entry);

	} else if (entry.type == 'open_branch') {
		Hawkejs.Expression.Subkeyword.toCode(this, subroutine, entry);
	} else if (entry.type == 'close_branch') {
		Hawkejs.Expression.Subkeyword.toCloseCode(this, subroutine, entry);
	} else {
		console.log(' -- Ignoring:', entry.type, entry)
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
 * Compile the given attribute value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Object}
 */
Builder.setMethod(function _compileAttributeValue(val) {

	let result = '';

	if (val) {

		if (val.type == 'string') {
			result = val.value;
		} else if (val.type == 'code') {
			result = R(val.value.slice(2, -2));
		} else if (val.type == 'concat') {
			let entry,
			    i;

			result = [];

			for (i = 0; i < val.value.length; i++) {
				entry = val.value[i];

				if (entry.type == 'expressions') {
					result.push(R(entry.value));
				} else if (entry.type == 'code') {
					let code;

					if (entry.value[2] == '=') {
						code = entry.value.slice(3, -2);
					} else {
						code = entry.value.slice(2, -2);
					}

					if (code.indexOf('print(') > -1) {
						code = '__render.returnPrint(print => {' + code + '})';
					}

					result.push(R(code));
				} else {
					result.push(entry.value);
				}
			}

			result = R(Hawkejs.Parser.Parser.uneval(result) + ".join('')");
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
			code = Hawkejs.Hawkejs.prototype.parseTemplateSyntax(code);
		}

		if (code[2] == '=') {
			code = 'print(' + code.slice(3, -2) + ')';
		} else {
			code = code.slice(2, -2);
		}

		code = '(print, $0) => {' + code + '}';

		result.push(R(code));
	}

	return result;
});