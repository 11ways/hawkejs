window.hawkejs = (function(){

	var ClientSide = true;
	
	function require(p){

		if ('fs' == p) return {};
		if ('cheerio' == p) return {};

		var path = require.resolve(p),
		    mod  = require.modules[path];

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
		 * @since    0.0.1
		 * @version  0.0.1
		 */
		var utils = {};

		/**
		 * Get a cheerio object,
		 * create it if needed
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.1
		 * @version  0.0.1
		 */
		utils.getObject = function (object) {
			
			// When working with a root, we can just do .html() later
			if (!object.$) object.$ = $($.parseHTML('<hawkejs data-hawkejs-shim="root">' + object.html + '</hawkejs>', document, true));
			
			return object.$;
		}
		
		/**
		 * Turn the element into an object
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.1
		 * @version  0.0.1
		 */
		utils.objectify = function (object, $origin) {
			
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
		 * @since    0.0.1
		 * @version  0.0.1
		 *
		 * @param    {object}    $object
		 * @param    {bool}      final     Convert custom hawkejs tags back to original
		 */
		utils.getHtml = function ($object, final) {
			
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
		 * @since    0.0.1
		 * @version  0.0.10
		 */
		utils.select = function ($object, selector) {

			var result,
			    renderSelector;
			
			// Replace head and body tags, during rendering they are renamed
			renderSelector = selector.replace(/^head/, 'hawkejshead');
			renderSelector = renderSelector.replace(/^body/, 'hawkejsbody');
			
			result = $(renderSelector, $object);

			// If nothing was found, it's possible we want a head or body
			// element after rendering, so look for them again
			if (!result || !result.length) {
				result = $(selector, $object);
			}

			return result;
		}
		
		/**
		 * Clone a jQuery object
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    2013.01.24
		 * @version  2013.01.24
		 */
		utils.clone = function(object) {
			utils.getObject(object);
			return object.$.clone();
		}

		/**
		 * HTML Encode a string
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.1
		 * @version  0.0.10
		 */
		utils.encode = function encode(html){
			return document.createElement('div').appendChild(
			document.createTextNode(html)).parentNode.innerHTML.replace(/"/g, '&quot;');
		};

		/**
		 * HTML Decode a string
		 * 
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.10
		 * @version  0.0.10
		 */
		utils.decode = function decode(text) {
			// We don't use the DOM workaround here,
			// because it'll fail when trying to decode html that has not
			// actually been decoded
			return html_entity_decode(text);
		};

		function html_entity_decode(string, quote_style) {
			// From: http://phpjs.org/functions
			// +   original by: john (http://www.jd-tech.net)
			// +      input by: ger
			// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// +   bugfixed by: Onno Marsman
			// +   improved by: marc andreu
			// +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// +      input by: Ratheous
			// +   bugfixed by: Brett Zamir (http://brett-zamir.me)
			// +      input by: Nick Kolosov (http://sammy.ru)
			// +   bugfixed by: Fox
			// -    depends on: get_html_translation_table
			// *     example 1: html_entity_decode('Kevin &amp; van Zonneveld');
			// *     returns 1: 'Kevin & van Zonneveld'
			// *     example 2: html_entity_decode('&amp;lt;');
			// *     returns 2: '&lt;'
			var hash_map = {},
			    symbol = '',
			    tmp_str = '',
			    entity = '';
			
			tmp_str = string.toString();

			if (false === (hash_map = get_html_translation_table('HTML_ENTITIES', quote_style))) {
				return false;
			}

			// fix &amp; problem
			// http://phpjs.org/functions/get_html_translation_table:416#comment_97660
			delete(hash_map['&']);
			hash_map['&'] = '&amp;';

			for (symbol in hash_map) {
			entity = hash_map[symbol];
			tmp_str = tmp_str.split(entity).join(symbol);
			}
			tmp_str = tmp_str.split('&#039;').join("'");

			return tmp_str;
		}

		function get_html_translation_table(table, quote_style) {
			// From: http://phpjs.org/functions
			// +   original by: Philip Peterson
			// +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// +   bugfixed by: noname
			// +   bugfixed by: Alex
			// +   bugfixed by: Marco
			// +   bugfixed by: madipta
			// +   improved by: KELAN
			// +   improved by: Brett Zamir (http://brett-zamir.me)
			// +   bugfixed by: Brett Zamir (http://brett-zamir.me)
			// +      input by: Frank Forte
			// +   bugfixed by: T.Wild
			// +      input by: Ratheous
			// %          note: It has been decided that we're not going to add global
			// %          note: dependencies to php.js, meaning the constants are not
			// %          note: real constants, but strings instead. Integers are also supported if someone
			// %          note: chooses to create the constants themselves.
			// *     example 1: get_html_translation_table('HTML_SPECIALCHARS');
			// *     returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}
			var entities = {},
				hash_map = {},
				decimal;
			var constMappingTable = {},
				constMappingQuoteStyle = {};
			var useTable = {},
				useQuoteStyle = {};

			// Translate arguments
			constMappingTable[0] = 'HTML_SPECIALCHARS';
			constMappingTable[1] = 'HTML_ENTITIES';
			constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
			constMappingQuoteStyle[2] = 'ENT_COMPAT';
			constMappingQuoteStyle[3] = 'ENT_QUOTES';

			useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
			useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT';

			if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
				throw new Error("Table: " + useTable + ' not supported');
				// return false;
			}

			entities['38'] = '&amp;';
			if (useTable === 'HTML_ENTITIES') {
				entities['160'] = '&nbsp;';
				entities['161'] = '&iexcl;';
				entities['162'] = '&cent;';
				entities['163'] = '&pound;';
				entities['164'] = '&curren;';
				entities['165'] = '&yen;';
				entities['166'] = '&brvbar;';
				entities['167'] = '&sect;';
				entities['168'] = '&uml;';
				entities['169'] = '&copy;';
				entities['170'] = '&ordf;';
				entities['171'] = '&laquo;';
				entities['172'] = '&not;';
				entities['173'] = '&shy;';
				entities['174'] = '&reg;';
				entities['175'] = '&macr;';
				entities['176'] = '&deg;';
				entities['177'] = '&plusmn;';
				entities['178'] = '&sup2;';
				entities['179'] = '&sup3;';
				entities['180'] = '&acute;';
				entities['181'] = '&micro;';
				entities['182'] = '&para;';
				entities['183'] = '&middot;';
				entities['184'] = '&cedil;';
				entities['185'] = '&sup1;';
				entities['186'] = '&ordm;';
				entities['187'] = '&raquo;';
				entities['188'] = '&frac14;';
				entities['189'] = '&frac12;';
				entities['190'] = '&frac34;';
				entities['191'] = '&iquest;';
				entities['192'] = '&Agrave;';
				entities['193'] = '&Aacute;';
				entities['194'] = '&Acirc;';
				entities['195'] = '&Atilde;';
				entities['196'] = '&Auml;';
				entities['197'] = '&Aring;';
				entities['198'] = '&AElig;';
				entities['199'] = '&Ccedil;';
				entities['200'] = '&Egrave;';
				entities['201'] = '&Eacute;';
				entities['202'] = '&Ecirc;';
				entities['203'] = '&Euml;';
				entities['204'] = '&Igrave;';
				entities['205'] = '&Iacute;';
				entities['206'] = '&Icirc;';
				entities['207'] = '&Iuml;';
				entities['208'] = '&ETH;';
				entities['209'] = '&Ntilde;';
				entities['210'] = '&Ograve;';
				entities['211'] = '&Oacute;';
				entities['212'] = '&Ocirc;';
				entities['213'] = '&Otilde;';
				entities['214'] = '&Ouml;';
				entities['215'] = '&times;';
				entities['216'] = '&Oslash;';
				entities['217'] = '&Ugrave;';
				entities['218'] = '&Uacute;';
				entities['219'] = '&Ucirc;';
				entities['220'] = '&Uuml;';
				entities['221'] = '&Yacute;';
				entities['222'] = '&THORN;';
				entities['223'] = '&szlig;';
				entities['224'] = '&agrave;';
				entities['225'] = '&aacute;';
				entities['226'] = '&acirc;';
				entities['227'] = '&atilde;';
				entities['228'] = '&auml;';
				entities['229'] = '&aring;';
				entities['230'] = '&aelig;';
				entities['231'] = '&ccedil;';
				entities['232'] = '&egrave;';
				entities['233'] = '&eacute;';
				entities['234'] = '&ecirc;';
				entities['235'] = '&euml;';
				entities['236'] = '&igrave;';
				entities['237'] = '&iacute;';
				entities['238'] = '&icirc;';
				entities['239'] = '&iuml;';
				entities['240'] = '&eth;';
				entities['241'] = '&ntilde;';
				entities['242'] = '&ograve;';
				entities['243'] = '&oacute;';
				entities['244'] = '&ocirc;';
				entities['245'] = '&otilde;';
				entities['246'] = '&ouml;';
				entities['247'] = '&divide;';
				entities['248'] = '&oslash;';
				entities['249'] = '&ugrave;';
				entities['250'] = '&uacute;';
				entities['251'] = '&ucirc;';
				entities['252'] = '&uuml;';
				entities['253'] = '&yacute;';
				entities['254'] = '&thorn;';
				entities['255'] = '&yuml;';
			}

			if (useQuoteStyle !== 'ENT_NOQUOTES') {
				entities['34'] = '&quot;';
			}
			if (useQuoteStyle === 'ENT_QUOTES') {
				entities['39'] = '&#39;';
			}
			entities['60'] = '&lt;';
			entities['62'] = '&gt;';


			// ascii decimals to real symbols
			for (decimal in entities) {
				if (entities.hasOwnProperty(decimal)) {
					hash_map[String.fromCharCode(decimal)] = entities[decimal];
				}
			}

			return hash_map;
		}

		/**
		 * A simple log shim function
		 *
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.1
		 * @version  0.0.11
		 */
		utils.log = function log (message, separate, level, meta) {
			
			if (level === undefined) level = 'info';
			
			if (separate) console.log ('\n>>>>>>>>>>>>>>>>>>>>>>>>>>');

			if (level === 'error' && typeof message === 'object') {
				console.log(message.name + ': ' + message.message);
				console.log(message.stack);
			} else {
				console.log(message);
			}
			if (separate) console.log ('<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
		}
		
		//__INSERT_HAWKEJS_CODE__//

		//__INSERT_EJS_CODE__//

	return require("hawkejs-client-side");
}());

(function() {

	// Some browsers fire an initial and useless popstate.
	// If history.state exists and isn't null,
	// assume browser isn't going to fire initial popstate.
	var initialURL = location.href,
	    popped     = ('state' in window.history && window.history.state !== null);

	/**
	 * Ajaxify links when the document has loaded
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.8
	 */
	window.onload = function() {
	
		hawkejs.ajaxifyLinks();
		
		// Listen to the "popstate" event, a back or forward button press
		window.addEventListener('popstate', function(e) {

			// Ignore inital popstate that some browsers fire on page load
			var initialPop = !popped && location.href === initialURL && e.state === null;
			popped = true
			if (initialPop) return;

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
	 * @version  0.0.10
	 */
	hawkejs.ajaxifyLinks = function ajaxifyLinks() {

		// Make all hawkejs links ajaxable
		$('[data-hawkejs="link"]:not([href=""]):not([data-hawkejs-ajaxified])').click(function(e) {

			// Prevent the browser from handling the link
			e.preventDefault();

			// Turn the anchor into a jQuery object
			var $this = $(this);
			
			// Get the wanted url
			var url = $this.attr('href');
			
			// Go to the page, and afterwards store the payload in the history
			hawkejs.goToAjaxViewWithHistory(url);
			
		}).attr('data-hawkejs-ajaxified', true);

		// Make all links without a href do nothing
		$('[data-hawkejs="link"][href=""]:not([data-hawkejs-ajaxified])').click(function(e) {
			e.preventDefault();
		}).attr('data-hawkejs-ajaxified', true);

		// Make all hawkejs forms ajaxable
		$('[data-hawkejs="form"]:not([data-hawkejs-ajaxified]) input[type="submit"],button[type="submit"]').click(function(e) {

			// Prevent the browser from submitting the form
			e.preventDefault();

			// Turn the submit button into a jQuery object
			var $this = $(this);

			// Get the parent form
			var $form = $this.parents('form');

			// Get the wanted action
			var action = $form.attr('action');

			// Get the wanted method
			var method = $form.attr('method').toLowerCase();

			// Get the data
			var getData, postData;

			if ($form.attr('data-file')) {
				hawkejs.downloadAjax(action, $form.jsonify(), method);
			} else {

				if (method === 'get') {
					getData = $form.jsonify();
				} else if (method === 'post') {
					postData = $form.jsonify();
				}

				hawkejs.goToAjaxViewWithHistory(action, getData, postData);
			}

		}).attr('data-hawkejs-ajaxified', true);
	};

	/**
	 * Perform a form submit which should result in a download in an AJAX way
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.11
	 * @version  0.0.11
	 *
	 * @param    {String}   action      The action url to submit the form to
	 * @param    {Object}   data        The data to submit
	 * @param    {String}   method      The method to use (POST/GET/...)
	 * @param    {Function} callback    The callback to execute when the
	 *                                  download starts. The server will need to
	 *                                  support this (special cookie setting)
	 */
	hawkejs.downloadAjax = function downloadAjax(action, data, method, callback) {

		var $iframe,
		    $doc,
		    formdata,
		    iframe_doc,
		    iframe_html,
		    random_id,
		    whenStop,
		    timer,
		    when,
		    i;

		hawkejs.event.emit('ajaxbegin');

		// When was this request made?
		when = Date.now();
		whenStop = when + (1000*60*5);

		// Generate a random it for download stuff
		random_id = 'ajaxFormTracker-' + when + '-' + ~~(Math.random()*1000);

		// Add this info to the url
		action = hawkejs.buildUrl(action, {_hawkejsAjaxFormTracker: random_id});

		// Create the new iFrame
		$iframe = $('<iframe style="display:none" src="about:blank"></iframe>');

		// Append it to the body
		$iframe.appendTo('body');

		// Get the iFrame content document
		iframe_doc = $iframe[0].contentWindow || $iframe[0].contentDocument;

		// Make sure we get the document
		if (iframe_doc.document) {
			iframe_doc = iframe_doc.document;
		}

		// Construct the HTML
		iframe_html = '<html><head></head><body>';
		iframe_html += '<form method="' + method + '" action="' + action + '">';

		// Convert the data to useable form info
		formdata = hawkejs.formify(data);

		for (i = 0; i < formdata.length; i++) {
			iframe_html += '<input type="hidden" name="' + formdata[i].name + '" value="' + hawkejs.utils.encode(formdata[i].value) + '" />';
		}

		iframe_html += "</form></body></html>";

		// Open the document and replace the content with the given html
		iframe_doc.open();
		iframe_doc.write(iframe_html);

		$doc = $(iframe_doc);

		// And finally submit the document
		$doc.find('form').submit();

		timer = setInterval(function cookieChecker() {

			if (document.cookie.indexOf(random_id) > -1) {

				// Send the hawkejs event
				hawkejs.event.emit('ajaxdownload');

				if (callback) callback();
				clearTimeout(timer);
			}

			// If we still didn't find the cookie after 5 minutes, stop the timer
			if (Date.now() > whenStop) {
				hawkejs.event.emit('ajaxdownloadstop');
				clearTimeout(timer);
			}
		}, 400);
	};

	/**
	 * Remove functions from an object (in-place)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.6
	 * @version  0.0.9
	 */
	hawkejs.removeFunctions = function removeFunctions(object, level) {

		if (!level) level = 0;
		
		if (object['__helpers']) delete object.__helpers;

		// Go over every entry in the object
		for (var i in object) {
			
			// If the object is a function, remove it!
			if (object[i] instanceof Function) {
				delete object[i];
			} else if (typeof object[i] === 'object' && object[i] !== null) {
				
				// If the object has a constructor, make sure it's not something html-y
				if (object[i].constructor) {
					
					// Skip constructors without names (like jquery)
					if (object[i].constructor.name) {
						hawkejs.removeFunctions(object[i], level++);
					} else {
						delete object[i];
					}
				} else {
					hawkejs.removeFunctions(object[i], level++);
				}
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

		hawkejs.goToAjaxView(url, getData, postData, function(payload) {
			
			// Remove functions from the payload
			hawkejs.removeFunctions(payload);
			
			// Remove jquery objects from the payload
			for (var i in payload.request.elements) {
				payload.request.elements[i].$ = false;
			}
			
			payload.__reAddHelpers = true;
			
			history.pushState(payload, null, url);

			if (callback) callback(payload);
		});
	};

	/**
	 * Browse to a link using AJAX.
	 * The response will be an item this client needs to render.
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.10
	 *	
	 * @param    {String}    href        The url to go to
	 * @param    {Object}    getData     The data to send as GET parameters
	 * @param    {Object}    postData    The data to send as POST parameters
	 * @param    {Function}  callback    The function to callback to (with payload)
	 */
	hawkejs.goToAjaxView = function goToAjaxView(href, getData, postData, callback) {

		hawkejs.event.emit('ajaxbegin');

		// The function that will handle the response
		var handleResponse = function handleResponse(variables) {

			hawkejs.event.emit('ajaxdata', variables, function ajaxData() {

				var $d = $(document),
				    template = variables.hawkejs.renderPart;
				
				hawkejs.render(template, variables, $d, function($result, n, payload) {
					
					// Ajaxify all the new links
					hawkejs.ajaxifyLinks();
					
					if (callback) {
						callback(payload);
					}

					hawkejs.event.emit('renderend');
				});
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

/**
 * The pretty print function for debug purposes
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.10
 * @version  0.0.10
 */
window.pr = function pr(message, extra) {

	if (!console) {
		return;
	}

	if (extra) {
		console.log('>>>>>>>>');
	}

	console.log(message);

	if (extra) {
		console.log('<<<<<<<<');
	}
};

// Add the json-dry ajax setup
jQuery.ajaxSetup({
	accepts: {
		jsondry: "application/json-dry"
	},
	contents: {
		// Make sure the regular json interpreter ignores it
		json: /(json)(?!.*dry.*)/,
		jsondry: /json-dry/
	},
	converters: {
		"text jsondry": function jsonDryParser(val) {

			var obj;

			try {
				obj = hawkejs.parse(val);
			} catch (err) {
				if (console) {
					console.log(err);
					console.log(err.stack);
				}
			}

			return obj;
		}
	}
});