/**
 * Server-side DOMTokenList class for CSS classes
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.2.18
 */
const ClassList = Fn.inherits('Hawkejs.DOMTokenList', function ClassList(element) {
	// If the element already has a classlist, return that
	if (element.classList) {
		return element.classList;
	}

	ClassList.super.call(this);
});