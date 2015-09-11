module.exports = function hawkejsDomSpotting(Hawkejs, Blast) {

	var observer_config,
	    attributes = {},
	    enabled;

	observer_config = {
		attributeOldValue: true,
		attributes: true,
		childList: true,
		subtree: true
	};

	/**
	 * Get the closest element (up the dom tree)
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.setStatic(function closest(element, query) {

		var cur = element;

		for (; cur && cur !== document; cur = cur.parentNode) {
			if (cur.matches(query)) {
				return cur;
			}
		}
	});

	/**
	 * Spot attribute changes
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.setStatic(function onAttribute(attr_name, callback) {

		if (!enabled) {
			enabled = true;

			// Create the observer only after the document is ready
			if (document.readyState == 'complete') {
				checkChildren(null, document);
				Hawkejs._observer.observe(document, observer_config);
			} else {
				document.addEventListener('DOMContentLoaded', function() {
					checkChildren(null, document);
					Hawkejs._observer.observe(document, observer_config);
				});
			}
		}

		if (!attributes[attr_name]) {
			attributes[attr_name] = [];
		}

		attributes[attr_name].push(callback);
	});

	/**
	 * Check this added node and all its children
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	function checkChildren(mutation, node) {

		var attr,
		    k,
		    l;

		// Ignore text nodes
		if (node.nodeType === 3 || node.nodeType === 8) {
			return;
		}

		// Go over every attribute
		if (node.attributes) {
			for (k = 0; k < node.attributes.length; k++) {
				attr = node.attributes[k];

				if (attributes[attr.name]) {
					for (l = 0; l < attributes[attr.name].length; l++) {
						attributes[attr.name][l](node, attr.value, null, true);
					}
				}
			}
		}

		// Now check the children
		for (k = 0; k < node.childNodes.length; k++) {
			checkChildren(mutation, node.childNodes[k]);
		}
	}

	/**
	 * Receive all mutation events
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs._observer = new MutationObserver(function onMutation(mutations) {

		var mutation,
		    attr,
		    node,
		    i,
		    j,
		    k,
		    l;

		for (i = 0; i < mutations.length; i++) {
			mutation = mutations[i];

			// Check newly inserted nodes
			if (mutation.type == 'childList') {

				for (j = 0; j < mutation.addedNodes.length; j++) {
					checkChildren(mutation, mutation.addedNodes[j]);
				}

				continue;
			}

			// Check attribute changes
			if (mutation.type == 'attributes') {
				if (attributes[mutation.attributeName]) {
					for (l = 0; l < attributes[mutation.attributeName].length; l++) {
						attributes[mutation.attributeName][l](mutation.target, mutation.target.attributes[mutation.attributeName], mutation.oldValue, false);
					}
				}
			}
		}
	});
};