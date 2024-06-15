/**
 * Test-ref-button custom element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const TestRefButton = Blast.Bound.Function.inherits('Hawkejs.Element', 'TestRefButton');

/**
 * The template to use for the content of this element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
TestRefButton.setTemplateFile('elements/test_ref_button');

/**
 * The span element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
TestRefButton.defineStateVariable('span_element', {
	type    : 'element',
	default : null,
});

/**
 * The message to render
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
TestRefButton.defineStateVariable('message');