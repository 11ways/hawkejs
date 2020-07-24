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
 * @version  2.0.0
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

		if (val !== '') {
			result += ' data-' + key + '="' +  Bound.String.encodeHTML(val) + '"';
		} else {
			result += ' data-' + key;
		}
	}

	return result;
});

/**
 * Magic property getter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
StringMap.setMethod(function __get(name) {

	if (this[name] != null || typeof name != 'string') {
		return this[name];
	}

	if (this[DATA][name] != null) {
		return this[DATA][name];
	}

	// Some strings are requested so many times, we'll hardcode them
	switch (name) {
		case 'he-slot':
		case 'heSlot':
			name = 'he-slot';
			break;

		case 'heName':
			name = 'he-name';
			break;

		case 'heTemplate':
			name = 'he-template';
			break;

		case 'he-name':
		case 'value':
		case 'hid':
			break;

		default:
			// Perform expensive string manipulation
			name = Bound.String.dasherize(Bound.String.underscore(name));
	}

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

	this[StringMap.SET_COUNT]++;

	// Some strings are requested so many times, we'll hardcode them
	switch (name) {
		case 'he-slot':
		case 'heSlot':
			name = 'he-slot';
			break;

		case 'heName':
			name = 'he-name';
			break;

		case 'heTemplate':
			name = 'he-template';
			break;

		case 'he-name':
		case 'value':
		case 'hid':
			break;

		default:
			// Perform expensive string manipulation
			name = Bound.String.dasherize(Bound.String.underscore(name));
	}

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