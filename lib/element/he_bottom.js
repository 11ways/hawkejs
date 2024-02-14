/**
 * The he-bottom element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Bottom = Fn.inherits('Hawkejs.Element', 'HeBottom');

/**
 * Render the content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.15
 */
Bottom.setMethod(function renderHawkejsContent() {

	var that = this,
	    new_children = [],
	    renderer = this.hawkejs_renderer,
	    tasks = [],
	    i;

	this.setAttribute('style', 'position:fixed;left:-200vw;z-index:999999999999;');

	for (i = 0; i < renderer.dialogs.length; i++) {
		let dialog = renderer.dialogs[i];

		dialog.onHawkejsAssemble(renderer);

		tasks.push(function doDialog(next) {

			let promise = Hawkejs.Element.HePlaceholder.prototype[Hawkejs.RENDER_CONTENT].call(dialog, renderer);

			Classes.Pledge.Swift.done(promise, function donePromise(err, result) {
				new_children.push(dialog);
				next();
			});
		});
	}

	return Hawkejs.parallel(tasks, function finishedDialogs(err) {

		if (err) {
			return;
		}

		// If debugging, we load the client-side script at the bottom
		if (renderer.hawkejs._debug) {
			let script = that.createElement('script');
			script.setAttribute('src', renderer.hawkejs.createScriptUrl(renderer.hawkejs.client_path, {root_path: renderer.hawkejs.root_path}));
			that.append(script);
		} else if (renderer.hawkejs.strategy == 'preventing') {
			// If the client-file strategy is to prevent the ready event,
			// we need to download the script synchronously at the bottom
			// if it isn't ready yet

			let script = that.createElement('script'),
			    hawkejs = renderer.hawkejs;

			let code = 'if (!window.hawkejs) {';
			code += "document.write('<scr' + 'ipt src=" + JSON.stringify(''+hawkejs.createScriptUrl(hawkejs.client_path, {root_path: hawkejs.root_path})) + "></scr' + 'ipt>');";
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