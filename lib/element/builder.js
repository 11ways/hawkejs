const Hwk = Hawkejs.Hawkejs;
const BUILDER = Symbol('builder');

/**
 * The builder wrapper
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @param    {HTMLElement}   element
 */
const Builder = Fn.inherits(null, 'Hawkejs', function Builder(element) {
	this.element = element;
	element[BUILDER] = this;
});

/**
 * Are we building an XML tree?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
Builder.setProperty('is_xml', false);

/**
 * Create a new builder
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @param    {Object}   options
 */
Builder.setStatic(function create(options = {}) {

	let is_xml = options.xml === true,
	    element = Hwk.createElement('root', is_xml);

	let builder = new Builder(element);

	if (is_xml) {
		builder.is_xml = true;
	}

	return builder;
});

/**
 * Create a new element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 */
Builder.setMethod(function createElement(tag) {
	let element = Hwk.createElement(tag, this.is_xml);
	return element;
});

/**
 * Add a child element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @return   {Builder}
 */
Builder.setMethod(function ele(tag) {

	let child = this.createElement(tag),
	    builder = new Builder(child);
	
	this.element.append(child);

	if (this.is_xml) {
		builder.is_xml = true;
	}

	return builder;
});

/**
 * Get the parent builder
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @return   {Builder}
 */
Builder.setMethod(function up() {
	return this.element?.parentElement?.[BUILDER];
});

/**
 * Set the text content
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @return   {Builder}
 */
Builder.setMethod(function txt(str) {
	this.element.textContent = str;
	return this;
});

/**
 * Set an attribute
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @return   {Builder}
 */
Builder.setMethod(function att(name, value) {
	this.element.setAttribute(name, value);
	return this;
});

/**
 * Add a comment node,
 * but don't return it
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @return   {Builder}
 */
Builder.setMethod(function com(content) {
	throw new Error('Not yet implemented')
});

/**
 * Add a CDATA node,
 * but return this element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @return   {Builder}
 */
Builder.setMethod(function dat(content) {
	throw new Error('Not yet implemented')
});

/**
 * Remove this node and return its parent
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @return   {Builder}
 */
Builder.setMethod(function remove() {
	let up = this.up();
	this.element.remove();
	return up;
});

/**
 * Return the string representation
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.4
 * @version  2.3.4
 *
 * @return   {String}
 */
Builder.setMethod(function end() {

	let result = this.element.innerHTML;

	if(this.is_xml) {
		result = '<?xml version="1.0" encoding="UTF-8"?>\n' + result;
	}

	return result;
});