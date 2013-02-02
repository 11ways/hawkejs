window.onload=function() {
	
	ajaxifyLinks();
	
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
			goToAjaxView(returnLocation);
		}
		
	});
}

/**
 * Make all hawkejs links use ajax
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.02.02
 * @version  2013.02.02
 */
function ajaxifyLinks () {

	// Make all hawkejs links ajaxable
	$('[data-hawkejs="link"]:not([data-hawkejs-ajaxified])').click(function(e) {
		
		// Turn the anchor into a jQuery object
		var $this = $(this);
		
		// Get the wanted url
		var url = $this.attr('href');
		
		// Go to the page, and afterwards store the payload in the history
		goToAjaxView(url, function(payload) {
			
			// Remove functions from the payload
			for (var i in payload) {
				if (payload[i] instanceof Function) {
					delete payload[i];
				}
			}
			
			// Remove jquery objects from the payload
			for (var i in payload.request.elements) {
				payload.request.elements[i].$ = false;
			}
			
			payload.__reAddHelpers = true;
			
			history.pushState(payload, null, url);
		});
		
		// Prevent the browser from handling the link
		e.preventDefault();
		
	}).attr('data-hawkejs-ajaxified', true);
}
	
/**
 * Browse to a link using AJAX.
 * The response will be an item this client needs to render.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.23
 * @version  2013.01.23
 *
 * @param    {string}    href        The url to go to
 * @param    {function}  callback    The function to callback to (with payload)
 */
function goToAjaxView (href, callback) {
	
	// Get the variables we need to build this page
	$.get(href, function(variables) {
		
		var $d = $(document);
		
		var template = variables.hawkejs.renderPart;
		
		hawkejs.render(template, variables, $d, function($result, n, payload) {
			
			// Ajaxify all the new links
			ajaxifyLinks();
			
			if (callback) callback(payload);
		});
		
	});
	
}

hawkejs = (function(){

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
		
// Noclient>
// The main hawkejs file will be appended to this client file.
// This piece of text & code will be removed and servers no purpose,
// but if it's not there it makes the IDE go mad.
	});
});
// <Noclient