/**
 * My-sync-span custom element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
var MySyncSpan = Blast.Bound.Function.inherits('Hawkejs.Element', 'MySyncSpan');

/**
 * The template to use for the content of this element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
MySyncSpan.setTemplate('<span class="test">Test this sync template!</span>', true);

/**
 * Get the main span
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.19
 * @version  2.3.19
 */
MySyncSpan.addElementGetter('main_span', 'span.test');