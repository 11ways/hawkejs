/**
 * The he-bottom element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
var Bottom = Fn.inherits('Hawkejs.Element', function HeBottom() {
	HeBottom.super.call(this);
});

/**
 * Render the content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.1
 */
Bottom.setMethod(function renderHawkejsContent() {

	var that = this,
	    renderer = this.hawkejs_renderer,
	    tasks = [],
	    html = '',
	    i;

	this.setAttribute('style', 'position:absolute;left:-200vw;');

	for (i = 0; i < renderer.dialogs.length; i++) {
		let dialog = renderer.dialogs[i];

		dialog.onHawkejsAssemble(renderer);

		tasks.push(function doDialog(next) {

			let promise = Hawkejs.Element.HePlaceholder.prototype.renderHawkejsContent.call(dialog, renderer);

			Blast.Classes.Pledge.done(promise, function donePromise(err, result) {
				html += dialog.outerHTML;
				next();
			});
		});
	}

	return Fn.parallel(tasks, function finishedDialogs(err) {

		if (err) {
			return;
		}

		// If the client-file strategy is to prevent the ready event,
		// we need to download the script synchronously at the bottom
		// if it isn't ready yet
		if (renderer.hawkejs.strategy == 'preventing') {
			html += '<script>';
			html += 'if (!window.hawkejs) {';
			html += "document.write('<scr' + 'ipt src=" + JSON.stringify(renderer.hawkejs.root_path + renderer.hawkejs.client_path) + "></scr' + 'ipt>');";
			html += '}';
			html += '</script>';
		}

		that.innerHTML = html;
	});
});