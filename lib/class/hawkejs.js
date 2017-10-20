var Hawkejs,
    Blast,
    Utils,
    TAB,
    F;

if (typeof blastName != 'undefined') {
	Blast = require('protoblast')(true);
} else {
	Blast = require('protoblast')(false);
}

Utils = Blast.Bound;
TAB = '\t';
F = Blast.Collection.Function;

/**
 * The Hawkejs class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 */
Hawkejs = F.inherits('Informer', 'Hawkejs', function Hawkejs() {

	// Store protoblast object in here
	this.Blast = Blast;

	// Store utils in here
	this.Utils = Utils;

	// Add try/catch to inner template expressions
	this.try_template_expressions = true;

	// Default tags
	this.open = '<%';
	this.close = '%>';

	// The server root path
	this.root = '/';

	// The javascript path (relative to root)
	this.scriptPath = '';

	// The style path (relative to root)
	this.stylePath = '';

	// Relative path to the client file
	this.clientPath = 'hawkejs/hawkejs-client.js';

	// Client file download strategy
	// blocking   : download and execute in the head
	// preventing : downloading asynchronously, but preventing "ready" event
	// defer      : only execute after ready event
	this.strategy = 'preventing';

	this.files = {};
	this.commands = {};
	this.helpers = {};

	// Compiled templates go here
	this.templates = {};

	// Source templates go here
	this.source = {};

	// Compile hinders go here
	this.compileHinders = {};

	// Do the after init
	this.afterInit();
});

/**
 * Load the settings
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   settings
 */
Hawkejs.setMethod(function loadSettings(settings) {
	// Insert the settings
	Utils.Object.assign(this, settings);
});

/**
 * Register a render on the client side
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 */
Hawkejs.setMethod(function registerRender(options) {

	// Create a new scene
	if (!this.scene) this.scene = new Blast.Classes.Hawkejs.Scene(this);

	this.scene.registerRender(options);
});

/**
 * Turn a template into code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   source
 * @param    {String}   name
 *
 * @return   {Function}
 */
Hawkejs.setMethod(function interpretTemplate(source, name) {

	var block_code,
	    json_name,
	    result = '',
	    lines,
	    ltemp,
	    split,
	    temp,
	    line,
	    tab = '\t',
	    cmd,
	    i,
	    j;

	// Dissect the template
	lines = Utils.String.dissect(source, this.open, this.close);

	// Get the template name
	json_name = JSON.stringify(name || 'inline');

	for (i = 0; i < lines.length; i++) {
		line = lines[i];

		// "inside" refers to JS code in view templates
		if (line.type == 'inside') {

			// Error reporting
			result += tab + '__render.setErr(' + json_name + ',' + line.lineStart + ');\n';

			// Get the cmd keyword
			cmd = Blast.Bound.String.trimLeft(line.content).split(/ |\t|\n/)[0].trim();

			if (this.commands[cmd]) {

				// Trim the entire line
				temp = line.content.trim();

				// Split by spaces
				split = temp.split(/ |\t|\n/);

				// Remove the cmd keyword
				split.shift();

				result += tab + '__render.command(' + JSON.stringify(cmd) + ', [' + split.join(' ') + ']);\n';
			} else {

				// Split by newlines
				temp = line.content.split('\n');
				block_code = '';

				for (j = 0; j < temp.length; j++) {

					if (j > 0) {
						block_code += '\n';
					}

					// We can't execute the setErr function (because of multiline
					// expressions) but we can use comments, and some error
					// inspecting later
					block_code += tab + '/*lineNr:' + (line.lineStart+j) + '*/ ';

					ltemp = temp[j].trim();
					temp[j] = ltemp;

					// If the line contains a regular comment,
					// add a newline
					if (ltemp.indexOf('//') > -1) {
						ltemp += '\n' + tab;
					}

					block_code += ltemp;
				}

				if (temp[0][0] == '}' || temp[temp.length-1][temp[temp.length-1].length-1] == '{') {
					// Skip braces, unfinished lines
				} else if (block_code) {

					// Make sure code blocks are complete
					if (Blast.Bound.String.count(block_code, '{') == Blast.Bound.String.count(block_code, '}')) {

						// Make sure opening braces come before closing ones
						// Equal sign is used when there are none, so they're both -1
						if (this.try_template_expressions && block_code.indexOf('{') <= block_code.indexOf('}')) {
							block_code = tab + 'try { ' + block_code + '}\n' + tab + 'catch (err) {';
							block_code += '__render.hawkejs.handleError(__render, __render.errName, __render.errLine, err);'
							block_code += '}';
						}
					}
				}

				result += block_code + ';\n';
			}
		} else {
			result += tab + '__render.print(' + JSON.stringify(line.content) + ');\n';
		}
	}

	return result;
});

