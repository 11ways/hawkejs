module.exports = function hawkejsRegisterElement(Hawkejs, Blast) {

	/**
	 * The he-bound element can communicate with the server
	 * and update itself if needed
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.registerElement('he-bound');

	/**
	 * Attach to elements with data-update-request attributes
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.onAttribute('data-update-request', function gotElement(element, value, old_value, created) {

		var event_type,
		    tag;

		if (value == old_value || !value) {
			return;
		}

		tag = element.tagName.toLowerCase();

		// Determine to what event we need to listen on the element
		switch (tag) {
			case 'anchor':
			case 'button':
				event_type = 'click';
				break;

			default:
				event_type = 'change';
		};

		// @todo: the click listener is only interesting for buttons & anchors
		element.addEventListener(event_type, function onClick(e) {

			var parent = Hawkejs.closest(element, '[data-update-url]'),
			    type,
			    data,
			    name,
			    val;

			// Don't do anything if there are no blocks with an update url
			if (!parent || !parent.reload) {
				return;
			}

			// Get the type of the request
			type = element.getAttribute('data-update-request');

			// Get the name of this element
			name = element.getAttribute('name');

			if (!name) {
				name = element.id || element.tagName;
			}

			// And the value
			val = element.value;

			if (typeof val === 'undefined' || (!val && (tag == 'anchor' || tag == 'button'))) {
				val = name;
			}

			data = {};
			data[name] = val;

			// Reload the actual element
			parent.reload(type, data);
		});
	});

	/**
	 * Attach to elements with data-create-url attribute
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.onAttribute('data-create-url', function gotElement(element, value, old_value, created) {

		if (!created) {
			return;
		}

		// When the selected option contains the js-create class,
		// alert the user
		element.addEventListener('change', function changed() {

			var option = element.options[element.selectedIndex];

			if (!option.classList.contains('js-create')) {
				return;
			}

			console.log('Selected', option);
		});
	});

	/**
	 * Attach to elements with data-element-source
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.onAttribute('data-options-source', function gotElement(element, value, old_value, created) {

		var other_element;

		if (!created) {
			return;
		}

		// If no depends-on is set, get the values once
		if (!element.getAttribute('data-depends-on')) {
			return updateOptions.call(element);
		} else {
			other_element = document.querySelectorAll('[data-name="' + element.getAttribute('data-depends-on') + '"]');

			other_element[0].addEventListener('change', function changed() {
				updateOptions.call(element, this.value);
			});
		}

		// Update the options in the select
		function updateOptions(new_value) {

			var value,
			    url;

			url = this.getAttribute('data-options-source');
			value = this.getAttribute('data-depends-on');

			// Do nothing if no url is set
			if (!url) {
				return;
			}

			// Do nothing if we need another value, but it isn't set
			if (value && (new_value == null || new_value === '')) {
				return;
			}

			url = Blast.Collection.URL.parse(url);

			if (value) {
				url.addQuery('value', new_value);
			}

			// Fetch the url
			hawkejs.scene.fetch(url, function gotResponse(err, data, xhr) {

				var old_options,
				    values,
				    entry,
				    html,
				    i;

				if (err) {
					return console.error(err);
				}

				// Get all the old, non null options
				old_options = element.querySelectorAll(':not(.js-null)');

				// Remove all the old options
				for (i = 0; i < old_options.length; i++) {
					old_options[i].remove();
				}

				values = Blast.Bound.Object.dissect(data);
				html = '';

				for (i = 0; i < values.length; i++) {
					entry = values[i];
					html = hawkejs.scene.helpers.Form.selectOption(entry.key, entry.value);
				}

				if (html) {
					element.insertAdjacentHTML('beforeend', html);
				}
			});
		}
	});
};