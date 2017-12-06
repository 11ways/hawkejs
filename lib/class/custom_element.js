module.exports = function hawkCustomElement(Hawkejs, Blast) {

	var weak_properties = new WeakMap(),
	    browser_store = {},
	    Element;

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
		Element = Blast.Bound.Function.inherits('Hawkejs.HTMLElement', function Element() {
			Element.super.call(this);
			ElementConstructor.call(this);
		});
	} else {

		// IE & Edge fix
		if (typeof HTMLElement === 'object') {
			var _Element = function HTMLElement(){};
			_Element.prototype = HTMLElement.prototype;
			HTMLElement = _Element;
		}

		Element = Blast.Bound.Function.inherits('HTMLElement', 'Hawkejs', function Element() {
			ElementConstructor.call(this);
		});
	}

	/**
	 * Create a private variable for the given instance
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.1
	 * @version  1.1.1
	 *
	 * @param    {Element}   instance
	 *
	 * @return   {Object}
	 */
	function getPrivate(instance) {

		var map = weak_properties.get(instance);

		if (!map) {
			map = {
				// Attribute configurations
				attributes  : {},

				// Attribute values for use in property getters
				prop_values : {},

				// Attribute string values
				values      : {}
			};

			weak_properties.set(instance, map);
		}

		return map;
	}


	/**
	 * Make sure the element is registered in the browser
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	Element.constitute(function registerElement() {

		var that = this,
		    upper_name,
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
			Blast.nextTick(function() {
				that.ElementConstructor = document.registerElement(name, options);
			});
		} else {
			if (typeof this.hawkejsCss == 'function') {

				// If there already are styles defined,
				// add a newline
				if (Hawkejs.Hawkejs.inline_css) {
					Hawkejs.Hawkejs.inline_css += '\n';
				}

				Hawkejs.Hawkejs.inline_css += this.hawkejsCss();
			}
		}

		// Register with hawkejs
		Hawkejs.Hawkejs.elements[name] = this;
	});

	/**
	 * Revive this object
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.2
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
			element[key] = temp;
		}

		// Delay this so the object is fully undried
		Blast.nextTick(function() {
			if (typeof element.undried == 'function') {
				element.undried();
			}
		});

		return element;
	});

	/**
	 * Add an attribute setter/getter
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.1
	 * @version  1.2.0
	 */
	Element.setStatic(function setAttribute(name, getter, setter, config) {

		if (typeof name == 'function') {
			config = setter;
			setter = getter;
			getter = name;
			name = getter.name;
		}

		if (!name) {
			throw new Error('No name was given for attribute');
		}

		if (getter && typeof getter == 'object') {
			config = getter;
			getter = null;
			setter = null;
		}

		if (setter && typeof setter == 'object') {
			config = setter;
			setter = null;
		}

		if (!config) {
			config = {};
		}

		// Store the custom getters and setters
		config.getter = getter;
		config.setter = setter;

		// Create an object on the constructor
		// so we know which attributes are configured
		if (!this._attributes) {
			this._attributes = {};
		}

		// Store the attribute configuration
		this._attributes[name] = config;

		// Set the instance property getter/setter
		this.setProperty(name, function attrGetter() {

			var val = this.getAttribute(name);

			// Custom getters can modify the attribute string
			if (getter) {
				val = getter.call(this, val);
			}

			return val;
		}, function attrSetter(value) {

			var newval,
			    map;

			if (setter) {
				newval = setter.call(this, value);

				// If there was no return value, use the original value
				if (typeof newval == 'undefined') {
					newval = value;
				}
			} else {
				newval = value;
			}

			// Set the attribute on the element
			this.setAttribute(name, newval);

			return newval;
		});
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
	 * Add a property that is stored in assigned_data
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.2.2
	 * @version  1.2.2
	 */
	Element.setStatic(function setAssignedProperty(name, getter, setter) {

		this.setProperty(name, function assignedGetter() {

			var val = this.assigned_data[name];

			if (getter) {
				val = getter.call(this, val);
			}

			return val;
		}, function assignedSetter(value) {

			var newval;

			if (setter) {
				newval = setter.vall(this, value);

				if (typeof newval == 'undefined') {
					newval = value;
				}
			} else {
				newval = value;
			}

			this.assigned_data[name] = newval;

			return newval;
		});
	});

	/**
	 * The view this was made in (if applicable)
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.2.2
	 * @version  1.2.2
	 *
	 * @type     {Hawkejs.ViewRender}
	 */
	Element.setProperty(function hawkejs_view() {

		if (this._hawkejs_view) {
			return this._hawkejs_view;
		}

		if (Blast.isBrowser) {
			return hawkejs.scene.generalView;
		}

	}, function setHawkejsView(view) {
		this._hawkejs_view = view;
	});

	/**
	 * A link to useable helpers
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.2.2
	 * @version  1.2.2
	 *
	 * @type     {Hawkejs.ViewRender}
	 */
	Element.setProperty(function hawkejs_helpers() {

		if (this._hawkejs_view) {
			console.log('Got main view helpers')
			return this._hawkejs_view.helpers;
		}

		if (Blast.isBrowser) {
			console.log('Got browser helpers')
			return hawkejs.scene.helpers;
		}
	});

	/**
	 * Real assigned data
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.2.2
	 *
	 * @type     {Object}
	 */
	Element.setProperty(function assigned_data() {

		if (this._assigned_data) {
			return this._assigned_data;
		}

		if (this._assigned_data == null) {
			this._assigned_data = {};
		}

		return this._assigned_data;
	}, function set_assigned_data(value) {
		this._assigned_data = value;
	});

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
				assigned_data: this.assigned_data
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
	 * @version  1.2.2
	 */
	Element.setMethod(function grab(node_name, class_name) {

		var list = Element.prototype.getElementsByNodeName.call(this, node_name),
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
			element = Hawkejs.Hawkejs.createElement(node_name);

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
	 * @version  1.2.2
	 *
	 * @param    {ViewRender}   viewRender
	 */
	Element.setMethod(function toHawkejsString(viewRender) {

		// If there is a CSS path set, require it now
		if (this.css_file) {
			viewRender.style(this.css_file);
		}

		if (this.hawkejs_id) {
			this.dataset.hid = this.hawkejs_id;

			// Don't stringify the element now, only to recreate it later
			// (possibly breaking any other references)
			// Instead: put a placeholder that'll insert this element
			// as soon as it is inserted in the DOM
			if (Blast.isBrowser) {
				browser_store[this.hawkejs_id] = this;

				return '<he-element-placeholder data-hid="' + this.hawkejs_id + '"></he-element-placeholder>';
			}
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

		value = this.assigned_data[name];

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
	Element.setMethod(function assignData(name, data) {

		if (arguments.length == 1) {
			return this.assigned_data[name];
		}

		this.assigned_data[name] = data;

		this.updateBindings(name);
	});

	/**
	 * Emit an event
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.2
	 * @version  1.1.2
	 *
	 * @param    {String}   name
	 * @param    {Object}   detail
	 */
	Element.setMethod(function emit(name, detail) {
		var event = new CustomEvent(name, {detail: detail});
		this.dispatchEvent(event);
	});

	/**
	 * Append an element
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.2.2
	 *
	 * @param    {HTMLElement}   element
	 */
	Element.setMethod(function appendChild(element) {
		return appendChild.super.call(this, element);
	});

	/**
	 * attachedCallback was renamed to connectedCallback
	 * in the web component spec
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.2
	 * @version  1.1.2
	 */
	Element.setMethod(function attachedCallback() {
		return this.connectedCallback();
	});

	/**
	 * Callback when attached to the DOM
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.2
	 * @version  1.1.2
	 */
	Element.setMethod(function connectedCallback() {

		var that;

		if (typeof this.connected !== 'function') {
			return;
		}

		that = this;

		// Delay by a little bit so all the other custom elements
		// can get registered in time
		Blast.setImmediate(function whenReady() {
			that.connected();
		});
	});

	/**
	 * Listen to changing attributes
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.1
	 *
	 * @param    {String}   name      The name of the attribute
	 * @param    {String}   prev      The previous value
	 * @param    {String}   val       The new value
	 * @param    {Boolean}  created   If this attribute was set on creation
	 */
	Element.setMethod(function attributeChangedCallback(name, prev, val, created) {

		var prop_val,
		    config,
		    map;

		// If the attribute is configured, add it as a property too
		if (this.constructor._attributes && this.constructor._attributes[name]) {
			config = this.constructor._attributes[name];
		} else {
			return;
		}

		// Get the private instance variable
		map = getPrivate(this);

		// Store the new attribute value
		map.values[name] = val;

		// Normalize the attribute string if it's a boolean
		if (config.boolean) {
			if (val === 'false') {
				val = false;
			} else if (val === 'null') {
				val = null;
			} else {
				val = true;
			}
		}

		// If there is a setter, call it now
		if (config.setter) {
			prop_val = config.setter.call(this, val);
		}

		// We need a prop val, and it should not be undefined
		// If there was no setter, or if there was a setter but it
		// returned nothing, we use the input val
		if (typeof prop_val === 'undefined') {
			prop_val = val;
		}

		// Store the property representation of this value
		map.prop_values[name] = prop_val;
	});

	/**
	 * OLD CUSTOM ELEMENT CODE
	 * Should be removed before release of 1.1.0
	 */

	/**
	 * See if this element has been registerd
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.2.2
	 * @version  1.2.2
	 *
	 * @param    {String}   element_name
	 *
	 * @return   {Boolean}
	 */
	Hawkejs.Hawkejs.setStatic(function elementHasBeenRegistered(element_name) {

		var temp;

		// Normalize the name
		element_name = Blast.Bound.String.underscore(element_name);
		element_name = Blast.Bound.String.dasherize(element_name);

		// Create temporary element
		temp = document.createElement(element_name);

		if (temp.constructor.name == 'HTMLElement') {
			return false;
		}

		return true;
	});

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
	Hawkejs.Hawkejs.setMethod(function registerElement(element_name, _parent, properties) {

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

	Hawkejs.Hawkejs.registerElement = Hawkejs.Hawkejs.prototype.registerElement;

	if (!Blast.isBrowser) {
		return;
	}

	/**
	 * The element placeholder is used during client side renders
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.2.2
	 * @version  1.2.2
	 */
	Hawkejs.Hawkejs.registerElement('he-element-placeholder', {
		attachedCallback: function attachedCallback() {
			this.connectedCallback();
		},
		connectedCallback: function connectedCallback() {
			var id = this.dataset.hid;

			if (id && this.parentElement) {
				this.parentElement.replaceChild(browser_store[id], this);
				delete browser_store[id];
			}
		}
	});
};