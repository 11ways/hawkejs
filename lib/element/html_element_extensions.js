var supports_prevent_scroll,
    has_within_event = Symbol('has_within_event'),
    has_html_event = Symbol('has_html_event'),
    has_focus = Symbol('has_focus'),
    ProtoEl,
    Element,
    m_proto;

if (typeof HTMLElement == 'undefined') {
	Element = Hawkejs.HTMLElement;
	ProtoEl = Hawkejs.HTMLElement.prototype;
	m_proto = __Protoblast.modifyPrototype;

	if (!m_proto) {
		__Protoblast.modifyPrototype = true;
	}
} else {
	Element = 'Element';
	ProtoEl = Blast.Collection.Element.prototype;

	// See if preventScroll is supported
	try {
		var test_element = createElement('div');

		test_element.addEventListener('focus', function onFocus(event) {
			event.preventDefault();
			event.stopPropagation();
		}, true);

		test_element.focus(
			Object.defineProperty({}, 'preventScroll', { get: function () {
				supports_prevent_scroll = true;
			}})
		);
	} catch(e) {}
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
 * @version  1.3.1
 *
 * @param    {Number}   index
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'getSiblingByIndex', function getSiblingByIndex(index) {
	return this.parentElement.children[index];
});

/**
 * Insert the new node after the given reference node
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.3.1
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

	if (!reference_node) {
		return this.append(new_node);
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

/**
 * Can this element be focused?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.4
 * @version  1.2.4
 *
 * @return   {Boolean}
 */
Blast.definePrototype(Element, 'isFocusable', function isFocusable() {

	// Any tabindex value means this element can be focused
	if (this.hasAttribute('tabindex') || this.hasAttribute('contentEditable')) {
		return true;
	}

	switch (this.nodeName) {
		case 'A':
		case 'AREA':
			return this.hasAttribute('href');

		case 'INPUT':
		case 'SELECT':
		case 'TEXTAREA':
		case 'BUTTON':
			return !this.hasAttribute('disabled');

		case 'IFRAME':
		case 'BODY':
		case 'EMBED':
		case 'OBJECT':
			return true;
	}

	return false;
});

/**
 * Can this element be tabbed to?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.4
 * @version  1.2.4
 *
 * @return   {Boolean}
 */
Blast.definePrototype(Element, 'isTabbable', function isTabbable() {

	var tabindex;

	if (!ProtoEl.isFocusable.call(this)) {
		return false;
	}

	tabindex = this.getAttribute('tabindex');

	if (tabindex && tabindex[0] == '-') {
		return false;
	}

	return true;
});

/**
 * Get this element or one of its children that will be
 * read out by the screenreader if we focus it.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Blast.definePrototype(Element, 'getScreenreadableElement', function getScreenreadableElement() {

	var result,
	    nodes = [],
	    node,
	    i;

	if (this.getAttribute('role') == 'text') {
		return this;
	}

	// Iterate over all the childnodes,
	// we can only have 1 child node.
	// If there are more, we need to target one specifically
	// But first we have to trim out the empty & comment nodes
	for (i = 0; i < this.childNodes.length; i++) {
		node = this.childNodes[i];

		if (node.nodeType === 8) {
			continue;
		} else if (node.nodeType === 3 && !node.textContent.trim()) {
			continue;
		} else {
			nodes.push(node);
		}
	}

	for (i = 0; i < nodes.length; i++) {
		node = nodes[i];

		// If the (first?) node is a text node (type 3) ...
		if (node.nodeType === 3) {

			// If there only is a text node, return this element
			// because it's screen readable
			// @TODO: what if there are multiple textnodes? That should be focusable too
			if (nodes.length === 1) {
				return this;
			}

			// Does this node have text?
			if (node.textContent.trim()) {
				// Yes, it has text!
				// We need to wrap this in a span
				let span = document.createElement('span');
				span.textContent = node.textContent;
				node.replaceWith(span);
				return span;
			}
		} else {
			result = getScreenreadableElement.call(node);

			if (result) {
				return result;
			}
		}
	}
});

/**
 * Force changing focus to the first screen-readable element
 * (either this element itself or one of its children)
 * so that it will be read out by a screenreader
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   options
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'forceReadableFocus', function forceReadableFocus(options) {

	var element = ProtoEl.getScreenreadableElement.call(this) || this;

	if (element) {
		ProtoEl.forceFocus.call(element, options);
		return element;
	}
});

/**
 * Force changing focus to this element.
 * (Prevents scrolling by default)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.4
 * @version  2.0.0
 *
 * @param    {Object}   options
 */
Blast.definePrototype(Element, 'forceFocus', function forceFocus(options) {

	var prevent_scroll,
	    x,
	    y;

	if (!ProtoEl.isFocusable.call(this)) {
		this.setAttribute('tabindex', '-1');
	}

	if (!options || options.preventScroll) {
		prevent_scroll = true;
		x = window.scrollX;
		y = window.scrollY;
	}

	if (prevent_scroll && supports_prevent_scroll) {
		this.focus({preventScroll: true});
	} else {
		this.focus();

		if (prevent_scroll) {
			window.scrollTo(x, y);
		}
	}

	if (document.activeElement) {
		document.activeElement.blur();
	}

	this.focus();

	// If the activeElement hasn't changed something went wrong.
	// Maybe VoiceOver shenanigans?
	if (true || document.activeElement != this) {
		if (!options) {
			options = {
				preventScroll: prevent_scroll
			};
		}

		if (options.attempt == null) {
			options.attempt = 0;
		}

		options.attempt++;

		if (options.attempt < 10) {
			let that = this;

			setTimeout(function retry() {
				forceFocus.call(that, options);
			}, 10);
		}
	}
});

