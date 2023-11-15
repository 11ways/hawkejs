const RenderLooper = Fn.inherits('Hawkejs.Element', 'RenderLooper');

RenderLooper.setTemplateFile('elements/render_looper');

/**
 * The element to render
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
RenderLooper.setAttribute('element-to-render');

/**
 * The amount to render
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
RenderLooper.setAttribute('amount', {type: 'number'});

/**
 * Get variables needed to render this
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
RenderLooper.setMethod(async function prepareRenderVariables() {

	return {
		element_to_render: this.element_to_render,
		amount_to_render: this.amount
	};
});