/**
 * The he-dialog element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 */
const Dialog = Fn.inherits('Hawkejs.Element', function HeDialog() {
	HeDialog.super.call(this);
});

/**
 * The template to render
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 */
Dialog.setAttribute('template');

/**
 * The variables to use during the render
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 */
Dialog.setAssignedProperty('variables');

/**
 * The template to use for dialogs
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.3
 */
Dialog.setTemplate(`<div class="he-dialog-contents">
<% if (self.template) { %>
<%= this.addSubtemplate(self.template, {set_template_info: self}, self.variables) %>
<% } else {
$0.setAttribute('data-he-slot', 'main');
} %>
</div>`);

/**
 * The CSS to use for dialogs
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 */
Dialog.setStylesheet('he-dialog:before {'
	+ 'content:"";display:inline-block;height:100%;'
	+ 'vertical-align:middle;'
	+ '}'
	+ 'he-dialog {'
	+ 'display:block;text-align:center;'
	+ 'position:fixed;width:100vw;'
	+ 'background-color:rgba(0,0,0,0.4);top:0;bottom:0;left:0;right:0;'
	+ 'z-index:99998;overflow:auto;'
	+ '}'
	+ '.he-dialog-contents {'
	+ 'display: inline-block;text-align:left;'
	+ 'vertical-align:middle;background:white;padding:1rem;border:1px solid black;'
	+ '}');

/**
 * Close the dialog
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 */
Dialog.setMethod(function close() {

	let renderer = hawkejs.scene.general_renderer;
	    filter = {},
	    scene = hawkejs.scene;

	this.remove();

	// @TODO: implement history states
	if (false && renderer && renderer.previous_state != null) {
		state = scene.getStateByNumber(renderer.previous_state);

		if (state) {
			if (!state.instance) {
				state.instance = Blast.Collection.JSON.undry(state.dried);
			}

			// @TODO: also add payload, somehow?
			history.pushState(null, null, state.instance.url);

			// Add the same state again
			scene.states.push(state);
		}
	}

	if (renderer && renderer.emit) {
		renderer.emit('dialog_close');
	} else {
		scene.emit('dialog_close');
	}

	scene.emit({
		type     : 'remove',
		category : 'dialog',
		template : filter.template || 'manual',
		theme    : filter.theme || 'default'
	}, this);

});

/**
 * Get the block target element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.1.0
 */
Dialog.setMethod(function getBlockUpdateTarget() {

	if (this.dataset.heSlot) {
		let slot = this.createElement('div');
		slot.setAttribute('slot', 'main');
		this.append(slot);
		return slot;
	} else {
		return this.querySelector('.he-dialog-contents');
	}

	return this;
});

/**
 * Introduced into the dom
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.1
 * @version  2.0.1
 */
Dialog.setMethod(function introduced() {

	const that = this;

	this.addEventListener('click', function onClick(e) {
		if (e.target === that) {
			that.close();
		}
	});

});