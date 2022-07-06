/**
 * The element placeholder is used during client side renders
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 */
var Placeholder = Fn.inherits('Hawkejs.Element', function HePlaceholder() {
	HePlaceholder.super.call(this);
});

/**
 * If set, only this line will be used as the content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.5
 */
Placeholder.setAssignedProperty('subject_line');

/**
 * Introduced into the dom
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 */
Placeholder.setMethod(function introduced() {

	var id = this.dataset.hid;

	if (id && this.parentElement && Hawkejs.browser_store[id]) {

		if (Hawkejs.browser_store[id] == this) {
			console.warn('Placeholder', id, 'has itself in the browser_store');
			return;
		}

		this.parentElement.replaceChild(Hawkejs.browser_store[id], this);

		// Sometimes HTML is introduced TWICE
		// That should be considered a bug, but to prevent empty
		// placeholder elements from showing up we'll only delete the
		// elements in here after a few seconds
		setTimeout(function clearElementFromStore() {
			delete Hawkejs.browser_store[id];
		}, 5000);
	} else if (this.parentElement && this[Hawkejs.RESULT]) {

		let elements = this[Hawkejs.RESULT].toElements(),
		    current = this,
		    i;

		for (i = 0; i < elements.length; i++) {
			current.after(elements[i]);
			current = elements[i];
		}

		this.remove();
	}
});

/**
 * Method for backward compatibility with pre 2.0.0 hawkejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.3
 */
Placeholder.setMethod(function getContent(callback) {
	return this[Hawkejs.RENDER_CONTENT]().done(callback);
});

/**
 * Get the content
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.10
 *
 * @param    {Hawkejs.Renderer}   [renderer]
 */
Placeholder.setMethod(Hawkejs.RENDER_CONTENT, function renderPlaceholderContent(renderer) {

	var that = this,
	    final_tasks = [],
	    pre_tasks = [],
	    lines,
	    tasks = [];

	if (this.subject_line) {
		lines = [this.subject_line];
	} else {
		// If there is no subject_line, it's possible another async method was
		// attached to this placeholder. But no matter what, this RENDER_CONTENT
		// method should not be called again, that'll just case an infinite loop
		if (this[Hawkejs.RENDER_CONTENT] == renderPlaceholderContent) {
			this[Hawkejs.RENDER_CONTENT] = null;
		}

		lines = [this];
	}

	Hawkejs.recurseLineTasks(lines, pre_tasks, tasks, renderer);

	if (pre_tasks.length) {
		final_tasks.push(Hawkejs.parallel(pre_tasks));
	}

	if (tasks.length) {
		final_tasks.push(function doTasks(next) {
			Fn.parallel(false, tasks).done(next);
		});
	}

	return Fn.parallel(false, final_tasks, function done(err, result) {

		if (err) {
			return;
		}

		if (that.subject_line) {
			that[Hawkejs.RESULT] = that.subject_line[Hawkejs.RESULT];
		}

		return that[Hawkejs.RESULT];
	});
});