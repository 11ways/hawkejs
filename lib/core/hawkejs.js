let MAIN_INSTANCE,
    counter = 0;

const TAB = '\t',
      DIRTY_LINE_NEEDS_RENDER = 1,
      DIRTY_LINE_HAS_CHILDREN = 2,
	  DIRTY_LINE_NEEDS_ASSEMBLY = 4,
      DIRTY_INFO = Hawkejs.DIRTY_INFO;

let defStat = function defStat(fnc) {
	return Hawkejs.setStatic(fnc);
}

/**
 * The main Hawkejs class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.2.9
 */
const Main = Fn.inherits('Informer', 'Hawkejs', function Hawkejs() {

	// Compiled template storage
	this.templates = {};

	// Original template source
	this.source = {};

	// Wrap template expressions in try-catch blocks?
	this.try_template_expressions = true;

	// Set the main instance by default
	if (!MAIN_INSTANCE) {
		MAIN_INSTANCE = this;
	}
});

/**
 * Set static custom elements object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Main.setStatic('elements', {});

/**
 * Set backwards-compatible reference to object with helper classes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
Main.setStatic('helpers', Hawkejs.helpers);

/**
 * Should explicit error tracing be enabled?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
Main.setProperty('skip_set_err', Blast.isProduction);

/**
 * Get the main Hawkejs instance (if it exists)
 * or create a new one
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.9
 * @version  2.2.9
 *
 * @return   {Hawkejs.Hawkejs}
 */
Main.setStatic(function getInstance() {
	return MAIN_INSTANCE || new Main();
});

/**
 * Set the main Hawkejs instance
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.9
 * @version  2.2.9
 *
 * @param    {Hawkejs.Hawkejs}   hawkejs
 */
Main.setStatic(function setInstance(hawkejs) {
	return MAIN_INSTANCE = hawkejs;
});

/**
 * Create a text node
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.1.0
 *
 * @param    {String}   text
 *
 * @return   {Node}
 */
Main.setStatic(function createTextNode(text) {

	if (Blast.isBrowser) {
		return document.createTextNode(text);
	}

	return new Hawkejs.Text(text);
});

/**
 * Create a text node from unsafe text (that needs escaping)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.23
 * @version  2.2.23
 *
 * @param    {String}   text
 *
 * @return   {Node}
 */
Main.setStatic(function createTextNodeFromUnsafe(text) {

	if (Blast.isBrowser) {
		text = Bound.String.decodeHTML(text);
		return Main.createTextNode(text);
	}

	return Hawkejs.Text.fromUnsafe(text);
});

/**
 * Is the given element/name a custom element?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.9
 * @version  2.2.9
 *
 * @param    {String|HTMLElement}   input
 *
 * @return   {Boolean}
 */
Main.setStatic(function isCustomElement(name) {

	if (!name) {
		return false;
	}

	let type = typeof name;

	if (type == 'object') {
		name = name.nodeName;
	} else if (type != 'string') {
		return false;
	}

	return Main.elements[name] != null;
});

/**
 * Create a html element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.3.4
 *
 * @param    {String}   name   The tag name
 * @param    {Boolean}  xml    Is this for XML?
 *
 * @return   {HTMLElement}
 */
Main.setStatic(function createElement(name, xml) {
	return this.getInstance().createElement(name, xml);
});

/**
 * Convert cheerio-objects to HTMLElements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  2.1.4
 *
 * @param    {Object|Array}   input
 * @param    {Node}           parent
 * @param    {Object}         extras   Extra properties to set on each created element
 *
 * @return   {Node|Array}
 */
Main.setStatic(function objectToElement(input, parent, extras) {

	if (Array.isArray(input)) {
		let result = [],
		    i;

		for (i = 0; i < input.length; i++) {
			result.push(this.objectToElement(input[i], parent, extras));
		}

		return result;
	}

	if (Blast.isBrowser && input instanceof Node) {
		return input;
	}

	if (input instanceof Classes.Hawkejs.Node) {
		return input;
	}

	let node;

	if (input.type == 'tag') {
		node = this.createElement(input.name);

		Object.assign(node, extras);

		if (input.attribs) {
			let key;

			for (key in input.attribs) {
				node.setAttribute(key, input.attribs[key]);
			}
		}

		if (input.children) {
			Hawkejs.appendChildren(node, this.objectToElement(input.children, node, extras));
		}

	} else if (input.type == 'text') {
		node = Hawkejs.createText(input.data);
		Object.assign(node, extras);
	}

	if (parent) {
		parent.append(node);
	}

	return node;
});

/**
 * The relative path to the client-file
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Main.setProperty('client_path', 'hawkejs/hawkejs-client.js');

/**
 * The relative path to the exposed-file
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.6
 * @version  2.1.6
 *
 * @type     {string}
 */
Main.setProperty('exposed_path', 'hawkejs/static.js');

/**
 * The client-file download strategy:
 * blocking   : download and execute in the head
 * preventing : downloading asynchronously, but preventing "ready" event
 * defer      : only execute after ready event
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Main.setProperty('strategy', 'preventing');

/**
 * The server root path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Main.setProperty('root_path', '/');

/**
 * The path to javascript files (relative to root)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Main.setProperty('script_path', '');

/**
 * The path to stylesheet files (relative to root_path)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Main.setProperty('style_path', '');

/**
 * Optional version info to use for assets
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Main.setProperty('app_version', '');

/**
 * Amount of parallel tasks for the `Hawkejs.parallel` method
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.2.16
 *
 * @type     {Number}
 */
Main.setProperty('parallel_task_limit', Blast.isBrowser ? 24 : 8);

/**
 * Create an HTML element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.9
 * @version  2.3.13
 *
 * @param    {String}   name   The tag name
 *
 * @return   {HTMLElement}
 */
Main.setMethod(function createElement(name, xml) {

	let constructor,
	    result;

	if (typeof name == 'object') {
		constructor = name.constructor;
	} else if (Main.elements[name] && !xml) {
		// See if the element can be found by the identical supplied name
		constructor = Main.elements[name];
	}

	if (constructor) {
		if (Blast.isBrowser) {
			if (constructor.ElementConstructor) {
				result = new constructor.ElementConstructor();
			} else {
				result = document.createElement(name);
			}
		} else {

			// First: create the element without invoking the constructor
			result = Object.create(constructor.prototype);

			// Call the HTMLElement constructor
			if (xml) {
				Classes.Hawkejs.DOM.Element.call(result);
			} else {
				Classes.Hawkejs.HTMLElement.call(result);
			}

			// If it's a custom element, also call the custom element constructor
			if (Main.isCustomElement(name)) {
				// Attach the hawkejs instance
				result.hawkejs = this;

				result.ensureConstructed();
			}

			// And now call the actual custom constructor
			constructor.call(result);
		}
	} else {
		if (Blast.isBrowser) {

			if (name[0] == '!' && name.toLowerCase().indexOf('doctype') > -1) {
				return;
			}

			result = document.createElement(name);
		} else {

			if (xml) {
				result = new Hawkejs.DOM.Element();
			} else {
				result = new Hawkejs.HTMLElement();
			}

			// Uppercase the name
			let uname = name.toUpperCase();

			result._l_node_name = name;
			result._l_tag_name = name;
			result.nodeName = uname;
			result.tagName = uname;
			result.localName = name.toLowerCase();
		}
	}

	// @see explanation in Renderer#createElement
	if (Blast.isBrowser && Hawkejs.canBeMarkedAsDirty(result)) {
		Hawkejs.markBranchAsDirty(result);
	}

	return result;
});

