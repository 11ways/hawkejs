const VOID_ELEMENTS  = Hawkejs.Hawkejs.VOID_ELEMENTS,
      SELECTED = Symbol('selected'),
      CHECKED  = Symbol('checked'),
      VALUE   = Symbol('value'),
      HTML    = Symbol('html'),
      namerx  = /^[a-z_:][a-z_:\-\.]*$/i;

const nwsapi = require('nwsapi');

// The NW instance will be created later
let NW;

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
 * @version  2.0.0
 */
var Element = Fn.inherits('Hawkejs.Node', function HTMLElement() {

	// Create the style property
	this.style = new Hawkejs.Style(this);

	// Create the class list
	this.classList = new Hawkejs.ClassList(this);

	this.childNodes = [];
	this.attributes = new Hawkejs.NamedNodeMap();
	this.className = '';

	this.dataset = new Hawkejs.DOMStringMap();

	this.hawkejs_renderer = null;
	this._render_count = 0;
});

/**
 * Values that could be added later
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Null}
 */
Element.setProperty(Hawkejs.RENDER_CONTENT, null);
Element.setProperty(Hawkejs.RESULT, null);

/**
 * Elements are node type 1
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 *
 * @type     {Number}
 */
Element.setProperty('nodeType', 1);

/**
 * Return array with children elements
 * @WARNING: this is not a live list
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.1
 * @version  2.0.0
 *
 * @type     {Array}
 */
Element.setProperty(function children() {

	var result = [],
	    node,
	    i;

	for (i = 0; i < this.childNodes.length; i++) {
		node = this.childNodes[i];

		if (node.nodeType == 1 && node.nodeName) {
			result.push(node);
		}
	}

	return result;
});

/**
 * Return the first element child
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {HTMLElement|Null}
 */
Element.setProperty(function firstElementChild() {

	var node,
	    i;

	for (i = 0; i < this.childNodes.length; i++) {
		node = this.childNodes[i];

		// For various reasons relating to insertAdjacentHTML(),
		// sometimes text is stored in an HTMLElement,
		// skip those by also checking the nodeName
		if (node.nodeType == 1 && node.nodeName) {
			return node;
		}
	}

	return null;
});

/**
 * Return the previous element sibling
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {HTMLElement|Null}
 */
Element.setProperty(function previousElementSibling() {

	let sibling,
	    node = this;

	while (node) {
		sibling = node.previousSibling;

		if (sibling && sibling.nodeType == 1 && sibling.nodeName) {
			return sibling;
		}

		node = sibling;
	}
});

/**
 * Return the next element sibling
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {HTMLElement|Null}
 */
Element.setProperty(function nextElementSibling() {

	let sibling,
	    node = this;

	while (node) {
		sibling = node.nextSibling;

		if (sibling && sibling.nodeType == 1 && sibling.nodeName) {
			return sibling;
		}

		node = sibling;
	}
});

/**
 * Get an attribute instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 */
Element.setMethod(function _getAttribute(key) {

	// Make sure we got a valid key
	if (!key) return;

	// Make sure the key is lower case
	key = key.toLowerCase();

	return this.attributes._items[key] || null;
});

/**
 * Get the class text
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Element.setProperty(function className() {
	return this.classList.toString();
}, function setClassName(text) {
	this.classList._setTokens(text);
});

/**
 * The id property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Element.setProperty(function id() {
	return this.getAttribute('id');
}, function setId(value) {
	return this.setAttribute('id', value);
});

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
 * The textContent property.
 * This is probably what you want on the client side.
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.3.1
 *
 * @type     {String}
 */
Element.setProperty(function textContent() {

	var text = Bound.String.stripTags(this.innerHTML, false, '');
	text = Bound.String.decodeHTML(text);

	return text;
}, function setTextContent(text) {
	return this.innerHTML = Bound.String.encodeHTML(String(text));
});

