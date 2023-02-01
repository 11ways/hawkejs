const VOID_ELEMENTS  = Hawkejs.Hawkejs.VOID_ELEMENTS,
      SELECTED = Symbol('selected'),
      CHECKED  = Symbol('checked'),
      VALUE   = Symbol('value');

var HAS_VALUE = {
	BUTTON   : true,
	OPTION   : true,
	INPUT    : true,
	LI       : true,
	METER    : true,
	PROGRESS : true,
	PARAM    : true
};

/**
 * Server-side HTMLElement class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.3.1
 */
var Element = Fn.inherits('Hawkejs.DOM.Element', function HTMLElement() {

	HTMLElement.super.call(this);

	// Create the style property
	this.style = new Hawkejs.Style(this);
	this.dataset = new Hawkejs.DOMStringMap();
});

Hawkejs.HTMLElement = Element;

/**
 * Fast check to see if something is a `data-` string
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 *
 * @param    {String}   str
 * 
 * @return   {Boolean}
 */
function isDataString(str) {
	return str[0] == 'd' && str[1] == 'a' && str[2] == 't' && str[3] == 'a' && str[4] == '-';
}

/**
 * Values that could be added later
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.1
 *
 * @type     {Null}
 */
Element.setProperty(Hawkejs.RENDER_CONTENT, null);
Element.setProperty(Hawkejs.RESULT, null);
Element.setProperty(Hawkejs.PRE_TASKS, null);
Element.setProperty('onHawkejsAssemble', null);
Element.setProperty('renderHawkejsContent', null);
Element.setProperty('is_assembled', null);
Element.setProperty('hawkejs_renderer', null);

/**
 * The name property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Element.setProperty(function name() {
	return this.getAttribute('name');
}, function setName(value) {
	return this.setAttribute('name', value);
});

/**
 * The tabIndex property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Element.setProperty(function tabIndex() {

	var value = Number(this.getAttribute('tabIndex'));

	if (!value) {
		return 0;
	}

	return value;
}, function setTabIndex(value) {

	if (!value) {
		value = 0;
	}

	return this.setAttribute('tabIndex', value);
});

/**
 * The value property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.1
 *
 * @type     {String}
 */
Element.setProperty(function value() {

	if (this.tagName == 'TEXTAREA') {

		if (this[VALUE] != null) {
			return this[VALUE];
		}

		return this.innerText;
	}

	if (HAS_VALUE[this.tagName]) {
		return this.getAttribute('value');
	}

	return this[VALUE];
}, function setValue(value) {

	// Setting the value of a textarea breaks the bond between the innerHTML
	if (this.tagName != 'TEXTAREA') {
		if (HAS_VALUE[this.tagName]) {
			return this.setAttribute('value', value);
		}
	}

	return this[VALUE] = value;
});

/**
 * The selected property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Element.setProperty(function selected() {

	if (this.tagName == 'OPTION') {
		return this.hasAttribute('selected');
	}

	return this[SELECTED];
}, function setSelected(value) {

	if (this.tagName == 'OPTION') {
		if (value) {
			return this.setAttribute('selected', '');
		} else {
			return this.removeAttribute('selected');
		}
	}

	return this[SELECTED] = value;
});

/**
 * The checked property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Element.setProperty(function checked() {

	if (this.tagName == 'INPUT' && this.getAttribute('type') == 'checkbox') {
		return this.hasAttribute('checked');
	}

	return this[CHECKED];
}, function setSelected(value) {

	if (this.tagName == 'INPUT' && this.getAttribute('type') == 'checkbox') {
		if (value) {
			return this.setAttribute('checked', '');
		} else {
			return this.removeAttribute('checked');
		}
	}

	return this[CHECKED] = value;
});

/**
 * The innerText property.
 * On the client, this takes visibility into account,
 * so it's more performance heavy and is probably not what you want.
 * 
 * The parent "Element" class also has a `textContent` property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.23
 *
 * @type     {String}
 */
Element.setProperty(function innerText() {
	var text = Bound.String.stripTags(this.innerHTML);

	text = Bound.String.decodeHTML(text);

	return text;
}, function setInnerText(text) {
	return this.textContent = text;
});

/**
 * The hidden property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Boolean}
 */
