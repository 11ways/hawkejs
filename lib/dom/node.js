const NODE_TYPE = {
	ELEMENT_NODE: 1,
	ATTRIBUTE_NODE: 2,
	TEXT_NODE: 3,
	CDATA_SECTION_NODE: 4, // historical
	ENTITY_REFERENCE_NODE: 5, // historical
	ENTITY_NODE: 6, // historical
	PROCESSING_INSTRUCTION_NODE: 7,
	COMMENT_NODE: 8,
	DOCUMENT_NODE: 9,
	DOCUMENT_TYPE_NODE: 10,
	DOCUMENT_FRAGMENT_NODE: 11,
	NOTATION_NODE: 12 // historical
};

const TREE_POSITION = {
	DISCONNECTED: 1,
	PRECEDING: 2,
	FOLLOWING: 4,
	CONTAINS: 8,
	CONTAINED_BY: 16,
};

const NODE_DOCUMENT_POSITION = {
	DOCUMENT_POSITION_DISCONNECTED: 1,
	DOCUMENT_POSITION_PRECEDING: 2,
	DOCUMENT_POSITION_FOLLOWING: 4,
	DOCUMENT_POSITION_CONTAINS: 8,
	DOCUMENT_POSITION_CONTAINED_BY: 16,
	DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
};

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
 * Insert an element before another child element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.3.0
 */
Node.setMethod(function insertBefore(new_node, reference_node) {

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
 * Replace a child node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.2
 * @version  2.1.2
 *
 * @param    {Node}   new_child
 * @param    {Node}   old_child
 */
Node.setMethod(function replaceChild(new_child, old_child) {

	let index = this.childNodes.indexOf(old_child);

	if (index == -1) {
		throw new Error('Child to be replaced is not a child of this node');
	}

	this.insertBefore(new_child, old_child);
	old_child.remove();
});

/**
 * Replace this node in its parent
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.2
 * @version  2.1.2
 *
 * @param    {Node}   node
 */
Node.setMethod(function replaceWith(node) {

	let parent = this.parentNode;

	if (!parent) {
		return;
	}

	let i = arguments.length;

	if (!i) {
		parent.removeChild(this);
	}

	let current;

	while (i--) {
		current = arguments[i];

		if (typeof current !== 'object') {
			current = Hawkejs.createText(current);
		} else if (current.parentNode) {
			current.parentNode.removeChild(current);
		}

		if (!i) {
			// "current" is now the first argument
			parent.replaceChild(current, this);
		} else {
			// "current" is now not the first
			parent.insertBefore(current, this.nextSibling);
		}
	}
});

/**
 * Compare positions in the document
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.2
 * @version  2.1.2
 *
 * @param    {Node}   other
 *
 * @return   {Number}
 */
Node.setMethod(function compareDocumentPosition(other) {

	let node1 = other,
	    node2 = this;

	let attr1 = null,
	    attr2 = null;

	if (node1.nodeType === NODE_TYPE.ATTRIBUTE_NODE) {
		attr1 = node1;
		// @TODO: our Attribute class doesn't keep elements yet
		node1 = attr1.element;
	}

	if (node2.nodeType === NODE_TYPE.ATTRIBUTE_NODE) {
		attr2 = node2;
		node2 = attr2.element;

		if (attr1 !== null && node1 !== null && node2 === node1) {
			// @TODO: Implement jsdom's node-impl.js
		}
	}

	if (node1 == node2) {
		return 0;
	}

	const result = compareTreePosition(node2, node1);

	if (result == NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_DISCONNECTED) {
		return NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_DISCONNECTED |
		       NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC |
		       NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_FOLLOWING;
	}

	return result;
});

/**
 * Compare the position of an object relative to another object.
 * A bit set is returned:
 *
 * - DISCONNECTED:  1
 * - PRECEDING:     2
 * - FOLLOWING:     4
 * - CONTAINS:      8
 * - CONTAINED_BY: 16
 *
 * @author   JSDom SymbolTree.js implementation
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.2
 * @version  2.1.2
 *
 * @param    {Node}   left
 * @param    {Node}   right
 *
 * @return   {Number}
 */
function compareTreePosition(left, right) {

	if (left == right) {
		return 0;
	}

	const left_ancestors = [];

	{
		let left_ancestor = left;

		while (left_ancestor) {
			if (left_ancestor === right) {
				return TREE_POSITION.CONTAINS | TREE_POSITION.PRECEDING;
			}

			left_ancestors.push(left_ancestor);
			left_ancestor = left_ancestor.parentElement;
		}
	}

	const right_ancestors = [];

	{
		let right_ancestor = right;

		while (right_ancestor) {
			if (right_ancestor === left) {
				return TREE_POSITION.CONTAINED_BY | TREE_POSITION.FOLLOWING;
			}

			right_ancestors.push(right_ancestor);
			right_ancestor = right_ancestor.parentElement;
		}
	}

	const root = reverseArrayIndex(left_ancestors, 0);

	if (!root || root !== reverseArrayIndex(right_ancestors, 0)) {
		return TreePosition.DISCONNECTED;
	}

	let common_ancestor_index = 0;
	const ancestors_min_length = Math.min(left_ancestors.length, right_ancestors.length);

	for (let i = 0; i < ancestors_min_length; ++i) {
		const left_ancestor = reverseArrayIndex(left_ancestors, i);
		const right_ancestor = reverseArrayIndex(right_ancestors, i);

		if (left_ancestor !== right_ancestor) {
			break;
		}

		common_ancestor_index = i;
	}

	const left_a = reverseArrayIndex(left_ancestors, common_ancestor_index + 1),
	      right_a = reverseArrayIndex(right_ancestors, common_ancestor_index + 1);

	const left_index = left_a.parentElement.childNodes.indexOf(left_a),
	      right_index = right_a.parentElement.childNodes.indexOf(right_a);

	if (right_index < left_index) {
		return TREE_POSITION.PRECEDING;
	} else {
		return TREE_POSITION.FOLLOWING;
	}
}

/**
 * Reverse array index getter
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.2
 * @version  2.1.2
 *
 * @param    {Node}   left
 * @param    {Node}   right
 *
 * @return   {Number}
 */
function reverseArrayIndex(array, reverseIndex) {
	return array[array.length - 1 - reverseIndex]; // no need to check `index >= 0`
}

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
TextNode.setProperty('nodeType', NODE_TYPE.TEXT_NODE);

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