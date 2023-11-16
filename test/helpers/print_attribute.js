/**
 * Element to simply render the text attribute value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.15
 * @version  2.3.15
 */
const PrintAttribute = Fn.inherits('Hawkejs.Element', 'PrintAttribute');

/**
 * The template to use
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.15
 * @version  2.3.15
 */
PrintAttribute.setTemplateFile('elements/print_attribute');

/**
 * The attribute to print
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.15
 * @version  2.3.15
 */
PrintAttribute.setAttribute('text');

/**
 * The rerender attribute
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.15
 * @version  2.3.15
 */
PrintAttribute.setAttribute('do-rerender', {type: 'boolean'});