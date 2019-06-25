const TAB = '\t';

/**
 * The main Hawkejs class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
const Main = Fn.inherits('Informer', 'Hawkejs', function Hawkejs() {

	// Compiled template storage
	this.templates = {};

	// Original template source
	this.source = {};

	this.try_template_expressions = true;

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
 * Create a html element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 *
 * @param    {String}   name   The tag name
 *
 * @return   {HTMLElement}
 */
Main.setStatic(function createElement(name) {

	var constructor,
	    modified,
	    result,
	    uname;

	if (typeof name == 'object') {
		constructor = name.constructor;
	} else if (Main.elements[name]) {
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
			result = new constructor();
		}
	} else {
		if (Blast.isBrowser) {

			if (name[0] == '!' && name.toLowerCase().indexOf('doctype') > -1) {
				return;
			}

			result = document.createElement(name);
		} else {
			result = new Hawkejs.HTMLElement();

			// Uppercase the name
			uname = name.toUpperCase();

			result._l_node_name = name;
			result._l_tag_name = name;
			result.nodeName = uname;
			result.tagName = uname;
		}
	}

	return result;
});

/**
 * Convert cheerio-objects to HTMLElements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  2.0.0
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
			node.childNodes = this.objectToElement(input.children, node, extras);
		}

	} else if (input.type == 'text') {
		node = Hawkejs.createText(input.data);
		Object.assign(node, extras);
	}

	if (parent) {
		node.parentElement = parent;
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
 * Compile a source to an executable function
 * and store in in the templates object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Object}   options
 * @param    {String}   options.template_name
 * @param    {String}   options.template       Template source to compile, or ...
 * @param    {Function} options.compiled       Already compiled inner template
 * @param    {Boolean}  options.evaluate       Eval code, return function [true]
 * @param    {Boolean}  options.cache          Cache compiled template [true]
 *
 * @return   {Function|String}
 */
Main.setMethod(function compile(options) {

	var compiled;

	if (typeof options == 'string') {
		if (arguments.length == 2) {
			options = {
				template_name : options,
				template      : arguments[1]
			};
		} else {
			options = {
				template_name : 'inline_' + Date.now(),
				template      : options,
				cache         : false
			};
		}
	} else if (!options) {
		options = {};
	}

	let name = options.template_name,
	    safe_name = JSON.stringify(name);

	let code = 'compiled = function compiledView(__render, __template, vars, helper) {\n';
	code += TAB + '__render.timeStart(' + safe_name + ');\n';

	let template_code = this.interpretTemplate(options.template, name, safe_name);
	template_code = this.rewriteVariableReferences(template_code);

	if (template_code == null) {
		throw new Error('Failed to interpret the template');
	}

	// Add the compiled template to the code
	code += template_code;

	// Call the timeEnd method
	code += TAB + '__render.timeEnd(' + safe_name + ');\n';

	// End of the function
	code += '}';

	try {
		eval(code);
	} catch(err) {

		if (options.throw_error) {
			throw err;
		}

		console.log('Found error when compiling view ' + safe_name + ':');
		console.log(err);
		console.log(code);

		compiled = function errorView() {
			__render.print('This template could not be compiled');
		};
	}

	if (options.cache !== false) {
		this.templates[name] = compiled;
		this.source[name] = options.template;
	}

	compiled.source_name = name;

	return compiled;
});

/**
 * Turn a template into code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   source
 * @param    {String}   name
 *
 * @return   {String}
 */
Main.setMethod(function interpretTemplate(source, name, safe_name) {

	var block_code,
	    pieces,
	    result = '',
	    piece,
	    lines,
	    trim,
	    temp,
	    line,
	    i,
	    j;

	source = this.parseHTML(source, name);
	source = this.parseSyntax(source, name);

	// Dissect the template
	lines = Bound.String.dissect(source, '<%', '%>');

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

			// Error reporting
			if (this.skip_set_err !== true) {
				result += TAB + '__render.setErr(' + safe_name + ',' + line.lineStart + ');\n';
			}

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

				// We can't execute the setErr function (because of multiline
				// expressions) but we can use comments, and some error
				// inspecting later
				if (this.skip_set_err !== true) {
					block_code += TAB + '/*lineNr:' + (line.lineStart+j) + '*/ ';
				};

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
						block_code = TAB + 'try { ' + block_code + '}\n' + TAB + 'catch (err) {';
						block_code += '__render.hawkejs.handleError(__render, __render.errName, __render.errLine, err);'
						block_code += '}';
					}
				}
			}

			result += block_code + ';\n';

		} else {
			if (!trim || (trim && line.content.trim())) {
				result += TAB + '__render.print(' + JSON.stringify(line.content) + ');\n';
			}
		}
	}

	return result;
});