/**
 * Compile a source to an executable function
 * and store in in the templates object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.4.0
 *
 * @param    {Object}   options
 * @param    {String}   options.template_name
 * @param    {String}   options.template       Template source to compile, or ...
 * @param    {Function} options.compiled       Already compiled inner template
 * @param    {Boolean}  options.cache          Cache compiled template [true]
 *
 * @return   {Function|String}
 */
Main.setMethod(function compile(options) {

	if (typeof options == 'string') {
		if (arguments.length == 2) {
			options = {
				template_name : options,
				template      : arguments[1],
				is_inline     : true,
			};
		} else {
			options = {
				template_name : 'inline_' + (counter++),
				template      : options,
				cache         : false,
				is_inline     : true,
			};
		}
	} else if (!options) {
		options = {};
	}

	let builder,
	    name = options.template_name;

	try {
		builder = this.buildTemplate(options);
	} catch (err) {
		console.log('Found error when interpreting template ' + name + ':');
		console.log(err);
		console.log(options);
		throw err;
	}

	let compiledView,
	    compiled,
	    code = builder.toCode();

	if (options.cache !== false) {
		this.source[name] = options.template;
	}

	try {
		compiled = this.compileCodeToFunction(code, {
			filename   : options.filename || name,
		});

		compiledView = compiled.compiledView;
		compiledView.compiled = compiled;
		compiledView.code = code;
	} catch (err) {

		if (options.throw_error) {
			throw err;
		}

		let message = this.handleError(null, name, null, err);

		compiledView = function errorView() {
			this.printElement('pre');
			this.print('This template could not be compiled\n');
			this.print(Bound.String.encodeHTML(message));
			this.closeElement('pre');
		};
	}

	if (options.plain_html) {
		compiledView.plain_html = options.template;
	}

	if (options.render_immediate != null) {
		compiledView.render_immediate = options.render_immediate;
	}

	if (options.cache !== false) {
		this.templates[name] = compiledView;
	} else {
		compiledView.source = options.template;
		compiledView.uncached = true;
	}

	compiledView.source_name = name;

	return compiledView;
});

/**
 * Interpret a template and return the Builder instance
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.0
 * @version  2.2.0
 *
 * @param    {Object}   options
 *
 * @return   {Hawkejs.Parser.Builder}
 */
Main.setMethod(function buildTemplate(options) {

	options.hawkejs = this;

	let parser = new Hawkejs.Parser.Directives(options.template, options);
	let builder = parser.build();

	return builder;
});

// PROTOBLAST START CUT
// The `vm` module is used on node to compile the code
let vm = require('vm');
// PROTOBLAST END CUT

/**
 * Compile code to a function
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {String}   code
 *
 * @return   {Function}
 */
Main.setMethod(function compileCodeToFunction(code, options) {

	let compiled,
	    exports,
	    error;

	if (Blast.isNode) {

		// The function statements have to be wrapped in another scope because
		// we always reuse the same VM instance. If we didn't do this,
		// creating newer function statements would overwrite older ones.
		// We also have to define Blast & Hawkejs, because `runInThisContext`
		// does not have access to the local scope
		code = `(function() { const Blast = __Protoblast, Hawkejs = Blast.Classes.Hawkejs, exports = {}; ${code}; return exports; }())`;

		try {
			exports = vm.runInThisContext(code, options);
		} catch (err) {
			error = err;
		}
	} else {
		try {
			exports = {};
			eval(code);
		} catch (err) {
			error = err;
		}
	}

	if (exports?.compiled) {
		compiled = exports.compiled;
	} else if (!error) {
		error = new Error('No compiled function found');
	}

	if (error) {
		error.code = code;
		throw error;
	}

	code = null;
	options = null;

	return compiled;
});

/**
 * Dissect the source EJS code
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.6
 * @version  2.1.6
 *
 * @param    {String}   source
 *
 * @return   {Array}
 */
Main.setMethod(function dissectEjs(source) {

	let current_line_nr = 0,
	    max_line_nr,
	    adjustment = 0,
	    result = [],
	    lines = Bound.String.dissect(source, '<%', '%>'),
	    index,
	    line,
	    i;

	for (i = 0; i < lines.length; i++) {
		line = lines[i];

		if (line.type == 'inside') {
			index = line.content.indexOf('/*source_line_nr:');

			if (index > -1) {
				max_line_nr = parseInt(line.content.slice(index + 17));

				line.adjusted_start = max_line_nr;

				let back_line,
				    j;

				for (j = i; j >= 0; j--) {
					back_line = lines[j];

					if (back_line.maxLine) {
						break;
					}

					back_line.maxLine = max_line_nr;
				}
			}
		}

		result.push(line);
	}

	index = -1;

	for (i = 0; i < result.length; i++) {
		line = result[i];

		if (line.maxLine == null) {
			line.maxLine = line.lineEnd;
		}

		if (line.adjusted_start == null) {
			line.adjusted_start = line.lineStart;
		}

		if (line.adjusted_start < index) {
			line.adjusted_start = index;
		}

		if (line.adjusted_start > line.maxLine) {
			line.adjusted_start = line.maxLine;
		}

		index = line.adjusted_start;
	}

	return result;
});

/**
 * Add the print commands
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.0
 * @version  2.1.2
 *
 * @param    {String}   source
 * @param    {Boolean}  print_unsafe
 *
 * @return   {String}
 */
Main.setMethod(function addPrintCommands(source, print_unsafe, name, safe_name) {

	var print_cmd,
	    block_code,
	    line_start,
	    pieces,
	    result = '',
	    piece,
	    lines,
	    trim,
	    temp,
	    line,
	    i,
	    j;

	if (print_unsafe === false) {
		print_cmd = 'printSafe';
	} else {
		print_cmd = 'printUnsafe';
	}

	// Dissect the template
	lines = this.dissectEjs(source);

	for (i = 0; i < lines.length; i++) {
		line = lines[i];

		// "inside" refers to JS code in view templates
		if (line.type == 'inside') {

			if (line.content.slice(-1) == '-') {
				trim = true;
				line.content = line.content.slice(0, -1);
			} else {
				trim = false;
			}

			line_start = line.adjusted_start;

			if (line_start > line.lineMax) {
				line_start = line.lineMax;
			}

			// Error reporting
			if (this.skip_set_err !== true) {
				result += TAB + '__render.setErr(' + safe_name + ',' + line_start + ');\n';
			}

			// "<%= %>" always print as-is, it could be HTML
			if (line.content[0] == '=') {

				// Trim the line
				temp = line.content.slice(1).trim();

				if (!temp) {
					continue;
				}

				// Split by spaces
				pieces = line.content.slice(1).trim().split(/\s+/);

				if (pieces) {
					// Add a print command
					result += TAB + '__render.print(' + pieces.join(' ') + ');\n';
				}

				continue;
			}

			// Split by newlines
			pieces = line.content.split('\n');
			block_code = '';

			for (j = 0; j < pieces.length; j++) {

				// Trim the piece
				piece = pieces[j].trim();
				pieces[j] = piece;

				if (j > 0) {
					block_code += '\n';
				}

				// If the line contains a regular comment,
				// add a newline
				if (piece.indexOf('//') > -1) {
					piece += '\n' + TAB;
				}

				block_code += piece;
			}

			if (pieces[0][0] == '}' || pieces[pieces.length-1][pieces[pieces.length-1].length-1] == '{') {
				// Skip braces, unfinished lines
			} else if (block_code) {

				// Make sure code blocks are complete
				if (Bound.String.count(block_code, '{') == Bound.String.count(block_code, '}')) {

					// Make sure opening braces come before closing ones
					// Equal sign is used when there are none, so they're both -1
					if (this.try_template_expressions && block_code.indexOf('{') <= block_code.indexOf('}')) {

						let test_block = block_code.trim();

						if (test_block.indexOf('/*source_line_nr:') == 0) {
							block_code = '\n' + TAB + test_block;
						} else {
							block_code = TAB + 'try {\n' + TAB + '/*start_try_block*/' + '\n' + block_code + '}\n' + TAB + 'catch (err) {';
							block_code += '__render.hawkejs.handleError(__render, __render.errName, __render.errLine, err);'
							block_code += '}';
						}
					}
				}
			}

			result += block_code + ';\n';

		} else {
			if (!trim || (trim && line.content.trim())) {
				result += TAB + '__render.' + print_cmd + '(' + JSON.stringify(line.content) + ');\n';
			}
		}
	}

	return result;
});

