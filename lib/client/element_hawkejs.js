module.exports = function hawkejsXElement(Hawkejs, Blast) {

	/**
	 * The x-hawkejs block elements
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.0
	 */
	var XHawkejs = Function.inherits('Hawkejs.Element', function XHawkejs() {
		XHawkejs.super.call(this);
	});

	/**
	 * Reload the element (if possible)
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.3.0
	 */
	XHawkejs.setMethod(function reload(type, data) {

		var that = this,
		    template,
		    options,
		    theme,
		    url;

		if (!(url = this.getAttribute('data-update-url'))) {
			return;
		}

		if (!type) {
			type = 'get';
		}

		if (data) {
			options = {};
			options[type] = data;
		}

		template = this.getAttribute('data-template');
		theme = this.getAttribute('data-theme');

		// Indicate this block is updating
		this.classList.add('js-he-updating');
		this.classList.remove('js-he-updated');
		this.classList.remove('js-he-failed-update');

		// Get data
		hawkejs.scene.fetch(url, options, function gotData(err, variables) {

			var renderer;

			if (err) {
				that.classList.remove('js-he-updating');
				return that.classList.add('js-he-failed-update');
			}

			renderer = hawkejs.render(template, variables, function rendered(err, html) {

				that.classList.remove('js-he-updating');

				if (err) {
					return that.classList.add('js-he-failed-update');
				}

				that.classList.add('js-he-updated');

				// @todo: sometimes HTML is an array. That should not happen
				if (Array.isArray(html)) {
					html = html[0];
				}

				that.innerHTML = html;

				hawkejs.scene.registerRender(renderer);
			});

			// Set the renderer theme
			renderer.setTheme(theme);
		});
	});

};