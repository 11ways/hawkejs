var Element;

if (typeof HTMLElement == 'undefined') {
	Element = Blast.Classes.Hawkejs.HTMLElement;
} else {
	Element = HTMLElement;
}

/**
 * The the index of this element inside its parent
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @return   {Number}
 */
Blast.definePrototype(Element, 'getIndexInParent', function getIndexInParent() {

	var i;

	if (!this.parentElement) {
		return -1;
	}

	for (i = 0; i < this.parentElement.children.length; i++) {
		if (this.parentElement.children[i] == this) {
			return i;
		}
	}

	return -1;
});

/**
 * Get the sibling of the given index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @param    {Number}   index
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'getSiblingByIndex', function getSiblingByIndex(index) {
	return this.parentElement.children.item(index);
});

/**
 * Insert the new node after the given reference node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @param    {HTMLElement}   new_node
 * @param    {HTMLElement}   reference_node
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'insertAfter', function insertAfter(new_node, reference_node) {

	if (reference_node) {
		reference_node = reference_node.nextSibling;
	}

	return this.insertBefore(new_node, reference_node);
});

/**
 * Move this element after the reference node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @param    {HTMLElement}   reference_node
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'moveAfterElement', function moveAfterElement(reference_node) {
	return this.parentElement.insertAfter(this, reference_node);
});

/**
 * Move this element before the reference node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @param    {HTMLElement}   reference_node
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'moveBeforeElement', function moveBeforeElement(reference_node) {
	return this.parentElement.insertBefore(this, reference_node);
});

/**
 * Move this element to the given index in it's parent
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @param    {Number}   index
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'setIndexInParent', function setIndexInParent(index) {

	var existing,
	    current;

	if (index < 0) {
		return;
	}

	// Get the current index
	current = this.getIndexInParent();

	// Get the element at the new index
	existing = this.getSiblingByIndex(index);

	if (index > current) {
		return this.moveAfterElement(existing);
	} else {
		return this.moveBeforeElement(existing);
	}
});

/**
 * Move this element by the given amount
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @param    {Number}   direction
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'incrementIndexInParent', function incrementIndexInParent(direction) {
	var new_index;

	if (!direction) {
		return;
	}

	new_index = this.getIndexInParent() + direction;

	if (new_index < 0) {
		new_index = 0;
	}

	return this.setIndexInParent(new_index);
});

/**
 * Transfer styles to another element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @param    {HTMLElement}   target
 * @param    {Array}         properties
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'transferStylesTo', function transferStylesTo(target, properties) {

	var styles = window.getComputedStyle(this),
	    i;

	if (!properties) {
		properties = styles;
	}

	for (i = 0; i < properties.length; i++) {
		key = properties[i];
		target.style[key] = styles[key];
	}
});