module.exports = function hawkElementBuilder(Hawkejs, Blast) {

	/**
	 * The Element Builder class
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   tagName
	 * @param    {Object}   options
	 */
	function ElementBuilder(tagName, options) {

		// Store the lowercase name
		this.tagName = tagName.toLowerCase();

		// The attributes
		this.attribute = {};

		// The content between the tags
		this.content = '';

		// The base content
		this.baseContent = false;

		// Use async content?
		this.useBaseContent = false;

		// Prepend html
		this.prepend_html = '';

		// Append html
		this.append_html = '';

		// Wrapper element
		this.wrapper = false;

		switch (this.tagName) {
			case 'link':
			case 'meta':
			case 'img':
			case 'br':
			case 'hr':
				this.self_close = true;
				break;
		}
	}

	/**
	 * A static function to create a new ElementBuilder
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   tagName
	 * @param    {Object}   options
	 */
	ElementBuilder.create = function create(tagName, options) {
		return new ElementBuilder(tagName, options);
	};

	/**
	 * Get the html asynchronously if the content provided also
	 * has a getContent method
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {String}
	 */
	ElementBuilder.prototype.getContent = function getContent(callback) {

		var that = this,
		    val;

		if (this.baseContent && this.baseContent.value) {
			val = this.baseContent.value;

			if (val.getContent) {
				this.useBaseContent = true;
				return val.getContent(callback);
			}
		}

		return callback(null, this.content);
	};

	/**
	 * Turn the opening tag into a string
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {String}
	 */
	ElementBuilder.prototype.getOpenTagString = function getOpenTagString() {

		var html = '<' + this.tagName,
		    name;

		html += this.getSerialized('id');
		html += this.getSerialized('class');
		html += this.getSerialized('for');
		html += this.getSerialized('name');

		for (name in this.attribute) {

			// Skip names that have already been added
			if (['id', 'class', 'for', 'name'].indexOf(name) > -1) {
				continue;
			}

			html += this.getSerialized(name);
		}

		// HTML5 tags don't self-close,
		// they just don't have an end tag
		html += '>';

		return html;
	};

	/**
	 * Turn the element into a string
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {String}
	 */
	ElementBuilder.prototype.toString = function toString() {

		var html = '',
		    classNames,
		    value;

		if (this.prepend_html) {
			html += this.prepend_html;
		}

		html += this.getOpenTagString();

		if (this.useBaseContent) {
			value = this.baseContent.value;
			if (this.baseContent.escape) {
				value = Blast.Classes.String.prototype.encodeHTML.call(value);
			}
		} else {
			value = this.content;
		}

		html += value || '';

		if (!this.self_close) {
			html += '</' + this.tagName + '>';
		}

		if (this.append_html) {
			html += this.append_html;
		}

		if (this.wrapper) {
			this.wrapper.setContent(html);
			return this.wrapper.toString();
		}

		return html;
	};

	/**
	 * Set the content
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    value
	 * @param    {Boolean}   escape    HTML escape the content? False by default
	 */
	ElementBuilder.prototype.setContent = function setContent(value, escape) {

		var html = '',
		    i;

		this.baseContent = {value: value, escape: escape};

		value = Blast.Bound.Array.cast(value);

		// Add every entry to the html string
		for (i = 0; i < value.length; i++) {

			// Join the entry if it's a string, too
			if (Array.isArray(value[i])) {
				html += value[i].join(' ');
			} else {
				html += value[i] || '';
			}
		}

		if (escape) {
			html = Blast.Classes.String.prototype.encodeHTML.call(html);
		}

		this.content = html;
	};

	/**
	 * Set an attribute,
	 * overwriting its existing value.
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {Mixed}    value
	 */
	ElementBuilder.prototype.setAttribute = function setAttribute(name, value) {

		var attributes,
		    key;

		if (name && typeof name == 'object') {

			if (name.attributes) {
				attributes = name.attributes;

				if (name['class']) {
					this.setAttribute('class', name['class']);
				}

				if (name.className) {
					this.setAttribute('class', name.className);
				}
			} else {
				attributes = name;
			}

			for (key in attributes) {
				this.setAttribute(key, attributes[key]);
			}

			return;
		}

		// Create an empty attribute
		this.attribute[name] = [];

		if (!value && value !== false) {
			value = '';
		}

		// Add the new attribute
		this.appendAttribute(name, value);
	};

	/**
	 * Get the value of an attribute
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ElementBuilder.prototype.getAttribute = function getAttribute(name) {

		var result,
		    entry,
		    i;

		// If the property is on this object, use that initially
		if (this.hasOwnProperty(name)) {
			result = this[name];
		}

		result = String(result || '');

		if (this.attribute[name]) {
			for (i = 0; i < this.attribute[name].length; i++) {

				entry = ''+this.attribute[name][i];

				if (entry) {
					if (result) result += ' ';
					result += entry;
				}
			}
		}

		return result;
	};

	/**
	 * Get the serialized key-value pair
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ElementBuilder.prototype.getSerialized = function getSerialized(name) {

		var result = this.getAttribute(name);

		if (result) {
			result = ' ' + name + '=' + JSON.stringify(Blast.Bound.String.encodeHTML(result));
		}

		return result;
	};

	/**
	 * Remove an attribute
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {Mixed}    value
	 */
	ElementBuilder.prototype.removeAttribute = function removeAttribute(name) {
		this.attribute[name] = null;
	};

	/**
	 * Append the value of an attribute
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ElementBuilder.prototype.appendAttribute = function appendAttribute(name, value) {

		// Make sure the attribute entry exists
		if (!this.attribute[name]) {
			this.attribute[name] = [];
		}

		// We don't allow duplicate values
		if (this.attribute[name].indexOf(value) === -1) {
			this.attribute[name].push(value);
		}
	};

	/**
	 * Replace the value inside an attribute, if it exists
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ElementBuilder.prototype.replaceAttributeValue = function replaceAttributeValue(name, oldValue, newValue) {

		var id;

		// Do nothing if the attribute doesn't exist
		if (!this.attribute[name]) {
			return;
		}

		// We don't allow duplicate values
		if (id = this.attribute[name].indexOf(oldValue) > -1) {
			this.attribute[name][id] = newValue;
		}
	};

	/**
	 * Add a css class
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   value   The classname to add
	 */
	ElementBuilder.prototype.addClass = function addClass(value) {

		// Do not allow false, null or undefineds
		if (!value) {
			return;
		}

		this.appendAttribute('class', value);
	};

	/**
	 * Get/set an attribute
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {String}   value
	 */
	ElementBuilder.prototype.attr = function attr(name, value) {

		if (arguments.length == 1) {
			return this.getAttribute(name);
		} else {
			return this.setAttribute(name, value);
		}
	};

	/**
	 * Get/set a data attribute
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {String}   value
	 */
	ElementBuilder.prototype.data = function data(name, value) {

		name = 'data-' + name;

		if (arguments.length == 1) {
			return this.attr(name);
		} else {
			return this.attr(name, value);
		}
	};

	Hawkejs.ElementBuilder = ElementBuilder;
};