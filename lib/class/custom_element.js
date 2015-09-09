module.exports = function hawkCustomElement(Hawkejs, Blast) {

	/**
	 * Register a new element
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   element_name
	 * @param    {Object}   _parent          Optional parent prototype, defaults to HTMLElement
	 * @param    {Object}   properties       Properties for the prototype
	 */
	Hawkejs.setMethod(function registerElement(element_name, _parent, properties) {

		var attr_change,
		    creator,
		    attributes = {},
		    parent = _parent,
		    proto  = {},
		    name;

		if (!properties || typeof properties != 'object') {
			properties = parent;
			parent = null;
		}

		if (!parent) {
			parent = HTMLElement.prototype;
		} else if (typeof parent == 'function') {
			parent = parent.prototype;
		}

		Blast.Bound.Object.each(properties, function eachProp(prop, key) {

			var setter;

			// Store the change function for later
			if (key == 'attributeChangedCallback' || key == 'attributeChanged') {
				attr_change = prop;
			} else if (key == 'createdCallback' || key == 'created') {
				creator = prop;
			} else if (prop.value) {
				proto[key] = prop;
			} else if (typeof prop == 'function') {
				proto[key] = {value: prop};
			} else {

				if (prop.attribute) {
					if (prop.attribute === true) {
						name = key;
					} else {
						name = prop.attribute;
					}

					if (!attributes[name]) {
						attributes[name] = [];
					}

					// Get the existing setter
					setter = prop.set;

					prop.set = function he_set(val) {

						// Call the real setter first
						if (setter && this[name] !== val && String(this[name]) !== String(val)) {
							setter.call(this, val);
						}

						// Now set the actual attribute
						if (this.getAttribute(name) !== val) {
							this.setAttribute(name, val);
						}
					};

					attributes[name].push(key);
				}

				proto[key] = prop;
			}
		});

		// Set the created callback
		proto.createdCallback = {
			value: function createdCallback() {

				var attr,
				    i;

				// Call the custom callback
				if (creator) {
					creator.call(this);
				}

				// Trigger an initial attribute change
				for (i = 0; i < this.attributes.length; i++) {
					attr = this.attributes[i];
					proto.attributeChangedCallback.value.call(this, attr.name, null, attr.value);
				}
			}
		};

		// Set the attribute change callback
		proto.attributeChangedCallback = {
			value: function changedAttribute(name, prev, _val) {

				var map_keys = attributes[name],
				    val = _val,
				    key,
				    i;

				if (val == 'false') {
					val = false;
				} else if (val == 'true') {
					val = true;
				} else if (val == 'null') {
					val = null;
				}

				if (attr_change) {
					attr_change.call(this, name, prev, val);
				}

				if (map_keys) {
					for (i = 0; i < map_keys.length; i++) {
						key = map_keys[i];

						if (this[key] !== val && String(this[key]) !== String(val)) {
							this[key] = val;
						}
					}
				}
			}
		};

		return document.registerElement(element_name, {prototype: Object.create(parent, proto)});
	});
};