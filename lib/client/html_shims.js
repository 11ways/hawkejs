var m_proto = __Protoblast.modifyPrototype;

if (!m_proto) {
	__Protoblast.modifyPrototype = true;
}

/**
 * Add a child node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Element|String}
 */
Blast.definePrototype(HTMLElement, 'append', function append(node) {

	if (typeof node != 'object') {
		node = document.createTextNode(node);
	}

	this.appendChild(node);
}, true);

/**
 * Replace this node in its parent with the given node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Node}
 */
Blast.definePrototype(Node, 'replaceWith', function replaceWith(node) {

	'use strict';

	var parent = this.parentNode,
	    i = arguments.length,
	    current;

	if (!parent) return;

	if (!i) {
		// if there are no arguments
		parent.removeChild(this);
	}

	while (i--) {
		// i-- decrements i and returns the value of i before the decrement
		current = arguments[i];

		if (typeof current !== 'object'){
			current = this.ownerDocument.createTextNode(current);
		} else if (current.parentNode){
			current.parentNode.removeChild(current);
		}

		// the value of "i" below is after the decrement
		if (!i) {
			// if currentNode is the first argument (currentNode === arguments[0])
			parent.replaceChild(current, this);
		} else {
			// if currentNode isn't the first
			parent.insertBefore(current, this.previousSibling);
		}
	}

}, true);


if (m_proto === false) {
	__Protoblast.modifyPrototype = false;
}