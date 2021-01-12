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
 * @version  2.1.0
 */
Bottom.setMethod(function renderHawkejsContent() {

	var that = this,
	    new_children = [],
	    renderer = this.hawkejs_renderer,
	    tasks = [],
	    i;

	this.setAttribute('style', 'position:absolute;left:-200vw;');

	for (i = 0; i < renderer.dialogs.length; i++) {
		let dialog = renderer.dialogs[i];

		dialog.onHawkejsAssemble(renderer);

		tasks.push(function doDialog(next) {

			let promise = Hawkejs.Element.HePlaceholder.prototype[Hawkejs.RENDER_CONTENT].call(dialog, renderer);

			Blast.Classes.Pledge.done(promise, function donePromise(err, result) {
				new_children.push(dialog);
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
			let script = that.createElement('script');

			let code = 'if (!window.hawkejs) {';
			code += "document.write('<scr' + 'ipt src=" + JSON.stringify(renderer.hawkejs.root_path + renderer.hawkejs.client_path) + "></scr' + 'ipt>');";
			code += '}';

			let text = Hawkejs.Hawkejs.createTextNode(code);

			script.append(text);

			that.append(script);
		}

		for (i = 0; i < new_children.length; i++) {
			that.append(new_children[i]);
		}
	});
});