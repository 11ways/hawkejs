var value_symbol = Symbol('value'),
    html_symbol = Symbol('html');

var VOID_ELEMENTS = {
	AREA: true,
	BASE: true,
	BR: true,
	COL: true,
	EMBED: true,
	HR: true,
	IMG: true,
	INPUT: true,
	KEYGEN: true,
	LINK: true,
	META: true,
	PARAM: true,
	SOURCE: true,
	TRACK: true,
	WBR: true
};

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
 * @version  1.2.8
 */
var Element = Blast.Bound.Function.inherits('Hawkejs.Node', function HTMLElement() {

	// Create the style property
	this.style = new Blast.Classes.Hawkejs.Style(this);

	// Create the class list
	this.classList = new Blast.Classes.Hawkejs.ClassList(this);

	this.childNodes = [];
	this.attributes = [];
	this.dataset = {};
	this.className = '';
});

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
 * Set a property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Element.setMethod(function _setProperty(arr, obj, key, val) {

	var property = this._getProperty(arr, key);

	if (property) {
		property.value = val;
		return;
	}

	arr.push(typeof obj == 'function' ? new obj(key.toLowerCase(), val) : obj);
});

/**
 * Get a property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Element.setMethod(function _getProperty(arr, key) {

	var i;

	// Make sure we got a valid key
	if (!key) return;

	// Make sure the key is lower case
	key = key.toLowerCase();

	for (i = 0; i < arr.length; i++) {
		if (key == arr[i].name) return arr[i];
	}

	return null;
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
 * @version  1.3.0
 *
 * @type     {String}
 */
Element.setProperty(function value() {

	if (this.tagName == 'TEXTAREA') {
		return this.innerText;
	}

	if (HAS_VALUE[this.tagName]) {
		return this.getAttribute('value');
	}

	return this[value_symbol];
}, function setValue(value) {

	// Setting the value of a textarea does nothing
	if (this.tagName == 'TEXTAREA') {
		return value;
	}

	if (HAS_VALUE[this.tagName]) {
		return this.setAttribute('value', value);
	}

	return this[value_symbol] = value;
});

/**
 * The textContent property.
 * This is probably what you want on the client side.
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Element.setProperty(function textContent() {
	// This won't really be correct on the server side, but it's something
	return this.innerHTML;
}, function setTextContent(text) {
	return this.innerHTML = Blast.Classes.String.prototype.encodeHTML.call(String(text));
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
	// This won't really be correct on the server side, but it's something
	return this.textContent;
}, function setInnterText(text) {
	return this.textContent = text;
});

/**
 * The innerHTML property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @type     {String}
 */
Element.setProperty(function innerHTML() {

	var node,
	    html,
	    i;

	// Start with an empty string
	html = '';

	for (i = 0; i < this.childNodes.length; i++) {
		node = this.childNodes[i];

		if (node == null) {
			// Do nothing
		} else if (typeof node == 'string') {
			html += node;
		} else {
			html += node.outerHTML || node.textContent || node || '';
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
 * @version  1.3.1
 *
 * @type     {String}
 */
Element.setProperty(function outerHTML() {

	if (this[html_symbol] != null) {
		return this[html_symbol];
	}

	let result = [],
	    node_name,
	    open_tag,
	    tag_name;

	node_name = this.nodeName.toLowerCase();

	if (this.tagName) {
		tag_name = this.tagName.toLowerCase();
	} else {
		tag_name = node_name;
	}

	open_tag = '<' + tag_name;

	if (tag_name != node_name) {
		open_tag += ' is="' + node_name + '"';
	}

	result.push(open_tag + this.serializeProperties() + '>');

	if (!VOID_ELEMENTS[this.nodeName]) {
		result.push(this.innerHTML);
		result.push('</' + tag_name + '>');
	}

	return result.join('');
}, function setOuterHtml(html) {
	this[html_symbol] = html;
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
 * @version  1.3.0
 */
Element.setMethod(function toDry() {
	// Rely on the CustomElement (called Element) class
	// to revive regular elements with a hawkejs_id property
	return {
		value: {
			hawkejs_id: this.hawkejs_id
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
 * @version  1.3.0
 *
 * @return   {String}
 */
Element.setMethod(function serializeProperties() {

	var result = '',
	    attr,
	    key,
	    i;

	result += this.getSerialized('id');
	result += this.getSerialized('class');
	result += this.getSerialized('for');
	result += this.getSerialized('name');

	for (i = 0; i < this.attributes.length; i++) {
		attr = this.attributes[i];

		if (attr.name == 'hidden') {
			result += ' hidden';
			continue;
		}

		if (skipAttributes.indexOf(attr.name) > -1) {
			continue;
		}

		result += this.getSerialized(attr.name);
	}

	for (key in this.dataset) {
		result += this.getSerialized('data-' + key);
	}

	// A textarea's value is actually it's innerText
	if (this.tagName != 'TEXTAREA') {
		result += this.getSerialized('value');
	}

	result += this.getSerialized('style');

	return result;
});

/**
 * Get the serialized key-value pair
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.1
 */
Element.setMethod(function getSerialized(name) {

	var result = this.getAttribute(name);

	if (result) {
		result = ' ' + name + '=' + JSON.stringify(Blast.Bound.String.encodeHTML(String(result)));
	}

	return result || '';
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
		node = new Blast.Classes.Hawkejs.Text(node);
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

	switch (position) {
		case 'beforeBegin':
			if (this.parentElement) {
				this.parentElement.insertBefore(element, this);
			}
			break;

		case 'afterBegin':
			if (this.childNodes.length) {
				this.insertBefore(element, this.childNodes[0]);
			} else {
				this.appendChild(element);
			}
			break;

		case 'beforeEnd':
			this.appendChild(element);
			break;

		case 'afterEnd':
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
 * @version  1.2.3
 */
Element.setMethod(function hasAttribute(name) {
	var attribute = this._getProperty(this.attributes, name);
	return !!attribute;
});

/**
 * Remove an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 */
Element.setMethod(function removeAttribute(name) {

	var attribute = this._getProperty(this.attributes, name),
	    index;

	if (attribute)  {
		index = this.attributes.indexOf(attribute);
		this.attributes.splice(index, 1);
	}
});

/**
 * Set an attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.8
 */
Element.setMethod(function setAttribute(name, value) {

	var do_callback,
	    data_name,
	    prev_val;

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
				this._setProperty(this.attributes, Blast.Classes.Hawkejs.Attribute, name, value);
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

			if (name.indexOf('data-') == 0) {
				val = this.dataset[name.slice(5)];

				if (typeof val != 'undefined') {
					return String(val);
				}
			}

			result = this._getProperty(this.attributes, name);

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
 * @version  1.2.8
 */
Element.setMethod(function getContent(callback) {

	var tasks;

	if (!this.childNodes.length) {
		return callback();
	}

	tasks = [];

	this.childNodes.forEach(function eachNode(node) {

		if (node && typeof node == 'object' && typeof node.getContent == 'function') {
			tasks.push(function getContent(next) {
				node.getContent(next);
			});
		}
	});

	Blast.Bound.Function.parallel(tasks, callback);
});

/**
 * Turn this into a string for hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {ViewRender}   viewRender
 */
Element.setMethod(function toHawkejsString(viewRender) {

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

// Some no-ops for browser compatibility
Element.setMethod(function addEventListener() {});
Element.setMethod(function removeEventListener() {});
Element.setMethod(function closest() {});
Element.setMethod(function querySelector() {});
Element.setMethod(function querySelectorAll() {});