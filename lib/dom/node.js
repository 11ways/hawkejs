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
 * @version  2.3.2
 */
const Node = Fn.inherits('Branch', 'Hawkejs', function Node() {
	Node.super.call(this);
	this._children = this[Classes.Branch.CHILDREN];
});

/**
 * Values that could be added later
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.1
 * @version  2.3.1
 *
 * @type     {Null}
 */
Node.setProperty(Hawkejs.RENDER_CONTENT, null);
Node.setProperty(Hawkejs.RESULT, null);
Node.setProperty(Hawkejs.PRE_TASKS, null);
Node.setProperty('renderHawkejsContent', null);
Node.setProperty('is_assembled', null);
Node.setProperty('hawkejs_renderer', null);

/**
 * The parent node
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Element}
 */
Node.setProperty(function parentNode() {
	return this.parent;
});

/**
 * The parent element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.1.4
 * @version  2.1.4
 *
 * @type     {Element}
 */
Node.setProperty(function parentElement() {
	return this.parent;
}, function setParent(element) {
	return this.parent = element;
});

/**
 * Expose the array of children
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.1.4
 * @version  2.1.4
 *
 * @type     {Array}
 */
Node.setProperty(function childNodes() {
	return this._children;
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
 * See if this node is an ancestor of the given node
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.17
 * @version  2.2.17
 *
 * @param    {Node}   node
 */
Node.setMethod(function contains(node) {

	if (node == null) {
		return false;
	}

	const children = this.childNodes;

	if (!children?.length) {
		return false;
	}

	let i;

	for (i = 0; i < children.length; i++) {
		if (children[i] === node || children[i].contains(node)) {
			return true;
		}
	}

	return false;
});

/**
 * Insert a node somewhere
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.2
 * @version  2.3.2
 *
 * @param    {Number}   direction
 * @param    {Branch}   new_branch
 * @param    {Branch}   reference_branch
 */
Node.setMethod(function _insert(direction, new_node, existing_node) {
	_insert.super.call(this, direction, new_node, existing_node);

	if (Hawkejs.canBeMarkedAsDirty(new_node)) {
		Hawkejs.markBranchAsDirty(new_node);
	}
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.2
 * @version  2.2.21
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

	let next_sibling,
	    current;

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
			next_sibling = this.nextSibling;

			if (next_sibling) {
				parent.insertBefore(current, next_sibling);
			} else {
				parent.append(current);
			}
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
 * @version  2.2.23
 */
const TextNode = Fn.inherits('Hawkejs.Node', function Text(data, known_safe) {

	this.textContent = data || '';
	this.has_html_version = false;

	if (!known_safe && Blast.stringNeedsHtmlEscaping(this.textContent)) {
		this.html_version = Bound.String.encodeHTML(this.textContent);
		this.has_html_version = true;
	}
});

/**
 * Server-side Text Node class from known unsafe text
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.23
 * @version  2.2.23
 */
TextNode.setStatic(function fromUnsafe(data) {
	data = data || '';

	// We actually still have to decode & re-encode the string
	// (in case of unescaped entities)
	let safe_text = Bound.String.decodeHTML(data);
	let result = new TextNode(safe_text);

	return result;
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
 * Text nodes use '#text' as the nodeName
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @type     {String}
 */
TextNode.setProperty('nodeName', '#text');

/**
 * Textnodes have no children
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.4
 * @version  2.1.4
 *
 * @type     {Null}
 */
TextNode.setProperty('children', null);

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
 * @version  2.2.23
 *
 * @type     {String}
 */
TextNode.setProperty(function outerHTML() {

	if (this.has_html_version) {
		return this.html_version;
	}

	return this.textContent;
});

/**
 * Return the object to use for JSON
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.4
 * @version  2.1.4
 */
TextNode.setMethod(function toJSON() {
	return this.data;
});

/**
 * Return the string representation
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @return   {String}
 */
TextNode.setMethod(function toString() {
	return '[object Text]';
});