/**
 * Turn a template into code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.1.0
 *
 * @param    {String}   source
 * @param    {String}   name
 *
 * @return   {String}
 */
Main.setMethod(function interpretTemplate(source, name, safe_name) {

	let allow_code = true,
	    options = false;

	if (typeof source == 'object') {
		options = source;
		source = options.template;

		if (options.html_only) {
			allow_code = false;
		}
	}

	if (allow_code) {
		// Convert Hawkejs-specific {% %} code blocks to EJS <% %> code
		source = this.parseTemplateSyntax(source, {name, allow_code});
	} else {
		// Only convert elements to code
		source = this.parseTemplateElements(source, name);
	}

	// Turn text outside of EJS blocks into print commands
	source = this.addPrintCommands(source, true, name, safe_name);

	return source;
});

/**
 * Parse syntax
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.6
 * @version  2.2.0
 *
 * @param    {String}   source
 * @param    {Object}   options
 *
 * @return   {string}
 */
Main.setMethod(function _parseTemplate(source, options) {

	let instance = new Hawkejs.Parser.Directives(source, options),
	    builder = instance.build(),
	    result = builder.toCode();

	return result;
});

/**
 * Parse HTML in the template source, without parsing Hawkejs syntax
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.4.0
 * @version  2.1.6
 *
 * @param    {String}   source
 * @param    {Object}   options
 *
 * @return   {String}
 */
Main.setMethod(function parseTemplateElements(source, options) {

	if (typeof options == 'string') {
		options = {name: options};
	}

	if (!options) {
		options = {};
	}

	options.hawkejs = this;
	options.allow_code = false;

	let result = this._parseTemplate(source, options);

	if (!result) {
		return source;
	}

	return result;
});

/**
 * Parse hawkejs syntax
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.1.6
 *
 * @param    {String}   source
 * @param    {String}   name
 * @param    {Boolean}  wrap_ejs   Wrap in ejs tags
 *
 * @return   {String}
 */
Main.setMethod(function parseTemplateSyntax(source, name, wrap_ejs) {

	let result = this._parseTemplate(source, {
		allow_code : true,
		hawkejs    : this,
		name,
	});

	if (wrap_ejs === false && result[0] == '<' && result[1] == '%') {
		result = result.slice(2, -2);
	}

	return result;
});

/**
 * Rename variable references
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.4.0
 *
 * @param    {string}           code
 * @param    {Hawkejs.Scopes}   scopes
 * @param    {number}           level
 *
 * @return   {string}
 */
Main.setMethod(function rewriteVariableReferences(code, scopes, level) {

	let prev_value,
	    result = '',
	    tokens = Fn.tokenize(code, true),
	    token,
	    next,
	    prev,
	    i;

	if (!scopes) {
		scopes = new Hawkejs.Scopes();
	}

	// Add the main function scope
	scopes.addFunctionScope(['compiledView', 'helper', 'this', '__render', 'vars']);

	for (i = 0; i < tokens.length; i++) {

		token = scopes.processToken(tokens[i]);

		if (!token) {
			continue;
		}

		next = tokens[i + 1];

		// Make sure the next token isn't a whitespace
		if (next && next.type == 'whitespace') {
			next = tokens[i + 2];
		}

		// If the token is a name, see if we have to modify it
		if (token.type == 'name') {

			// We don't modify property names
			if (prev_value != '.' && prev_value != '?.') {
				if (next && next.type == 'punct' && next.value == ':') {
					// Skip key names in object literals
					continue;
				}

				if (scopes.shouldIgnoreName(token.value)) {
					continue;
				}

				// Local properties shouldn't be overridden
				if (Hawkejs.Renderer.local_properties && Hawkejs.Renderer.local_properties[token.value]) {
					token.value = '__render.' + token.value;
					continue;
				}

				if (token.value == 'Classes') {
					token.value = '__render.Blast.Classes';
					continue;
				}

				if (token.value == 'Blast') {
					token.value = '__render.Blast';
					continue;
				}

				if (Hawkejs.helpers[token.value] != null) {
					token.value = 'helper.' + token.value;
				} else if (Hawkejs.Renderer.prototype['view_' + token.value]) {
					// If the method exists prefixed with `view_`, use that
					token.value = '__render.view_' + token.value;
				} else if (Obj.getPropertyDescriptor(Hawkejs.Renderer, token.value) && Hawkejs.Renderer.prototype[token.value] && Hawkejs.Renderer.prototype[token.value].is_command) {
					// Add the correct context for viewrender methods
					token.value = '__render.' + token.value;
				} else if (Obj.getPropertyDescriptor(Hawkejs.Template, token.value) && Hawkejs.Template.prototype[token.value] && Hawkejs.Template.prototype[token.value].is_command) {
					// Add the correct context for viewrender methods
					token.value = '__template.' + token.value;
				} else {

					if (Hawkejs.hasGlobal(token.value)) {
						token.value = '(Hawkejs.getGlobal(' + JSON.stringify(token.value) + '))';
					} else {
						
						let is_assignment = false,
						    name = next?.name;

						if (name) {
							if (name == 'increment' || name == 'decrement' || name.indexOf('assign') === 0) {
								is_assignment = true;
							}
						}

						if (is_assignment) {
							token.value = 'vars.getProxy().' + token.value;
						} else {
							token.value = 'vars.get(' + JSON.stringify(token.value) + ')';
						}
					}
				}
			}
		}

		prev = token;
		prev_value = token.value;
	}

	for (i = 0; i < tokens.length; i++) {
		result += tokens[i].value;
	}

	return result;
});

/**
 * Get the source of a template
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  2.2.12
 *
 * @param    {Array}      names
 * @param    {Function}   callback
 */
