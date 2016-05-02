module.exports = function hawkCustomElement(Hawkejs, Blast) {

	var Element;

	/**
	 * Base element constructor
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	function ElementConstructor() {

		var attr,
		    i;

		// Trigger an initial attribute change
		for (i = 0; i < this.attributes.length; i++) {
			attr = this.attributes[i];
			this.attributeChangedCallback(attr.name, null, attr.value, true);
		}
	}

	if (Blast.isNode) {
		Element = Function.inherits('Hawkejs.HTMLElement', function Element() {
			Element.super.call(this);
			ElementConstructor.call(this);
		});
	} else {
		Element = Function.inherits('HTMLElement', 'Hawkejs', function Element() {
			ElementConstructor.call(this);
		});
	}

	/**
	 * Make sure the element is registered in the browser
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.constitute(function registerElement() {

		var upper_name,
		    upper_tag,
		    tag_name,
		    options,
		    name = Blast.Bound.String.before(this.name, 'Element') || this.name;

		// Add underscores
		name = Blast.Bound.String.underscore(name);

		// Turn underscores into dashes
		name = Blast.Bound.String.dasherize(name);

		// Make sure the name contains a dash
		if (name.indexOf('-') < 1) {
			name = 'he-' + name;
		}

		upper_name = name.toUpperCase();

		if (this.prototype.parent_element) {
			upper_tag = this.prototype.parent_element.toUpperCase();
		} else {
			upper_tag = upper_name;
		}

		this.setProperty('nodeName', upper_name);
		this.setProperty('tagName', upper_tag);

		if (!Blast.isNode) {

			options = {
				prototype: Object.create(this.prototype, {createdCallback: {value: this}})
			};

			// If a parent element is set, the 'is=""' attribute needs to be used
			if (this.prototype.parent_element) {
				options.extends = this.prototype.parent_element;
			}

			// Register the element in the browser
			this.ElementConstructor = document.registerElement(name, options);
		} else {
			if (typeof this.hawkejsCss == 'function') {

				// If there already are styles defined,
				// add a newline
				if (Hawkejs.inline_css) {
					Hawkejs.inline_css += '\n';
				}

				Hawkejs.inline_css += this.hawkejsCss();
			}
		}

		// Register with hawkejs
		Hawkejs.elements[name] = this;
	});

	/**
	 * Revive this object
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.setStatic(function unDry(obj, force) {

		var that = this,
		    element,
		    temp,
		    key;

		if (Blast.isBrowser) {
			if (obj.hawkejs_id) {
				element = document.querySelector('[data-hid="' + obj.hawkejs_id + '"]');
			}

			// No id was given, or it wasn't found (yet)
			// So create a temporary element
			if (!element) {

				// If force is enabled, a new element is made
				if (force) {
					element = new this.ElementConstructor;
				} else {
					// Else a delay object is returned
					temp = {
						__delay_undry: function delayUndry() {

							if (temp.revived == null) {
								temp.revived = that.unDry(obj, true);
							}

							return temp.revived;
						},
						revived: null,
						obj: obj
					};

					return temp;
				}
			}
		} else {
			element = new this;
		}

		for (key in obj) {
			temp = obj[key];

			if (key == 'attachments') {
				Blast.Bound.Object.assign(element.attachments, temp);
				continue;
			}

			element[key] = temp;
		}

		if (typeof element.undried == 'function') {
			element.undried();
		}

		return element;
	});

	/**
	 * Monitor a value for changes
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.setStatic(function monitor(name, callback) {

		if (!this._monitors) this._monitors = {};
		if (!this._monitors[name]) this._monitors[name] = [];

		this._monitors[name].push(callback);
	});

	/**
	 * Real data attachments
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @type     {Object}
	 */
	Element.prepareProperty('attachments', Object);

	if (!Blast.isBrowser) {
		/**
		 * Content
		 *
		 * @author   Jelle De Loecker <jelle@develry.be>
		 * @since    1.1.0
		 * @version  1.1.0
		 *
		 * @type     {Object}
		 */
		Element.prepareProperty('contents', Array);
	}

	/**
	 * Cloning an element needs to be done using `cloneNode`,
	 * otherwise the same reference is returned.
	 * This dummy function is added so JSON-Dry keeps the wanted link.
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.setMethod(function dryClone() {
		return this;
	});

	/**
	 * Dry this object
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.setMethod(function toDry() {

		return {
			value: {
				hawkejs_id: this.hawkejs_id,
				attachments: this.attachments
			}
		};
	});

	/**
	 * Get all child elements that are of the given node name
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @param    {String}   name   The name of the node type (or null for all)
	 */
	Element.setMethod(function getElementsByNodeName(name) {

		var result = [],
		    upper_node,
		    entry,
		    i;

		if (name) {
			upper_node = name.toUpperCase();
		}

		for (i = 0; i < this.childNodes.length; i++) {
			entry = this.childNodes[i];

			if (entry && entry.nodeName) {

				if (!name || entry.nodeName == upper_node) {
					result.push(entry);
				}

				// Do recursive search
				result = result.concat(getElementsByNodeName.call(entry, name));
			}
		}

		return result;
	});

	/**
	 * Grab (get or create) child element
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.setMethod(function grab(node_name, class_name) {

		var list = this.getElementsByNodeName(node_name),
		    element,
		    entry,
		    i;

		if (list.length) {
			if (class_name) {
				for (i = 0; i < list.length; i++) {
					entry = list[i];

					if (entry.classList.contains(class_name)) {
						element = entry;
						break;
					}
				}
			} else {
				// If no class name is given, use the first entry
				element = list[0];
			}
		}

		if (!element) {
			// No items with this name were found, so create one
			element = Hawkejs.createElement(node_name);

			// Add the new child
			this.appendChild(element);

			// If a class name was wanted, set that too
			if (class_name) {
				element.classList.add(class_name);
			}
		}

		return element;
	});

	/**
	 * Turn this into a string for hawkejs
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @param    {ViewRender}   viewRender
	 */
	Element.setMethod(function toHawkejsString(viewRender) {

		if (this.hawkejs_id) {
			this.dataset.hid = this.hawkejs_id;
		}

		return this.outerHTML;
	});

	/**
	 * Set the hawkejs identifier
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @param    {String}   id
	 */
	Element.setMethod(function setIdentifier(id) {
		this.hawkejs_id = id;
	});

	/**
	 * Fire binding callbacks
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @param    {String}   name   The name of the binding that was updated
	 */
	Element.setMethod(function updateBindings(name) {

		var value,
		    list,
		    i;

		if (!this.constructor._monitors) return;

		list = this.constructor._monitors[name];

		if (!list || !list.length) {
			return;
		}

		value = this.attachments[name];

		for (i = 0; i < list.length; i++) {
			list[i].call(this, value);
		}
	});

	/**
	 * Attach an object to this element
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @param    {String}   name      The name of the attribute
	 * @param    {Object}   data
	 */
	Element.setMethod(function attach(name, data) {

		if (arguments.length == 1) {
			return this.attachments[name];
		}

		this.attachments[name] = data;

		this.updateBindings(name);
	});

	/**
	 * Append an element
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @param    {HTMLElement}   element
	 */
	Element.setMethod(function appendChild(element) {

		if (Blast.isBrowser && element.element && element instanceof Hawkejs.ElementBuilder) {
			element = element.element;
		}

		return appendChild.super.call(this, element);
	});

	/**
	 * Listen to changing attributes
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @param    {String}   name      The name of the attribute
	 * @param    {String}   prev      The previous value
	 * @param    {String}   val       The new value
	 * @param    {Boolean}  created   If this attribute was set on creation
	 */
	Element.setMethod(function attributeChangedCallback(name, prev, val, created) {});

	/**
	 * OLD CUSTOM ELEMENT CODE
	 * Should be removed before release of 1.1.0
	 */

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
		    options = {},
		    parent = _parent,
		    proto  = {};

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

			var setter,
			    name;

			// Store the change function for later
			if (key == 'attributeChangedCallback' || key == 'attributeChanged') {
				attr_change = prop;
			} else if (key == 'extends') {
				options.extends = prop;
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

					if (!prop.get) {
						prop.get = function he_get() {
							var val = this.getAttribute(name);

							if (val == 'true') {
								return true;
							} else if (val == 'false') {
								return false;
							}

							return val;
						};
					}

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
					proto.attributeChangedCallback.value.call(this, attr.name, null, attr.value, true);
				}
			}
		};

		// Set the attribute change callback
		proto.attributeChangedCallback = {
			value: function changedAttribute(name, prev, _val, created) {

				var map_keys = attributes[name],
				    val = _val,
				    key,
				    i;

				// Newly created attributes without a val are true
				if (created && (val == null || val == '')) {
					val = true;
				}

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

		options.prototype = Object.create(parent, proto);

		return document.registerElement(element_name, options);
	});

	Hawkejs.registerElement = Hawkejs.prototype.registerElement;
};