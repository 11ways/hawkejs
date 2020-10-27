/**
 * Server-side Node class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 */
var Node = Fn.inherits(null, 'Hawkejs', function Node() {});


/**
 * The parent node (always an element on the server)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Element}
 */
Node.setProperty(function parentNode() {
	return this.parentElement;
});

/**
 * Get the previous sibling node if it exists
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Node}
 */
Node.setProperty(function previousSibling() {
	return this._getSibling(-1);
});

/**
 * Get the next sibling node if it exists
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Node}
 */
Node.setProperty(function nextSibling() {
	return this._getSibling(1);
});

/**
 * Return the first child node
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Node|Null}
 */
Node.setProperty(function firstChild() {
	return this.childNodes[0] || null;
});

/**
 * Return the last child node
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Node|Null}
 */
Node.setProperty(function lastChild() {
	return this.childNodes[this.childNodes.length - 1] || null;
});

/**
 * Get a sibling
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Number}   direction
 *
 * @return   {Node}
 */
Node.setMethod(function _getSibling(direction) {
	if (!this.parentElement) {
		return null;
	}

	let i = this.parentElement.childNodes.indexOf(this);

	return this.parentElement.childNodes[i + direction] || null;
});

/**
 * Remove this node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  2.0.0
 */
Node.setMethod(function remove() {

	if (!this.parentElement) {
		return;
	}

	let i = this.parentElement.childNodes.indexOf(this);

	if (i > -1) {
		this.parentElement.childNodes.splice(i, 1);
	}

	this.parentElement = null;
});

/**
 * Remove a child node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Node}   node
 */
Node.setMethod(function removeChild(node) {

	if (node.parentElement != this) {
		throw new Error("Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.");
	}

	node.remove();

	return node;
});

/**
 * Server-side Text Node class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 */
var TextNode = Fn.inherits('Hawkejs.Node', function Text(data) {
	this.textContent = data;
});

/**
 * Text nodes are node type 3
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.8
 * @version  2.1.0
 *
 * @type     {Number}
 */
TextNode.setProperty('nodeType', 3);

/**
 * The textContent property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 *
 * @type     {String}
 */
TextNode.setProperty(function textContent() {
	return this.data || '';
}, function setTextContent(text) {
	return this.data = String(text);
});

/**
 * The outerHTML property.
 * Normal TextNodes don't have this, but it makes our lives easier
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 *
 * @type     {String}
 */
TextNode.setProperty(function outerHTML() {
	return Bound.String.encodeHTML(this.textContent);
});