Main.setMethod(function getFirstAvailableSource(names, callback) {

	if (!Array.isArray(names)) {
		names = [names];
	} else {
		names = Bound.Array.flatten(names);
	}

	// Filter out duplicates
	names = Bound.Array.unique(names);

	let verified_names = [],
	    name,
	    i;

	for (i = 0; i < names.length; i++) {
		name = names[i];

		if (!name) continue;
		name = name.trim();

		if (!name || name == '/') continue;
		verified_names.push(name);
	}

	if (!verified_names.length) {
		let err = new Error('No valid template names were given to Hawkejs#getFirstAvailableSource()');
		return Blast.setImmediate(() => callback(err));
	}

	// Check the cache
	if (!this._debug && this.template_source_cache) {

		// Get the cache entry of the first template
		let first = this.template_source_cache[names[0]];

		if (first && first.name && first.source) {
			return callback(null, first);
		}
	}

	this.getFirstAvailableInternalSource(verified_names, function gotResult(err, result) {

		if (err) {
			return callback(err);
		}

		if (!result) {
			return callback(new Error('Failed to get templates "' + verified_names + '", first available source is empty'));
		}

		if (!result.name && !result.source) {
			console.error('Illegal template source for', verified_names, ':', result);
			return callback(new Error('Failed to get templates "' + verified_names + '", no name & source was returned'));
		}

		callback(null, result);
	});
});

/**
 * Get the compiled template function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  2.0.0
 *
 * @param    {String|Array}   names
 * @param    {Function}       callback
 */
Main.setMethod(function getFirstAvailableCompiled(names, callback) {

	var that = this;

	this.getFirstAvailableSource(names, function gotCompiled(err, result) {
		that._gotCompiled(err, result, callback);
	});
});

/**
 * Handle result of getFirstAvailableCompiled
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Error}        err
 * @param    {Object}       result
 * @param    {Function}     callback
 */
Main.setMethod(function _gotCompiled(err, result, callback) {

	var compiled;

	if (err) {
		return callback(err);
	}

	if (!this._debug && this.templates[result.name]) {
		return callback(null, {
			name     : result.name,
			compiled : this.templates[result.name]
		});
	}

	compiled = this.compile({
		template_name : result.name,
		template      : result.source,
		filename      : result.filename,
	});

	result.compiled = compiled;

	this.templates[result.name] = compiled;

	callback(null, result);
});

/**
 * Normalize the render arguments & create a renderer
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.3.16
 *
 * @param    {String|Renderer|Function}   template
 * @param    {Object}                     variables
 * @param    {Function}                   callback
 *
 * @return   {Object}
 */
Main.setMethod(function prepareRenderArguments(template, variables, callback) {

	let is_new_renderer = true,
	    renderer,
	    error;

	if (!template) {
		error = new Error('No valid template has been given');
	} else {

		let template_type = typeof template;

		if (template_type == 'string' || template_type == 'function') {
			// Create new ViewRender instance
			renderer = new Hawkejs.Renderer(this);
		} else if (template_type == 'object' && template.constructor.name == 'Renderer') {
			is_new_renderer = false;
			renderer = template;
			template = null;
		} else if (template_type == 'object' && Array.isArray(template)) {
			// Create new ViewRender instance
			renderer = new Hawkejs.Renderer(this);
			template = new Hawkejs.Templates(renderer, template);
		} else if (template_type == 'object' && template instanceof Hawkejs.Templates) {
			let names = [];

			for (let entry of template.templates) {
				names.push(entry.name);
			}

			renderer = new Hawkejs.Renderer(this);
			template = new Hawkejs.Templates(renderer, names);
		} else {
			if (template && (template.expose_to_scene || template.dry_class == 'Renderer')) {
				error = new Error('Unable to render un-revived Renderer');
			} else {
				error = new Error('Unable to render "' + template_type + '" template');
				error.template = template;
			}
		}
	}

	if (typeof variables == 'function') {
		callback = variables;
		variables = null;
	}

	if (!callback) {
		callback = err => {
			if (err) {
				console.error('Error rendering:', err);
			}
		};
	}

	if (is_new_renderer && variables && renderer) {
		renderer.variables = variables;
	}

	// Update the exposed variables in the browser now
	if (Blast.isBrowser && typeof hawkejs != 'undefined') {
		Object.assign(hawkejs.scene.exposed, renderer.expose_to_scene);
	}

	return {
		renderer  : renderer,
		template  : template,
		variables : variables,
		callback  : callback,
		error     : error
	};
});

/**
 * Evaluate the given template source synchronously
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.1.0
 *
 * @param    {String|Function}   source
 * @param    {Object}            variables
 *
 * @return   {Array}
 */
Main.setMethod(function evaluate(source, variables, html_only) {

	let renderer = new Hawkejs.Renderer(this);

	return renderer.evaluate(source, variables, html_only);
});

/**
 * Render the wanted template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.2.10
 *
 * @param    {String|Renderer|Function}   template
 * @param    {Object}                     variables
 * @param    {Function}                   callback
 *
 * @return   {Renderer}
 */
Main.setMethod(function render(template, variables, callback) {

	let config = this.prepareRenderArguments(template, variables, callback);

	if (config.error) {
		return config.callback(config.error);
	}

	// Start executing the template code
	Blast.nextGroupedTick(function immediateRender() {
		config.renderer.renderHTML(config.template, config.variables).done(config.callback);
	});

	return config.renderer;
});

/**
 * Render the wanted template to an element list
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.10
 *
 * @param    {String|Renderer|Function}   template
 * @param    {Object}                     variables
 * @param    {Function}                   callback
 *
 * @return   {Renderer}
 */
Main.setMethod(function renderToElements(template, variables, callback) {

	let config = this.prepareRenderArguments(template, variables, callback);

	if (config.error) {
		return config.callback(config.error);
	}

	// Start executing the template code
	Blast.nextGroupedTick(function immediateRender() {
		config.renderer.render(config.template, config.variables).done(function gotBlock(err, block) {

			if (err) {
				return config.callback(err);
			}

			return config.callback(null, block.toElements());
		});
	});

	return config.renderer;
});

/**
 * Handle render errors by showing where the error occured
 * inside the original template file
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.3.16
 *
 * @param    {Renderer}    renderer
 * @param    {String}      templateName
 * @param    {Number}      lineNr
 * @param    {Error}       error
 *
 * @return   {String}
 */
