/**
 * Server-side Node class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 */
var Node = Blast.Bound.Function.inherits(null, 'Hawkejs', function Node() {});

/**
 * Remove this node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.8
 */
Node.setMethod(function remove() {

	var i;

	if (!this.parentElement) {
		return;
	}

	i = this.parentElement.childNodes.indexOf(this);

	if (i > -1) {
		this.parentElement.childNodes.splice(i, 1);
	}

	this.parentElement = null;
});

/**
 * Server-side Text Node class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 */
var TextNode = Blast.Bound.Function.inherits('Hawkejs.Node', function Text(data) {
	this.textContent = data;
});

/**
 * Text nodes are node type 3
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 *
 * @type     {Number}
 */
TextNode.setProperty('nodeType', 1);

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
	return Blast.Bound.String.encodeHTML(this.textContent);
});