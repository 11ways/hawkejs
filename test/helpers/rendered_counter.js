const RenderedCounter = Fn.inherits('Hawkejs.Element', 'RenderedCounter');

RenderedCounter.setTemplateFile('elements/empty_render');

/**
 * This element rendered its contents
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
RenderedCounter.setMethod(function rendered() {

	if (!this._rcount) {
		this._rcount = 0;
	}

	this._rcount++;

	this.setAttribute('rcount', this._rcount);
});