const nwsapi   = require('nwsapi'),
      HTML     = Symbol('html'),
      namerx   = /^[a-z_:][a-z_:\-\.]*$/i;

// The NW instance will be created later
let NW;

/**
 * Server-side root Element class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
const Element = Fn.inherits('Hawkejs.Node', 'Hawkejs.DOM', function Element() {

	Element.super.call(this);

	this.classList = new Hawkejs.ClassList(this);
	this.attributes = new Hawkejs.NamedNodeMap();
	this.className = '';
});

/**
 * Fast check to see if something is a `data-` string
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.5
 * @version  2.3.5
 *
 * @param    {String}   str
 * 
 * @return   {Boolean}
 */
function isDataString(str) {
	return str[0] == 'd' && str[1] == 'a' && str[2] == 't' && str[3] == 'a' && str[4] == '-';
}

/**
 * Refer NS methods to their regular counterparts
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
function setNSStubs(...names) {
	for (let name of names) {
		Element.setMethod(name + 'NS', function(ns, ...args) {
			return this[name](...args);
		});
	}
}

setNSStubs(
	'getElementsByTagName',
	'hasAttribute',
	'getAttribute',
	'setAttribute',
	'removeAttribute'
);

/**
 * Elements are node type 1
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  2.3.1
 *
 * @type     {Array}
 */
Element.setProperty(function children() {

	let child_nodes = this.childNodes,
	    length = child_nodes.length,
	    result = [],
	    node,
	    i;

	for (i = 0; i < length; i++) {
		node = child_nodes[i];

		if (node.nodeType === 1 && node.nodeName != null) {
			result.push(node);
		}
	}

	return result;
});

/**
 * Return the first element child
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.3.1
 *
 * @type     {HTMLElement|Null}
 */
Element.setProperty(function firstElementChild() {

	let child_nodes = this.childNodes,
	    length = child_nodes.length,
	    node,
	    i;

	for (i = 0; i < length; i++) {
		node = child_nodes[i];

		// For various reasons relating to insertAdjacentHTML(),
		// sometimes text is stored in an HTMLElement,
		// skip those by also checking the nodeName
		if (node.nodeType == 1 && node.nodeName != null) {
			return node;
		}
	}

	return null;
});

/**
 * Return the previous element sibling
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * See if an attribute is set
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
Element.setMethod(function hasAttribute(name) {

	// Make sure we got a valid key
	if (!name) return false;

	// Make sure the key is lower case
	name = name.toLowerCase();

	return this.attributes._has(name);
});

/**
 * Get an attribute instance
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * Remove an attribute
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
Element.setMethod(function removeAttribute(name) {

	let do_callback = false,
	    prev_val;

	if (typeof this.attributeChangedCallback == 'function') {
		do_callback = true;
		prev_val = this.getAttribute(name);
	}

	this.attributes._removeAttribute(name);

	if (do_callback) {
		this.attributeChangedCallback(name, prev_val, null);
	}
});

/**
 * Make sure the attribute name is valid
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.22
 */
Element.setMethod(function _testAttributeName(name) {
	if (!namerx.test(name)) {
		let error = Error('Attribute name "' + name + '" contains an invalid character');
		error.name = 'InvalidCharacterError';
		throw error;
	}
});

/**
 * Set an attribute
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
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

		case 'class':
			this.className = value;
			break;

		default:
			this.attributes._setKeyVal(name, value);
			break;
	}

	if (do_callback) {
		this.attributeChangedCallback(name, prev_val, value);
	}
});

/**
 * Get an attribute
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
Element.setMethod(function getAttribute(name) {

	switch (name) {

		case 'class':
			return this.className;

		default:

			if (isDataString(name)) {
				let val = this.dataset.getFromDashes(name.slice(5));

				if (typeof val != 'undefined') {
					return String(val);
				}
			}

			let result = this._getAttribute(name);

			if (result) {
				return result.value;
			} else {
				return result;
			}
	}
});

/**
 * Turn this into a string for hawkejs
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  2.3.1
 *
 * @param    {ViewRender}   viewRender
 */
Element.setMethod(function toHawkejsString(viewRender) {

	let result = this[Hawkejs.RESULT];

	if (result != null) {
		return result;
	}

	if (this.hawkejs_id) {
		this.setIdentifier(this.hawkejs_id);
	}

	return this.outerHTML;
});


/**
 * Get the class text
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * The textContent property.
 * This is probably what you want on the client side.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.2.23
 *
 * @type     {String}
 */
Element.setProperty(function textContent() {

	var text = Bound.String.stripTags(this.innerHTML, false, '');
	text = Bound.String.decodeHTML(text);

	return text;
}, function setTextContent(text) {
	removeAllChildren(this);
	this.appendChild(new Hawkejs.Text(text));
});


/**
 * The innerHTML property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.3.18
 *
 * @type     {String}
 */
