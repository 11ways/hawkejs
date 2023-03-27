/**
 * The he-dynamic element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 */
const Dynamic = Fn.inherits('Hawkejs.Element', 'HeDynamic');

/**
 * The template source
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 */
Dynamic.setAssignedProperty('hwk_source');

/**
 * The CSS to use for dialogs
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 */
Dynamic.setStylesheet(`he-dynamic {display:block}`);

/**
 * Re-render this element with the original content source
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 */
Dynamic.setMethod(function rerender() {

	if (!this.inner_template && this.hwk_source) {
		let compiled = hawkejs.compile({
			template_name    : 'he_dynamic_' + this.hawkejs_id,
			template         : this.hwk_source,
			cache            : false,
			plain_html       : false,
			render_immediate : false,
		});

		this.inner_template = compiled;
	}

	return rerender.super.call(this);
});
