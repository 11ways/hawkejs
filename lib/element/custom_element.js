var originalCreateElement,
    creating_element,
    observed_attributes = Symbol('observed_attributes'),
    weak_properties = new WeakMap(),
    browser_store = {},
    Element,
    has_v1 = typeof customElements == 'object';

if (Blast.isBrowser) {
	Hawkejs.browser_store = browser_store;
}

/**
 * Base element constructor
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
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
	Element = Fn.inherits('Hawkejs.HTMLElement', 'Hawkejs.Element', function Element() {
		Element.super.call(this);
		ElementConstructor.call(this);
	});
} else {

	// IE & Edge fix
	if (typeof HTMLElement === 'object') {
		let Element = function HTMLElement(){};
		Element.prototype = HTMLElement.prototype;
		HTMLElement = Element;
	}

	Element = Blast.Bound.Function.inherits('HTMLElement', 'Hawkejs.Element', function Element() {
		ElementConstructor.call(this);
	});

	if (typeof customElements != 'undefined') {
		let originalCreateElement = document.createElement;

		document.createElement = function createElement(name) {

			var element;

			creating_element = true;
			element = originalCreateElement.apply(document, arguments);
			creating_element = false;

			if (element.constructor.constitutors) {
				element.constructor.call(element);
			}

			return element;
		};
	}
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
			values      : {},

			// New values that are beign set
			new_values  : {}
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
 * @version  2.0.0
 */
Element.constitute(function registerElement() {

	var that = this,
	    ClassSyntaxFixer,
	    upper_name,
	    upper_tag,
	    tag_name,
	    options,
	    prefix,
	    name,
	    ns;

	if (Bound.String.endsWith(this.name, 'Element')) {
		name = Bound.String.before(this.name, 'Element');
	} else {
		name = this.name;
	}

	if (!name) {
		return;
	}

	// Add underscores
	name = Bound.String.underscore(name);

	// Turn underscores into dashes
	name = Bound.String.dasherize(name);

	// Make sure the name contains a dash
	if (name.indexOf('-') < 1) {
		if (this.namespace) {
			ns = Bound.Function.getNamespace(this.namespace);
		}

		if (ns && ns.default_element_prefix) {
			prefix = ns.default_element_prefix;
		}

		if (!prefix) {
			prefix = 'he';
		}

		name = prefix + '-' + name;
	}

	upper_name = name.toUpperCase();

	if (this.prototype.parent_element) {
		upper_tag = this.prototype.parent_element.toUpperCase();
	} else {
		upper_tag = upper_name;
	}

	this.setProperty('nodeName', upper_name);
	this.setProperty('tagName', upper_tag);
	this.setProperty('_l_node_name', name);
	this.setProperty('_l_tag_name', upper_tag.toLowerCase());

	if (Blast.isNode) {
		// No need to mess with any `define` stuff on the server
	} else if (typeof customElements == 'undefined') {

		options = {
			prototype: Object.create(this.prototype, {createdCallback: {value: this}})
		};

		// If a parent element is set, the 'is=""' attribute needs to be used
		if (this.prototype.parent_element) {
			options.extends = this.prototype.parent_element;
		}

		// Register the element in the browser
		Blast.afterOnce('requiring', function registerElement() {
			that.ElementConstructor = document.registerElement(name, options);
		});
	} else {

		options = {};

		// If a parent element is set, the 'is=""' attribute needs to be used
		if (this.prototype.parent_element) {
			options.extends = this.prototype.parent_element;
		}

		// Create a wrapper function that'll be used to actually create the element
		// using the v1 custom-element structure
		ClassSyntaxFixer = function ClassSyntaxFixer() {
			var instance = Reflect.construct(HTMLElement, [], ClassSyntaxFixer);

			if (creating_element) {
				// Do nothing, constructor will be called later
			} else if (typeof hawkejs == 'undefined') {
				Blast.nextTick(function callWithHawkejsOnNextTick() {
					that.call(instance);
				});
			} else {
				that.call(instance);
			}

			return instance;
		}

		// Needed to make onAttributeChanged work
		Fn.setStaticProperty(ClassSyntaxFixer, function observedAttributes() {
			return that.observedAttributes;
		});

		// Make sure to completely replace the wrapper's prototype
		// with our own
		ClassSyntaxFixer.prototype = that.prototype;

		Blast.afterOnce('hawkejs_init', function defineElement() {
			customElements.define(name, ClassSyntaxFixer, options);
		});
	}

	// Register with hawkejs
	Hawkejs.Hawkejs.elements[name] = this;
	Hawkejs.Hawkejs.elements[name.toUpperCase()] = this;
});

