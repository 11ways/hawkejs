const R = Hawkejs.Parser.Parser.rawString;

/**
 * The builder class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.4.0
 */
const Builder = Fn.inherits(null, 'Hawkejs.Parser', function Builder(hawkejs) {

	this.hawkejs = hawkejs;

	this.functions = [];
	this.current = null;
	this.root = this.createFunctionBody('root');

	// The name of the template
	this.template_name = null;

	// Is this an inline template?
	this.is_inline = null;

	// Any references seen
	// (this can be reset at any time)
	this.seen_references = null;

	// Properties used during compilation
	this._functions_to_compile = null;
	this._root_subroutine = null;
});

/**
 * Is only HTML allowed?
 * (Parsing can be more lenient in that case)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.1
 * @version  2.2.1
 *
 * @type     {boolean}
 */
Builder.setProperty(function only_html_allowed() {

	if (this.directives_parser) {
		return this.directives_parser.only_html_allowed;
	}

	return false;
});

/**
 * Reset the seen references array
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @return   {Array}
 */
Builder.setMethod(function resetSeenReferences() {
	let seen_references = [];
	this.seen_references = seen_references;
	return seen_references;
});

/**
 * Create a new function
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.4.0
 *
 * @param    {string}   type
 * @param    {string}   info
 *
 * @return   {Hawkejs.Parser.FunctionBody}
 */