Main.setMethod(function handleError(renderer, templateName, lineNr, error) {

	// This error might have already been handled by a sub-renderer
	if (error && error.hawkejs_message) {
		return error.hawkejs_message;
	}

	let before_stack,
	    message,
	    codeNr,
	    source,
	    start,
	    code,
	    name,
	    stop,
	    temp,
	    i;

	if (!templateName) {
		if (!error) {
			error = new Error('No template was given');
		}

		if (typeof console !== 'undefined') {
			console.error(error);
		}

		return;
	}

	// If the error occured BEFORE executing the function,
	// the previous template is probably to blame
	if (lineNr == 'pre') {

		// Get the current templateName we didn't find
		temp = templateName;

		// Set the last templateName
		templateName = renderer.lastTemplate || templateName;

		// We don't know the real lineNr, so just use 0
		lineNr = 0;
	}

	if (typeof templateName == 'string') {
		name = templateName;
	} else if (templateName.active) {
		name = templateName.active.name;
	} else if (templateName.templates) {
		name = templateName.templates[0].name;
	}

	message = '\nError inside »' + name + '« template\n' + error + '\n';

	source = this.source[templateName];

	if (source == null && renderer && renderer.compiled_inlines[templateName]) {
		source = renderer.compiled_inlines[templateName].source;
	}

	if (source) {
		source = source.split('\n');
	} else {
		source = [];
	}

	let at_eval,
	    at_cpv;

	// Handle user-made javascript errors
	// This used to only happen when lineNr was 0,
	// but that didn't give a good enough code hint
	if (source && error && typeof error == 'object') {

		let stack = Bound.Error.parseStack(error),
		    line;

		let findLine = function findLine(lines, method_name) {

			let line,
			    i;

			for (i = 0; i < lines.length; i++) {
				line = lines[i];

				if (line.name.indexOf(method_name) > -1) {
					return line;
				}
			}
		};

		line = findLine(stack, 'cpv_') || findLine(stack, templateName) || findLine(stack, 'compiledView');

		if (line) {
			codeNr = line.line;
		} else if (error.lineNumber) {
			codeNr = error.lineNumber;
		}

		if (codeNr) {

			if (error.code && typeof error.code == 'string') {
				code = error.code;
			} else {
				if (this.templates[templateName]) {
					code = this.templates[templateName].code;
				} else if (renderer && renderer.compiled_inlines[templateName]) {
					code = renderer.compiled_inlines[templateName].code;
				}
			}

			// Get the compiled code, with the comment in it
			let in_try_block = false,
				skip_count = 0,
				skipped = 0,
				pieces,
				piece,
				index;
			
			if (code && typeof code == 'string') {
				pieces = code.split('\n').slice(0, codeNr);
			} else {
				pieces = [];
			}

			for (let i = pieces.length - 1; i >= 0; i--) {
				piece = pieces[i];
				index = piece.indexOf('/*source_line_nr:');

				if (index > -1) {
					lineNr = parseInt(piece.slice(index + 17));
					break;
				}

				if (piece.indexOf('/*start_try_block*/') > -1) {
					skipped += skip_count - 1;
					skip_count = 0;
				}

				if (piece.indexOf('/*end_try_block*/') > -1) {
					skip_count = 0;
				}

				skip_count++;
			}

			if (lineNr == null) {
				lineNr = codeNr;
			}

			if (skipped > 0) {
				lineNr += skipped;
			}
		}

		// Also get the before stack
		if (at_eval) {
			before_stack = Bound.String.before(error.stack, 'eval at compile');
		} else if (at_cpv) {
			before_stack = Bound.String.before(error.stack, 'at Renderer.cpv_');
		} else {
			before_stack = Bound.String.before(error.stack, 'at Renderer.compiledView');
		}

		if (!before_stack) {
			before_stack = error.stack;
		}

		before_stack = before_stack.split('\n');

		// Add all the lines, except the first (type of error) and the last
		for (i = 1; i < before_stack.length - 1; i++) {
			message += '  ' + before_stack[i] + '\n';
		}
	}

	start = lineNr - 3;
	stop = lineNr + 4;

	if (lineNr < 0) {
		lineNr = 0;
	}

	if (start < 0) {
		stop += Math.abs(start);
		start = 0;
	}

	if (stop > source.length) {
		stop = source.length;
	}

	message += '----------------------------------------------\n';

	let code_piece = '';

	for (i = start; i < stop; i++) {
		code_piece += source[i] + '\n';
	}

	code_piece = Bound.String.dedent(code_piece).split('\n');

	for (i = start; i < stop; i++) {

		if (i == lineNr) {
			message += ' »»»';
		} else {
			message += '    ';
		}

		if (i < 10) {
			message += '   ' + (i + 1);
		} else if (i < 100) {
			message += '  ' + (i + 1);
		} else {
			message += ' ' + (i + 1);
		}

		message += ' | ' + code_piece[i - start] + '\n';
	}

	if (typeof console !== 'undefined') {
		console.error(error, message);
	}

	error.hawkejs_message = message;

	return message;
});

/**
 * Create style url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {RURL}
 */
Main.setMethod(function createStyleUrl(path, config) {

	var url = Classes.RURL.parse(path, this.root_path + this.style_path);

	if (!url.hostname || url.usedBaseProperty('hostname')) {
		let version = this.exposed('app_version');

		if (version) {
			url.param('v', version);
		}

		if (!url.pathname.endsWith('.css')) {
			url.pathname += '.css';
		}

		if (config && config.theme && config.theme != 'default') {
			url.param('theme', config.theme);
		}
	}

	return url;
});

/**
 * Create script url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {RURL}
 */
Main.setMethod(function createScriptUrl(path, config) {

	var root_path,
	    url;

	if (!path) {
		return null;
	}

	if (config && config.root_path != null) {
		root_path = config.root_path;
	} else {
		root_path = this.root_path + this.script_path;
	}

	url = Classes.RURL.parse(path, root_path);

	// If the full pathname matches the root path,
	// then this was not a valid url
	if (url.pathname === root_path) {
		return null;
	}

	if (!url.hostname || url.usedBaseProperty('hostname')) {
		let version = this.exposed('app_version');

		if (version) {
			url.param('v', version);
		}

		if (!url.pathname.endsWith('.js')) {
			url.pathname += '.js';
		}

		if (config && config.theme && config.theme != 'default') {
			url.param('theme', config.theme);
		}
	}

	return url;
});

/**
 * Create a Renderer instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @return   {Hawkejs.Renderer}
 */
Main.setMethod(function createRenderer() {
	return new Classes.Hawkejs.Renderer(this);
});

/**
 * Load the settings
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Object}   settings
 */
Main.setMethod(function loadSettings(settings) {
	// Insert the settings
	Object.assign(this, settings);
});

/**
 * Register a render on the client side
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Object}   options
 */
Main.setMethod(function registerServerRender(options) {

	// Create a new scene
	if (!this.scene) {
		this.scene = new Classes.Hawkejs.Scene(this);
	}

	this.scene.registerServerRender(options);
});

/**
 * Get an exposed value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 *
 * @return   {Mixed}
 */
Main.setMethod(function exposed(name) {

	if (Blast.isNode) {
		if (this.expose_static) {
			return this.expose_static[name];
		}
	} else if (this.scene && this.scene.exposed) {
		return this.scene.exposed[name];
	}

});

/**
 * Serialize a JavaScript object to a valid expression
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.3.1
 *
 * @param    {Object}   obj
 *
 * @return   {String}
 */
Main.setMethod(function stringifyToExpression(obj) {

	let dried;

	if (this._debug) {
		// When debug mode is on, a properly indented
		// object literal is preferred
		dried = Bound.JSON.dry(obj, null, '\t');
	} else {
		dried = Bound.JSON.dry(obj);
	}

	if (dried.includes('</script')) {
		// And finally: script tags need to be broken up,
		// or else the browser will think it's an actual
		// script tag
		dried = dried.replaceAll('</script', '</s" + "cript');
	}

	return dried;
});

/**
 * Get hawkejs text content of a certain object.
 * Used to stringify a line on the server before sending it to the client.
 * (On the client, getElementContent is used)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.18
 *
 * @param    {String|Object}      line
 * @param    {Hawkejs.Renderer}   renderer
 * @param    {Number}             level
 *
 * @return   {String}
 */
defStat(function getTextContent(line, renderer, level) {

	let result;

	if (typeof line === 'string') {
		result = line;
	} else if (line) {
		let temp = Hawkejs.extractResult(line);

		if (temp != null) {
			result = temp;
		} else if (line.toHawkejsString) {
			result = line.toHawkejsString(renderer);
		} else if ((temp = line.outerHTML) != null) {
			result = temp;
		} else if (line.nodeType === 3) {
			result = line.textContent;
		} else if (typeof line.toElement == 'function') {
			result = line.toElement();
		} else {
			result = '' + line;
		}
	} else {
		result = '' + line;
	}

	// Recursively get the text content
	if (typeof result == 'object') {

		if (level == null) {
			level = 0;
		}

		result = getTextContent(result, renderer, level + 1);
	}

	return result;
});