Element.setProperty(function innerHTML() {

	let child_nodes = this.childNodes,
	    length = child_nodes.length,
		html = '';

	if (length > 0) {
		let node,
		    temp,
		    i;

		for (i = 0; i < length; i++) {
			node = child_nodes[i]

			if (node == null) {
				// Do nothing
			} else if (typeof node == 'string') {
				html += node;
			} else if ((temp = Hawkejs.extractResult(node)) != null) {
				html += Hawkejs.getTextContent(temp);
			} else {

				// Never escape <script> or <style> contents!
				if (this.nodeName == 'SCRIPT' || this.nodeName == 'STYLE') {
					temp = node.textContent;
				} else {
					temp = node.outerHTML;
				}

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

	removeAllChildren(this);

	// An empty string or null clears out the contents
	if (html === '' || html === null) {
		return;
	}

	// Undefined would print "undefined"
	if (html == null) {
		html = ''+html;
	}

	this._setInnerHTML(html);
});

/**
 * Remove all children of the given element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.23
 * @version  2.2.23
 */
function removeAllChildren(element) {

	let i;

	// Unset the parentElement for all the nodes
	for (i = 0; i < element.childNodes.length; i++) {
		if (typeof element.childNodes[i] == 'object') {
			element.childNodes[i].parentElement = null;
		}
	}

	// Delete all already set nodes
	element.childNodes.length = 0;
}

/**
 * The outerHTML property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.3.1
 *
 * @type     {String}
 */
Element.setProperty(function outerHTML() {

	let forced_html = this[HTML];

	if (forced_html != null) {
		return forced_html;
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

	html = open_tag + this.serializeProperties();

	html += this._outerHTMLClose(tag_name);

	return html;
}, function setOuterHtml(html) {
	this[HTML] = html;
});

/**
 * Get the second part of the outer HTML
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
Element.setMethod(function _outerHTMLClose(tag_name) {

	let html = this.innerHTML;

	if (html) {
		html = '>' + html + '</' + tag_name + '>';
	} else {
		html += '/>';
	}

	return html;
});

/**
 * Set the inner HTML
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.2.23
 *
 * @param    {String|Function}   html
 */
Element.setMethod(function _setInnerHTML(html) {

	let html_only;

	if (typeof html == 'string') {
		html_only = true;
	} else if (typeof html.toElement == 'function') {
		let element = html.toElement();
		this.append(element);
		return;
	}

	if (!html) {
		return;
	}

	if (typeof html == 'object') {
		html = String(html);
	}

	if (!Blast.stringNeedsHtmlEscaping(html)) {
		let node = new Hawkejs.Text(html, true);
		this.appendChild(node);
		return;
	}

	let renderer = this.hawkejs_renderer;

	if (!renderer) {
		let hawkejs = Hawkejs.Hawkejs.getInstance();
		renderer = new Hawkejs.Renderer(hawkejs);
	}

	let elements = renderer.evaluate(html, null, html_only),
	    i;

	for (i = 0; i < elements.length; i++) {
		this.append(elements[i]);
	}
});

/**
 * Dry this object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  2.0.1
 */
Element.setMethod(function toDry() {

	let result;

	// When no tagName is set, this is actually plain HTML content
	if (!this.tagName) {
		result = {
			value : {
				outerHTML : this.outerHTML
			}
		};
	} else {
		result = Hawkejs.Element.Element.prototype.toDry.call(this);
		result.value.tagName = this.tagName;
	}

	// Rely on the CustomElement (called Element) class
	// to revive regular elements with a hawkejs_id property
	result.dry_class = 'Element.Element';
	result.namespace = 'Hawkejs';

	return result;
});

/**
 * Add a child node
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.3.1
 *
 * @return   {HTMLElement}
 */
Element.setMethod(function appendChild(child) {

	let child_nodes = this.childNodes;

	if (typeof child == 'object') {

		if (child.nodeType == null) {
			throw new Error('Failed to execute \'appendChild\' on \'Node\': parameter 1 is not of type \'Node\'.');
		}

		if (child.parentElement === this) {
			let index = child_nodes.indexOf(child);

			if (index > -1) {
				child_nodes.splice(index, 1);
			}
		} else {
			child.parentElement = this;
		}

		// This is great for server-side rendering
		// (it makes sure elements are marked as dirt when directly
		// pushed to another element's children)
		// but this is not done on client-side renders,
		// so we need another solution there.
		// @see Renderer#createElement
		if (Hawkejs.canBeMarkedAsDirty(child)) {
			Hawkejs.markBranchAsDirty(child);
		}
	}

	child_nodes.push(child);
	return child;
});

let skipAttributes = ['id', 'class', 'for', 'name'];

/**
 * Serialize properties
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
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

		for (key in items) {
			attr = items[key];

			if (!attr) {
				continue;
			}

			if (skipAttributes.indexOf(attr.name) > -1) {
				continue;
			}

			result += this.getSerialized(attr.name);
		}
	}

	return result;
});

/**
 * Get the serialized key-value pair
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.1.0
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
			result += '="' + Bound.String.encodeHTML(value, true) + '"';
		}
	}

	return result;
});

/**
 * Add an adjacent HTML element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * Get all child elements that contain the given class name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
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
 * Get the NW instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

// NW implementations
Element.setMethod(function querySelectorAll(selector) {
	return getNw().select(selector, this);
});

Element.setMethod(function closest(selector) {
	return getNw().closest(selector, this);
});

Element.setMethod(function querySelector(selector) {
	return getNw().first(selector, this);
});

Element.setMethod(function matches(selector) {
	return getNw().match(selector, this);
});

// Some no-ops for browser compatibility
Element.setMethod(function addEventListener() {});
Element.setMethod(function removeEventListener() {});
Element.setMethod(function focus() {});

/**
 * Custom Janeway representation (left side)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @return   {string}
 */
Element.setMethod(Blast.JANEWAY_LEFT, function janewayClassIdentifier() {
	return this.nodeName
});

/**
 * Custom Janeway representation (right side)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @return   {string}
 */
Element.setMethod(Blast.JANEWAY_RIGHT, function janewayInstanceInfo() {

	if (this.id) {
		return '#' + this.id;
	}

	return '';
});