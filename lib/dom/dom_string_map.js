var DATA = Symbol('data');

/**
 * Server-side DOMStringMap class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
var StringMap = Fn.inherits('Magic', 'Hawkejs', function DOMStringMap() {
	this[DATA] = {};
	this[StringMap.SET_COUNT] = 0;
});

StringMap.SET_COUNT = Symbol('set_count');

/**
 * Return simplified object for JSON
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 */
StringMap.setMethod(function toJSON() {
	return Object.assign({}, this[DATA]);
});

/**
 * Serialize the content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.21
 */
StringMap.setMethod(function __serialize() {

	if (this[StringMap.SET_COUNT] === 0) {
		return '';
	}

	let result = '',
	    key,
	    val;

	for (key in this[DATA]) {

		val = this[DATA][key];

		if (val == null) {
			continue;
		}

		key = domDeCamelize(key);

		if (val !== '') {
			result += ' data-' + key + '="' +  Bound.String.encodeHTML(val, true) + '"';
		} else {
			result += ' data-' + key;
		}
	}

	return result;
});

/**
 * Camelize a string
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
function domCamelize(name) {

	// Some strings are requested so many times, we'll hardcode them
	switch (name) {
		case 'he-slot':
			name = 'heSlot';
			break;

		case 'he-link':
			name = 'heLink';
			break;

		case 'he-name':
			name = 'heName';
			break;

		case 'he-template':
			name = 'heTemplate';
			break;

		case 'breadcrumb':
		case 'heName':
		case 'value':
		case 'hid':
			break;

		default:
			name = Bound.String.camelize(name, true);
	}

	return name;
};

/**
 * Decamelize a string
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
function domDeCamelize(name) {

	switch (name) {
		case 'heSlot':
			name = 'he-slot';
			break;
		
		case 'heName':
			name = 'he-name';
			break;
		
		case 'heTemplate':
			name = 'he-template';
			break;

		case 'breadcrumb':
		case 'value':
		case 'hid':
		case 'id':
			break;
		
		default:
			name = Bound.String.decamelize(name, '-');
	}

	return name;
}

/**
 * Assert that the property name is allowed
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
function assertDomName(name) {
	if (name.indexOf('-') > -1) {
		throw new Error('Failed to set a named property on \'DOMStringMap\': \'' + name + '\' is not a valid name');
	}
}

/**
 * Get a value by its camelized name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 *
 * @param    {String}   camelized_name
 * @param    {String}   value
 */
 StringMap.setMethod(function getFromDashes(camelized_name, value) {
	return this.__get(domCamelize(camelized_name), value);
});

/**
 * Set a value by its camelized name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 *
 * @param    {String}   camelized_name
 * @param    {String}   value
 */
StringMap.setMethod(function setFromDashes(camelized_name, value) {
	return this.__set(domCamelize(camelized_name), value);
});

/**
 * Magic property getter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.21
 */
StringMap.setMethod(function __get(name) {

	if (this[name] != null || typeof name != 'string') {
		return this[name];
	}

	if (this[DATA][name] != null) {
		return this[DATA][name];
	}

	assertDomName(name);

	return this[DATA][name];
});

/**
 * Magic property setter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
StringMap.setMethod(function __set(name, value) {

	if (typeof name != 'string') {
		return this[name] = value;
	}

	assertDomName(name);
	this[StringMap.SET_COUNT]++;

	this[DATA][name] = String(value);

	return true;
});

/**
 * Magic property ownKeys getter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
StringMap.setMethod(function __ownKeys() {
	return Object.keys(this[DATA]);
});

/**
 * Magic property deleter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
StringMap.setMethod(function __delete(name) {
	return delete this[DATA][name];
});

/**
 * See if the given property exists
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
StringMap.setMethod(function __has(name) {
	return this[DATA][name] != null;
});

/**
 * See if the given property exists
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
StringMap.setMethod(function __describe(name) {

	var value = this.__get(name);

	if (value == null) {
		return undefined;
	}

	return {
		value        : value,
		writable     : true,
		enumerable   : true,
		configurable : true
	};
});