/**
 * The innerText property.
 * On the client, this takes visibility into account,
 * so it's more performance heavy and is probably not what you want.
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Element.setProperty(function innerText() {
	var text = Bound.String.stripTags(this.innerHTML);
	text = Bound.String.decodeHTML(text);

	return text;
}, function setInnterText(text) {
	return this.textContent = text;
});

/**
 * The innerHTML property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Element.setProperty(function innerHTML() {

	var length,
	    html = '';

	this._render_count++;

	if (length = this.childNodes.length) {
		let node,
		    temp,
		    i;

		for (i = 0; i < length; i++) {
			node = this.childNodes[i];

			if (node == null) {
				// Do nothing
			} else if (typeof node == 'string') {
				html += node;
			} else if ((temp = node[Hawkejs.RESULT]) != null) {
				html += Hawkejs.getTextContent(temp);
			} else {
				temp = node.outerHTML;

				if (temp != null) {
					html += temp;
				} else {
					html += node.textContent || node || '';
				}
			}
		}
	}

	return html;
}, function setInnerHTML(html) {

	var i;

	// Unset the parentElement for all the nodes
	for (i = 0; i < this.childNodes.length; i++) {
		if (typeof this.childNodes[i] == 'object') {
			this.childNodes[i].parentElement = null;
		}
	}

	// Delete all already set nodes
	this.childNodes.length = 0;

	// Don't parse HTML
	this.childNodes.push(html);
});

/**
 * The outerHTML property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Element.setProperty(function outerHTML() {

	if (this[HTML] != null) {
		return this[HTML];
	}

	let node_name,
	    open_tag,
	    tag_name,
	    html;

	node_name = this._l_node_name;

	if (this.tagName) {
		tag_name = this._l_tag_name;
	} else {
		tag_name = node_name;
	}

	open_tag = '<' + tag_name;

	if (tag_name != node_name) {
		open_tag += ' is="' + node_name + '"';
	}

	//result.push(open_tag + this.serializeProperties() + '>');
	html = open_tag + this.serializeProperties() + '>';

	if (!VOID_ELEMENTS[this.nodeName]) {
		html += this.innerHTML + '</' + tag_name + '>';
	}

	return html;
}, function setOuterHtml(html) {
	this[HTML] = html;
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
 * Dry this object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  2.0.0
 */
Element.setMethod(function toDry() {

	// When no tagName is set, this is actually plain HTML content
	if (!this.tagName) {
		return {
			value : this.outerHTML
		};
	}

	// Rely on the CustomElement (called Element) class
	// to revive regular elements with a hawkejs_id property
	return {
		value: {
			hawkejs_id : this.hawkejs_id,
			tag_name   : this.tagName
		},
		dry_class: 'Element.Element'
	};
});

var skipAttributes = ['id', 'class', 'for', 'name'];

/**
 * Serialize properties
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.3.1
 *
 * @return   {String}
 */
