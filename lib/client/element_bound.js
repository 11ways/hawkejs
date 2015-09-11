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
	 * Attach to elemtns with data-update-request attributes
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
};