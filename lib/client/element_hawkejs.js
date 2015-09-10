module.exports = function hawkejsXElement(Hawkejs, Blast) {

	/**
	 * The x-hawkejs block elements
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.registerElement('x-hawkejs', {

		/**
		 * Reload the element (if possible)
		 *
		 * @author   Jelle De Loecker <jelle@develry.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		reload: function reload(type, data) {

			var that = this,
			    template,
			    options,
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

					that.innerHTML = html;

					hawkejs.scene.registerRender(renderer);
				});
			});
		}
	});
};