window.onload=function() {
	
	// Make all hawkejs links ajaxable
	$('[data-hawkejs="link"]').click(function(e) {
		
		var $this = $(this);
		
		var url = $this.attr('href');
		
		goToAjaxView(url, function(payload) {
			
			// Remove functions from the payload
			for (var i in payload) {
				if (payload[i] instanceof Function) {
					delete payload[i];
				}
			}
			
			payload.__reAddHelpers = true;
			
			history.pushState(payload, null, url);
			
		});
		
		// Prevent the browser from handling the link
		e.preventDefault();
		
	});
	
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
		
		/**
		 * On the server side we use cheerio,
		 * on the client side we use jQuery
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.21
		 * @version  2013.01.21
		 */
		var getCheerio = function getCheerio (object) {
			
			if (!object.$) {
				var $element = $(object.html);
				
				object.$ =
					(function(context){
						
						if (context === undefined) context = '*';
						
						return function(selector) {
							
							var $context = $(selector, context);
							return $context;
						}
						
					})($element)
		
			}

			return object.$;
		}
		
		/**
		 * Get html of a cheerio object
		 */
	  var getHtml = function getHtml ($cheerio) {
			
			var $result = $cheerio();
		  return $result.html();
	  }
		
		var cheerio = {};
		cheerio.load = function(html) {return $(html)};
		
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
		
		// A DOMParser
		µ.parser = new DOMParser();
		
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

// Noclient>
// The main hawkejs file will be appended to this client file.
// This piece of text & code will be removed and servers no purpose,
// but if it's not there it makes the IDE go mad.
	});
});
// <Noclient