/**
 * Get the scroll container of this element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.1
 *
 * @param    {Object}   options
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'getScrollContainer', function getScrollContainer(options) {

	let style = window.getComputedStyle(this);

	if (style.position == 'fixed') {
		return document.scrollingElement || document.body;
	}

	let vertical = true,
	    element = this,
	    result;

	// Only look for vertical scroll container by default
	if (options && options.horizontal) {
		vertical = false;
	}

	while (element = element.parentElement) {
		style = window.getComputedStyle(element);

		if (style.overflow == 'auto' || style.overflow == 'scroll' || style.overflow == 'hidden') {
			result = element;
			break;
		}

		if (vertical) {
			if (style.overflowY == 'auto' || style.overflowY == 'scroll' || style.overflowY == 'hidden') {
				result = element;
				break;
			}
		} else {
			if (style.overflowX == 'auto' || style.overflowX == 'scroll' || style.overflowX == 'hidden') {
				result = element;
				break;
			}
		}
	}

	if (result) {
		if (result.scrollHeight > result.clientHeight) {
			return result;
		} else {
			return getScrollContainer.call(result, options);
		}
	}

	return document.scrollingElement || document.body;
});

/**
 * Query for tabbable elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 *
 * @return   {Array}
 */
Blast.definePrototype(Element, 'queryTabbableElements', function queryTabbableElements(query) {

	var elements,
	    results = [],
	    element,
	    i;

	if (query) {
		elements = this.querySelectorAll(query);
	} else {
		// Get all tabbable elements
		elements = this.querySelectorAll('a, area, input, select, textarea, button, iframe, body, embed, object, [contenteditable], [tabindex]');
	}

	for (i = 0; i < elements.length; i++) {
		element = elements[i];

		if (element.isTabbable()) {
			results.push(element);
		}
	}

	return results;
});

/**
 * Query up:
 * See if this matches or a parent
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   query
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'queryUp', function queryUp(query) {

	var current = this;

	while (current) {
		if (current.matches(query)) {
			return current;
		}

		current = current.parentElement;
	}
});

/**
 * Query the current block container
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.6
 * @version  2.1.6
 *
 * @param    {String}   query
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'queryBlock', function queryBlock(query) {

	let block;

	if (Blast.isBrowser) {
		block = this.queryParents('[data-he-name]');
	}

	if (!block) {

		let root = this;

		while (root.parentElement) {
			root = root.parentElement;
		}

		block = root[Hawkejs.BLOCK];
	}

	if (block) {
		return block.querySelector(query);
	}
});

/**
 * Query parents
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   query
 *
 * @return   {HTMLElement}
 */
Blast.definePrototype(Element, 'queryParents', function queryParents(query) {

	if (!this.parentElement) {
		return null;
	}

	return ProtoEl.queryUp.call(this.parentElement, query);
});

/**
 * Query siblings
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   query
 *
 * @return   {HTMLElement[]}
 */
Blast.definePrototype(Element, 'querySiblings', function querySiblings(query) {

	var current = this,
	    result = [];

	while (current = current.nextElementSibling) {
		if (current.matches(query)) {
			result.push(current);
		}
	}

	return result;
});

/**
 * Query elements that are not nested
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   query
 *
 * @return   {HTMLElement[]}
 */
Blast.definePrototype(Element, 'queryAllNotNested', function queryAllNotNested(query) {

	let elements = this.querySelectorAll(query),
	    element,
	    current,
	    result = [],
	    i;

	for (i = 0; i < elements.length; i++) {
		element = elements[i];

		if (current && current.contains(element)) {
			continue;
		}

		result.push(element);
		current = element;
	}

	return result;
});

/**
 * Add focus-within & focus-without events:
 * focus-within fires once when the element or any of its children gets focus.
 * focus-without fires when all of them lose focus.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Blast.definePrototype(Element, 'enableFocusWithinEvent', function enableFocusWithinEvent() {

	var that = this;

	if (this[has_within_event]) {
		return;
	}

	// Listen for focusin event: when this or any child gets focus
	this.addEventListener('focusin', function onFocusin(e) {

		if (!that[has_focus]) {
			that[has_focus] = true;
			Hawkejs.Element.Element.prototype.emit.call(this, 'focus-within');
		}

	});

	// Listen for focusout event
	this.addEventListener('focusout', function onFocusout(e) {

		// Don't react to children
		if (that.contains(e.relatedTarget)) {
			return;
		}

		that[has_focus] = false;
		Hawkejs.Element.Element.prototype.emit.call(this, 'focus-without');
	});
});

/**
 * Add html-change event:
 * will fire after focus-without if the content has changed
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Blast.definePrototype(Element, 'enableHtmlChangeEvent', function enableHtmlChangeEvent() {

	var that = this,
	    old_html;

	if (this[has_html_event]) {
		return;
	}

	this.enableFocusWithinEvent();

	// Get the initial HTML contents
	old_html = this.innerHTML;

	this.addEventListener('focus-within', function onWithin() {
		old_html = that.innerHTML;
	});

	this.addEventListener('focus-without', function onWithout() {

		if (that.innerHTML != old_html) {
			Hawkejs.Element.Element.prototype.emit.call(this, 'html-change');
		}
	});
});

/**
 * Add an event listener with an optional selector
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   event
 * @param    {String}   selector
 * @param    {Function} callback
 */
Blast.definePrototype(Element, 'onEventSelector', function onEventSelector(event, selector, callback) {

	if (typeof selector == 'function') {
		callback = selector;
		selector = null;
	}

	this.addEventListener(event, function onEvent(e) {

		if (selector && !e.target.closest(selector)) {
			return;
		}

		callback.call(e.target, e);
	});
});

if (m_proto === false) {
	__Protoblast.modifyPrototype = false;
}