/**
 * Do something when the scene is ready
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {Function}
 */
Element.setStatic(function sceneReady(fnc) {

	if (Blast.hasBeenSeen('hawkejs_registered')) {
		return Blast.nextTick(fnc);
	}

	Blast.afterOnce('hawkejs_registered', function waitForScene() {
		fnc();
	});
}, false);

/**
 * Revive this object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.3.4
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

			if (!obj.hawkejs_id || document.readyState == 'interactive' || document.readyState == 'complete') {
				force = true;
			}

			// If force is enabled, a new element is made
			if (force) {
				if (obj.tag_name || has_v1) {
					element = document.createElement(obj.tag_name || this.prototype.nodeName);
				} else if (this.ElementConstructor) {
					element = new this.ElementConstructor;
				} else {
					throw new Error('Custom element ' + this.name + ' has no ElementConstructor');
				}
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
	Element.sceneReady(function() {
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
 * @since    1.2.8
 * @version  1.2.8
 */
Element.setStatic(function setAttribute(name, getter, setter, config) {
	this.constitute(function setAttribute() {
		this._setAttribute(name, getter, setter, config);
	});
});

/**
 * Add an attribute setter/getter
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.1
 * @version  2.0.0
 */
Element.setStatic(function _setAttribute(name, getter, setter, config) {

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

	if (setter) {
		this.addObservedAttribute(name);
	}

	// Store the attribute configuration
	this._attributes[name] = config;

	// Set the instance property getter/setter
	this.setProperty(name, function attrGetter() {

		var val;

		if (this.constructor.prototype == this) {
			return;
		}

		val = this.getAttribute(name);

		// Custom getters can modify the attribute string
		if (getter) {
			val = getter.call(this, val);
		}

		return val;
	}, function attrSetter(value) {

		var new_values,
		    newval,
		    map;

		if (this.constructor.prototype == this) {
			throw new Error('Unable to assign to setter outside of object instance');
		}

		if (setter) {
			newval = setter.call(this, value);

			// If there was no return value, use the original value
			if (typeof newval == 'undefined') {
				newval = value;
			}
		} else {
			newval = value;
		}

		// Remember this value so the setter isn't called again later
		// in the `attributeChangedCallback`
		new_values = getPrivate(this).new_values;
		new_values[name] = newval;

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
 * @version  2.0.0
 */
Element.setStatic(function setAssignedProperty(name, getter, setter) {

	if (typeof name == 'function') {
		setter = getter;
		getter = name;
		name = getter.name;
	}

	let listener_method = 'on' + Bound.String.camelize(name) + 'Assignment';

	this.setProperty(name, function assignedGetter() {

		var val;

		if (this.constructor.prototype == this) {
			return;
		}

		val = this.assigned_data[name];

		if (getter) {
			val = getter.call(this, val);
		}

		return val;
	}, function assignedSetter(value) {

		var oldval,
		    newval,
		    replace;

		if (this.constructor.prototype == this) {
			throw new Error('Unable to assign to setter outside of object instance');
		}

		if (setter) {
			newval = setter.call(this, value);

			if (typeof newval == 'undefined') {
				newval = value;
			}
		} else {
			newval = value;
		}

		oldval = this.assigned_data[name];

		this.assigned_data[name] = newval;

		if (typeof this[listener_method] == 'function') {
			replace = this[listener_method](newval, oldval);

			if (typeof replace !== 'undefined' && !(replace && replace.then)) {
				newval = replace;
				this.assigned_data[name] = replace;
			}
		}

		return newval;
	});
});

/**
 * Add a custom template renderer to the given element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Function}   element_class
 */
function addTemplateRenderer(element_class) {
	// Add the method to force rendering the template
	Hawkejs.setCachedMethod(element_class, Hawkejs.RENDER_CONTENT, renderCustomTemplate);
}
var c=0;
/**
 * The custom template render function
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
function renderCustomTemplate() {

	var that = this,
	    child_nodes,
	    child,
	    vars = {},
	    i;

	for (i = 0; i < this.children.length; i++) {
		child = this.children[i];

		if (!child.getAttribute) {
			continue;
		}

		if (child.getAttribute('slot')) {
			vars[child.getAttribute('slot')] = child;
		}
	}

	// Set the original child nodes
	child_nodes = Bound.Array.cast(this.childNodes).slice(0);

	// Now remove them from the actual element
	Hawkejs.removeChildren(this);

	return Fn.series(function renderTemplate(next) {

		var template = that.constructor.compiled_template || that.constructor.template_file;

		that.hawkejs_renderer.renderTemplate(template, {self: that, child_nodes: child_nodes}, String(c++)).done(next);
	}, function assembleBlock(next, template) {
		template.target_block.assemble().done(next);
	}, function assembledBlock(next, block) {

		var slots,
		    slot,
		    name,
		    i;

		for (i = 0; i < block.lines.length; i++) {
			that.append(block.lines[i]);
		}

		slots = Hawkejs.getElementsByAttribute(that, 'data-he-slot');

		for (i = 0; i < slots.length; i++) {
			slot = slots[i];
			name = slot.dataset.heSlot;

			if (vars[name]) {
				Hawkejs.replaceChildren(slot, vars[name].childNodes);
			}
		}

		next();
	}, null);
}

/**
 * Set the template file used to render the inner HTML
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   path
 */
Element.setStatic(function setTemplateFile(path) {

	this.template_file = path;

	addTemplateRenderer(this);
});

/**
 * Set the template to use for the content
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   template
 */
Element.setStatic(function setTemplate(template) {

	var hawkejs = new Hawkejs.Hawkejs();

	let compiled = hawkejs.compile({
		template_name : this.name + '_template',
		template      : template,
		cache         : false
	});

	this.compiled_template = compiled;

	addTemplateRenderer(this);
});

/**
 * Add an attribute to the observedAttributes getter
 * (Attribute names in this property will then make a call to
 * attributeChangedCallback on change)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name   Name of the attribute to observe
 * @param    {Function} fnc    Optional function to call
 */
Element.setStatic(function addObservedAttribute(name, fnc) {

	var attributes = this[observed_attributes];

	if (!attributes) {

		attributes = this[observed_attributes] = {
			attributes : [],
			callbacks  : {}
		};

		this.setStaticProperty(function observedAttributes() {
			return attributes.attributes.slice(0);
		});
	}

	attributes.attributes.push(name);

	if (fnc) {
		if (!attributes.callbacks[name]) {
			attributes.callbacks[name] = [];
		}

		attributes.callbacks[name].push(fnc);
	}
});

/**
 * The view this was made in (if applicable)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 *
 * @type     {Hawkejs.Renderer}
 */
Element.setProperty(function hawkejs_view() {
	return this.hawkejs_renderer;
}, function setView(value) {
	return this.hawkejs_renderer = value;
});

/**
 * The view this was made in (if applicable)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 *
 * @type     {Hawkejs.Renderer}
 */
Element.setProperty(function hawkejs_renderer() {

	if (this._hawkejs_renderer) {
		return this._hawkejs_renderer;
	}

	if (Blast.isBrowser) {
		return hawkejs.scene.general_renderer;
	}

}, function setHawkejsRenderer(view) {
	this._hawkejs_renderer = view;
});

/**
 * A link to useable helpers
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 *
 * @type     {Hawkejs.HelperCollection}
 */
Element.setProperty(function hawkejs_helpers() {

	if (this._hawkejs_renderer) {
		return this._hawkejs_renderer.helpers;
	}

	if (Blast.isBrowser) {
		return hawkejs.scene.helpers;
	}
});

/**
 * Real assigned data
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.9
 *
 * @type     {Object}
 */
Element.setProperty(function assigned_data() {

	if (this.constructor.prototype == this) {
		return;
	}

	if (this._assigned_data) {
		return this._assigned_data;
	}

	if (this._assigned_data == null) {
		this._assigned_data = {};
	}

	return this._assigned_data;
}, function set_assigned_data(value) {

	if (this.constructor.prototype == this) {
		throw new Error('Unable to assign to setter outside of object instance');
	}

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
 * @version  1.3.4
 *
 * @param    {ViewRender}   viewRender
 */
Element.setMethod(function toHawkejsString(viewRender) {

	if (typeof this.retained == 'function') {
		this.retained();
	}

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
 * @version  1.2.8
 *
 * @param    {String}   id
 */
Element.setMethod(function setIdentifier(id) {
	this.hawkejs_id = id;
	this.dataset.hid = id;

	if (Blast.isBrowser) {
		browser_store[id] = this;
	}
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
 * @version  1.3.1
 *
 * @param    {String}   name
 * @param    {Object}   options
 */
Element.setMethod(function emit(name, options) {

	var event;

	// Ignore events on server
	if (Blast.isNode) {
		return;
	}

	if (!options) {
		options = {};
	}

	event = new CustomEvent(name, options);
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
 * @version  1.2.3
 */
Element.setMethod(function connectedCallback() {

	var that = this,
	    data;

	if (typeof this.introduced == 'function') {
		// Delay by a little bit so all the other custom elements
		// can get registered in time
		Element.sceneReady(function whenReady() {

			var data = getPrivate(that);

			if (data.has_been_introduced) {
				return;
			}

			data.has_been_introduced = true,

			that.introduced();
		});
	}

	if (typeof this.reconnected == 'function') {
		data = getPrivate(that);

		if (data.has_been_introduced) {
			this.reconnected();
		}
	}

	if (typeof this.connected == 'function') {
		// Delay by a little bit so all the other custom elements
		// can get registered in time
		Element.sceneReady(function whenReady() {
			that.connected();
		});
	}
});

/**
 * Callback when removed from the DOM
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 */
Element.setMethod(function disconnectedCallback() {
	if (typeof this.disconnected == 'function') {
		this.disconnected();
	}
});

/**
 * Listen to changing attributes
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 *
 * @param    {String}   name      The name of the attribute
 * @param    {String}   prev      The previous value
 * @param    {String}   val       The new value
 * @param    {Boolean}  created   If this attribute was set on creation
 */
Element.setMethod(function attributeChangedCallback(name, prev, val, created) {

	var prop_val,
	    changed,
	    config,
	    map;

	// If the attribute is configured, add it as a property too
	if (this.constructor._attributes && this.constructor._attributes[name]) {
		config = this.constructor._attributes[name];
	} else if (!this.constructor[observed_attributes] || !this.constructor[observed_attributes].callbacks[name]) {
		return;
	}

	// Get the private instance variable
	map = getPrivate(this);

	// Store the new attribute value
	map.values[name] = val;

	// Normalize the attribute string if it's a boolean
	if (config && config.boolean) {
		if (val === 'false') {
			val = false;
		} else if (val === 'null') {
			val = null;
		} else {
			val = true;
		}
	}

	// If there is a setter, call it now
	if (config == null || config.setter) {
		if (map.new_values[name] !== val) {
			changed = true;

			// Is there an explicit setter?
			if (config && config.setter) {
				prop_val = config.setter.call(this, val);
			}
		}

		map.new_values[name] = undefined;
	}

	if (this.constructor[observed_attributes].callbacks[name]) {
		if (changed) {
			let i;

			for (i = 0; i < this.constructor[observed_attributes].callbacks[name].length; i++) {
				this.constructor[observed_attributes].callbacks[name][i].call(this, val);
			}
		}

		// If there is no setter, remember this new value
		if (!config) {
			map.new_values[name] = val;
		}
	}

	if (config) {

		// We need a prop val, and it should not be undefined
		// If there was no setter, or if there was a setter but it
		// returned nothing, we use the input val
		if (typeof prop_val === 'undefined') {
			prop_val = val;
		}

		// Store the property representation of this value
		map.prop_values[name] = prop_val;
	}
});

/**
 * Create an element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Element.setMethod(function createElement(name) {

	if (this.hawkejs_view) {
		return this.hawkejs_view.create_element(name);
	}

	return Hawkejs.Hawkejs.createElement(name);
});

/**
 * Claim the content up until the current render point
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Boolean}   only_if_empty
 */
Element.setMethod(function _claimSiblings(only_if_empty) {
	return Hawkejs.claimSiblings(this, only_if_empty);
});