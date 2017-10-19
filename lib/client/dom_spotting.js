module.exports = function hawkejsDomSpotting(HawkejsNS, Blast) {

	var observer_config,
	    attributes = {},
	    initial_seen = new WeakMap(),
	    created_observer,
	    initial_map,
	    Hawkejs = HawkejsNS.Hawkejs,
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

		var dom_ready = false;

		if (document.readyState == 'complete' || document.readyState == 'interactive') {
			dom_ready = true;
		}

		if (!attributes[attr_name]) {
			attributes[attr_name] = [];
		}

		attributes[attr_name].push(callback);

		if (!enabled) {
			enabled = true;

			// Create the observer only after the document is ready
			if (dom_ready) {
				if (!created_observer) {
					Hawkejs._observer.observe(document, observer_config);
					created_observer = true;
				}
			} else {
				// Dom is not yet ready, schedule everything once it is
				return document.addEventListener('DOMContentLoaded', function() {

					if (!created_observer) {
						initialCheck(attr_name);
						Hawkejs._observer.observe(document, observer_config);
						created_observer = true;
					}
				});
			}
		}

		// Check for existing elements if the dom has already finished loading
		if (dom_ready) {
			initialCheck(attr_name);
		}
	});

	/**
	 * Do an initial check for the given attribute name
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.1.2
	 *
	 * @param    {String}   attr_name
	 */
	function initialCheck(attr_name) {

		var elements = document.querySelectorAll('[' + attr_name + ']'),
		    element,
		    value,
		    i,
		    l;

		for (i = 0; i < elements.length; i++) {
			element = elements[i];
			value = element.getAttribute(attr_name);

			if (initial_seen.get(element)) {
				continue;
			}

			if (attributes[attr_name]) {
				initial_seen.set(element, true);
				for (l = 0; l < attributes[attr_name].length; l++) {
					attributes[attr_name][l](element, value, null, true);
				}
			}
		}
	}

	/**
	 * Check this added node and all its children
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}   mutation
	 * @param    {Node}     node
	 * @param    {WeakMap}  seen
	 */
	function checkChildren(mutation, node, seen) {

		var attr,
		    k,
		    l;

		if (seen == null) {
			seen = initial_seen;
		}

		// Ignore text nodes
		if (node.nodeType === 3 || node.nodeType === 8) {
			return;
		}

		// Only check attributes for nodes that haven't been checked before
		if (!seen.get(node)) {

			// Indicate this node has been checked
			seen.set(node, true);

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
		}

		// Now check the children
		for (k = 0; k < node.childNodes.length; k++) {
			checkChildren(mutation, node.childNodes[k], seen);
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
		    seen = new WeakMap(),
		    i,
		    j,
		    k,
		    l;

		for (i = 0; i < mutations.length; i++) {
			mutation = mutations[i];

			// Check newly inserted nodes
			if (mutation.type == 'childList') {

				for (j = 0; j < mutation.addedNodes.length; j++) {
					checkChildren(mutation, mutation.addedNodes[j], seen);
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