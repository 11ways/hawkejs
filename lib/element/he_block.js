/**
 * The he-block element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Block = Fn.inherits('Hawkejs.Element', function HeBlock() {
	HeBlock.super.call(this);
});

/**
 * Make sure all children are ready to be stringified for hawkejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
Block.setMethod(function renderHawkejsContent() {

	var name = this.dataset.heName,
	    block = this.hawkejs_renderer.blocks[name];

	if (!block) {
		return;
	}

	let that = this;

	return Fn.series([block.assemble()], function done(err) {

		var i;

		if (err) {
			return;
		}

		if (!block.options.append) {
			// Clear all the content
			Hawkejs.removeChildren(that);
		}

		// Set css class, but only for non-pushed blocks
		if (block.options.content != 'push') {
			Hawkejs.addClasses(that, block.options.className);
		}

		if (block.options.attributes) {
			Hawkejs.setAttributes(that, block.options.attributes);
		}

		for (i = 0; i < block.lines.length; i++) {

			if (typeof block.lines[i] == 'string') {
				that.insertAdjacentHTML('beforeend', block.lines[i]);
			} else {
				that.append(block.lines[i]);
			}
		}

		if (block.start_template) {
			that.dataset.heTemplate = block.start_template.name;

			if (block.start_template.theme && block.start_template.theme != 'default') {
				that.dataset.theme = block.start_template.theme;
			}
		}

		if (renderHawkejsContent.super) {
			return renderHawkejsContent.super.call(that);
		}
	});
});