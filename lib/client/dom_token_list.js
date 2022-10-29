/**
 * Client-side DOMTokenList constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.18
 * @version  2.2.18
 */
const DOMTokenList = Fn.inherits(null, 'Hawkejs', function DOMTokenList() {
	let element = document.createElement('a');
	return element.classList;
});