/**
 * On the server we can turn lines into strings,
 * but on the browser that would be wasteful and we should get an Element
 * when we can. This function does that.
 * (On the server, getTextContent is used instead)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.11
 *
 * @param    {String|Object}      line
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Node}
 */
defStat(function getElementContent(line, renderer) {

	let result;

	// If the line is a string, we need to interpret it as HTML
	if (typeof line === 'string') {
		result = Hawkejs.parseHTML(line);
	} else if (line) {

		let temp = Hawkejs.extractResult(line);

		if (temp != null) {
			if (typeof temp == 'string') {
				result = Hawkejs.parseHTML(temp);
			} else {
				result = getElementContent(temp, renderer);
			}
		} else if (typeof line.toElement == 'function') {
			result = line.toElement();
		} 
	}

	if (result == null) {
		result = line;
	}

	if (result && result.block_id && result.lines) {

		let length = result.lines.length,
		    lines = result.lines,
		    line,
		    i;

		result = [];

		for (i = 0; i < length; i++) {
			line = lines[i];
			result = result.concat(getElementContent(line, renderer));
		}
	}

	return result;
});

/**
 * Get html-safe text
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String|Object}      input
 *
 * @return   {String}
 */
defStat(function getSafeText(input) {

	var result;

	if (input == null) {
		return '';
	}

	if (typeof input != 'string') {
		if ((result = input.innerText) != null) {
			return result;
		}

		input = String(input);
	}

	result = Bound.String.stripTags(input);
	result = Bound.String.decodeHTML(result);

	return result;
});

/**
 * Get the first element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.1.0
 *
 * @param    {Array}   entries
 *
 * @return   {Element}
 */
defStat(function getFirstElement(entries) {

	if (entries && entries.length) {
		let entry,
		    i;

		for (i = 0; i < entries.length; i++) {
			entry = entries[i];

			if (entry && entry.nodeType == 1) {
				return entry;
			}
		}
	}
});

/**
 * Normalize children
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.1
 *
 * @param    {String|Object}      line
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Node}
 */
defStat(function normalizeChildren(element, renderer) {

	// Ignore textnodes
	if (element.nodeType == 3) {
		return;
	}

	let children = element.children,
	    length = children.length,
	    replacement,
	    child,
	    i;

	for (i = 0; i < length; i++) {
		child = children[i];
		replacement = Hawkejs.getElementContent(child, renderer);

		if (child == replacement) {
			normalizeChildren(child, renderer);
			continue;
		}

		if (Array.isArray(replacement)) {
			child.replaceWith.apply(child, replacement);
			i--;
		} else {
			child.replaceWith(replacement);
			i--;
		}

		// Refresh all the children
		children = element.children;
		length = children.length;
	}
});

/**
 * Create a text node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  2.0.0
 */
defStat(function createText(data) {

	if (data == null) {
		data = '';
	}

	if (Blast.isBrowser) {
		return document.createTextNode(data);
	}

	return new Blast.Classes.Hawkejs.Text(data);
});

/**
 * Parse an HTML string and return an array of elements
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.9
 *
 * @param    {String}      html
 *
 * @return   {Array}
 */
defStat(function parseHTML(html) {

	let result;

	if (Blast.isNode) {
		let hawkejs = Hawkejs.Hawkejs.getInstance();
		let renderer = new Hawkejs.Renderer(hawkejs);
		result = renderer.evaluate(html, null, true);
	} else {
		result = document.createRange().createContextualFragment(html);
		result = result.childNodes;
	}

	return Blast.Bound.Array.cast(result);
});

/**
 * Add classes to a classlist
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.1
 * @version  2.0.0
 *
 * @param    {HTMLElement}   element
 * @param    {String|Array}  class_name
 */
defStat(function addClasses(element, class_name) {

	var classes,
	    list,
	    i;

	if (!class_name) {
		return;
	}

	if (!Array.isArray(class_name)) {
		classes = class_name.split(' ');
	} else {
		classes = class_name;
	}

	if (!classes.length) {
		return;
	}

	if (element.classList) {
		list = element.classList;
	} else {
		list = element;
	}

	for (i = 0; i < classes.length; i++) {
		if (classes[i]) {
			list.add(classes[i]);
		}
	}
});

/**
 * Remove classes from a classlist
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.2.2
 *
 * @param    {HTMLElement}   element
 * @param    {String|Array}  class_name
 */
defStat(function removeClasses(element, class_name) {

	var classes,
	    list,
	    i;

	if (!class_name) {
		return;
	}

	if (element.classList) {
		list = element.classList;
	} else {
		list = element;
	}

	if (!Array.isArray(class_name)) {
		classes = class_name.split(' ');
	} else {
		classes = class_name;
	}

	for (i = 0; i < classes.length; i++) {
		if (classes[i]) {
			list.remove(classes[i]);
		}
	}
});

/**
 * Add attributes to an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @param    {HTMLElement}   element
 * @param    {Object}        attributes
 */
defStat(function setAttributes(element, attributes) {

	var key;

	for (key in attributes) {
		element.setAttribute(key, attributes[key]);
	}
});

/**
 * Make an element empty
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.1
 *
 * @param    {HTMLElement}   element
 */
defStat(function removeChildren(element) {

	if (!element) {
		return;
	}

	// Some elements actually have a `length` property, so ignore those
	if (typeof element.nodeType != 'number' && Bound.Array.likeArray(element)) {
		let i;

		for (i = 0; i < element.length; i++) {
			removeChildren(element[i]);
		}

		return;
	}

	if (Blast.isNode) {
		element.innerHTML = '';
		return;
	}

	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
});

/**
 * Replace the children of an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.1
 *
 * @param    {HTMLElement}   element
 * @param    {Array}         new_children
 */
defStat(function replaceChildren(element, new_children) {

	if (Bound.Array.likeArray(element)) {
		throw new Error('Unable to replace children of multiple elements');
	}

	// First remove all existing children
	Hawkejs.removeChildren(element);

	// Then add the new children
	Hawkejs.appendChildren(element, new_children);
});

/**
 * Add elements to another element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 *
 * @param    {HTMLElement}   target
 * @param    {Array}         new_children
 */
defStat(function appendChildren(target, new_children) {

	let i;

	// Make sure new_children is an array (or it'll skip elements on the client-side)
	new_children = Bound.Array.cast(new_children);

	for (i = 0; i < new_children.length; i++) {
		target.append(new_children[i]);
	}
});

/**
 * Get elements by attribute name/value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}   element
 * @param    {String}        names
 * @param    {String}        value
 *
 * @return   {Array}
 */
defStat(function getElementsByAttribute(element, names, value) {
	var check_value = arguments.length > 2;
	return _getElementsByAttribute([], check_value, element, names, value);
});

/**
 * Get elements by attribute name/value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {Array}         result
 * @param    {HTMLElement}   element
 * @param    {String}        name
 * @param    {String}        value
 *
 * @return   {Array}
 */
