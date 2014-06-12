var async  = require('async'),
    Nuclei = require('nuclei').Nuclei;

/**
 * The Hawkejs class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Hawkejs = Nuclei.extend(function Hawkejs() {

	// Default tags
	this.open = '<%';
	this.close = '%>';

	// Use render context with with by default
	this.withRenderContext = true;

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
		    lines,
		    split,
		    line,
		    code,
		    temp,
		    cmd,
		    arg,
		    i;

		code = 'compiled = function compiledView(vars, helper){\n';

		if (this.withRenderContext) {
			// Use with to inject the context into the scope
			code += 'with (this) {\n';
		}

		// Use with to inject variables into the scope
		code += 'with (vars) {\n';

		lines = extract(source, this.open, this.close);

		for (i = 0; i < lines.length; i++) {
			line = lines[i];

			if (line.type == 'inside') {

				// Trim the right spaces
				temp = line.content.trimRight();

				// Split by spaces
				split = temp.split(' ');

				// Get the cmd keyword
				cmd = split.first();

				if (this.commands[cmd]) {
					split.shift();
					code += 'this.command(' + JSON.stringify(cmd) + ', [' + split.join(' ') + ']);\n';
				} else {
					code += temp.trimLeft() + ';\n';
				}

			} else {
				code += 'this.print(' + JSON.stringify(line.content) + ');';
			}
		}

		if (this.withRenderContext) {
			code += '}'; // End of 'this' with
		}

		code += '}'; // End of 'vars' with
		code += '}'; // End of the function

		try {
			eval(code);
		} catch(err) {
			console.log(err);
		}

		this.templates[name] = compiled;

		return compiled;
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
Hawkejs.load = function load(filePath) {
	if (!Hawkejs.prototype.files[filePath]) {
		Hawkejs.prototype.files[filePath] = true;
		require(filePath)(Hawkejs);
	}
};