/**
 * Compile a source to an executable function
 * and store in in the templates object.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   options
 * @param    {String}   options.template_name
 * @param    {String}   options.template       Template source to compile, or ...
 * @param    {Function} options.compiled       Already compiled inner template
 * @param    {Array}    options.call           Call already compiled template
 * @param    {Boolean}  options.evaluate       Eval code, return function (true)
 * @param    {Boolean}  options.cache          Cache compiled template (true)
 *
 * @return   {Function|String}
 */
Hawkejs.setMethod(function compile(options) {

	var template_code,
	    json_name,
	    compiled,
	    source,
	    scope,
	    code,
	    key,
	    i;

	if (!options) {
		options = {};
	}

	json_name = JSON.stringify(options.template_name);

	code = 'compiled = function compiledView(vars, helper){\n';
	code += TAB + 'var __render = this;\n';
	code += TAB + '__render.timeStart(' + json_name + ');\n';

	if (options.scope && options.scope.length) {
		for (i = 0; i < options.scope.length; i++) {
			scope = options.scope[i];

			for (key in scope.variables) {
				code += TAB + 'var ' + key + ' = vars.__scope[' + i + '].variables["' + key + '"];\n';
			}
		}
	}

	if (options.compiled) {

		// We already have a compiled function that needs to be wrapped
		template_code = '' + options.compiled;

		// The compiled code is actually a function that we need to call
		if (options.call) {
			template_code = '(' + template_code + this.renameVars('(' + options.call + ')') + ');';
		}

		if (typeof options.cache == 'undefined') {
			options.cache = false;
		}
	} else if (options.template) {
		source = options.template;
		template_code = this.interpretTemplate(options.template, options.template_name);
		template_code = this.renameVars(template_code);
	}

	// Add the compiled template to the code
	code += template_code;

	// Call the timeEnd method
	code += TAB + '__render.timeEnd(' + json_name + ');\n';

	// End of the function
	code += '}';

	if (options.evaluate !== false) {
		try {
			eval(code);
		} catch(err) {

			if (typeof console !== 'undefined') {
				console.log('Found error when compiling view:')
				console.log(err);
				console.log(code);
			}

			compiled = function errorView() {
				__render.print('This template could not be compiled');
			};
		}

		if (options.cache !== false) {
			this.templates[options.template_name] = compiled;
			this.source[options.template_name] = source;
			compiled.sourceName = options.template_name;
		}

		return compiled;
	}

	return code;
});

/**
 * Because 'with' is no longer used, variable references have
 * to be modified. This function does that.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   code
 * @param    {Number}   level
 *
 * @return   {String}
 */
