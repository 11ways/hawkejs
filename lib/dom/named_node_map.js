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
 * Add a key-val
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
NNMap.setMethod(function _setKeyVal(key, val) {

	key = key.toLowerCase();

	if (this._items[key] == null) {
		this._length++;
		this._items[key] = new Hawkejs.Attribute(key, val);
	} else {
		this._items[key].value = String(val);
	}
});

/**
 * Remove an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
NNMap.setMethod(function _removeAttribute(key) {

	if (this._items[key]) {
		this._length--;
		this._items[key] = null;
	}
});