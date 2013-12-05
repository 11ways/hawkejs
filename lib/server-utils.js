var cheerio = require('cheerio');

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
 * @since    2013.01.19
 * @version  2013.01.21
 */
µ.getObject = function (object) {
	if (!object.$) {
		object.$ = cheerio.load(object.html);
		object.$root = object.$(object.$.root());
	}
	return object.$;
}

/**
 * Clone a cheerio object
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.24
 * @version  2013.01.24
 */
µ.clone = function(object) {
	
	// Version 1: +/- 565 ops/s
	// We used to get and re-parse the html, but that was the old clone way
	var clone = cheerio.load(object.html);

	// Version 2: +/- 573 ops/s
	//µ.getObject(object);
	//
	//var _root = {};
	//
	//// Copies the element, but not by reference.
	//// Still copies sub objects & arrays by reference, though
	//for (var i in object.$._root) {
	//	_root[i] = object.$._root[i];
	//}
	//
	//var clone = object.$;
	//
	//// Overwrite the root
	//clone._root = _root;
	
	// Version 3: +/- 492 ops/s
	//µ.getObject(object);
	//var clone = cheerio.load(object.$.root());
	
	// Version 4: +/- 570 ops/s
	// Using cloneextend
	//µ.getObject(object);
	//var clone = ce.clone(object.$);

	return clone;
}

/**
 * Turn the element into an object
 */
µ.objectify = function (object, $origin) {
	
	if ($origin) {	
		return $origin(object);
	} else {
		return cheerio.load(object);
	}
}

/**
 * Get the HTML
 */
µ.getHtml = function ($object) {
	return $object.html();
}
var t = 0;
/**
 * Perform a selection
 */
µ.select = function ($object, selector, $super) {
	if ($super) {
		return $super(selector, $object);
	} else {
		return $object(selector);
	}
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

	if (level === 'error' && typeof message === 'object') {
		console.log(message.name + ': ' + message.message);
		console.log(message.stack);
	} else {
		console.log(message);
	}
	if (separate) console.log ('<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
}

module.exports = µ;