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

	var renderer = this.hawkejs_renderer;

	this.setAttribute('style', 'position:fixed;left:-100vw;');

	// If the client-file strategy is to prevent the ready event,
	// we need to download the script synchronously at the bottom
	// if it isn't ready yet
	if (renderer.hawkejs.strategy == 'preventing') {
		let html = '<script>';
		html += 'if (!window.hawkejs) {';
		html += "document.write('<scr' + 'ipt src=" + JSON.stringify(renderer.hawkejs.root_path + renderer.hawkejs.client_path) + "></scr' + 'ipt>');";
		html += '}';
		html += '</script>';

		this.innerHTML = html;
	}
});