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
 * @version  2.0.0
 */
Placeholder.setProperty('subject_line', null);

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
		this.parentElement.replaceChild(Hawkejs.browser_store[id], this);

		// Sometimes HTML is introduced TWICE
		// That should be considered a bug, but to prevent empty
		// placeholder elements from showing up we'll only delete the
		// elements in here after a few seconds
		setTimeout(function clearElementFromStore() {
			delete Hawkejs.browser_store[id];
		}, 5000);
	}
});

/**
 * Method for backward compatibility with pre 2.0.0 hawkejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Placeholder.setMethod(function getContent(callback) {
	return this.renderHawkejsContent().done(callback);
});

/**
 * Get the content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   [renderer]
 */
Placeholder.setMethod(function renderHawkejsContent(renderer) {

	var that = this,
	    final_tasks = [],
	    pre_tasks = [],
	    lines,
	    tasks = [];

	if (this.subject_line) {
		lines = [this.subject_line];
	} else {
		lines = [this];
	}

	Hawkejs.recurseLineTasks(lines, pre_tasks, tasks, renderer);

	if (pre_tasks.length) {
		final_tasks.push(Fn.parallel(pre_tasks));
	}

	if (tasks.length) {
		final_tasks.push(function doTasks(next) {
			Fn.parallel(tasks).done(next);
		});
	}

	return Fn.parallel(final_tasks, function done(err, result) {

		if (err) {
			callback(err);
			return;
		}

		if (that.subject_line) {
			that[Hawkejs.RESULT] = that.subject_line[Hawkejs.RESULT];
		}

		return that[Hawkejs.RESULT];
	});
});