/**
 * Parse HTML in the template source
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.4.0
 * @version  2.0.0
 *
 * @param    {String}   source
 * @param    {String}   name
 *
 * @return   {String}
 */
Main.setMethod(function parseHTML(source, name) {

	var instance = new Hawkejs.Parser.Directives(source, name),
	    result = instance.convert();

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
 * @version  2.0.0
 *
 * @param    {String}   source
 * @param    {String}   name
 * @param    {Boolean}  wrap_ejs   Wrap in ejs tags [true]
 *
 * @return   {String}
 */
Main.setMethod(function parseSyntax(source, name, wrap_ejs) {

	if (!source) {
		return '';
	}

	let ejs_count = 0,
	    current,
	    options,
	    tokens,
	    result,
	    added,
	    lines,
	    close,
	    line,
	    temp,
	    type,
	    key,
	    i;

	// Dissect the template
	lines = Bound.String.dissect(source, '{%', '%}');
	result = [];

	for (i = 0; i < lines.length; i++) {
		line = lines[i];

		ejs_count += Bound.String.count(line.content, '<%');

		if (ejs_count > 0) {
			ejs_count -= Bound.String.count(line.content, '%>');
		}

		if (line.type == 'normal') {
			result.push(line.content);
			continue;
		}

		line.content = line.content.trim();

		// Tokenize the line
		tokens = new Hawkejs.Parser.Expressions(line.content);

		added = false;

		for (key in Hawkejs.Expression) {

			if (typeof Hawkejs.Expression[key] != 'function') {
				continue;
			}

			if (tokens.at(0).value == '/') {
				type = tokens.at(1).value;
				close = true;
				tokens.goTo(3);
			} else {
				type = tokens.at(0).value;
				tokens.goTo(2);
				close = false;
			}

			options = {
				type     : type,
				close    : close,
				tokens   : tokens,
				source   : line.content,
				current  : current,
				wrap_ejs : wrap_ejs
			};

			temp = Hawkejs.Expression[key].parse(options);

			if (temp !== false) {
				temp.parent = current;
				temp.options = options;

				if (temp.close || temp.name[0] == '/') {
					if (current) {
						current = current.parent;
					}
				} else if (!temp.void) {
					// Only non-void tags are set current
					current = temp;
				}

				result.push(temp.code);
				added = true;
				break;
			}
		}

		if (!added) {
			tokens.index = 0;
			line = '__render.parseExpression(' + JSON.stringify(tokens.getExpression()) + ', vars)';

			if (!ejs_count && wrap_ejs !== false) {
				line = '<% ' + line + ' %>';
			}

			result.push(line);
		}
	}

	result = result.join('') || source;

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
 * @version  2.0.0
 *
 * @param    {String}   code
 * @param    {Number}   level
 *
 * @return   {String}
 */
Main.setMethod(function rewriteVariableReferences(code, level) {

	var scopes = new Hawkejs.Scopes(),
	    result = '',
	    tokens = Fn.tokenize(code, true),
	    token,
	    next,
	    prev,
	    i;

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
			if (!prev || (prev && prev.value != '.')) {
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

				if (token.value == 'Blast') {
					token.value = '__render.Blast';
					continue;
				}

				if (Hawkejs.helpers[token.value] != null) {
					token.value = 'helper.' + token.value;
				} else if (Hawkejs.Renderer.prototype['view_' + token.value]) {
					// If the method exists prefixed with `view_`, use that
					token.value = '__render.view_' + token.value;
				} else if (Hawkejs.Renderer.prototype[token.value] && Hawkejs.Renderer.prototype[token.value].is_command) {
					// Add the correct context for viewrender methods
					token.value = '__render.' + token.value;
				} else if (Hawkejs.Template.prototype[token.value] && Hawkejs.Template.prototype[token.value].is_command) {
					// Add the correct context for viewrender methods
					token.value = '__template.' + token.value;
				} else {
					// All the rest are variables that should be changed
					token.value = 'vars.' + token.value;
				}
			}
		}

		prev = token;
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
 * @version  2.0.0
 *
 * @param    {Array}      names
 * @param    {Function}   callback
 */
Main.setMethod(function getFirstAvailableSource(names, callback) {

	var that = this,
	    found_source,
	    found_name;

	if (!Array.isArray(names)) {
		names = [names];
	} else {
		names = Bound.Array.flatten(names);
	}

	// Check the cache
	if (!this._debug && this.template_source_cache) {

		// Get the cache entry of the first template
		let first = this.template_source_cache[names[0]];

		if (first && first.name && first.source) {
			return Blast.nextTick(function gotCache() {
				return callback(null, first);
			});
		}
	}

	this.getFirstAvailableInternalSource(names, callback);
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
		template      : result.source
	});

	result.compiled = compiled;

	this.templates[result.name] = compiled;

	callback(null, result);
});

/**
 * Render the wanted template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String|Renderer|Function}   template
 * @param    {Object}                     variables
 * @param    {Function}                   callback
 *
 * @return   {Renderer}
 */
Main.setMethod(function render(template, variables, callback) {

	var template_type,
	    renderer;

	if (!template) {
		throw new Error('No valid template has been given');
	}

	template_type = typeof template;

	if (template_type == 'string' || template_type == 'function') {
		// Create new ViewRender instance
		renderer = new Hawkejs.Renderer(this);
	} else if (template_type == 'object' && template.constructor.name == 'Renderer') {
		renderer = template;
		template = null;
	} else {
		if (template && template.expose_to_scene) {
			throw new Error('Unable to render un-revived Renderer');
		} else {
			throw new Error('Unable to render unknown input');
		}
	}

	if (typeof variables == 'function') {
		callback = variables;
		variables = null;
	}

	// Start executing the template code
	Blast.nextTick(function immediateRender() {
		renderer.renderHTML(template, variables).done(callback);
	});

	return renderer;
});


/**
 * Handle render errors by showing where the error occured
 * inside the original template file
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {ViewRender}  viewRender
 * @param    {String}      templateName
 * @param    {Number}      lineNr
 * @param    {Error}       error
 */
Main.setMethod(function handleError(viewRender, templateName, lineNr, error) {

	var before_stack,
	    message,
	    codeNr,
	    source,
	    start,
	    name,
	    stop,
	    temp,
	    i;

	if (!templateName) {
		if (!error) {
			error = new Error('No template was given');
		}

		if (typeof console !== 'undefined') {
			console.log(error);
		}

		return;
	}

	// If the error occured BEFORE executing the function,
	// the previous template is probably to blame
	if (lineNr == 'pre') {

		// Get the current templateName we didn't find
		temp = templateName;

		// Set the last templateName
		templateName = viewRender.lastTemplate || templateName;

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

	source = (this.source[templateName]||'').split('\n');

	// Handle user-made javascript errors
	// This used to only happen when lineNr was 0,
	// but that didn't give a good enough code hint
	if (source && error && typeof error == 'object') {

		// We used to get the line containing "at ViewRender.compiledView",
		// but templates can also contain functions, so use "eval at compile" instead
		temp = Blast.Bound.String.after(error.stack, 'eval at compile').split('\n')[0].trim();
		temp = Blast.Bound.RegExp.execAll(/:(\d+):(\d+)\)/g, temp);

		temp = temp[temp.length-1];

		// Finally: get the number of the line inside the compiled code
		if (temp) {
			codeNr = Number(temp[1]);
		}

		// Get the compiled code, with the comment in it
		temp = (this.templates[templateName]+'').split('\n')[codeNr-1];

		temp = /lineNr:(\d*)/.exec(temp);

		if (temp != null) {
			lineNr = Number(temp[1]);
		} else if (!lineNr && codeNr) {
			// No linenr found, even as a comment, so attempt to use the codeNr
			lineNr = codeNr;
		}

		// Also get the before stack
		before_stack = Blast.Bound.String.before(error.stack, 'eval at compile').split('\n');

		// Add all the lines, except the first (type of error) and the last
		for (i = 1; i < before_stack.length - 1; i++) {
			message += '  ' + before_stack[i] + '\n';
		}
	}

	start = lineNr - 3;
	stop = lineNr + 4;

	if (lineNr < 0) {
		linrNr = 0;
	}

	if (start < 0) {
		stop += Math.abs(start);
		start = 0;
	}

	if (stop > source.length) {
		stop = source.length;
	}

	message += '----------------------------------------------\n';

	for (i = start; i < stop; i++) {

		if (i == lineNr) {
			message += ' »»»';
		} else {
			message += '    ';
		}

		if (i < 10) {
			message += '   ' + i;
		} else if (i < 100) {
			message += '  ' + i;
		} else {
			message += ' ' + i;
		}

		message += ' | ' + source[i] + '\n';
	}

	if (typeof console !== 'undefined') {
		console.log(message);
	}
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

		if (!Bound.String.endsWith(url.pathname, '.css')) {
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

	if (config && config.root_path != null) {
		root_path = config.root_path;
	} else {
		root_path = this.root_path + this.script_path;
	}

	url = Classes.RURL.parse(path, root_path);

	if (!url.hostname || url.usedBaseProperty('hostname')) {
		let version = this.exposed('app_version');

		if (version) {
			url.param('v', version);
		}

		if (!Bound.String.endsWith(url.pathname, '.js')) {
			url.pathname += '.js';
		}

		if (config && config.theme && config.theme != 'default') {
			url.param('theme', config.theme);
		}
	}

	return url;
});

/**
 * Create a ViewRender instance
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
	Bound.Object.assign(this, settings);
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
 * Get hawkejs text content of a certain object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String|Object}      line
 * @param    {Hawkejs.Renderer}   renderer
 * @param    {Number}             level
 *
 * @return   {String}
 */
Hawkejs.getTextContent = function getTextContent(line, renderer, level) {

	var result,
	    temp;

	if (typeof line === 'string') {
		result = line;
	} else if (line) {
		if (line[Hawkejs.RESULT] != null) {
			result = line[Hawkejs.RESULT];
		} else if (line.toHawkejsString) {
			result = line.toHawkejsString(renderer);
		} else if ((temp = line.outerHTML) != null) {
			result = temp;
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
};


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
Hawkejs.getSafeText = function getSafeText(input) {

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
};

/**
 * Get the first element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array}   entries
 *
 * @return   {Element}
 */
Hawkejs.getFirstElement = function getFirstElement(entries) {

	var result;

	if (entries && entries.length) {
		let entry,
		    i;

		for (i = 0; i < entries.length; i++) {
			entry = entries[i];

			if (entry && entry.nodeName) {
				result = entry;
				break;
			}
		}
	}

	return result;
};

/**
 * Get elements for use in the browser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String|Object}      line
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Node}
 */
Hawkejs.getElementContent = function getElementContent(line, renderer) {

	var result;

	if (typeof line === 'string') {
		result = line;
	} else if (line) {
		if (line[Hawkejs.RESULT] != null) {
			result = getElementContent(line[Hawkejs.RESULT]);
		}
	}

	if (result == null) {
		result = line;
	}

	if (result && result.block_id && result.lines) {
		result = result.lines;
	}

	return result;
};

/**
 * Normalize children
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String|Object}      line
 * @param    {Hawkejs.Renderer}   renderer
 *
 * @return   {Node}
 */
Hawkejs.normalizeChildren = function normalizeChildren(element, renderer) {

	var replacement,
	    child,
	    i;

	for (i = 0; i < element.children.length; i++) {
		child = element.children[i];
		replacement = Hawkejs.getElementContent(child);

		if (child == replacement) {
			Hawkejs.normalizeChildren(child, renderer);
			continue;
		}

		if (Array.isArray(replacement)) {
			child.replaceWith.apply(child, replacement);
			i--;
		} else {
			child.replaceWith(replacement);
			i--;
		}
	}
};

/**
 * Create a text node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  2.0.0
 */
Hawkejs.createText = function createText(data) {

	if (data == null) {
		data = '';
	}

	if (Blast.isBrowser) {
		return document.createTextNode(data);
	}

	return new Blast.Classes.Hawkejs.Text(data);
};

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
Hawkejs.addClasses = function addClasses(element, class_name) {

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
};

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
Hawkejs.removeClasses = function removeClasses(element, class_name) {

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
};

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
Hawkejs.setAttributes = function setAttributes(element, attributes) {

	var key;

	for (key in attributes) {
		element.setAttribute(key, attributes[key]);
	}
};

/**
 * Make an element empty
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {HTMLElement}   element
 */
Hawkejs.removeChildren = function removeChildren(element) {

	if (Blast.isNode) {
		element.innerHTML = '';
		return;
	}

	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
};

/**
 * Replace the children of an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {HTMLElement}   element
 * @param    {Array}         new_children
 */
Hawkejs.replaceChildren = function replaceChildren(element, new_children) {

	var i;

	// First remove all existing children
	Hawkejs.removeChildren(element);

	// Make sure new_children is an array (or it'll skip elements on the client-side)
	new_children = Bound.Array.cast(new_children);

	for (i = 0; i < new_children.length; i++) {
		element.append(new_children[i]);
	}
};

/**
 * Get elements by attribute name/value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {HTMLElement}   element
 * @param    {String}        name
 * @param    {String}        value
 *
 * @return   {Array}
 */
Hawkejs.getElementsByAttribute = function getElementsByAttribute(element, name, value) {
	var check_value = arguments.length > 2;
	return _getElementsByAttribute([], check_value, element, name, value);
};

/**
 * Get elements by attribute name/value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array}         result
 * @param    {HTMLElement}   element
 * @param    {String}        name
 * @param    {String}        value
 *
 * @return   {Array}
 */
function _getElementsByAttribute(result, check_value, element, name, value) {

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

	for (i = 0; i < children.length; i++) {
		child = children[i];

		if (!child || !child.hasAttribute) {
			continue;
		}

		if (child.hasAttribute(name)) {
			if (!check_value || child.getAttribute(name) == value) {
				result.push(child);
			}
		}

		_getElementsByAttribute(result, check_value, child, name, value);
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
Hawkejs.claimSiblings = function claimSiblings(element, only_if_empty) {

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
};

/**
 * Execute the `next` function, but wait for optional promise
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Promise}   promise
 * @param    {Function}  next
 */
Hawkejs.doNext = function doNext(promise, next) {

	if (!promise) {
		return next();
	}

	if (promise.then) {
		Classes.Pledge.prototype.done.call(promise, next);
	} else {
		next();
	}
};

/**
 * Prepare line tasks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Promise}            promise
 * @param    {Array}              pre_tasks
 * @param    {Array}              tasks
 * @param    {Hawkejs.Renderer}   [renderer]
 */
Hawkejs.recurseLineTasks = function recurseLineTasks(lines, pre_tasks, tasks, renderer) {

	var i;

	// Iterate over the lines to find any placeholders
	for (i = 0; i < lines.length; i++) {

		if (!lines[i] || typeof lines[i] == 'string') {
			continue;
		}

		let line = lines[i];

		if (line[Hawkejs.PRE_ASSEMBLE]) {
			pre_tasks.push(function doPreTask(next) {
				let result = line[Hawkejs.PRE_ASSEMBLE](renderer);

				Hawkejs.doNext(result, next);
			});
		} else if (line[Hawkejs.RENDER_CONTENT]) {
			tasks.push(function doLineRenderContent(next) {
				let result = line[Hawkejs.RENDER_CONTENT](renderer);
				Hawkejs.doNext(result, next);
			});
		} else if (line.renderHawkejsContent) {
			tasks.push(function doRenderHawkejsContent(next) {
				let result = line.renderHawkejsContent(renderer);
				Hawkejs.doNext(result, next);
			});
		}

		if (line.children && line.children.length) {
			recurseLineTasks(line.children, pre_tasks, tasks, renderer);
		}
	}
};

/**
 * Set a cached method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Promise}   promise
 * @param    {Array}     pre_tasks
 * @param    {Array}     tasks
 */
Hawkejs.setCachedMethod = function setCachedMethod(target, name, fnc) {

	var result;

	if (!Main.RESULT_SYMBOLS[name]) {
		Main.RESULT_SYMBOLS[name] = Symbol('result');
	}

	result = Main.RESULT_SYMBOLS[name];

	if (typeof target == 'function') {
		Fn.setMethod(target, name, doMethod);
	} else {
		target[name] = doMethod;
	}

	function doMethod() {

		if (this[result] == null) {
			this[result] = fnc.call(this);
		}

		return this[result];
	};
};

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
 * @version  2.0.0
 *
 * @type     {Object}
 */
Main.VOID_ELEMENTS = {
	AREA       : true,
	BASE       : true,
	BR         : true,
	COL        : true,
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
	'!DOCTYPE' : true
};