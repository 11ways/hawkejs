/**
 * LinkedTokenList constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.18
 * @version  2.2.18
 */
const LinkedTokenList = Fn.inherits(null, 'Hawkejs', function LinkedTokenList(element, attribute) {
	this.list = new Hawkejs.DOMTokenList();
	this.element = element;
	this.attribute = attribute;
});

/**
 * Compose a property getter
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.18
 * @version  2.2.18
 */
LinkedTokenList.setStatic(function composePropertyGetter(property, name, callback) {
	this.setProperty(name, function _get() {
		return this[property][name];
	}, function _set(value) {
		this[property][name] = value;

		if (callback) {
			callback(this, this[property], name, value);
		}

		return value;
	});
});

/**
 * Compose a method call
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.18
 * @version  2.2.18
 */
LinkedTokenList.setStatic(function composeMethodCall(property, name, callback) {

	if (Array.isArray(name)) {
		for (let entry of name) {
			this.composeMethodCall(property, entry, callback);
		}

		return;
	}

	this.setMethod(name, function _call(...args) {

		let result = this[property][name](...args);

		if (callback) {
			callback(this, this[property], name, result);
		}

		return result;
	});
});

/**
 * Callback that will actually set the original element's attribute
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.18
 * @version  2.2.18
 */
function onChange(parent, instance, name, result) {
	parent.element.setAttributeSilent(parent.attribute, instance.value);
}

// Link all the methods & properties
LinkedTokenList.composeMethodCall('list', ['add', 'remove', 'replace', 'toggle'], onChange);
LinkedTokenList.composeMethodCall('list', ['toString', 'entries', 'values', 'item', 'contains']);
LinkedTokenList.composePropertyGetter('list', 'value', onChange);
LinkedTokenList.composePropertyGetter('list', 'length');