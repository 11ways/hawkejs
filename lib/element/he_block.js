/**
 * The he-block element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Block = Fn.inherits('Hawkejs.Element', 'HeBlock');
console.log('Setting renderer on', Block);
/**
 * Make sure all children are ready to be stringified for hawkejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.8
 * @version  2.0.3
 *
 * @return   {Pledge}
 */
Hawkejs.setCachedMethod(Block, Hawkejs.RENDER_CONTENT, function renderBlockContent() {

	var name = this.dataset.heName,
	    block = this.hawkejs_renderer.blocks.get(name);

console.log('HHELLLLLLLLLOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
console.log('');

	if (!block) {
console.log(' -- Block', name, 'not found')
		return;
	}

	console.log('Rendering block', name)

	let that = this;

	return Fn.series([block.assemble()], function done(err) {

		console.log('Done rendering block', name)

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

		console.log('...')

		if (renderBlockContent.super) {
			return renderBlockContent.super.call(that);
		}
	});
});

console.log('Renderer is now:', Block.prototype[Hawkejs.RENDER_CONTENT])