function _getElementsByAttribute(result, check_value, element, names, value) {

	if (typeof element == 'string' || element.nodeType != 1) {
		return;
	}

	let children,
	    child,
	    i;

	if (Array.isArray(element)) {
		children = element;
	} else {
		children = element.children;
	}

	names = Array.cast(names);

	for (i = 0; i < children.length; i++) {
		child = children[i];

		if (!child || !child.hasAttribute) {
			continue;
		}

		for (let name of names) {
			if (child.hasAttribute(name)) {
				if (!check_value || child.getAttribute(name) == value) {
					result.push(child);
					break;
				}
			}
		}

		_getElementsByAttribute(result, check_value, child, names, value);
	}

	return result;
}

/**
 * Claim all the siblings of the given element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {HTMLElement}   element
 * @param    {Boolean}       only_if_empty
 */
defStat(function claimSiblings(element, only_if_empty) {

	if (only_if_empty && element.childNodes.length) {
		throw new Error('"' + element.tagName + '" element already has content, you probably closed same assignment twice');
	}

	let node;

	if (element.parentElement) {
		while (node = element.nextSibling) {
			node.remove();
			element.append(node);
		}
		return;
	}

	if (!element.parent_block) {
		return;
	}

	let index = element.parent_block.lines.indexOf(element),
	    i;

	if (index === -1) {
		throw new Error('Unable to claim content: unable to find element in the parent block');
	}

	while (element.parent_block.lines.length > index + 1) {
		node = element.parent_block.lines.splice(index + 1, 1)[0];
		element.append(node);
	}
});

/**
 * Execute the `next` function, but wait for optional promise.
 * If it has already been resolved, execute it immediately.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.3.15
 * @version  2.4.0
 *
 * @param    {Promise}   promise
 * @param    {Function}  next
 */
defStat(function doNextSync(promise, next) {

	if (!promise) {
		return next();
	}

	if (Classes.Pledge.isPledge(promise)) {
		if (promise.isResolved()) {
			return next(null, promise.getResolvedValue());
		}

		if (promise.isRejected()) {
			return next(promise.getRejectedReason());
		}
	}

	if (promise.is_done) {
		return next();
	}

	if (promise.then) {
		Classes.Pledge.Swift.prototype.done.call(promise, next);
	} else {
		next();
	}
});

/**
 * Execute the `next` function, but wait for optional promise
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.16
 *
 * @param    {Promise}   promise
 * @param    {Function}  next
 */
defStat(function doNextGrouped(promise, next) {

	if (!promise) {
		return next();
	}

	// If it's a Pledge and it's already done, queue the callback in a grouped
	// immediate call, this way less overhead Pledges are made
	if (promise.is_done) {
		Blast.nextGroupedImmediate(next);
		return;
	}

	if (promise.then) {
		Classes.Pledge.prototype.done.call(promise, next);
	} else {
		next();
	}
});

/**
 * Execute the `next` function, but wait for optional promise
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.16
 *
 * @param    {Promise}   promise
 * @param    {Function}  next
 */
defStat(function doNext(promise, next) {
	return this.doNextGrouped(promise, next);
});

/**
 * Recursively create tasks for each line
 * that needs to do something asynchronously before it can be rendered.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.3.1
 *
 * @param    {Array}     lines      An array of lines/elements that need to be prepared
 * @param    {Renderer}  renderer   The renderer
 * @param    {Boolean}   force      Check all elements, even if they're not marked as dirt
 * @param    {Boolean}   assembling Are the elements being assembled?
 *
 * @return   {Array}   The tasks that need to be performed
 */
defStat(function prepareLineTasks(lines, renderer, force, assembling) {

	let task_limit = renderer.hawkejs.parallel_task_limit,
	    final_tasks = [],
	    pre_tasks = [],
	    tasks = [];

	Hawkejs.recurseLineTasks(lines, pre_tasks, tasks, renderer, force, assembling);

	let queued_pledge = renderer.doQueuedTasks();

	if (queued_pledge) {
		final_tasks.push(queued_pledge);
	}

	if (tasks.length) {
		Bound.Array.include(final_tasks, tasks);
	}

	// When there are pre_tasks, we have to do those first,
	// and let them finish first too!
	// So we'll return an array with only 1 entry,
	// that way a Fn.parallel won't break stuff
	if (pre_tasks.length) {

		if (final_tasks.length) {
			let pre_task_pledge = Hawkejs.parallel(false, task_limit * 3, pre_tasks);
			let after_tasks = final_tasks;

			final_tasks = [
				function doPreTasksFirst(next) {
					pre_task_pledge.done((err, res) => {

						if (err) {
							return next(err);
						}

						Hawkejs.parallel(after_tasks).done(next);
					});
				}
			];
		} else {
			final_tasks = pre_tasks;
		}
	}

	return final_tasks;
});

/**
 * Method used to recursively prepare tasks for the given lines.
 * These tasks can then be executed.
 *
 * A "line" is something that has been printed in the templates.
 * This can be a string, an element or even special objects.
 * This method will see if the line needs to perform a task before it can be rendered.
 *
 * These tasks will only PREPARE the lines, not replace them.
 * Placeholders will still be placeholders.
 * Getting the correct value/html happens later.
 *
 * This method is used by the BlockBuffer class,
 * but also by the HE-PLACEHOLDER element.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.3.15
 *
 * @param    {Array}              lines        The lines we want to render
 * @param    {Array}              pre_tasks    Array of PRE_ASSEMBLE tasks
 * @param    {Array}              tasks        Array of RENDER_CONTENT tasks
 * @param    {Hawkejs.Renderer}   [renderer]
 * @param    {Boolean}            force
 * @param    {Boolean}            assembling   Are the elements being assembled?
 *
 * @return   void
 */
defStat(function recurseLineTasks(lines, pre_tasks, tasks, renderer, force, assembling) {

	let length = lines.length,
	    i;

	if (!force && Blast.isBrowser) {
		force = true;
	}

	// Iterate over the lines to find any placeholders
	for (i = 0; i < length; i++) {

		let line = lines[i];

		if (typeof line != 'object' || line == null) {
			continue;
		}

		let dirty_value = line[DIRTY_INFO];

		if (!force && !dirty_value) {
			continue;
		}

		if (assembling && (dirty_value & DIRTY_LINE_NEEDS_ASSEMBLY)) {
			line.onHawkejsAssemble(renderer);
		}

		if (renderer) {
			let delayed_elements = renderer.delayed_elements;

			if (lines !== delayed_elements && delayed_elements.indexOf(line) > -1) {
				continue;
			}
		}

		if (force || (dirty_value & DIRTY_LINE_NEEDS_RENDER)) {

			let render_tasks = line[Hawkejs.RENDER_TASKS];
			let check_render_methods = true;

			if (render_tasks) {
				// A line/element can have an array of tasks that should be performed first
				render_tasks.drainPreTasks(pre_tasks, renderer);

				check_render_methods = render_tasks.doRenderMethods(pre_tasks, tasks, renderer);
			}

			if (check_render_methods) {

				// After any PRE_TASKS, it can have:
				// OR a PRE_ASSEMBLE
				// OR a RENDER_CONTENT
				// OR a renderHawkejsContent
				if (line[Hawkejs.RENDER_CONTENT] || line.renderHawkejsContent) {

					tasks.push(function doLineRenderContent(next) {
						let result = Hawkejs.renderContent(line, renderer);
						Hawkejs.doNextSync(result, next);
					});

				} else if (!line.is_assembled && line instanceof Hawkejs.BlockBuffer) {
					tasks.push(function assembleBlock(next) {
						Hawkejs.doNextSync(line.assemble(), next);
					});
				}
			}
		}

		let children = line.children;

		if (children && children.length) {
			recurseLineTasks(children, pre_tasks, tasks, renderer, force, assembling);
		}
	}
});

