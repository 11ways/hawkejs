var Hawkejs = require('./lib/class/hawkejs.js'),
    files,
    lorem   = require('lorem-ipsum'),
    async   = require('async'),
    fs      = require('fs');

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
		location = __dirname + '/' + location;
	}

	if (!Hawkejs.prototype.files[filePath]) {
		Hawkejs.prototype.files[filePath] = options;

		if (options.server) {
			require(location)(Hawkejs, Hawkejs.Blast);
		}
	}
};

// First extra file needs to be loaded using require, all others go through load
//require(__dirname + '/lib/class/hawkejs-server.js')(Hawkejs);

module.exports = Hawkejs;

files = ['helper.js', 'placeholder.js', 'scene.js', 'view_render.js', 'hawkejs-server.js'];

// Require all the main class files
files.forEach(function(classPath) {

	if (classPath == 'hawkejs.js') {
		return;
	}

	Hawkejs.load('lib/class/' + classPath, {id: classPath});
});

Hawkejs.load('lib/class/hawkejs-client.js', {server: false});

/**
 * Create a file for the client side
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Function}  callback
 */
Hawkejs.prototype.createClientFile = function createClientFile(callback) {

	var that = this,
	    tasks = {},
	    extraFiles = [],
	    cfile = __dirname + '/hawkejs-client-side.js';

	if (that.generatedClientFile) {
		if (callback) callback(null, that.generatedClientFile);
		return cfile;
	}

	files.forEach(function(classPath) {
		extraFiles.push('lib/class/' + classPath);
	});

	Hawkejs.Blast.Bound.Object.each(Hawkejs.prototype.files, function(options, classPath) {
		if (options.browser) {
			if (extraFiles.indexOf(classPath) < 0) extraFiles.push(classPath);
		}
	});

	// Read in all the main files
	extraFiles.forEach(function(classPath) {
		tasks[classPath] = function(next) {
			fs.readFile(classPath, {encoding: 'utf8'}, function(err, result) {
				next(err, result);
			});
		};
	});

	tasks.hawkejs = function(next) {
		fs.readFile('./lib/class/hawkejs.js', {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.template = function(next) {
		fs.readFile('./lib/client/template.js', {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.async = function(next) {
		fs.readFile(require.resolve('async'), {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.nuclei = function(next) {

		var nucleiPath = require.resolve('nuclei').split('/');
		nucleiPath.pop();
		nucleiPath = nucleiPath.join('/') + '/lib/nuclei.js';

		fs.readFile(nucleiPath, {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.hawkevents = function(next) {

		var ePath = require.resolve('hawkevents');

		fs.readFile(ePath, {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.jsondry = function(next) {

		var ePath = require.resolve('json-dry');

		fs.readFile(ePath, {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.events = function(next) {
		fs.readFile('./lib/client/events.js', {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	tasks.protoblast = function(next) {

		var Blast = require('protoblast')();

		fs.readFile(Blast.getClientPath(true), {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	// Fetch all the files
	async.parallel(tasks, function(err, result) {

		var template,
		    code,
		    id;

		if (err) {
			throw err;
		}

		template = result.template;
		id = template.indexOf('//_REGISTER_//');

		// Add async
		code = 'require.register("async", function(module, exports, require){\n';
		code += result.async;
		code += '\n});\n';

		// Add nuclei
		code += 'require.register("nuclei", function(module, exports, require){\n';
		code += result.nuclei;
		code += '\n});\n';

		// Add events for browser
		code += 'require.register("events", function(module, exports, require){\n';
		code += result.events;
		code += '\n});\n';

		// Add hawkevents for browser
		code += 'require.register("hawkevents", function(module, exports, require){\n';
		code += result.hawkevents;
		code += '\n});\n';

		// Add json-dry
		code += 'require.register("json-dry", function(module, exports, require){\n';
		code += result.tasks;
		code += '\n});\n';

		// Add protoblast for browser
		code += 'require.register("protoblast", function(module, exports, require){\n';
		code += result.protoblast;
		code += '\n});\n';

		// Add main hawkejs
		code += 'require.register("hawkejs", function(module, exports, require){\n';
		code += result.hawkejs;
		code += '\n});\n';

		extraFiles.forEach(function(filekey) {

			var options = Hawkejs.prototype.files[filekey];

			code += 'require.register("' + filekey + '", function(module, exports, require){\n';
			code += result[filekey];
			code += '\n});\n';
		});

		code += 'clientFiles = ' + JSON.stringify(extraFiles) + ';\n';

		template = template.slice(0, id) + '\n' + code + template.slice(id);

		fs.writeFile(cfile, template, function() {
			that.generatedClientFile = cfile;
			
			if (callback) callback(null, cfile);
		});
	});

	return cfile;
};

return;

var h = new Hawkejs();
h.addViewDirectory('/srv/codedor/indiaplatform/ind001/local/jelle/www/node_modules/alchemymvc/node_modules/hawkejs/example/views/');

h.createClientFile(function(err, result) {
	console.log(result);
})


//return;
h.render('pages/index', {myVar: 'This is myVar'}, function(err, html) {
	console.log('»»»»»»»»»»»»»»»»»»');
	console.log(err);
	console.log(html);
	console.log('««««««««««««««««')
});



return;