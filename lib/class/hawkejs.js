var async  = require('async'),
    Nuclei = require('nuclei').Nuclei,
    Hawkevents = require('hawkevents'),
    Blast      = require('protoblast')(false),
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

	// Relative path to the client file
	this.clientPath = 'hawkejs/hawkejs-client.js';

	// jQuery fallback
	this.jqueryPath = '';

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
		    i;

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
				//code += 'this.errLine = ' + line.lineStart + ';this.errName = ' + JSON.stringify(name) + ';';
				code += tab + 'this.setErr(' + strName + ',' + line.lineStart + ');\n';

				// Trim the right spaces
				temp = line.content.trimRight();

				// Split by spaces
				split = temp.split(' ');

				// Get the cmd keyword
				cmd = split[0];

				if (this.commands[cmd]) {
					split.shift();
					code += tab + 'this.command(' + JSON.stringify(cmd) + ', [' + split.join(' ') + ']);\n';
				} else {
					code += tab + temp.trimLeft() + ';\n';
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
			console.log(err);
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
	 * @param    {String}   templateName
	 * @param    {Number}   lineNr
	 * @param    {Error}    error
	 */
	this.handleError = function handleError(templateName, lineNr, error) {

		var message,
		    source,
		    start,
		    stop,
		    i;

		if (!templateName) {
			return console.log(error);
		}

		message = '\nError inside »' + templateName + '« template\n' + error + '\n';
		source = this.source[templateName].split('\n');

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
			return setImmediate(function(){callback(null, templateName)});
		}

		if (this.templates[templateName]) {
			return setImmediate(function(){callback(null, this.templates[templateName])});
		}

		this.getSource(templateName, function(err, source) {

			if (err) {
				return callback(err);
			}

			var compiled = that.compile(templateName, source);
			that.templates[templateName] = compiled;

			callback(null, compiled);
		});
	};

	/**
	 * Render the wanted template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    templateName
	 * @param    {Object}    variables
	 * @param    {Function}  callback
	 *
	 * @return   {ViewRender}
	 */
	this.render = function render(templateName, variables, callback) {

		// Create a new ViewRender object
		var viewRender = new HawkejsClass.ViewRender(this),
		    that = this;

		if (typeof variables == 'function') {
			callback = variables;
			variables = {};
		}

		// Start executing the template code
		viewRender.execute(templateName, variables, true);

		// If a callback has been given, make sure it gets the html
		if (callback) {
			viewRender.finish(callback);
		}

		return viewRender;
	};
});

Hawkejs.async = async;

/**
 * Create classes using Nuclei
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function}   fnc
 */
Hawkejs.create = function create(fnc) {
	return Nuclei.extend(fnc);
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
 * Load a script for use with Hawkejs
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Hawkejs.load = function load(filePath, options) {

	var location = filePath;

	if (!options || typeof options != 'object') {
		options = {};
	}

	if (typeof options.server == 'undefined') {
		options.server = true;
	}

	if (typeof options.browser == 'undefined') {
		options.browser = true;
	}

	if (location[0] !== '/') {
		location = __dirname + '/../../' + location;
	}

	if (!Hawkejs.prototype.files[filePath]) {
		Hawkejs.prototype.files[filePath] = options;
		require(location)(Hawkejs);
	}
};

Hawkejs.Hawkevents = Hawkevents;
Hawkejs.Blast = Blast;
Hawkejs.Utils = Blast.Bound;
Hawkejs.async = async;

module.exports = Hawkejs;