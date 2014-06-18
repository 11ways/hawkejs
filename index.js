var Hawkejs = require('./lib/class/hawkejs.js'),
    files,
    async   = require('async'),
    fs      = require('fs');

Hawkejs.load(__dirname + '/lib/class/hawkejs-server.js', {browser: false});
Hawkejs.load(__dirname + '/lib/class/view_render.js');
Hawkejs.load(__dirname + '/lib/class/helper.js');
Hawkejs.load(__dirname + '/lib/class/scene.js');
Hawkejs.load(__dirname + '/lib/class/placeholder.js');

module.exports = Hawkejs;





var h = new Hawkejs();
h.templateDir = '/srv/codedor/indiaplatform/ind001/local/jelle/www/node_modules/alchemymvc/node_modules/hawkejs/templates/';

h.open = '<?'
h.close = '?>'

h.render('test', {myVar: 'This is myVar'}, function(err, html) {
	console.log('»»»»»»»»»»»»»»»»»»');
	console.log(err);
	//console.log(html);
	console.log('««««««««««««««««')
});


return;

files = ['hawkejs.js', 'helper.js', 'placeholder.js', 'scene.js', 'view_render.js'];

// Require all the main class files
files.forEach(function(classPath) {

	if (classPath == 'hawkejs.js') {
		return;
	}

	require('./lib/class/' + classPath)(Hawkejs);
});

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

	var tasks = {},
	    extraFiles = [];

	extraFiles.push('./lib/class/hawkejs.js');

	files.forEach(function(classPath) {
		extraFiles.push('./lib/class/' + classPath);
	});

	Object.each(Hawkejs.prototype.files, function(i, classPath) {
		extraFiles.push(classPath);
	});

	// Read in all the main files
	extraFiles.forEach(function(classPath) {
		tasks[classPath] = function(next) {
			fs.readFile(classPath, {encoding: 'utf8'}, function(err, result) {
				next(err, result);
			});
		};
	});

	tasks.template = function(next) {
		fs.readFile('./lib/hawkejs-client.js', {encoding: 'utf8'}, function(err, result) {
			next(err, result);
		});
	};

	// Fetch all the files
	async.parallel(tasks, function(err, result) {

		var template = result.template,
		    code     = '';

		extraFiles.forEach(function(filekey) {

			//code += 

		});

	});
};


