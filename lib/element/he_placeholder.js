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
 * Introduced into the dom
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.2
 * @version  1.3.0
 */
Placeholder.setMethod(function introduced() {
	var id = this.dataset.hid;

	if (id && this.parentElement && browser_store[id]) {
		this.parentElement.replaceChild(browser_store[id], this);

		// Sometimes HTML is introduced TWICE
		// That should be considered a bug, but to prevent empty
		// placeholder elements from showing up we'll only delete the
		// elements in here after a few seconds
		setTimeout(function clearElementFromStore() {
			delete browser_store[id];
		}, 5000);
	}
});

/**
 * Get the content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Placeholder.setMethod(function getContent(callback) {

	var that = this,
	    final_tasks = [],
	    pre_tasks = [],
	    tasks = [];

	Hawkejs.recurseLineTasks([this], pre_tasks, tasks);

	if (pre_tasks.length) {
		final_tasks.push(Fn.parallel(pre_tasks));
	}

	if (tasks.length) {
		final_tasks.push(function doTasks(next) {
			Fn.parallel(tasks).done(next);
		});
	}

	Fn.parallel(final_tasks, function done(err, result) {

		if (err) {
			callback(err);
			return;
		}

		return callback(null, that[Hawkejs.RESULT]);
	});
});