Builder.setMethod(function createFunctionBody(type, info) {

	let entry = new Hawkejs.Parser.FunctionBody(this, type, this.functions.length, this.current, info);

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
 * Start a group
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 *
 * @return   {Object}
 */
Builder.setMethod(function startGroup() {
	let entry = {
		type    : 'group',
		parent  : null,
		content : [],
	};

	if (this.current_group) {
		entry.parent = this.current_group;
	}

	this.add(entry);

	this.current_group = entry;

	return entry;
});

/**
 * Stop a group
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 *
 * @return   {Object}
 */
Builder.setMethod(function stopGroup() {

	let result = this.current_group;

	this.current_group = this.current_group.parent;

	return result;
});

/**
 * Add 
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.2
 * @version  2.3.7
 *
 * @param    {Object}   entry
 */
Builder.setMethod(function add(entry, original_entry) {

	if (original_entry) {
		entry.line_start = original_entry.line_start;
		entry.line_end = original_entry.line_end;

		if (!entry.source) {
			entry.source = original_entry.source;
		}
	}

	this.pushEntry(entry);
});

/**
 * Actually push the entry to the correct content array
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 *
 * @param    {Object}   entry
 */
Builder.setMethod(function pushEntry(entry) {
	if (this.current_group) {
		this.current_group.content.push(entry);
	} else {
		this.current.content.push(entry);
	}
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
 * @return   {Hawkejs.Parser.FunctionBody}
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
 * @version  2.4.0
 *
 * @param    {Array}   path
 */
Builder.setMethod(function seenReference(path) {

	/** @type Hawkejs.Parser.FunctionBody */
	let current = this.getCurrentBlockOrElement();

	if (this.seen_references) {
		this.seen_references.push(path);
	}

	if (!current) {
		//console.log('Failed to find block or element for reference: ' + path.join('.'));
		return;
	}

	current.containsReference(path);
});

/**
 * Open a new element tag
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.3.8
 *
 * @param    {Object}   entry
 */
Builder.setMethod(function addElement(entry) {

	// @TODO: If elements should get separate subroutines
	// (like in the case of reference variables maybe?)
	// this should be changed to true later in the code!
	entry.create_separate_subroutine = false;

	this.pushEntry(entry);

	if (entry.tag_name_expression) {
		this.createFunctionBody('element', 'tne');
	} else {
		let node_name = entry.tag_name.toUpperCase();

		if (Hawkejs.Hawkejs.VOID_ELEMENTS[node_name]) {
			return;
		}
	
		this.createFunctionBody('element', node_name);
	}

	entry.function_body = this.current;
	this.current.entry = entry;
});

/**
 * Close an element tag
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.15
 *
 * @param    {Object}   entry
 */
Builder.setMethod(function closeElement(entry) {

	let closing_with_expression = !!entry.tag_name_expression,
	    node_name;

	if (!closing_with_expression) {
		node_name = entry.tag_name.toUpperCase();

		// Closing void tags should just be ignored.
		if (Hawkejs.Hawkejs.VOID_ELEMENTS[node_name]) {
			// Except when it's a </br>, that should turn into a break
			if (node_name == 'BR') {
				entry.type = 'open_tag';
				this.addElement(entry);
			}

			return;
		}
	}

	if (this.current.type != 'root' && this.current.type != 'element') {
		// Overlapping element/statements can in theory be allowed
	} else if (node_name && this.current.info != node_name) {

		if (this.only_html_allowed) {
			// Be lenient! Add an open tag for this close tag
			// So `bla</p>` will become `bla<p></p>`, as browsers do it
			this.addElement({
				type       : 'open_tag',
				line_start : entry.line_start,
				line_end   : entry.line_start,
				source     : entry.source,
				tag_name   : entry.tag_name,
			});
		} else if (Hawkejs.Hawkejs.OPTIONAL_CLOSING_ELEMENTS[this.current.info]) {
			this.add({type: 'close_tag', name: this.current.info});
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

		let close_tag = {
			type : 'close_tag',
		};

		if (node_name) {
			close_tag.name = node_name;
		} else {
			close_tag.tag_name_expression = entry.tag_name_expression;
		}

		this.add(close_tag);
	}
});

/**
 * Create the code
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.4.0
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
	    sr;

	for (sr of this._subroutines) {
		functions[sr.name] = R(sr.name);

		if (result) {
			result += '\n\n';
		}

		result += sr.toString();
	}

	result += '\n\nexports.compiled = ' + Hawkejs.Parser.Parser.uneval(functions) + ';\n';

	return result;
});

/**
 * Create a subroutine, but do not process the contents yet
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.4.0
 *
 * @param    {Hawkejs.Parser.FunctionBody}   body
 * @param    {Array}    args
 *
 * @return   {Hawkejs.Parser.Subroutine}
 */
Builder.setMethod(function _createSubroutine(body, args) {

	let subroutine = new Hawkejs.Parser.Subroutine(this, body);

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
 * @param    {Hawkejs.Parser.FunctionBody} body
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
 * @version  2.4.0
 *
 * @param    {Hawkejs.Parser.Subroutine}   subroutine
 * @param    {Object}                      entry
 */
Builder.setMethod(function _compileEntry(subroutine, entry) {

	if (entry.line_start != null) {
		subroutine.append('\n\n');
		subroutine.append('/*source_line_nr:' + entry.line_start + ':start*/');

		if (this.hawkejs.skip_set_err !== true) {
			subroutine.append('\n');
			subroutine.appendCall('__render.setErr', [this.template_name, entry.line_start]);
		}
	}

	subroutine.append('\n');

	if (entry.type == 'group') {
		for (let child of entry.content) {
			this._compileEntry(subroutine, child);
		}
	} else if (entry.type == 'text') {
		let value = Bound.String.decodeHTML(entry.value);
		subroutine.appendCall('__render.printTextNode', [value]);
	} else if (entry.type == 'open_tag') {

		let args = [],
		    store_source = false;
		
		if (entry.tag_name == 'he-dynamic') {
			store_source = true;
		}

		let options = this._compileElementOptions(entry);

		let create_separate_subroutine = entry.create_separate_subroutine;

		// There are several reasons why the element should get a separate subroutine:
		// the most probably one is because it contains a reference variable
		if (create_separate_subroutine && entry.function_body?.content?.length) {

			const body = entry.function_body;
			const subroutine = this._createSubroutine(body, ['_$expression']);

			if (!options) {
				options = {body: null};
			}

			options.body = R(subroutine.name);
			this._compileBody(subroutine, body);
			subroutine.requires(subroutine);

			// If the body contains reference variables,
			// the Renderer needs to know about it
			if (body.reference_count > 0) {
				options.references = body.references;
				options.reference_count = body.reference_count;
			}
		}

		// @TODO: DELETE THIS
		if (store_source) {
			if (!options) {
				options = {};
			}

			if (!options.properties) {
				options.properties = [];
			}

			options.properties.push({
				name  : 'hwk_source',
				value : entry.function_body.getSourceCode(),
			});
		}

		if (entry.tag_name) {
			args.push(entry.tag_name);
		} else if (entry.tag_name_expression) {
			let expression = this._compileRawExpression({value: entry.tag_name_expression});
			args.push(R(Hawkejs.Parser.Parser.uneval(expression)));
		} else {
			throw new Error('Failed to open unknown element');
		}

		args.push(options);

		subroutine.appendCall('__render.printElement', args);

		if (!create_separate_subroutine && entry.function_body) {
			this._compileBody(subroutine, entry.function_body);
		}
	} else if (entry.type == 'close_tag') {

		let args = [];

		if (entry.tag_name_expression) {
			let expression = this._compileRawExpression({value: entry.tag_name_expression});
			args.push(R(Hawkejs.Parser.Parser.uneval(expression)));
		} else {
			args.push(entry.tag_name);
		}

		subroutine.appendCall('__render.closeElement', args);
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
		subroutine.checkBreak();

	} else if (entry.type == 'open_branch') {
		entry.args = Bound.Array.cast(entry.args);
		Hawkejs.Expression.Subkeyword.toCode(this, subroutine, entry);
	} else if (entry.type == 'close_branch') {
		entry.args = Bound.Array.cast(entry.args);
		Hawkejs.Expression.Subkeyword.toCloseCode(this, subroutine, entry);
		subroutine.checkBreak();
	} else if (entry.type == 'error') {
		subroutine.append('throw new Error(' + JSON.stringify(entry.message) + ');');
	} else {
		if (entry.type == 'source') {
			return;
		}
		throw new SyntaxError('Unable to parse ' + entry.type + ' entry');
	}
});

/**
 * Compile element options
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.4.0
 *
 * @param    {Object}   entry
 *
 * @return   {string}
 */
Builder.setMethod(function _compileElementOptions(entry) {

	let has_attributes = !Obj.isEmpty(entry.attributes);

	if (!has_attributes && !entry.directives && !entry.properties && !entry.variables && !entry.codes && !entry.body && !entry.hooks && !entry.states) {
		return;
	}

	let key,
	    val;

	let data = {
		attributes : null,
		directives : null,
		properties : null,
		variables  : null,
		states     : null,
		hooks      : null,
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

	if (entry.states) {
		data.states = this._compileDirectiveValues(entry.states);
	}

	if (entry.hooks) {
		data.hooks = this._compileDirectiveValues(entry.hooks, false);
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
 * Parse an expression and return the tokens
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.0
 * @version  2.4.0
 *
 * @param    {Object}   entry
 * @param    {boolean}  unwrap_optionals
 *
 * @return   {Object}
 */
Builder.setMethod(function _parseExpression(entry, unwrap_optionals = true) {
	let parser = new Hawkejs.Parser.Expressions(entry.value, this);
	let expression = parser.getExpression();
	return expression;
});

/**
 * Parse a sub expression and compile it to an object the builder will understand
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.0
 * @version  2.4.0
 *
 * @param    {Object}   entry
 * @param    {boolean}  unwrap_optionals
 *
 * @return   {Object}
 */
Builder.setMethod(function _compileRawExpression(entry, unwrap_optionals = true) {
	let expression = this._parseExpression(entry, unwrap_optionals);
	return Hawkejs.Parser.Parser.wrapExpression(expression, null, unwrap_optionals);
});

/**
 * Parse a sub expression and compile it to a runtime object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.0
 * @version  2.4.0
 *
 * @param    {Object}   entry
 * @param    {boolean}  unwrap_optionals
 *
 * @return   {Object}
 */
Builder.setMethod(function _compileExpressionToRuntimeObject(entry, unwrap_optionals = true) {

	let expression = this._parseExpression(entry, unwrap_optionals);

	if (!expression) {
		return null;
	}

	let expressions = Bound.Array.cast(expression);

	// If it's a simple primitive value we don't have to wrap anything
	if (expressions.length == 1 && expressions[0].value != null) {
		return {$value: expressions[0].value};
	}

	return {$expression: expressions};
});

/**
 * Compile the given attribute value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.0
 *
 * @param    {Object}   val
 * @param    {boolean}  unwrap_optionals
 *
 * @return   {Object}
 */
Builder.setMethod(function _compileAttributeValue(val, unwrap_optionals = true) {

	if (!val) {
		return '';
	}

	let result;

	// Reset the seen references
	let seen_references = this.resetSeenReferences();

	if (val.type == 'string') {
		result = {$value: val.value};
	} else if (val.type == 'code') {
		let code = val.value.slice(2, -2);

		// Technically, prints are not allowed when assigning an attribute value,
		// but just ignore it
		if (code[0] == '=') {
			code = code.slice(1);
		}

		code = this.hawkejs.rewriteVariableReferences(code);
		result = {$value: R(code)};
	} else if (val.type == 'concat') {
		let entry,
			i;

		result = [];

		for (i = 0; i < val.value.length; i++) {
			entry = val.value[i];

			if (entry.type == 'expressions') {
				result.push(this._compileExpressionToRuntimeObject(entry, unwrap_optionals));
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

				result.push({$value: R(code)});
			} else {
				result.push({$value: entry.value});
			}
		}

		result = {$concat: result};
	} else if (val.type == 'expressions' || val.type == 'safeprint') {

		if (val.type == 'safeprint') {
			val.value = val.value.slice(2, -2);
		}

		result = this._compileExpressionToRuntimeObject(val, unwrap_optionals);
	} else {
		result = {$value: R(val.value)};
	}

	if (result) {
		if (!unwrap_optionals) {
			result.$unwrap_optionals = false;
		}

		if (seen_references?.length) {
			result.$references = seen_references.slice(0);
		}
	}

	return result;
});

/**
 * Compile an array of attribute values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {Object[]}   values
 * @param    {boolean}    unwrap_optionals
 *
 * @return   {String}
 */
Builder.setMethod(function _compileDirectiveValues(values, unwrap_optionals = true) {

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
			value    : this._compileAttributeValue(value.value, unwrap_optionals),
		};

		if (value.domain) {
			entry.domain = value.domain;
		}

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