/**
 * The he-block element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Block = Fn.inherits('Hawkejs.Element', 'HeBlock');

/**
 * Make sure all children are ready to be stringified for hawkejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  2.3.15
 *
 * @return   {Pledge}
 */
Hawkejs.setCachedMethod(Block, Hawkejs.RENDER_CONTENT, function renderBlockContent() {

	let name = this.dataset.heName,
	    block = this.hawkejs_renderer.blocks.get(name);

	if (!block) {
		return;
	}

	let that = this;

	let assemble = block.assemble();

	// This still has to remain asynchronous because otherwise unit tests fail
	return Hawkejs.series([assemble], function done(err) {

		var i;

		if (err) {
			return;
		}

		if (!block.options.append) {
			// Clear all the content
			Hawkejs.removeChildren(that);
		}

		for (i = 0; i < block.lines.length; i++) {

			if (typeof block.lines[i] == 'string') {
				that.insertAdjacentHTML('beforeend', block.lines[i]);
			} else {
				that.append(block.lines[i]);
			}
		}

		block.addInfoToElement(that);

		if (renderBlockContent.super) {
			return renderBlockContent.super.call(that);
		}
	});
});