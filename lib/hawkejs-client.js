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
		
/* 
 * DOMParser HTML extension
 * The newer version uses native webkit function,
 * but that has some problems...
 * 
 * 2012-02-02 
 * 
 * By Eli Grey, http://eligrey.com 
 * Public domain. 
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK. 
 */  

/*! @source https://gist.github.com/1129031 */  
/*global document, DOMParser*/  
(function(DOMParser) {  
    "use strict";  
    var DOMParser_proto = DOMParser.prototype  
      , real_parseFromString = DOMParser_proto.parseFromString;

    // Firefox/Opera/IE throw errors on unsupported types  
    try {  
        // WebKit returns null on unsupported types  
        if ((new DOMParser).parseFromString("", "text/html")) {  
            // text/html parsing is natively supported  
            return;  
        }  
    } catch (ex) {}  

    DOMParser_proto.parseFromString = function(markup, type) {  
        if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {  
            var doc = document.implementation.createHTMLDocument("")
              , doc_elt = doc.documentElement
              , first_elt;

            doc_elt.innerHTML = markup;
            first_elt = doc_elt.firstElementChild;

            if (doc_elt.childElementCount === 1
                && first_elt.localName.toLowerCase() === "html") {  
                doc.replaceChild(first_elt, doc_elt);  
            }  

            return doc;  
        } else {  
            return real_parseFromString.apply(this, arguments);  
        }  
    };  
}(DOMParser));

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
	if (!object.$) object.$ = $(object.html);
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
	
	return $(object);

	/*if ($origin) {	
		return $(object);
	} else {
		return cheerio.load(object);
	}*/
}

/**
 * Get the HTML
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.21
 * @version  2013.01.21
 */
µ.getHtml = function ($object) {
	return $object.html();
}

/**
 * Perform a selection
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.21
 * @version  2013.01.21
 */
µ.select = function ($object, selector) {
	return $(selector, $object);
}