/**
 * Execute the render method
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {Object}             line         The line we want to render
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Pledge}
 */
defStat(function renderContent(line, renderer) {

	let deprecated_method;

	if (line[Hawkejs.RENDER_CONTENT]) {
		deprecated_method = false;
	} else if (line.renderHawkejsContent) {
		deprecated_method = true;
	} else {
		return;
	}

	let result;

	if (deprecated_method) {
		result = Hawkejs.callDeprecatedRenderContent(line, renderer);
	} else {
		result = line[Hawkejs.RENDER_CONTENT](renderer);
	}

	return result;
});

/**
 * Call the deprecated `renderHawkejsContent` method and cache it
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {Object}             line         The line we want to render
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Pledge}
 */
defStat(function callDeprecatedRenderContent(line, renderer) {

	if (line[Hawkejs.RC_CACHE] == null) {
		line[Hawkejs.RC_CACHE] = line.renderHawkejsContent(renderer);
	}

	return line[Hawkejs.RC_CACHE];
});

/**
 * Set a method that will cache its result when executed.
 *
 * Can be used on a class (will be added to the prototype, used for CustomElements)
 * or on an instances of any class, for on-the-fly caching
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}          target   The object to attach a method to
 * @param    {String|Symbol}   name     The name of the cached method
 * @param    {Function}        fnc      The actual method function
 */
defStat(function setCachedMethod(target, name, fnc) {

	var result_symbol;

	// Each method that can be cached gets its own result symbol
	// (But this is probably only for render_hawkejs_content)
	if (!Main.RESULT_SYMBOLS[name]) {
		Main.RESULT_SYMBOLS[name] = Symbol('result');
	}

	// Get the symbol to use for this method's result
	result_symbol = Main.RESULT_SYMBOLS[name];

	if (typeof target == 'function') {
		Fn.setMethod(target, name, doMethod);
	} else {
		target[name] = doMethod;
	}

	// The actual method wrapper that will be set on the class/instance
	function doMethod() {

		// If there is no result yet, call the actual method
		if (this[result_symbol] == null) {
			this[result_symbol] = fnc.call(this);
		}

		// And now return the result
		return this[result_symbol];
	};

	doMethod.cached_method = fnc;
});

/**
 * Get the RenderTasks instance of something
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @param    {Object}   target   The object to get the instance from
 *
 * @return   {RenderTasks}
 */
defStat(function getRenderTasks(target) {

	let instance = target[Hawkejs.RENDER_TASKS];

	if (!instance) {
		instance = new Hawkejs.RenderTasks(target);
	}

	return instance;
});

/**
 * Add a task to the given object that'll be used for pre-assembling
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.3.1
 *
 * @param    {Object}          target   The object to add a task to
 * @param    {Function}        fnc      The actual function
 */
defStat(function addPreTask(target, fnc) {
	Hawkejs.getRenderTasks(target).addPreTask(fnc);
});

/**
 * Is the given line dirty?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @param    {Object}   line
 */
defStat(function canBeMarkedAsDirty(line) {

	let current_value = line[DIRTY_INFO] || 0,
	    result = false;

	if (!current_value || !(current_value & DIRTY_LINE_NEEDS_ASSEMBLY)) {
		if (typeof line.onHawkejsAssemble == 'function') {
			current_value |= DIRTY_LINE_NEEDS_ASSEMBLY;
			result = true;
		}
	}

	if (!current_value || !(current_value & DIRTY_LINE_NEEDS_RENDER)) {
		if (Hawkejs.needsToDoAsyncWork(line)) {
			current_value |= DIRTY_LINE_NEEDS_RENDER;
			result = true;
		}
	}

	line[DIRTY_INFO] = current_value;

	if (!result && current_value) {
		result = true;
	}

	return result;
});

/**
 * Mark the line as being dirty
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @param    {Object}   line
 */
defStat(function markBranchAsDirty(line) {

	let current_value = line[DIRTY_INFO] || 0;

	line[DIRTY_INFO] = current_value | DIRTY_LINE_NEEDS_RENDER;
	line = line.parent;

	// Iterate over the line and its ancestors
	while (line) {
		// Get the current dirty_line value
		current_value = line[DIRTY_INFO] || 0;

		// If it has a truthy value, it's already dirty and we can stop early
		if (current_value > 0 && (current_value & DIRTY_LINE_HAS_CHILDREN)) {
			break;
		}

		line[DIRTY_INFO] = current_value | DIRTY_LINE_HAS_CHILDREN;
		line = line.parent;
	}
});

/**
 * Does the given variable have any kind of async task it needs to do?
 * Does not test children, in case of an HTMLElement
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.1
 *
 * @param    {Object}   obj
 *
 * @return   {Boolean}
 */
defStat(function needsToDoAsyncWork(obj) {

	if (!obj || typeof obj != 'object') {
		return false;
	}

	if (obj[Hawkejs.RENDER_TASKS]) {
		return true;
	}

	if (obj[Hawkejs.RENDER_CONTENT]) {
		return true;
	}

	if (obj.renderHawkejsContent) {
		return true;
	}

	if (obj instanceof Hawkejs.BlockBuffer && !obj.is_assembled) {
		return true;
	}

	return false;
});

/**
 * Consume an array and return an array for each iteration
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {Array}      values
 * @param    {Function}   fnc
 *
 * @return   {Array|null}
 */
defStat(function consume(values, fnc) {

	if (!values || !values.length) {
		return;
	}

	let result = [],
	    entry;

	while (values.length) {
		entry = values.shift();
		result.push(fnc(entry));
	}

	return result;
});

/**
 * Symbols for cached results
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Object}
 */
Main.RESULT_SYMBOLS = {};

/**
 * All void elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.1
 *
 * @type     {Object}
 */
Main.VOID_ELEMENTS = {
	AREA       : true,
	BASE       : true,
	BR         : true,
	COL        : true,
	COMMAND    : true,
	EMBED      : true,
	HR         : true,
	IMG        : true,
	INPUT      : true,
	KEYGEN     : true,
	LINK       : true,
	META       : true,
	PARAM      : true,
	SOURCE     : true,
	TRACK      : true,
	WBR        : true,
	'!DOCTYPE' : true,

	// SVG elements
	CIRCLE     : 2,
	ELLIPSE    : 2,
	LINE       : 2,
	PATH       : 2,
	POLYGON    : 2,
	POLYLINE   : 2,
	RECT       : 2,
	STOP       : 2,
	USE        : 2,
};

/**
 * All optional-closing elements
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.15
 * @version  2.2.15
 *
 * @type     {Object}
 */
Main.OPTIONAL_CLOSING_ELEMENTS = {
	HTML     : true,
	HEAD     : true,
	BODY     : true,
	P        : true,
	DT       : true,
	DD       : true,
	LI       : true,
	PTION    : true,
	THEAD    : true,
	TH       : true,
	TBODY    : true,
	TR       : true,
	TD       : true,
	TFOOT    : true,
	COLGROUP : true,
};

/**
 * Elements with a strict parent requirement
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.17
 * @version  2.3.11
 *
 * @type     {Object}
 */
Main.STRICT_ELEMENT_PARENTAGE = {
	LI : ['UL', 'OL'],
};