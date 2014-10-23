var entities = require('entities'),
    cheerio = require('cheerio');

/**
 * Cheerio/jQuery wrapper functions.
 * Uses Cheerio on the server side,
 * jQuery on the client side.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.21
 * @version  2013.01.21
 */
var utils = {};

/**
 * Get a cheerio object,
 * create it if needed
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.19
 * @version  2013.01.21
 */
utils.getObject = function (object) {
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
utils.clone = function(object) {
	
	// Version 1: +/- 565 ops/s
	// We used to get and re-parse the html, but that was the old clone way
	var clone = cheerio.load(object.html);

	// Version 2: +/- 573 ops/s
	//utils.getObject(object);
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
	//utils.getObject(object);
	//var clone = cheerio.load(object.$.root());
	
	// Version 4: +/- 570 ops/s
	// Using cloneextend
	//utils.getObject(object);
	//var clone = ce.clone(object.$);

	return clone;
}

/**
 * Turn the element into an object
 */
utils.objectify = function (object, $origin) {
	
	if ($origin) {	
		return $origin(object);
	} else {
		return cheerio.load(object);
	}
}

/**
 * Get the HTML
 */
utils.getHtml = function ($object) {
	return $object.html();
}
var t = 0;
/**
 * Perform a selection
 */
utils.select = function ($object, selector, $super) {
	if ($super) {
		return $super(selector, $object);
	} else {
		return $object(selector);
	}
}

/**
 * The log wrapper, allows the user to override utils.logger
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.11
 * @version  0.0.11
 */
utils.log = function logWrapper(){
	return utils.logger.apply(utils, arguments);
};

/**
 * A simple log shim function
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.1.2
 */
utils.logger = function logger(message, separate, level, meta) {
	
	if (level === undefined) level = 'info';

	// Don't use console.log if it doesn't exist
	if (!console.log) {
		return;
	}

	// Don't output loggings if debug is off, unless it's an error
	if (!hawkejs._debug && level !== 'error') {
		return;
	}

	if (separate) console.log ('\n>>>>>>>>>>>>>>>>>>>>>>>>>>');

	if (level === 'error' && typeof message === 'object') {
		console.log(message.name + ': ' + message.message);
		console.log(message.stack);
	} else {
		console.log(message);
	}
	if (separate) console.log ('<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
}

/**
 * HTML Encode a string
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.10
 */
utils.encode = function encode(html){

	// Cast the html to a string
	html += '';

	return entities.encode(html);
};

/**
 * HTML Decode a string
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.10
 * @version  0.0.10
 */
utils.decode = function decode(text) {

	// Cast the text to a string
	text += '';
	
	return entities.decode(text);
};

module.exports = utils;