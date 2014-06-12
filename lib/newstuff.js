var fs = require('fs'),
    source = ''+fs.readFileSync('test.ejs'),
    body = ''+fs.readFileSync('body.ejs'),
    ptest = ''+fs.readFileSync('print_test.ejs'),
    Nuclei = require('nuclei').Nuclei,
    async  = require('async');

require('./prototype.js');

/**
 * The Hawkeye class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var Hawkeye = Nuclei.extend(function Hawkeye() {

	// Default tags
	this.open = '<%';
	this.close = '%>';

	// Use render context with with by default
	this.withRenderContext = true;

	/**
	 * The Hawkeye instance constructor
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.2.0
	 * @version  0.2.0
	 */
	this.init = function init() {
		// Compiled templates go here
		this.templates = {};

		this.commands = {};
		this.helpers = {};
	};

	/**
	 * Compile a source to an executable function
	 * and store in in the templates object.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.2.0
	 * @version  0.2.0
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

	/**
	 * Register commands.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.2.0
	 * @version  0.2.0
	 *
	 * @param    {String}    name
	 * @param    {Function}  fnc
	 */
	this.register = function register(name, fnc) {
		this.commands[name] = fnc;
	};

	this.addHelper = function addHelper(name, fnc) {
		this.helpers[name] = fnc;
	};

});




var Helper = Nuclei.extend(function Helper() {

	this.init = function init(view) {
		this.view = view;
	};

	this.print = function print(message) {

		this.view.print('Printed with a helper: ' + message);

	};

});

function extract(str, open, close) {

	var closeLen = close.length,
	    openLen = open.length,
	    result = [],
	    lineCount = 0,
	    isOpen,
	    obj,
	    cur,
	    i;

	for (i = 0; i < str.length; i++) {

		cur = str[i];

		if (cur == '\n') {
			lineCount++;
		}

		// If the tag is open
		if (isOpen) {
			if (str.substr(i, closeLen) == close) {
				i += (closeLen - 1);
				isOpen = false;
				obj.lineEnd = lineCount;
			} else {
				obj.content += cur;
			}

			continue;
		}

		// See if a tag is being opened
		if (str.substr(i, openLen) == open) {

			if (obj && obj.type == 'normal') {
				obj.lineEnd = lineCount;
			}

			obj = {type: 'inside', lineStart: lineCount, lineEnd: undefined, content: ''};
			result.push(obj);

			isOpen = true;
			i += (openLen - 1);

			continue;
		}

		// No tag is open, no tag is being opened
		if (!obj || obj.type != 'normal') {
			obj = {type: 'normal', lineStart: lineCount, lineEnd: undefined, content: ''};
			result.push(obj);
		}

		obj.content += cur;
	}

	obj.lineEnd = lineCount;

	return result;
}

var vars = {
	myVar: 'This is myVar!',
	one: 'The value 1',
	text: 'blablablablabla'
};

var h = new Hawkeye();

h.addHelper('main', Helper);

h.register('=', function echo(message) {
	this.print(message);
});

h.compile('test', source);
h.compile('body', body);
h.compile('print_test', ptest);

// This is after async-ness
var render = new ViewRender(h);
render.execute('test', vars, true);

render.finish(function(err, result) {
	console.log('Got this result: ')
	console.log(result)
})


// This was all pre-asyncness
return

// Render everything once in advance (for JIT)
var render = new ViewRender(h);
render.execute('test', vars, true);


console.log(render.finished)

var hejs = require('hawkejs');
hejs._baseDir = './hejstest/';
hejs._debug = false;

hejs.registerPath('./hejstest/', function() {
	
	// Render everything once in advance (for JIT and async)
	hejs.render('test', vars, function(bla, a) {
		console.log(bla.html());

		// Render 1000 times using the original code
		console.time('Version 1');
		for (var i = 0; i < 1000; i++) {
			hejs.render('test', vars, function(bla, a) {
				bla.html();
			});
		}
		console.timeEnd('Version 1');

		// Render 1000 times using the new code
		console.time('Version 2');
		for (var i = 0; i < 1000; i++) {
			render = new ViewRender(h);
			render.execute('test', vars, true);
		}
		console.timeEnd('Version 2');
		

	});
});



