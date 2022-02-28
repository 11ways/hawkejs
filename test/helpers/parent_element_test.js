/**
 * Parent-element-test custom element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 */
const ParentElementSyncTest = Blast.Bound.Function.inherits('Hawkejs.Element', 'ParentElementSyncTest');

/**
  * The template to use for the content of this element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 */
ParentElementSyncTest.setTemplate(`Self: <%= $0.nodeName %> - Parent: <%= $0.parentElement && $0.parentElement.nodeName %>`);

/**
 * Parent-element-test custom element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 */
const ParentElementAsyncTest = Blast.Bound.Function.inherits('Hawkejs.Element', 'ParentElementAsyncTest');

/**
 * The template to use for the content of this element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
ParentElementAsyncTest.setTemplateFile('elements/parent_element_async_test');
