window.hawkejs = (function(){

	var ClientSide = true;
	
	function require(p){
    if ('fs' == p) return {};
		if ('cheerio' == p) return {};
    var path = require.resolve(p)
      , mod = require.modules[path];
    if (!mod) throw new Error('failed to require "' + p + '"');
    if (!mod.exports) {
      mod.exports = {};
      mod.call(mod.exports, mod, mod.exports, require.relative(path));
    }
    return mod.exports;
  }
	
	require.modules = {};

	require.resolve = function (path){
			var orig = path
				, reg = path + '.js'
				, index = path + '/index.js';
			return require.modules[reg] && reg
				|| require.modules[index] && index
				|| orig;
		};
	
	require.register = function (path, fn){
			require.modules[path] = fn;
		};
	
	require.relative = function (parent) {
			return function(p){
				if ('.' != p.substr(0, 1)) return require(p);
				
				var path = parent.split('/')
					, segs = p.split('/');
				path.pop();
				
				for (var i = 0; i < segs.length; i++) {
					var seg = segs[i];
					if ('..' == seg) path.pop();
					else if ('.' != seg) path.push(seg);
				}
	
				return require(path.join('/'));
			};
		};
	
	
	require.register("hawkejs-client-side.js", function(module, exports, require){
		
		var ent = {
			encode: function(html){
				return String(html)
					.replace(/&(?!\w+;)/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;');
			}
		};
		
		var ClientSide = true;

		/**
		 * Cheerio/jQuery wrapper functions.
		 * Uses Cheerio on the server side,
		 * jQuery on the client side.
		 *
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.21
		 * @version  2013.01.21
		 */
		var µ = {};

		/**
		 * Get a cheerio object,
		 * create it if needed
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.21
		 * @version  2013.01.21
		 */
		µ.getObject = function (object) {
			
			// When working with a root, we can just do .html() later
			if (!object.$) object.$ = $('<hawkejs data-hawkejs-shim="root">' + object.html + '</hawkejs>');
			
			return object.$;
		}
		
		/**
		 * Turn the element into an object
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.21
		 * @version  2013.01.21
		 */
		µ.objectify = function (object, $origin) {
			
			//return $(object);
		
			if ($origin) {	
				return $(object);
			} else {
				return $('<hawkejs data-hawkejs-shim="root">' + object + '</hawkejs>');
			}
		}
		
		/**
		 * Get the HTML
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.21
		 * @version  2013.01.21
		 *
		 * @param    {object}    $object
		 * @param    {bool}      final     Convert custom hawkejs tags back to original
		 */
		µ.getHtml = function ($object, final) {
			
			/**
			 * Even though using
			 * $object[0].outerHTML
			 * would work for most elements, when creating body & html tags nothing
			 * would be returned. So we always add a __root__ div to make .html() work
			 */
			var html = $object.html();
			
			if (final) html = hp.unescape$(html);
			
			return html;
			
		}
		
		/**
		 * Perform a selection
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.21
		 * @version  2013.01.21
		 */
		µ.select = function ($object, selector) {
			
			// Replace head and body tags
			selector = selector.replace(/^head/, 'hawkejshead');
			selector = selector.replace(/^body/, 'hawkejsbody');
			
			return $(selector, $object);
		}
		
		/**
		 * Clone a jQuery object
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.24
		 * @version  2013.01.24
		 */
		µ.clone = function(object) {
			µ.getObject(object);
			return object.$.clone();
		}

		/**
		 * A simple log shim function
		 *
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.22
		 * @version  2013.01.23
		 */
		µ.log = function log (message, separate, level, meta) {
			
			if (level === undefined) level = 'info';
			
			if (separate) console.log ('\n>>>>>>>>>>>>>>>>>>>>>>>>>>');
			console.log(message);
			if (separate) console.log ('<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
		}
		
		//__INSERT_HAWKEJS_CODE__//

		//__INSERT_EJS_CODE__//

	return require("hawkejs-client-side");
}());

(function() {

	/**
	 * Ajaxify links when the document has loaded
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	window.onload = function() {
	
		hawkejs.ajaxifyLinks();
		
		// Listen to the "popstate" event, a back or forward button press
		window.addEventListener('popstate', function(e) {

			// If the state is found, we can use that to recreate the page
			if (e.state) {
				hawkejs.applyChanges($(document), e.state);
			} else {
				// It wasn't found, so we'll just have to re-request the page
				// without adding it to the history again, of course
				
				// Get the wanted location
				var returnLocation = history.location || document.location;
				
				// Go there
				hawkejs.goToAjaxView(returnLocation);
			}
			
		});
	};

	/**
	 * Make all hawkejs links & forms use AJAX
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.2
	 * @version  0.0.8
	 */
	hawkejs.ajaxifyLinks = function ajaxifyLinks() {

		// Make all hawkejs links ajaxable
		$('[data-hawkejs="link"]:not([data-hawkejs-ajaxified])').click(function(e) {

			// Prevent the browser from handling the link
			e.preventDefault();

			// Turn the anchor into a jQuery object
			var $this = $(this);
			
			// Get the wanted url
			var url = $this.attr('href');
			
			// Go to the page, and afterwards store the payload in the history
			hawkejs.goToAjaxViewWithHistory(url);
			
		}).attr('data-hawkejs-ajaxified', true);

		// Make all hawkejs forms ajaxable
		$('[data-hawkejs="form"]:not([data-hawkejs-ajaxified]) input[type="submit"]').click(function(e) {

			// Prevent the browser from submitting the form
			e.preventDefault();

			// Turn the submit button into a jQuery object
			var $this = $(this);

			// Get the parent form
			var $form = $this.parent('form');

			// Get the wanted action
			var action = $form.attr('action');

			// Get the wanted method
			var method = $form.attr('method').toLowerCase();

			// Get the data
			var getData, postData;

			if (method === 'get') {
				getData = $form.jsonify();
			} else if (method === 'post') {
				postData = $form.jsonify();
			}

			hawkejs.goToAjaxViewWithHistory(action, getData, postData);


		}).attr('data-hawkejs-ajaxified', true);
	};


	/**
	 * Remove functions from an object (in-place)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.6
	 * @version  0.0.8
	 */
	hawkejs.removeFunctions = function removeFunctions(object) {
		
		if (object['__helpers']) delete object.__helpers;

		// Go over every entry in the object
		for (var i in object) {
			
			// If the object is a function, remove it!
			if (object[i] instanceof Function) {
				delete object[i];
			} else if (typeof object[i] === 'object' && object[i] !== null) {
				// If it's an object, recursively remove those functions
				hawkejs.removeFunctions(object[i]);
			}
		}
		
		return object;
	};

	/**
	 * Build a URL with GET parameters
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 *
	 * @param    {String}    existingURL The base url (can already contain parameters)
	 * @param    {Object}    object      The GET data to append
	 */
	hawkejs.buildUrl = function buildUrl(existingURL, object) {

		// See what separator we need to use
	    var sep = (existingURL.indexOf('?') > -1) ? '&' : '?';

	    // Construct the new url
	    return existingURL + sep + $.param(object);
	};

	/**
	 * Go to ajax view with history
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.2
	 * @version  0.0.8
	 *
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    getData     The data to send as GET parameters
	 * @param    {Object}    postData    The data to send as POST parameters
	 * @param    {Function}  callback    The function to callback to (with payload)
	 */
	hawkejs.goToAjaxViewWithHistory = function goToAjaxViewWithHistory(url, getData, postData, callback) {

		hawkejs.event.emit('ajaxbegin');
		
		hawkejs.goToAjaxView(url, getData, postData, function(payload) {
			
			// Remove functions from the payload
			hawkejs.removeFunctions(payload);
			
			// Remove jquery objects from the payload
			for (var i in payload.request.elements) {
				payload.request.elements[i].$ = false;
			}
			
			payload.__reAddHelpers = true;
			
			history.pushState(payload, null, url);

			hawkejs.event.emit('ajaxend');
			
			if (callback) callback(payload);
		});
	};

	/**
	 * Browse to a link using AJAX.
	 * The response will be an item this client needs to render.
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.8
	 *	
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    getData     The data to send as GET parameters
	 * @param    {Object}    postData    The data to send as POST parameters
	 * @param    {Function}  callback    The function to callback to (with payload)
	 */
	hawkejs.goToAjaxView = function goToAjaxView(href, getData, postData, callback) {

		// The function that will handle the response
		var handleResponse = function handleResponse(variables) {

			var $d = $(document);
			
			var template = variables.hawkejs.renderPart;
			
			hawkejs.render(template, variables, $d, function($result, n, payload) {
				
				// Ajaxify all the new links
				hawkejs.ajaxifyLinks();
				
				if (callback) callback(payload);
			});
		};

		// Add GET data to the url
		if (getData) href = hawkejs.buildUrl(href, getData);

		// Is POST data is given, turn it into a post
		if (postData) {
			$.post(href, postData, handleResponse);
		} else {
			// Get the variables we need to build this page
			$.get(href, handleResponse);
		}
	};

}());


