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
 * @version  2.0.0
 */
Bottom.setMethod(function renderHawkejsContent() {

	var that = this,
	    renderer = this.hawkejs_renderer,
	    tasks = [],
	    i;

	this.setAttribute('style', 'position:fixed;left:-100vw;');

	for (i = 0; i < renderer.dialogs.length; i++) {
		let dialog = renderer.dialogs[i];

		tasks.push(function doDialog(next) {
			console.log('Getting content of', dialog);

			dialog.getContent(function gotContent(err, dialog_html) {

				if (err) {
					return next(err);
				}

				html += '\n' + dialog_html;
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
			let html = '<script>';
			html += 'if (!window.hawkejs) {';
			html += "document.write('<scr' + 'ipt src=" + JSON.stringify(renderer.hawkejs.root_path + renderer.hawkejs.client_path) + "></scr' + 'ipt>');";
			html += '}';
			html += '</script>';

			that.innerHTML = html;
		}
	});
});