Element.setProperty(function hidden() {
	return this.hasAttribute('hidden');
}, function setHidden(value) {
	if (value) {
		this.setAttribute('hidden', true);
	} else {
		this.removeAttribute('hidden');
	}
});

/**
 * Get the second part of the outer HTML
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
Element.setMethod(function _outerHTMLClose(tag_name) {

	let void_element_info = VOID_ELEMENTS[this.nodeName],
	    html;
	
	if (void_element_info === 2) {
		html = '/>';
	} else {
		html = '>';

		if (!void_element_info) {
			html += this.innerHTML + '</' + tag_name + '>';
		}
	}

	return html;
});

/**
 * See if an attribute is set
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  2.3.4
 */
Element.setMethod(function hasAttribute(name) {

	if (isDataString(name)) {
		let val = this.dataset.getFromDashes(name.slice(5));

		if (typeof val != 'undefined') {
			return true;
		}
	}

	return hasAttribute.super.call(this, name);
});

/**
 * Remove an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  2.2.21
 */
Element.setMethod(function removeAttribute(name) {

	let do_callback = false,
	    prev_val;

	if (typeof this.attributeChangedCallback == 'function') {
		do_callback = true;
		prev_val = this.getAttribute(name);
	}

	this.attributes._removeAttribute(name);

	if (isDataString(name)) {
		delete this.dataset[name.slice(5)];
	}

	if (do_callback) {
		this.attributeChangedCallback(name, prev_val, null);
	}
});

/**
 * Set an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.21
 */
Element.setMethod(function setAttribute(name, value) {

	let do_callback,
	    prev_val;

	this._testAttributeName(name);

	if (typeof this.attributeChangedCallback == 'function') {
		do_callback = true;
		prev_val = this.getAttribute(name);
	}

	switch (name) {
		case 'style':
			this.style.cssText = value;
			break;

		case 'class':
			this.className = value;
			break;

		default:

			if (isDataString(name)) {
				this.dataset.setFromDashes(name.slice(5), String(value));
			} else {
				this.attributes._setKeyVal(name, value);
			}
			break;
	}

	if (do_callback) {
		this.attributeChangedCallback(name, prev_val, value);
	}
});

/**
 * Get an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.21
 */
Element.setMethod(function getAttribute(name) {

	var result,
	    val;

	switch (name) {
		case 'style':
			return this.style.cssText;

		case 'class':
			return this.className;

		default:

			if (isDataString(name)) {
				val = this.dataset.getFromDashes(name.slice(5));

				if (typeof val != 'undefined') {
					return String(val);
				}
			}

			result = this._getAttribute(name);

			if (result) {
				return result.value;
			} else {
				return result;
			}
	}
});

let skipAttributes = ['id', 'class', 'for', 'name'];

/**
 * Serialize properties
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.3.1
 *
 * @return   {String}
 */
Element.setMethod(function serializeProperties() {

	let attributes = this.attributes,
	    items = attributes._items,
	    result = '',
	    key;

	if (items['id']) {
		result = this.getSerialized('id');
	}

	if (this.classList.length > 0) {
		result += this.getSerialized('class');
	}

	if (attributes.length) {
		let attr;

		if (items['for']) {
			result += this.getSerialized('for');
		}

		if (items['name']) {
			result += this.getSerialized('name');
		}

		for (key in items) {
			attr = items[key];

			if (!attr) {
				continue;
			}

			if (attr.name == 'hidden') {
				result += ' hidden';
				continue;
			}

			if (skipAttributes.indexOf(attr.name) > -1) {
				continue;
			}

			result += this.getSerialized(attr.name);
		}
	}

	result += this.dataset.__serialize();

	if (this.style.styles.length > 0) {
		result += this.getSerialized('style');
	}

	return result;
});

/**
 * Set the hawkejs identifier,
 * needed for surviving serialization
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {String}   id
 */
Element.setMethod(function setIdentifier(id) {
	this.hawkejs_id = id;
	this.dataset.hid = id;
});

// NW fixes
Element.setProperty('compatMode', 'CSS');

// Doesn't really exist in the browser, but needed for NW
Element.setMethod(function createElement(name) {
	return Hawkejs.Hawkejs.createElement(name);
});