Hawkejs.setMethod(function renameVars(code, level) {

	var result = '',
	    tokens = Utils.Function.tokenize(code, true),
	    prevToken,
	    nextToken,
	    fncVars,
	    fncOpening,
	    curlClosed,
	    fncTokens,
	    fncCurls,
	    curlOpen,
	    fncExpec,
	    fncOArgs,
	    fncNames,
	    fncOpen,
	    fncName,
	    token,
	    skip,
	    arr,
	    obj,
	    i,
	    j;

	// Variables per function scope
	fncVars = [];
	fncNames = [];
	fncTokens = [];
	fncVars.push(['compiledView', 'helper', 'this', '__render', 'vars']);

	skip = ['console'];

	// Keep a record of how many curlys were open when these functions started
	fncCurls = [];

	// The open fnc level
	fncOpen = 0;

	// count the open/closed curls
	curlOpen = 0;

	if (typeof level !== 'number') {
		level = 0;
	}

	for (i = 0; i < tokens.length; i++) {

		// Get the current token
		token = tokens[i];

		if (token.type == 'curly') {
			if (token.value == '{') {
				curlOpen++;
			} else {
				curlOpen--;
			}

			// A function has been expected, store the open token
			if (fncExpec) {
				fncTokens[fncOpen] = token;
				fncExpec = false;
			}

			// There are, again, as many curls open as there were whe the
			// curent function was created, so it must be closed
			if (fncCurls[fncOpen] === curlOpen) {

				// Get all the scoped variables in this function
				arr = fncVars[fncVars.length - 1];
				obj = '';

				for (j = 0; j < arr.length; j++) {
					if (arr[j] == fncName) continue;
					if (fncNames.indexOf(arr[j]) > -1) continue;

					if (obj) {
						obj += ',';
					} else {
						obj = '{';
					}

					obj += arr[j] + ':' + arr[j];
				}

				if (!obj) obj = '{';

				obj += '}';

				// Each nested function should register its scoped variables
				fncTokens[fncOpen].value += '(__render.regFnSc(' + (fncOpen - 1) + ',' + JSON.stringify(fncName || '') + ',' + obj + '));';
				fncName = '';

				// Remove those function entries
				fncCurls.splice(fncOpen, 1);
				fncVars.splice(fncOpen, 1);
				fncNames.length = fncOpen;

				fncOpen--;
			}
		}

		// Skip whitespaces
		if (token.type == 'whitespace') {
			continue;
		}

		if (token.type == 'keyword' && (token.value == 'function' || token.value == 'catch')) {

			fncOpening = true;
			fncOpen++;

			// When this function was created, there were `curlOpen`
			// amount of blocks open
			fncCurls[fncOpen] = curlOpen;

			// Overwrite the entry for this function level,
			// but only if it's not the 0 level
			if (fncOpen > 0) {
				fncVars[fncOpen] = [];
			}
			continue;
		}

		if (fncOpening && token.type == 'name') {

			// Store this name as the current function name
			if (!fncOArgs) {
				fncName = token.value;
				fncNames[fncOpen] = fncName;
			}

			// Add this function name to the do-not-modify vars
			fncVars[fncOpen].push(token.value);
			continue;
		}

		if (fncOpening && token.type == 'parens') {
			if (token.value == ')') {
				fncOpening = false;
				fncExpec = true;
				fncOArgs = false;
			} else {
				fncOArgs = true;
			}

			continue;
		}

		// Remove var keywords
		if (token.type == 'keyword' && token.value == 'var') {
			token.value = '';
		}

		// Get the next token
		nextToken = tokens[i+1];

		// Make sure the next token isn't a whitespace
		if (nextToken && nextToken.type == 'whitespace') {
			nextToken = tokens[i+2];
		}

		// If the token is a name, see if we have to modify it
		if (token.type == 'name') {


			// We don't modify property names
			if (!prevToken || (prevToken && prevToken.value != '.')) {

				if (nextToken && nextToken.type == 'punct' && nextToken.value == ':') {
					// Skip key names in object literals
				} else if (Hawkejs.helpers[token.value] != null) {
					token.value = 'helper.' + token.value;
				} else if (Blast.Classes.Hawkejs.ViewRender.prototype['view_' + token.value]) {
					// If the method exists prefixed with `view_`, use that
					token.value = '__render.view_' + token.value;
				} else if (Blast.Classes.Hawkejs.ViewRender.prototype[token.value]) {
					// Add the correct context for viewrender methods
					token.value = '__render.' + token.value;
				} else if (typeof Blast.Classes[token.value] !== 'undefined' || skip.indexOf(token.value) > -1) {
					// Skip important classes
				} else {

					// See that this name hasn't been defined in any scope
					if (Utils.Array.flatten(fncVars).indexOf(token.value) > -1) {
						continue;
					}

					// All the rest are variables that should be changed
					token.value = 'vars.' + token.value;
				}
			}
		}

		prevToken = token;
	}

	for (i = 0; i < tokens.length; i++) {
		result += tokens[i].value;
	}

	return result;
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
Hawkejs.setMethod(function handleError(viewRender, templateName, lineNr, error) {

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
	if (source && error && error.name == 'TypeError') {

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
		} else {
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
 * Get the source of a template
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}     templateName
 * @param    {Function}   callback
 */
Hawkejs.setMethod(function getSource(templateName, callback) {

	var that = this,
	    hinder,
	    bomb;

	if (templateName == null) {
		return callback(new Error('Undefined templates variable requested'));
	}

	// Create the source cache if it doesn't exist yet
	if (this.templateSourceCache == null) {
		this.templateSourceCache = {};
	}

	if (this.templateSourceHinder == null) {
		this.templateSourceHinder = {};
	}

	// Return sourcecode from the cache if it's already available
	if (!this._debug && this.templateSourceCache[templateName]) {
		Blast.setImmediate(function gotCache() {

			// Clear out old hinder objects
			if (that.templateSourceHinder[templateName] != null) {
				delete that.templateSourceHinder[templateName];
			}

			callback(null, that.templateSourceCache[templateName]);
		});
		return;
	}

	if (this.templateSourceHinder[templateName] != null) {
		this.templateSourceHinder[templateName].push(function afterWorker(err) {
			callback(err, that.templateSourceCache[templateName]);
		});
		return;
	}

	hinder = Utils.Function.hinder(function workerGetSource(done) {

		// We did not find the source in the cache,
		// so call the server or client function to get it
		that.getSourceInternal(templateName, function gotResponse(err, source) {

			// Store the source view in the cache
			that.templateSourceCache[templateName] = source;

			// Call the first getSource callback
			callback(err, source);

			// Unhinder all pushed functions
			done(err);
		});
	});

	this.templateSourceHinder[templateName] = hinder;
});

/**
 * Get the source of a template
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {Array}      names
 * @param    {Function}   callback
 */
Hawkejs.setMethod(function getFirstAvailableSource(names, callback) {

	var that = this,
	    found_source,
	    found_name,
	    iter;

	if (!Array.isArray(names)) {
		names = [names];
	} else {
		names = Utils.Array.flatten(names);
	}

	// Create the source cache if it doesn't exist yet
	if (this.templateSourceCache == null) {
		this.templateSourceCache = {};
	}

	if (!this._debug && this.templateSourceCache[names[0]]) {
		return Blast.setImmediate(function gotCache() {
			return callback(null, {
				name   : names[0],
				source : that.templateSourceCache[names[0]]
			});
		});
	}

	this.getFirstAvailableInternalSource(names, function gotResult(err, result) {

		if (err) {
			return callback(err);
		}

		callback(null, result);
	});
});

/**
 * Get the compiled template function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {String|Array}   names
 * @param    {Function}       callback
 */
Hawkejs.setMethod(function getFirstAvailableCompiled(names, callback) {

	var that = this;

	// If the given names is actually function, just return that
	if (typeof names == 'function') {
		return Blast.setImmediate(function alreadyGotCompiled(){
			callback(null, names);
		});
	}

	this.getFirstAvailableSource(names, function gotCompiled(err, result) {

		var compiled;

		if (err) {
			return callback(err);
		}

		if (!that._debug && that.templates[result.name]) {
			return callback(null, {
				name     : result.name,
				compiled : that.templates[result.name]
			});
		}

		compiled = that.compile({
			template_name : result.name,
			template      : result.source
		});

		result.compiled = compiled;

		that.templates[result.name] = compiled;

		callback(null, result);
	});
});

/**
 * Compile the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}       name
 * @param    {Function}     callback
 */
Hawkejs.setMethod(function getCompiled(template_name, callback) {

	var that = this;

	this.getFirstAvailableCompiled(template_name, function gotResult(err, result) {

		if (err) {
			return callback(err);
		}

		callback(null, result.compiled);
	});
});

/**
 * Create a ViewRender instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {ViewRender}
 */
Hawkejs.setMethod(function createViewRender() {
	return new Blast.Classes.Hawkejs.ViewRender(this);
});

/**
 * Render the wanted template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.2
 *
 * @param    {String|ViewRender|Function}   template
 * @param    {Object}                       variables
 * @param    {Function}                     callback
 *
 * @return   {ViewRender}
 */
Hawkejs.setMethod(function render(template, variables, callback) {

	var template_type,
	    view_render;

	if (!template) {
		throw new Error('No valid template has been given');
	}

	template_type = typeof template;

	if (template_type == 'string' || template_type == 'function') {
		// Create new ViewRender instance
		view_render = new Blast.Classes.Hawkejs.ViewRender(this);
	} else if (template_type == 'object' && template.constructor.name == 'ViewRender') {
		view_render = template;
		template = null;
	}

	if (typeof variables == 'function') {
		callback = variables;
		variables = null;
	}

	// Start executing the template code
	Blast.setImmediate(function immediateRender() {
		view_render.beginRender(template, variables, callback);
	});

	return view_render;
});

/**
 * After init (to register commands)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.2
 */
Hawkejs.setMethod(function afterInit() {

	// Register the basic echo command
	this.registerCommand('=', function echo(message) {
		this.print(message);
	});
});

/**
 * Register a command in the current instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}    name
 * @param    {Function}  fnc
 */
Hawkejs.setMethod(function registerCommand(name, fnc) {
	this.commands[name] = fnc;
});

/**
 * Register helper class.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}    name
 * @param    {Function}  fnc
 */
Hawkejs.setMethod(function registerHelper(name, fnc) {
	this.helpers[name] = fnc;
});

/**
 * Set static helpers object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.setStatic('helpers', {});

/**
 * Set static custom elements object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Hawkejs.setStatic('elements', {});

/**
 * Find a custom element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.2
 */
Hawkejs.setStatic(function createElement(name) {

	var result,
	    modified,
	    constructor;

	if (typeof name == 'object') {
		constructor = name.constructor;
	} else if (Hawkejs.elements[name]) {
		// See if the element can be found by the identical supplied name
		constructor = Hawkejs.elements[name];
	}

	if (!constructor) {
		// Else modify the name
		modified = Blast.Bound.String.before(name, 'Element') || name;

		// Add underscores
		modified = Blast.Bound.String.underscore(modified);

		// Turn underscores into dashes
		modified = Blast.Bound.String.dasherize(modified);

		if (Hawkejs.elements[modified]) {
			constructor = Hawkejs.elements[modified];
		}
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
			result = document.createElement(name);
		} else {
			result = new Blast.Classes.Hawkejs.HTMLElement();
			result.nodeName = name;
			result.tagName = name;
		}
	}

	return result;
});

/**
 * Add classes to a classlist
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.1
 * @version  1.1.1
 *
 * @param    {HTMLElement}   element
 * @param    {String|Array}  class_name
 */
Hawkejs.setStatic(function addClasses(element, class_name) {

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
			list.add(classes[i]);
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
Hawkejs.setStatic(function setAttributes(element, attributes) {

	var key;

	for (key in attributes) {
		element.setAttribute(key, attributes[key]);
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
Hawkejs.setStatic(function removeClasses(element, class_name) {

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
 * Function that will pass of logging to the correct function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.logHandler = function logHandler(_level) {

	var level,
	    args,
	    skip,
	    i;

	if (!Hawkejs.DEBUG || !Hawkejs.log) {
		return;
	}

	if (typeof _level !== 'number') {
		level = 0;
		skip = 0;
	} else {
		level = _level;
		skip = 1;
	}

	args = new Array(arguments.length - skip);

	for (i = 0; i < args.length; i++) {
		args[i] = arguments[i + skip];
	}

	Hawkejs.log(level, args);
};

/**
 * Get hawkejs text content of a certain object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String|Object}   line
 */
Hawkejs.getTextContent = function getTextContent(line, viewRender) {

	var result;

	if (typeof line === 'string') {
		result = line;
	} else {
		if (line instanceof Blast.Classes.Hawkejs.Placeholder) {
			result = line.getResult();
		} else if (line && line.toHawkejsString) {
			result = line.toHawkejsString(viewRender);
		} else if (line && line.outerHTML) {
			result = line.outerHTML;
		} else {
			result = '' + line;
		}
	}

	// Recursively get the text content
	if (typeof result == 'object') {
		result = Hawkejs.getTextContent(result, viewRender);
	}

	return result;
};

Hawkejs.Blast = Blast;
Hawkejs.Utils = Blast.Bound;
Hawkejs.DEBUG = false;

module.exports = Blast.Classes.Hawkejs;