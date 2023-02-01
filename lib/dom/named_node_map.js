/**
 * Server-side NamedNodeMap class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
var NNMap = Fn.inherits(null, 'Hawkejs', function NamedNodeMap() {
	this._length = 0;
	this._items = {};
	this._indexes = [];
});

/**
 * Get the amount of attributes
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Number}
 */
NNMap.setProperty(function length() {
	return this._length;
}, function setLength(val) {
	this._length = 0;
	this._items = {};
	return 0;
});

/**
 * Get a certain entry by number
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.1.0
 *
 * @param    {Number}   index
 *
 * @return   {Hawkejs.Attribute}
 */
NNMap.setMethod(function item(index) {

	let key = this._indexes[index];

	if (key == null) {
		return;
	}

	return this._items[key];
});

/**
 * Add a key-val
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.0
 */
NNMap.setMethod(function _setKeyVal(key, val) {

	key = key.toLowerCase();

	if (this._items[key] == null) {
		this._length++;
		this._items[key] = new Hawkejs.Attribute(key, val);
		this._indexes.push(key);
	} else {
		this._items[key].value = String(val);
	}
});

/**
 * Remove an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.0
 */
NNMap.setMethod(function _removeAttribute(key) {

	if (this._items[key]) {
		this._length--;
		this._items[key] = null;

		let index = this._indexes.indexOf(key);
		this._indexes.splice(index, 1);
	}
});

/**
 * Does this have a certain key?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
NNMap.setMethod(function _has(key) {

	let entry = this._items[key];

	if (entry == null) {
		return false;
	}

	return entry.value != null;
});

/**
 * Return simplified object for JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.1
 * @version  2.0.1
 */
NNMap.setMethod(function toJSON() {

	let result = {},
	    key;

	for (key in this._items) {
		result[key] = this._items[key].value;
	}

	return result;
});