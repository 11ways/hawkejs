module.exports = function hawkElementBuilder(Hawkejs, Blast) {

	/**
	 * The Element Builder class
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.0
	 *
	 * @param    {String}   tagName
	 * @param    {Object}   options
	 */
	var ElementBuilder = Blast.Bound.Function.inherits(null, 'Hawkejs', function ElementBuilder(tagName, options) {

		if (ElementBuilder.super && ElementBuilder.super.name != 'HTMLElement') {
			ElementBuilder.super.call(this);
		}

		// Store the lowercase name
		this.tagName = tagName.toLowerCase();
		this.nodeName = this.tagName;

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

		// You can optionally set a viewRender instance later
		this.viewRender = null;

		// Store the options
		this.options = options || {};

		// Does this element have a tabindex by default?
		switch (this.tagName) {
			case 'textarea':
			case 'button':
			case 'object':
			case 'select':
			case 'input':
			case 'area':
			case 'a':
				this.has_tabindex = true;
				break;
		}

		if (this.has_tabindex || this.options.tabindex != null) {
			if (this.options.tabindex != null) {
				this.tabindex = this.options.tabindex;
			} else if (this.viewRender && this.viewRender.internal('tabindex') != null) {
				this.tabindex = this.viewRender.internal('tabindex');
			}
		}

		// Is it a self-closing tag?
		switch (this.tagName) {
			case 'link':
			case 'meta':
			case 'img':
			case 'br':
			case 'hr':
				this.self_close = true;
				break;
		}
	});

	ElementBuilder.compose('element', function compositor() {
		var self = this.compositorParent;
		return self.createElement(self.tagName);
	}, ['setAttribute', 'getAttribute', 'addEventListener', 'removeEventListener', 'appendChild']);

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
	 * The dataset property
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @type     {Object}
	 */
	ElementBuilder.setProperty(function dataset() {
		return this.element.dataset;
	});

	/**
	 * The classList property
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @type     {ClassList}
	 */
	ElementBuilder.setProperty(function classList() {
		return this.element.classList;
	});

	/**
	 * The childNodes property
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @type     {Array}
	 */
	ElementBuilder.setProperty(function childNodes() {
		return this.element.childNodes;
	});

	/**
	 * The textContent property
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @type     {String}
	 */
	ElementBuilder.setProperty(function textContent() {
		return this.element.textContent;
	}, function setTextContent(text) {
		return this.element.textContent = text;
	});

	/**
	 * The innerText property
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @type     {String}
	 */
	ElementBuilder.setProperty(function innerText() {
		return this.element.innerText;
	}, function setInnerText(text) {
		return this.element.innerText = text;
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
	ElementBuilder.setProperty(function innerHTML() {
		return this.content;
	}, function setInnerHTML(html) {
		this.setContent(html);
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
	ElementBuilder.setProperty(function outerHTML() {

		var html = '',
		    classNames,
		    value;

		if (this.prepend_html) {
			html += this.prepend_html;
		}

		if (this.useBaseContent) {
			value = this.baseContent.value;
			if (this.baseContent.escape) {
				value = Blast.Classes.String.prototype.encodeHTML.call(value);
			}
			this.element.innerHTML = value;
		}

		html += this.element.outerHTML;

		if (this.append_html) {
			html += this.append_html;
		}

		if (this.wrapper) {
			this.wrapper.setContent(html);
			return this.wrapper.toString();
		}

		return html;
	});

	/**
	 * Create a HTMLElement
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @return   {String}
	 */
	ElementBuilder.setMethod(function createElement(nodeName) {

		var element;

		if (Blast.isNode) {
			element = new Blast.Classes.Hawkejs.Element();
			element.nodeName = nodeName.toUpperCase();
			element.tagName = element.nodeName;
		} else {
			element = document.createElement(nodeName);
		}

		return element;
	});

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
	ElementBuilder.setMethod(function getContent(callback) {

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
	});

	/**
	 * Turn the element into a string
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.0
	 *
	 * @return   {String}
	 */
	ElementBuilder.setMethod(function toString() {
		return this.outerHTML;
	});

	/**
	 * Set the content
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.0
	 *
	 * @param    {String}    value
	 * @param    {Boolean}   escape    HTML escape the content? False by default
	 */
	ElementBuilder.setMethod(function setContent(value, escape) {

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

		this.element.innerHTML = html;
	});

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
	ElementBuilder.setMethod(function removeAttribute(name) {
		this.setAttribute(name, null);
	});

	/**
	 * Append the value of an attribute
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.0
	 */
	ElementBuilder.setMethod(function appendAttribute(name, value) {

		var target_value = this.getAttribute(name);

		if (target_value) {
			target_value += ' ' + value;
		} else {
			target_value = value;
		}

		this.setAttribute(name, target_value);
	});

	Hawkejs.ElementBuilder = ElementBuilder;
};