Element.setMethod(function serializeProperties() {

	var result,
	    length,
	    key;

	result = this.getSerialized('id');
	result += this.getSerialized('class');

	if (this.attributes.length) {
		let attr,
		    i;

		result += this.getSerialized('for');
		result += this.getSerialized('name');

		for (key in this.attributes._items) {
			attr = this.attributes._items[key];

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

	result += this.getSerialized('style');

	return result;
});

/**
 * Get the serialized key-value pair
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.4.0
 */
Element.setMethod(function getSerialized(name) {

	var value = this.getAttribute(name),
	    result = '';

	if (value != null) {

		if ((name == 'style' || name == 'class') && !value) {
			return result;
		}

		result = ' ' + name;

		if (value !== '') {
			result += '="' + Bound.String.encodeHTML(value) + '"';
		}
	}

	return result;
});

/**
 * Add a child node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Element|String}
 */
Element.setMethod(function append(node) {

	if (typeof node == 'string') {
		node = new Hawkejs.Text(node);
	}

	this.appendChild(node);
});

/**
 * Add a child element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.3.0
 *
 * @return   {HTMLElement}
 */
Element.setMethod(function appendChild(child) {

	var index;

	if (typeof child == 'object') {

		if (child.parentElement == this) {
			index = this.childNodes.indexOf(child);

			if (index > -1) {
				this.childNodes.splice(index, 1);
			}
		}

		child.parentElement = this;
	}

	this.childNodes.push(child);
	return child;
});

/**
 * Add an adjacent HTML element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {String}   position
 * @param    {String}   html
 */
Element.setMethod(function insertAdjacentHTML(position, html) {

	var el = new Element();
	el.outerHTML = html;

	return this.insertAdjacentElement(position, el);
});

/**
 * Add an adjacent element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {String}        position
 * @param    {HTMLElement}   element
 */
Element.setMethod(function insertAdjacentElement(position, element) {

	switch (position.toLowerCase()) {
		case 'beforebegin':
			if (this.parentElement) {
				this.parentElement.insertBefore(element, this);
			}
			break;

		case 'afterbegin':
			if (this.childNodes.length) {
				this.insertBefore(element, this.childNodes[0]);
			} else {
				this.appendChild(element);
			}
			break;

		case 'beforeend':
			this.appendChild(element);
			break;

		case 'afterend':
			if (this.parentElement) {
				this.parentElement.insertAfter(element, this);
			}
			break;
	}
});

/**
 * See if an attribute is set
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  2.0.0
 */
Element.setMethod(function hasAttribute(name) {

	var val;

	if (name.indexOf('data-') == 0) {
		val = this.dataset[name.slice(5)];

		if (typeof val != 'undefined') {
			return true;
		}
	}

	val = this._getAttribute(name);
	return !!val;
});

/**
 * Remove an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  2.0.0
 */
Element.setMethod(function removeAttribute(name) {

	this.attributes._removeAttribute(name);

	if (name.indexOf('data-') == 0) {
		delete this.dataset[name.slice(5)];
	}
});

/**
 * Make sure the attribute name is valid
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
function testAttributeName(name) {
	if (!namerx.test(name)) {
		let error = Error('String contains an invalid character');
		error.name = 'InvalidCharacterError';
		throw error;
	}
}

/**
 * Set an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 */
Element.setMethod(function setAttribute(name, value) {

	var do_callback,
	    data_name,
	    prev_val;

	testAttributeName(name);

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

			if (name.indexOf('data-') == 0) {
				data_name = name.slice(5);

				this.dataset[data_name] = String(value);
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
 * @version  1.1.0
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

			if (name[0] == 'd' && name.indexOf('data-') == 0) {
				val = this.dataset[name.slice(5)];

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

/**
 * Insert an element before another child element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.3.0
 */
Element.setMethod(function insertBefore(new_node, reference_node) {

	var moved,
	    index,
	    i;

	for (i = 0; i < this.childNodes.length; i++) {
		if (this.childNodes[i] == reference_node) {

			if (new_node.parentElement == this) {
				index = this.childNodes.indexOf(new_node);

				if (index > -1) {
					this.childNodes.splice(index, 1);
				}
			}

			this.childNodes.splice(i, 0, new_node);
			moved = true;
			break;
		}
	}

	// If it succeeded we should become the new parent
	if (moved) {
		new_node.parentElement = this;
	} else {
		throw new Error('Node was not found');
	}
});

/**
 * Get all child elements that contain the given class name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Element.setMethod(function getElementsByClassName(name) {

	var result = [],
	    entry,
	    i;

	for (i = 0; i < this.childNodes.length; i++) {
		entry = this.childNodes[i];

		if (entry && entry.classList) {

			if (entry.classList.contains(name)) {
				result.push(entry);
			}

			// Do recursive search
			result = result.concat(entry.getElementsByClassName(name));
		}
	}

	return result;
});

/**
 * Get all child elements that are of the given tag name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Element.setMethod(function getElementsByTagName(name) {

	var result = [],
	    upper_tag,
	    entry,
	    i;

	upper_tag = name.toUpperCase();

	for (i = 0; i < this.childNodes.length; i++) {
		entry = this.childNodes[i];

		if (entry && entry.tagName) {

			if (entry.tagName == upper_tag) {
				result.push(entry);
			}

			// Do recursive search
			result = result.concat(entry.getElementsByTagName(name));
		}
	}

	return result;
});

/**
 * Make sure all children are ready to be stringified for hawkejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   [renderer]
 *
 * @return   {Pledge}
 */
Element.setMethod(function renderHawkejsContent(renderer) {

	var length = this.childNodes.length,
	    tasks,
	    node,
	    temp,
	    i;

	if (!length) {
		return;
	}

	tasks = [];

	for (i = 0; i < length; i++) {
		node = this.childNodes[i];

		if (node) {
			if (node[Hawkejs.RENDER_CONTENT]) {
				temp = node[Hawkejs.RENDER_CONTENT](renderer);
			} else if (typeof node.renderHawkejsContent == 'function') {
				temp = node.renderHawkejsContent(renderer);
			}

			if (temp && temp.then) {
				tasks.push(temp);
			}
		}
	}

	if (!tasks.length) {
		return;
	}

	if (tasks.length == 1) {
		return tasks[0];
	}

	return Fn.parallel(tasks);
});

/**
 * Turn this into a string for hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  2.0.0
 *
 * @param    {ViewRender}   viewRender
 */
Element.setMethod(function toHawkejsString(viewRender) {

	if (this[Hawkejs.RESULT]) {
		return this[Hawkejs.RESULT];
	}

	if (this.hawkejs_id) {
		this.dataset.hid = this.hawkejs_id;
	}

	return this.outerHTML;
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

/**
 * Get the NW instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Object}
 */
function getNw() {

	if (!NW) {
		NW = nwsapi({
			document: {
				compatMode: 'CSS',
				documentElement: {},
				createElement: function createElement(name) {
					return Hawkejs.Hawkejs.createElement(name);
				}
			}
		});
	}

	return NW;
}

// NW fixes
Element.setProperty('compatMode', 'CSS');

// Doesn't really exist in the browser, but needed for NW
Element.setMethod(function createElement(name) {
	return Hawkejs.Hawkejs.createElement(name);
});

// NW implementations
Element.setMethod(function querySelectorAll(selector) {
	return getNw().select(selector, this);
});

Element.setMethod(function closest() {
	return getNw().closest(selector, this);
});

Element.setMethod(function querySelector(selector) {
	return getNw().first(selector, this);
});

Element.setMethod(function matches() {
	return getNw().match(selector, this);
});

// Some no-ops for browser compatibility
Element.setMethod(function addEventListener() {});
Element.setMethod(function removeEventListener() {});