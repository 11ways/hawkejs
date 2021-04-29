const RenderAfterAttributes = Fn.inherits('Hawkejs.Element', 'RenderAfterAttributes');

RenderAfterAttributes.setTemplateFile('elements/render_after_attributes');

/**
 * Create a value that needs async work
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.6.2
 * @version  0.6.2
 */
const DelayedText = Fn.inherits('Informer', function DelayedText(text) {
	this.text = text;
	this.result = null;
});

/**
 * Return the string result
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.6.2
 * @version  0.6.2
 *
 * @return   {string}
 */
DelayedText.setMethod(function toString() {

	if (this.result != null) {
		return this.result;
	}

	return '';
});

/**
 * Callback with the translated content (for Hawkejs)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.6.2
 * @version  0.6.2
 *
 * @param    {Hawkejs.Renderer}   [renderer]
 *
 * @return   {Pledge}
 */
DelayedText.setMethod(function renderHawkejsContent(renderer) {

	let pledge = new Blast.Classes.Pledge();

	setTimeout(() => {
		this.result = this.text;
		pledge.resolve(this.text);
	}, 50);

	return pledge;
});

/**
 * Return the result (for Hawkejs)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.6.2
 * @version  0.6.2
 *
 * @return   {string}
 */
DelayedText.setMethod(function toHawkejsString(view) {
	this.view = view;
	return this.toString();
});

/**
 * Create a value that needs async work
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.6.2
 * @version  0.6.2
 */
Blast.Classes.Hawkejs.Renderer.setCommand(function delayResult(text) {

	let result = new DelayedText(text);
	result.view = this;

	return result;
});
