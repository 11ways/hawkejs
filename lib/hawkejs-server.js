var µ = require('./server-utils');
var path = require('path');
var fs = require('fs');

var log = µ.log;

module.exports = function (hawkejs) {
	
	/**
	 * Add extra helper files
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.02
	 * @version  2013.02.02
	 */
	hawkejs.addHelpers = function addHelpers (filepath) {
		
		try {
			require(filepath)(hawkejs);
		
			hawkejs._helperFiles.push(filepath);
		} catch (err) {
			console.error('Could not add helper file "' + filepath + '"');
		}
	}

	/**
	 * Enable client-side suport
	 * This is a blocking feature, but only runs at server boot
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.01.20
	 * @version  2013.01.26
	 *
	 * @param    {string}   filepath    The serverpath where we can store the file
	 * @param    {string}   publicpath  The public path for the browser
	 */
	hawkejs.enableClientSide = function enableClientSide (filepath, publicpath) {
		
		// Add a slash to the publicpath
		publicpath = '/' + publicpath;
		
		// Get the client file path and main file (this file) path
		var clientpath = path.resolve(__dirname, 'hawkejs-client.js');
		var mainpath = path.resolve(__dirname, 'hawkejs.js');
		var helperpath = path.resolve(__dirname, 'helpers.js');
		var ejspath = '';
		
		var paths = require.main.paths.slice(0);
		
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
			var clientfile = fs.readFileSync(clientpath, 'utf-8');
			var mainfile = fs.readFileSync(mainpath, 'utf-8');
			var ejsfile = fs.readFileSync(ejspath, 'utf-8');
			var helperfile = fs.readFileSync(helperpath, 'utf-8');
			
			var clientfilename = 'hawkejs-client-side.js';
			
			var servercodefound = false;
			
			var data = clientfile;
			
			data += mainfile;
			
			// Set the basedir, for now views must always go in /hawkejs
			data += '\n\nhawkejs._baseDir = \'/hawkejs\';\n';
			
			// Require the extra helper files
			for (var helpercount in hawkejs._helperFiles) {
				data += "require('./helperfile-" + helpercount + "')(hawkejs);\n";
			}
			
			data += '\n}); // The hawkejs module\n\n';
			
			// Add the helpers
			data += 'require.register("helpers.js", function(module, exports, require){\n';
			
			data += helperfile;
			
			// Close the helpers require function
			data += '});\n';
			
			// Add all the extra helper files
			for (var helpercount in hawkejs._helperFiles) {
				var helpercode = fs.readFileSync(hawkejs._helperFiles[helpercount], 'utf-8');
				
				data += 'require.register("helperfile-' + helpercount + '.js", function(module, exports, require){\n';
				data += helpercode;
				data += '});\n';
			}
		
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
			
			data += ejsfile;
			
			// Finish the file
			data += '\n\nreturn require("hawkejs-client-side"); \n})();\n'
			
			if (!this._debug) {
				// Uglify the javascript
				var result = uglify.minify(data, {fromString: true, mangle: false});
				
				data = result.code;
			}
			
			fs.writeFile(path.resolve(filepath, clientfilename), data, 'utf-8');
			
			// Indicate we have browser suport
			this._clientBrowserPath = publicpath + '/' + clientfilename;
			
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
	 * @since    2013.01.20
	 * @version  2013.01.28
	 *
	 * @param    {object}    req    The request object
	 * @param    {object}    res    The response object
	 * @param    {function}  next   The express callback
	 */
	hawkejs.middleware = function _middleware (req, res, next) {
		
		// Prepare a hawkejs object
		var h = {};
		
		//  Add the request & response object
		h.req = req;
		h.res = res;
	
		// Add the original url
		h.originalUrl = req.originalUrl;
		
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
	 * @since    2013.01.20
	 * @version  2013.01.20
	 *
	 * @param    {object}  variables   The variables passed along with the element
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