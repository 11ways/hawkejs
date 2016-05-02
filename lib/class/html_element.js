module.exports = function hawkHTMLElement(Hawkejs, Blast) {

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

	/**
	 * Server-side HTMLElement class
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	var Element = Function.inherits(null, 'Hawkejs', function HTMLElement() {

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
		return this.innerHTML = Blast.Classes.String.prototype.encodeHTML.call(text);
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
	 * @version  1.1.0
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

			if (typeof node == 'string') {
				html += node;
			} else {
				html += node.outerHTML || node.textContent;
			}
		}

		return html;
	}, function setInnerHTML(html) {

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
	 * @version  1.1.0
	 *
	 * @type     {String}
	 */
	Element.setProperty(function outerHTML() {

		var result = [],
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
	});

	var skipAttributes = ['id', 'class', 'for', 'name'];

	/**
	 * Serialize properties
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
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

			if (skipAttributes.indexOf(attr.name) > -1) {
				continue;
			}

			result += this.getSerialized(attr.name);
		}

		for (key in this.dataset) {
			result += this.getSerialized('data-' + key);
		}

		return result;
	});

	/**
	 * Get the serialized key-value pair
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.setMethod(function getSerialized(name) {

		var result = this.getAttribute(name);

		if (result) {
			result = ' ' + name + '=' + JSON.stringify(Blast.Bound.String.encodeHTML(result));
		}

		return result || '';
	});

	/**
	 * Add a child element
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @return   {HTMLElement}
	 */
	Element.setMethod(function appendChild(child) {
		child.parentElement = this;
		this.childNodes.push(child);
		return child;
	});

	/**
	 * Set an attribute
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.setMethod(function setAttribute(name, value) {
		var data_name;

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
					return;
				}

				this._setProperty(this.attributes, Blast.Classes.Hawkejs.Attribute, name, value);
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

	// Some no-ops for browser compatibility
	Element.setMethod(function addEventListener() {});
	Element.setMethod(function removeEventListener() {});

};