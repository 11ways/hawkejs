var Blast      = require('protoblast')(true), // Should be false when dev is done
    Utils      = Blast.Bound,
    F          = Blast.Collection.Function,
    Hawkejs;

/**
 * The Hawkejs class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs = Blast.Classes.Informer.extend(function Hawkejs() {

	// Call the super constructor
	Hawkejs.super.call(this);

	// Store protoblast object in here
	this.Blast = Blast;

	// Store utils in here
	this.Utils = Utils;

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
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.setMethod(function registerRender(options) {

	// Create a new scene
	if (!this.scene) this.scene = new Hawkejs.Scene(this);

	this.scene.registerRender(options);
});

/**
 * Compile a source to an executable function
 * and store in in the templates object.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {String}   source
 *
 * @return   {Function}
 */
Hawkejs.setMethod(function compile(name, source) {

	var compiled,
	    strName,
	    named,
	    lines,
	    split,
	    line,
	    code,
	    temp,
	    tab,
	    cmd,
	    arg,
	    i,
	    j;

	if (typeof source === 'undefined') {
		named = false;
		source = name;
		name = 'inline';
	} else {
		named = true;
	}

	// Convert the template name to a JSON string we can use for eval
	strName = JSON.stringify(name);

	// Set the beginning tab indent
	tab = '\t';

	code = 'compiled = function compiledView(vars, helper){\n';

	code += tab + '__render.timeStart(' + strName + ');\n';

	lines = Utils.String.dissect(source, this.open, this.close);

	for (i = 0; i < lines.length; i++) {
		line = lines[i];

		if (line.type == 'inside') {

			// Error reporting
			code += tab + '__render.setErr(' + strName + ',' + line.lineStart + ');\n';

			// Get the cmd keyword
			cmd = line.content.trimLeft().split(' ')[0];

			if (this.commands[cmd]) {

				// Trim the entire line
				temp = line.content.trim();

				// Split by spaces
				split = temp.split(' ');

				// Remove the cmd keyword
				split.shift();

				code += tab + '__render.command(' + JSON.stringify(cmd) + ', [' + split.join(' ') + ']);\n';
			} else {

				// Split by newlines
				temp = line.content.split('\n');

				for (j = 0; j < temp.length; j++) {

					if (j > 0) {
						code += '\n';
					}

					// We can't execute the setErr function (because of multiline
					// expressions) but we can use comments, and some error
					// inspecting later
					code += tab + '/*lineNr:' + (line.lineStart+j) + '*/ ' + temp[j].trim();
				}

				code += ';\n';
			}

		} else {
			code += tab + '__render.print(' + JSON.stringify(line.content) + ');\n';
		}
	}

	// Remove 1 tab
	tab = tab.slice(0,tab.length-1);

	code += tab + '__render.timeEnd(' + strName + ');\n';

	code += '}'; // End of the function

	// Rename the variables inside the code
	code = this.renameVars(code);

	try {
		eval(code);
	} catch(err) {
		console.log('Found error when compiling view:')
		console.log(err);
		console.log(code);

		compiled = function errorView() {
			__render.print('This template could not be compiled');
		};
	}

	if (named) {
		this.templates[name] = compiled;
		this.source[name] = source;
		compiled.sourceName = name;
	}

	return compiled;
});

/**
 * Because 'with' is no longer used, variable references have
 * to be modified. This function does that.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
	    fncCurls,
	    curlOpen,
	    fncOpen,
	    opened,
	    token,
	    i;

	// Variables per function scope
	fncVars = [];
	fncVars.push(['compiledView', 'helper', 'this', '__render', 'vars']);

	// Keep a record of how many curlys were open when these functions started
	fncCurls = [];

	// The open fnc level
	fncOpen = -1;

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

			// There are, again, as many curls open as there were whe the
			// curent function was created, so it must be closed
			if (fncCurls[fncOpen] === curlOpen) {

				// Remove those function entries
				fncCurls.splice(fncOpen, 1);
				fncVars.splice(fncOpen, 1);

				fncOpen--;
			}

			// Add a `this` alias once the main function block is opened
			if (!opened) {
				opened = true;
				token.value += '\n\tvar __render = this;\n';
			}
		}

		// Skip whitespaces
		if (token.type == 'whitespace') {
			continue;
		}

		if (token.type == 'keyword' && token.value == 'function') {

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
			// Add this function name to the do-not-modify vars
			fncVars[fncOpen].push(token.value);
			continue;
		}

		if (fncOpening && token.type == 'parens') {
			if (token.value == ')') {
				fncOpening = false;
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
			if (prevToken && prevToken.value != '.') {

				if (nextToken && nextToken.type == 'punct' && nextToken.value == ':') {
					// Skip key names in object literals
				} else if (Hawkejs.helpers[token.value] != null) {
					token.value = 'helper.' + token.value;
				} else if (Hawkejs.ViewRender.prototype[token.value]) {
					// Add the correct context for viewrender methods
					token.value = '__render.' + token.value;
				} else if (typeof Blast.Globals[token.value] !== 'undefined') {
					// Skip global stuff
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {ViewRender}  viewRender
 * @param    {String}      templateName
 * @param    {Number}      lineNr
 * @param    {Error}       error
 */
