var µ      = require('./server-utils'),
    path   = require('path'),
    fs     = require('fs'),
    async  = require('async'),
    mkdirp = require('mkdirp'),
    uglify = require('uglify-js'),
    dry    = require('json-dry'),
    log    = µ.log;

/**
 * A replace function that doesn't break on $
 *
 */
function replaceString(haystack, needle, text) {
    var position = haystack.indexOf(needle),
        result = haystack;
    if (position > -1) {
        result = haystack.substring(0, position) + text + haystack.substring(position+needle.length);
    }
    return result
}

module.exports = function (hawkejs) {
	
	// Which dirs have we already watched for view files?
	var parsedDirs = {};
	
	// Which do we still need to parse?
	var parseQueue = [];
	
	// A temporary copy of the queue
	var tpq = [];
	
	// What is the temporary path to store the view files?
	var tempPath = false;
	
	// Is there a registerpath running?
	var runningRegister = false;
	
	/**
	 * Actually copy given files to our directory
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.09
	 * @version  2013.02.19
	 */
	hawkejs._copyfiles = function(filepath, callback, subdir) {
		
		log('Copying files from ' + filepath + ' (subdir: ' + subdir + ')');
		
		if (!subdir) subdir = '';
		
		fs.readdir(filepath, function (err, files){
	
			if (err) {
				log('View directory does not exists: ' + filepath);
			}
			
			var srun = [];
			
			for (var i in files) {
				
				var filename = files[i];
				
				(function(filename, filepath, subdir) {
					srun.push(function(asynccallback) {
						// Check the file
						fs.stat(filepath + '/' + filename, function(err, stats){

							if (stats.isDirectory()) {
								
								// Get the directory name
								var dirname = filename;
								
								// Store the original path
								var dirpath = filepath + '/' + filename;
								
								// Add this to the subdir
								subdir += '/' + dirname;
								
								hawkejs._copyfiles(dirpath, function(){asynccallback(null)}, subdir)
								
							} else {
								
								var destinationdir = path.join(tempPath, subdir);
								
								mkdirp(destinationdir, function (error) {
								
									// Open the original file
									var origin = fs.createReadStream(filepath + '/' + filename);
									
									// Open the destination file
									var destination = fs.createWriteStream(tempPath + '/' + subdir + '/' + filename);     
									
									origin.on('end', function(err) {
										
										if (err) {
											log('Template could not be loaded: ' + filename);
											log(err);
										}
										
										asynccallback(null);
									});
									
									// Pipe the original file into the destination
									origin.pipe(destination);
									
								});
								
							}
							
						});
					});
				
				})(filename, filepath, subdir);

			}
			
			// Execute the functions in serie
			async.series(srun, function(err, results) {
					
					if (callback) callback();
				});
			
		});
	}
	
	/**
	 * Register a directory containing view files with hawkejs,
	 * which will copy them over to its temporary path
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.09
	 * @version  2013.04.15
	 */
	hawkejs.registerPath = function registerPath (filepath, callback, force, recursive) {
		
		// @todo: pass along force to the queue
		if (runningRegister) {
			parseQueue.push(filepath);
			if (callback) callback();
			return;
		}
		
		if (typeof force == 'undefined') force = false;
		
		// If we've been given an array, recursively call this function
		if (filepath instanceof Array) {

			var srun = [];
			
			for (var i in filepath) {
				
				(function(fpath) {
					srun.push(
						function(asynccallback) {
							hawkejs.registerPath(fpath, function(){asynccallback(null, fpath)}, false, true);
						}
					)
				})(filepath[i]);
				
				async.series(srun, function(err, results) {
					
					if (callback) callback();
					
					// Call the queue parser again
					hawkejs.parsePathQueue();
				});
				
			}
			
		} else {
			
			// If the temp path isn't set yet, push it to the queue
			if (!tempPath) {
				parseQueue.push(filepath);
				if (callback) callback();
				return;
			}
			
			// Set the running register to true, so no other function can run
			runningRegister = true;
			
			// If we've already done this path, ignore it (unless it's forced)
			if (typeof parsedDirs[filepath] == 'undefined' || force) {
				
				hawkejs._copyfiles(filepath, function() {
					// We're done here
					runningRegister = false;
					
					// We've read in these files, tell the parent we're done
					if (callback) callback();
					
					// If this isn't a recursive call, go over the queue again
					// (because new items could have been added)
					if (!recursive) hawkejs.parsePathQueue();

				});

			} else {
				runningRegister = false;
				if (callback) callback();
			}
		}
	}
	
	/**
	 * Look through the parse queue
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.09
	 * @version  2013.02.09
	 */
	hawkejs.parsePathQueue = function parsePathQueue (recursive) {
		
		// If this is the first call (not recursive, parent)
		// then get the content from the queue array
		if (!recursive) {
			
			var l = parseQueue.length;
			
			// Remove the elements from the parsequeue, and into our temp queue
			for (var i = 0; i < l; i++) {
				tpq.push(parseQueue.shift());
			}
			
		}
		
		if (!tempPath) {
			return false;
		} else {
			
			if (tpq.length) {
				
				// Get the first item
				var path = tpq.shift();
				
				// Register it
				hawkejs.registerPath(path, function() {
					
					// If we've done this, we can go deeper
					hawkejs.parsePathQueue(true);
				});
				
			}
			
			return true;
		}
	}
	
	/**
	 * Add extra helper files
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.02
	 * @version  2013.03.21
	 *
	 * @param    {string}   filePath   The path of the file, with .js
	 * @param    {object}   options    Extra options
	 */
	hawkejs.addHelpers = function addHelpers (filepath, options) {
		
		if (typeof options == 'undefined') options = {};
		
		// Load this on the client side?
		if (typeof options.client == 'undefined') options.client = true;
		
		// Load this on the server side?
		if (typeof options.server == 'undefined') options.server = true;
		
		// Is this in the common module format? If yes: hawkejs object is passed
		if (typeof options.common == 'undefined') options.common = true;
		
		try {
			
			if (options.server) {
				if (options.common) require(filepath)(hawkejs);
				else require(filepath);
			}
			
			if (options.client) {
				hawkejs._helperFiles.push({filepath: filepath, options: options});
			}
			
		} catch (err) {
			console.error('Could not add helper file "' + filepath + '"');
		}
	}

	/**
	 * Enable client-side suport
	 * This is a blocking feature, but only runs at server boot
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.10
	 *
	 * @param    {Object}   app         The express app
	 * @param    {Object}   express
	 * @param    {Array}    source      Paths where views can be found
	 * @param    {String}   filepath    The serverpath where we can store the file
	 */
	hawkejs.enableClientSide = function enableClientSide (app, express, source, filepath) {
		
		// Add a slash to the publicpath
		var publicpath = '/hawkejs/';
		
		// Tell Express where the view files are stored
		app.set('views', filepath);
		
		// Expose these to the public
		app.use('/hawkejs', express.static(filepath));

		// Also expode the vendor folder
		app.use('/hawkejs/vendor', express.static(path.resolve(__dirname, '..', 'vendor')));

		// Set the temporary path
		tempPath = filepath;
		
		// Now the temp path has been set, we can parse the queue,
		// if there is anything in it
		hawkejs.parsePathQueue();
		
		// And add our own source paths
		hawkejs.registerPath(source);
		
		// Get the client file path and main file (this file) path
		var clientpath = path.resolve(__dirname, 'hawkejs-client.js'),
		    mainpath   = path.resolve(__dirname, 'hawkejs.js'),
		    helperpath = path.resolve(__dirname, 'helpers.js'),
		    paths      = require.main.paths.slice(0),
		    ejspath    = '';

		// Look in our plugin's node_modules folder first
		paths.unshift(path.resolve(__dirname, '..', 'node_modules'));
		
		// Look for the ejs code
		for (var i in paths) {
			
			var p = paths[i];
			var fptest = path.resolve(p, 'ejs', 'ejs.js');
			
			try {
				
				var ejsStat = fs.statSync(fptest);
				
				// The file has been found!
				if (ejsStat) {
					ejspath = fptest;
					// Break out of the loop
					break;
				}
				
			} catch (err) {
				log('EJS client file not found at ' + fptest, false, 'error');
			}
		}
		
		if (ejsStat) {
			
			// Read the js files in order to combine them
			var clientfile      = fs.readFileSync(clientpath, 'utf-8'),
			    mainfile        = fs.readFileSync(mainpath, 'utf-8'),
			    ejsfile         = fs.readFileSync(ejspath, 'utf-8'),
			    helperfile      = fs.readFileSync(helperpath, 'utf-8'),
			    dryfile         = fs.readFileSync(dry.info.path, 'utf-8'),
			    clientfilename  = 'hawkejs-client-side.js',
			    servercodefound = false,
			    data            = '';
			
			// Add the main hawkejs file
			data += mainfile;
			
			// Set the basedir, for now views must always go in /hawkejs
			data += '\n\nhawkejs._baseDir = \'/hawkejs\';\n';
			
			// Require the extra helper files
			for (var helpercount in hawkejs._helperFiles) {
				var hs = hawkejs._helperFiles[helpercount];
				
				if (hs.options.client) {
					if (hs.options.common) {
						data += "require('./helperfile-" + helpercount + "')(hawkejs);\n";
					} else {
						data += "require('./helperfile-" + helpercount + "');\n";
					}
				}
			}
			
			data += '\n}); // The hawkejs module\n\n';

			// Add the json dry file
			data += 'require.register("json-dry.js", function(module, exports, require){\n';
			data += dryfile
			data += '});\n';
			
			// Add the helpers
			data += 'require.register("helpers.js", function(module, exports, require){\n';
			
			data += helperfile;
			
			// Close the helpers require function
			data += '});\n';
			
			// Add all the extra helper files
			for (var helpercount in hawkejs._helperFiles) {
				
				var hs = hawkejs._helperFiles[helpercount];
				
				if (hs.options.client) {
					var helpercode = fs.readFileSync(hs.filepath, 'utf-8');
					
					data += 'require.register("helperfile-' + helpercount + '.js", function(module, exports, require){\n';
					data += helpercode;
					data += '});\n';
				}
			}

			// Now insert the code into the client file
			clientfile = replaceString(clientfile, '//__INSERT_HAWKEJS_CODE__//', data);
			data = clientfile;

			/**
			 * Delete code between these 2 strings
			 * (Where the underscore is actually a space)
			 *
			 * //_Noclient>
			 * Code to be deleted!
			 * //_<Noclient
			 * 
			 */
			do {
				if (servercodefound) {
					var txbegin = data.substring(0, scbegin);
					var txend = data.substring(scend + 12);
					data = txbegin + txend;
					
					// Reset the servercodefound to false
					servercodefound = false;
				}
				
				// We do not type in the actual noclient tag, because it'll be matched
				var scbegin = data.indexOf('// ' + 'Noclient>');
				var scend = data.indexOf('// ' + '<Noclient');
				
				if (scbegin > -1 && scend > -1) servercodefound = true;
				
			} while (servercodefound);


			// Now add the ejs modules
			var ejsBegin = ejsfile.indexOf('require.register("ejs.js", function(module, exports, require){');
			
			// Remove everything before the beginning of the useful ejs file
			ejsfile = ejsfile.substring(ejsBegin);
			
			var ejsEnd = ejsfile.indexOf('return require("ejs");');
			
			// Remove everything after the end (including that bit)
			ejsfile = ejsfile.substring(0, ejsEnd);

			// Put the ejs file into the client file
			data = replaceString(data, '//__INSERT_EJS_CODE__//', ejsfile);
			
			if (!this._debug) {
				// Uglify the javascript
				var result = uglify.minify(data, {fromString: true, mangle: false});
				
				data = result.code;
			}
			
			fs.writeFile(path.resolve(filepath, clientfilename), data, 'utf-8');
			
			// Indicate we have browser suport
			this._clientBrowserPath = publicpath + clientfilename;
			
			// Enable client side suport (ajax calls)
			this._client = true;
			
			// Enable client side render
			this._clientSideRender = true;
			
		} else {
			log('Could not enable client side Hawkejs support!', false, 'error');
		}
	}
	
	/**
	 * Some middleware we will use to extract interesting information
	 * from the request, and insert them into the settings object
	 * for the render function to use later.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.8
	 *
	 * @param    {Object}    req    The request object
	 * @param    {Object}    res    The response object
	 * @param    {Function}  next   The express callback
	 */
	hawkejs.middleware = function _middleware (req, res, next) {
		
		// Prepare a hawkejs object
		var h = {};
		
		//  Add the request & response object
		h.req = req;
		h.res = res;
	
		// Add the original url
		h.originalUrl = req.originalUrl;

		// Add the url without parameters
		h.cleanUrl = h.originalUrl.split('?')[0];

		// Add GET parameters
		h.query = hawkejs.clone(req.query);

		// Is this an ajax call? Defaults to false
		h.ajax = false;
		
		// Add comments?
		h.comments = true;
		
		// Enable debugging output?
		h.debug = this._debug;
		
		// Code that should be executed in the client browser should come here
		h.clientcode = {};
		
		// Add this object to the local vars
		res.locals({hawkejs: h});
		
		// Fire up the next middleware
		// We have to wait to get some more data
		next();
	}
	
	/**
	 * Since the first middleware couldn't get all of the data yet,
	 * because not all of the middleware had finished yet and it still
	 * needed to go through routing, we will extract more now.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}  variables   The variables passed along with the element
	 */
	hawkejs._extractReqData = function _extractReqData (variables) {
		
		var h = variables.hawkejs;
		var req = h.req;
		var res = h.res;
		
		// Copy the xhr setting
		h.ajax = req.xhr;
		
		// Add the string this route had to match against
		h.matchSource = req.route.path;
		
		// Add this string's converted regex
		h.matchRegex = req.route.regexp;
	}
	
	/**
	 * Export the express render function through this simple closure
	 *
	 * "options" this object from Express will always contain these elements
	 *
	 * - cache          {boolean}
	 * - settings       {object}
	 * -- env                 {string}
	 * -- json spaces         {integer}
	 * -- jsonp callback name {string}
	 * -- view engine         {string}
	 * -- views               {string}  The path to the views
	 * -- x-powered-by        {boolean} If true, express will send this header
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.19
	 * @version  2013.01.28
	 *
	 * @param    {string}    path
	 * @param    {object}    options
	 * @param    {function}  callback
	 */
	hawkejs.__express = function (path, options, callback) {
		return hawkejs.renderFile(path, options, callback);
	};

	
}