var Nuclei = require('nuclei').Nuclei,
    Hawkevents = require('hawkevents'),
    Blast      = require('protoblast')(true), // Should be false when dev is done
    Utils      = Blast.Bound,
    HawkejsClass,
    Hawkejs;

/**
 * The Hawkejs class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
HawkejsClass = Hawkejs = Nuclei.extend(function Hawkejs() {

	// Store protoblast object in here
	this.Blast = Blast;

	// Store utils in here
	this.Utils = Blast.Bound;

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

	/**
	 * The Hawkejs instance constructor
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	this.init = function init() {

		// Compiled templates go here
		this.templates = {};

		// Source templates to here
		this.source = {};
	};

	/**
	 * Load the settings
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}   settings
	 */
	this.loadSettings = function loadSettings(settings) {
		// Insert the settings
		Utils.Object.assign(this, settings);
	};

	/**
	 * Register a render on the client side
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	this.registerRender = function registerRender(options) {

		// Create a new scene
		if (!this.scene) this.scene = new HawkejsClass.Scene(this);

		this.scene.registerRender(options);
	};

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
	this.compile = function compile(name, source) {

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

		code += tab + 'this.timeStart(' + strName + ');\n';

		lines = Utils.String.dissect(source, this.open, this.close);

		for (i = 0; i < lines.length; i++) {
			line = lines[i];

			if (line.type == 'inside') {

				// Error reporting
				code += tab + 'this.setErr(' + strName + ',' + line.lineStart + ');\n';

				// Get the cmd keyword
				cmd = line.content.trimLeft().split(' ')[0];

				if (this.commands[cmd]) {

					// Trim the entire line
					temp = line.content.trim();

					// Split by spaces
					split = temp.split(' ');

					// Remove the cmd keyword
					split.shift();

					code += tab + 'this.command(' + JSON.stringify(cmd) + ', [' + split.join(' ') + ']);\n';
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
				code += tab + 'this.print(' + JSON.stringify(line.content) + ');\n';
			}
		}

		// Remove 1 tab
		tab = tab.slice(0,tab.length-1);

		code += tab + 'this.timeEnd(' + strName + ');\n';

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
				this.print('This template could not be compiled');
			};
		}

		if (named) {
			this.templates[name] = compiled;
			this.source[name] = source;
		}

		return compiled;
	};

	/**
	 * Because 'with' is no longer used, variable references have
	 * to be modified. This function does that.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   code
	 *
	 * @return   {String}
	 */
	this.renameVars = function renameVars(code) {

		var result = '',
		    tokens = Utils.Function.tokenize(code, true),
		    prevToken,
		    nextToken,
		    token,
		    i;

		for (i = 0; i < tokens.length; i++) {

			// Get the current token
			token = tokens[i];

			// Skip whitespaces
			if (token.type == 'whitespace') {
				continue;
			}

			// Get the next token
			nextToken = tokens[i+1];

			// Make sure the next token isn't a whitespace
			if (nextToken && nextToken.type == 'whitespace') {
				nextToken = tokens[i+2];
			}

			// If the token is a name, see if we have to modifie it
			if (token.type == 'name') {

				// We don't modify property names
				if (prevToken && prevToken.value != '.') {

					if (nextToken && nextToken.type == 'punct' && nextToken.value == ':') {
						// Skip key names in object literals
					} else if (HawkejsClass.ViewRender.prototype[token.value]) {
						// Add the correct context for viewrender methods
						token.value = 'this.' + token.value;
					} else if (typeof Blast.Globals[token.value] !== 'undefined') {
						// Skip global stuff
					} else {

						// All the rest are variables
						switch(token.value) {

							// These names should not be modified
							case 'compiledView':
							case 'vars':
							case 'helper':
							case 'this':
								break;

							default:
								token.value = 'vars.' + token.value;
						}
					}
				}
			}

			prevToken = token;
		}

		for (i = 0; i < tokens.length; i++) {
			result += tokens[i].value;
		}

		return result;
	};

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
	this.handleError = function handleError(viewRender, templateName, lineNr, error) {

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

			lineNr = Number(/lineNr:(\d+?)/.exec(temp)[1]);
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
	};

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
	this.getSource = function getSource(templateName, callback) {

		if (!this.templateSourceCache) {
			this.templateSourceCache = {};
		}

		if (this.templateSourceCache[templateName]) {
			return setImmediate(callback.bind(this, null, this.templateSourceCache[templateName]));
		}

		// We did not find the source in the cache,
		// so call the server or client function to get it
		this.getSourceInternal(templateName, callback);
	};

	/**
	 * Get the compiled template function
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    templateName
	 * @param    {Function}  callback
	 */
	this.getCompiled = function getCompiled(templateName, callback) {

		var that = this;

		// If the templateName is actually function, just return that
		if (typeof templateName == 'function') {
			return setImmediate(function alreadyGotCompiled(){callback(null, templateName)});
		}

		if (this.templates[templateName]) {
			return setImmediate(function gotCachedTemplate(){callback(null, that.templates[templateName])});
		}

		this.getSource(templateName, function gotTemplateSource(err, source) {

			if (err) {
				return callback(err);
			}

			var compiled = that.compile(templateName, source);
			that.templates[templateName] = compiled;

			callback(null, compiled);
		});
	};

	/**
	 * Create a ViewRender instance
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {ViewRender}
	 */
	this.createViewRender = function createViewRender() {
		return new HawkejsClass.ViewRender(this);
	};

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
	this.render = function render(templateName, variables, callback) {

		var viewRender;

		if (!templateName) {
			throw new Error('No valid template name has been given');
		}

		if (typeof templateName == 'string') {
			// Create new ViewRender instance
			viewRender = new HawkejsClass.ViewRender(this);
		} else if (typeof templateName == 'object' && templateName.constructor.name == 'ViewRender') {
			viewRender = templateName;
			templateName = null;
		}

		if (typeof variables == 'function') {
			callback = variables;
			variables = null;
		}

		// @todo: give this a nice place for Express
		//viewRender.prepare(variables.hawkejs.req, variables.hawkejs.res);

		// Start executing the template code
		viewRender.beginRender(templateName, variables, callback);

		return viewRender;
	};
}, {also: Blast.Classes.Informer});

/**
 * Create classes using Nuclei
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function}   fnc
 */
Hawkejs.create = function create(fnc, options) {
	return Nuclei.extend(fnc, options);
};

/**
 * Register commands.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}    name
 * @param    {Function}  fnc
 */
Hawkejs.registerCommand = function registerCommand(name, fnc) {
	Hawkejs.prototype.commands[name] = fnc;
};

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
Hawkejs.registerHelper = function registerHelper(name, fnc) {
	Hawkejs.prototype.helpers[name] = fnc;
};

/**
 * The basic echo command
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.registerCommand('=', function echo(message) {
	this.print(message);
});

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

Hawkejs.Hawkevents = Hawkevents;
Hawkejs.Blast = Blast;
Hawkejs.Utils = Blast.Bound;
Hawkejs.DEBUG = true;


module.exports = Hawkejs;