Hawkejs.setMethod(function handleError(viewRender, templateName, lineNr, error) {

	var message,
	    codeNr,
	    source,
	    start,
	    stop,
	    temp,
	    i;

	if (!templateName) {
		return console.log(error);
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

	message = '\nError inside »' + templateName + '« template\n' + error + '\n';

	source = (this.source[templateName]||'').split('\n');

	// Handle user-made javascript errors
	if (source && lineNr == 0 && error && error.name == 'TypeError') {

		temp = Blast.Bound.String.after(error.stack, 'at ViewRender.compiledView').split('\n')[0].trim();
		temp = Blast.Bound.RegExp.execAll(/:(\d+):(\d+)\)/g, temp);
		temp = temp[temp.length-1];

		// Finally: get the number of the line inside the compiled code
		if (temp) {
			codeNr = Number(temp[1]);
		}

		// Get the compiled code, with the comment in it
		temp = (this.templates[templateName]+'').split('\n')[codeNr-1];

		temp = /lineNr:(\d+?)/.exec(temp);

		if (temp != null) {
			lineNr = Number(temp[1]);
		} else {
			// No linenr found, even as a comment, so attempt to use the codeNr
			lineNr = codeNr;
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

	console.log(message);
});

/**
 * Get the source of a template
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}     templateName
 * @param    {Function}   callback
 */
Hawkejs.setMethod(function getSource(templateName, callback) {

	var that = this,
	    hinder;

	// Create the source cache if it doesn't exist yet
	if (this.templateSourceCache == null) {
		this.templateSourceCache = {};
	}

	if (this.templateSourceHinder == null) {
		this.templateSourceHinder = {};
	}

	// Return sourcecode from the cache if it's already available
	if (this.templateSourceCache[templateName]) {
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
		this.templateSourceHinder[templateName].push(function afterWorker() {
			that.getSource(templateName, callback);
		});
		return;
	}

	hinder = Function.hinder(function workerGetSource(done) {

		// We did not find the source in the cache,
		// so call the server or client function to get it
		that.getSourceInternal(templateName, function gotResponse(err, source) {

			// Store the source view in the cache
			that.templateSourceCache[templateName] = source;

			// Call the first getSource callback
			callback(err, source);

			// Unhinder all pushed functions
			done();
		});
	});

	this.templateSourceHinder[templateName] = hinder;
});

/**
 * Get the compiled template function
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String|Array}   names
 * @param    {Function}       callback
 */
Hawkejs.setMethod(function getCompiled(names, callback) {

	var that = this,
	    compiled,
	    gotErr,
	    iter;

	// If the given names is actually function, just return that
	if (typeof names == 'function') {
		return Blast.setImmediate(function alreadyGotCompiled(){callback(null, names)});
	}

	if (!Array.isArray(names)) {
		names = [names];
	} else {
		names = Utils.Array.flatten(names);
	}

	iter = new Blast.Classes.Iterator(names);

	Function.while(function test() {
		return compiled == null && iter.hasNext();
	}, function getCompiledTask(next) {

		var templateName = iter.next().value,
		    hinder;

		// Callback already compiled templates
		if (that.templates[templateName] != null) {
			compiled = that.templates[templateName];
			return next();
		}

		if (that.compileHinders[templateName]) {
			// Wait for the main worker to compile the template
			that.compileHinders[templateName].push(function afterWorker() {
				compiled = that.templates[templateName];
				next();
			});
			return;
		}

		hinder = Function.hinder(function worker(done) {
			that.getSource(templateName, function gotTemplateSource(err, source) {

				if (err) {
					gotErr = err;
					return next();
				}

				if (source != null) {
					compiled = that.compile(templateName, source);
					that.templates[templateName] = compiled;
				}

				next();
				done();
			});
		});

		that.compileHinders[templateName] = hinder;
	}, function finished() {

		var err;

		if (!compiled) {
			// @todo: default compiled error template
			callback(gotErr);
		} else {
			callback(null, compiled);
		}
	});
});

/**
 * Create a ViewRender instance
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {ViewRender}
 */
Hawkejs.setMethod(function createViewRender() {
	return new Hawkejs.ViewRender(this);
});

/**
 * Render the wanted template
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String|ViewRender}    templateName
 * @param    {Object}               variables
 * @param    {Function}             callback
 *
 * @return   {ViewRender}
 */
Hawkejs.setMethod(function render(templateName, variables, callback) {

	var viewRender;

	if (!templateName) {
		throw new Error('No valid template name has been given');
	}

	if (typeof templateName == 'string') {
		// Create new ViewRender instance
		viewRender = new Hawkejs.ViewRender(this);
	} else if (typeof templateName == 'object' && templateName.constructor.name == 'ViewRender') {
		viewRender = templateName;
		templateName = null;
	}

	if (typeof variables == 'function') {
		callback = variables;
		variables = null;
	}

	// Start executing the template code
	Blast.setImmediate(function immediateRender() {
		viewRender.beginRender(templateName, variables, callback);
	});

	return viewRender;
});

/**
 * After init (to register commands)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.setMethod(function afterInit() {

	// Register the basic echo command
	this.registerCommand('=', function echo(message) {
		this.print(message);
	})
});

/**
 * Register a command in the current instance
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.setStatic('helpers', {});

/**
 * Function that will pass of logging to the correct function
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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

Hawkejs.Blast = Blast;
Hawkejs.Utils = Blast.Bound;
Hawkejs.DEBUG = false;

module.exports = Hawkejs;