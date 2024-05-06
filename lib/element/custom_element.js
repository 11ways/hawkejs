let has_premature_undried_elements,
    originalCreateElement,
    creating_element,
    observed_attributes = Symbol('observed_attributes'),
    weak_properties = new WeakMap(),
    browser_store = {},
	ENSURED_CSS_FILES,
    Element,
    has_v1 = typeof customElements == 'object',
    render_counter = 0;

const CURRENT_RENDER = Symbol('current_render'),
      STATE_DEFINITION = Symbol('state_definition'),
      STATE_VALUES = Symbol('state_values'),
      ADDED_EVENT_LISTENERS = Symbol('added_event_listeners');

let custom_stylesheet_handler;

if (Blast.isBrowser) {
	Hawkejs.browser_store = browser_store;
	ENSURED_CSS_FILES = new Map();
}

/**
 * Base element constructor
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.17
 */
function ElementConstructor() {

	if (this[Hawkejs.CONSTRUCTED]) {
		throw new Error('Element ' + this.nodeName + ' is being constructed twice');
	}

	let ElClass = this.constructor;

	if (ElClass._has_default_attributes === true) {
		let name,
		    conf;

		for (name in ElClass._attributes) {
			conf = ElClass._attributes[name];

			if (conf.default != null && !this.hasAttribute(name)) {
				this.setAttributeSilent(name, conf.default);
			}
		}
	}

	if (this.attributes.length) {

		let attr,
		    i;

		// Trigger an initial attribute change
		for (i = 0; i < this.attributes.length; i++) {
			attr = this.attributes.item(i);
			this.attributeChangedCallback(attr.name, null, attr.value, true);
		}
	}

	// If the custom element has an inline template,
	// execute it immediately
	if (ElClass.compiled_template && ElClass.compiled_template.render_immediate !== false) {

		// If this has already been rendered or the render should be delayed, do nothing
		if (this[Hawkejs.DELAY_SYNC_RENDER] || this.hasAttribute('he-rendered')) {
			// Do nothing
		} else {
			this._renderTemplateSynchronously();
		}
	}

	this[Hawkejs.CONSTRUCTED] = true;
}

Hawkejs.CustomElementConstructor = ElementConstructor;

if (Blast.isNode) {
	Element = Fn.inherits('Hawkejs.HTMLElement', 'Hawkejs.Element', function Element() {
		// Do not call the HTMLElement super, that'll be done somewhere else
	});
} else {

	// IE & Edge fix
	if (typeof HTMLElement === 'object') {
		let Element = function HTMLElement(){};
		Element.prototype = HTMLElement.prototype;
		HTMLElement = Element;
	}

	Element = Blast.Bound.Function.inherits('HTMLElement', 'Hawkejs.Element', function Element() {
		// Do nothing
	});

	if (typeof customElements != 'undefined') {

		let originalCreateElement = document.createElement;
		Hawkejs.originalCreateElement = originalCreateElement;

		document.createElement = function createElement(name) {

			const element = Hawkejs._createUnconstructedElement.apply(null, arguments);

			// Call the custom-element constructor too
			if (Hawkejs.Hawkejs.isCustomElement(element)) {
				element[Hawkejs.CREATED_MANUALLY] = true;
				element.constructor.call(element);
				ElementConstructor.call(element);
			}

			return element;
		};
	}
}

/**
 * Create an element on which we can call the constructor later
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.1.0
 * @version  2.2.9
 *
 * @param    {String}   name
 *
 * @return   {HTMLElement}
 */
Hawkejs._createUnconstructedElement = function _createUnconstructedElement(name) {

	let element;

	creating_element = true;

	if (Hawkejs.originalCreateElement) {
		element = Hawkejs.originalCreateElement.apply(document, arguments);
	} else if (Blast.isBrowser || !Hawkejs.Hawkejs.isCustomElement(name)) {
		element = Hawkejs.Hawkejs.createElement(name);
	} else {
		// Get the constructor
		let constructor = Hawkejs.Hawkejs.elements[name];

		// Create the element without invoking the constructor
		element = Object.create(constructor.prototype);

		// Call the HTMLElement constructor
		// (The custom constructor will be called later!)
		Hawkejs.HTMLElement.call(element);
	}

	creating_element = false;

	return element;
};

/**
 * Create a private variable for the given instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.1
 * @version  2.3.19
 *
 * @param    {Element}   instance
 *
 * @return   {Object}
 */
const getPrivate = instance => {

	let map = weak_properties.get(instance);

	if (!map) {
		map = {
			// Attribute configurations
			attributes  : {},

			// Attribute values for use in property getters
			prop_values : {},

			// Attribute string values
			values      : {},

			// New values that are being set
			new_values  : {},

			// Cached element getters
			cached_elements : new Map(),
		};

		weak_properties.set(instance, map);
	}

	return map;
};

/**
 * Is the given name allowed as a property?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {String}   name
 */
function assertPropertyName(name) {
	switch (name) {
		case 'children':
		case 'childNodes':
		case 'dataset':
			throw new Error('The property name "' + name + '" is already in use');
	}
}

/**
 * Register the element in the browser
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.2.17
 */
Element.constitute(function registerElement() {

	if (this.is_abstract_class) {
		return;
	}

	let name = this.name,
	    tag_name;

	if (this.prototype.hasOwnProperty('tagName')) {
		tag_name = this.prototype.tagName;
	}

	if (name.endsWith('Element')) {
		name = Bound.String.before(name, 'Element');
	}

	// If the name is just "Element", ignore it
	if (!name && !tag_name) {
		return;
	}

	const that = this;

	let upper_tag,
	    options;

	if (!tag_name) {

		// Add underscores
		tag_name = Bound.String.underscore(name);

		// Turn underscores into dashes
		tag_name = Bound.String.dasherize(tag_name);

		// See if a prefix *needs* to be added
		let prefix = this.custom_element_prefix;

		// If the prefix equals the name, don't use it
		// (This is to prevent alchemy-widgets-alchemy-widgets situations)
		if (prefix == tag_name) {
			prefix = false;
		}

		// Make sure the name contains a dash
		if (prefix || tag_name.indexOf('-') < 1) {

			// If no custom prefix was found, see if a default one exists
			if (!prefix) {
				prefix = this.default_element_prefix;
			}

			// Still nothing? Look in the namespace
			if (!prefix) {
				let ns;

				if (this.namespace) {
					ns = Bound.Function.getNamespace(this.namespace);
				}

				if (ns && ns.default_element_prefix) {
					prefix = ns.default_element_prefix;
				}
			}

			if (!prefix) {
				prefix = 'he';
			}

			tag_name = prefix + '-' + tag_name;
		}
	}

	// Make sure the tag name is uppercased
	tag_name = tag_name.toUpperCase();

	// This is for elements with a "parent" element, so it would be like
	// <button is="my-button">, though this is rarely used
	if (this.prototype.parent_element) {
		upper_tag = this.prototype.parent_element.toUpperCase();
	} else {
		upper_tag = tag_name;
	}

	let lower_name = tag_name.toLowerCase();

	this.setProperty('nodeName', tag_name);
	this.setProperty('tagName', upper_tag);
	this.setProperty('_l_node_name', lower_name);
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
		let ClassSyntaxFixer = function ClassSyntaxFixer() {
			var instance = Reflect.construct(HTMLElement, [], ClassSyntaxFixer);

			if (creating_element) {
				// Do nothing, constructor will be called later
			} else if (typeof hawkejs == 'undefined' || (Blast.isBrowser && document.readyState != 'complete')) {
				Blast.setImmediate(function callWithHawkejsOnNextTick() {

					if (document.readyState == 'loading') {
						return Blast.setImmediate(callWithHawkejsOnNextTick);
					}

					ElementConstructor.call(instance);
				});
			} else {
				ElementConstructor.call(instance);
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

		// Register the element as soon as all the constitutors have finished
		that.afterConstituted(function defineElement() {
			customElements.define(lower_name, ClassSyntaxFixer, options);
		});
	}

	// Register with hawkejs
	Hawkejs.Hawkejs.elements[lower_name] = this;
	Hawkejs.Hawkejs.elements[upper_tag] = this;
});

/**
 * Set the tagName of this element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.17
 * @version  2.2.17
 *
 * @param    {String}   tag_name
 */
Element.setStatic(function setTagName(tag_name) {
	this.setProperty('tagName', tag_name.toUpperCase());
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
 * Revive this element.
 * This is also used for non-custom HTML elements.
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.22
 *
 * @param    {Object}   obj
 * @param    {boolean}  force
 *
 * @return   {HTMLElement}
 */
Element.setStatic(function unDry(obj, force) {

	var that = this,
	    element,
	    temp,
	    key;

	if (Blast.isBrowser) {
		let tagName = obj.tagName || obj.tag_name;

		if (obj.hawkejs_id) {
			element = document.querySelector('[data-hid="' + obj.hawkejs_id + '"]');
		}

		if (!element) {

			if (obj.outerHTML) {
				element = Blast.parseHTML(obj.outerHTML);

				if (typeof element == 'string') {
					return element;
				}

			} else if (tagName) {
				element = document.createElement(tagName);
				Hawkejs.setAttributes(element, obj.attributes);

				if (obj.className) {
					element.className = obj.className;
				}

				if (obj.id) {
					element.id = obj.id;
				}

				if (obj.cssText) {
					element.style.cssText = obj.cssText;
				}

				if (obj.innerHTML) {
					element.innerHTML = obj.innerHTML;
				}

				if (obj.dataset) {
					let key;

					for (key in obj.dataset) {
						element.dataset[key] = obj.dataset[key];
					}
				}

				if (obj.renderer) {
					element.hawkejs_renderer = obj.renderer;
				}
			}
		}

		// No id was given, or it wasn't found (yet)
		// So create a temporary element
		if (!element) {

			if (!obj.hawkejs_id || Hawkejs.canQueryBody()) {
				force = true;
			}

			// If force is enabled, a new element is made
			if (force) {
				if (tagName || has_v1) {
					element = document.createElement(tagName || this.prototype.nodeName);
				} else if (this.ElementConstructor) {
					element = new this.ElementConstructor;
				} else {
					throw new Error('Custom element ' + this.name + ' has no ElementConstructor');
				}
			} else {
				has_premature_undried_elements = true;

				// Return an object the Scene instance will replace
				// once the DOM is ready
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

	if (obj.assigned_data) {
		element.assigned_data = obj.assigned_data;
	}

	if (obj.variables) {
		element[Hawkejs.VARIABLES] = obj.variables;
	}

	if (obj.reactive?.length) {
		Hawkejs.Renderer.attachReactiveListeners(element, obj.reactive);
		element[Hawkejs.RENDER_INSTRUCTION] = obj.instructions;
	}

	if (obj.state_values?.size) {
		element[STATE_VALUES] = obj.state_values;
	}

	if (obj.event_handlers?.length) {
		element[Hawkejs.EVENT_HANDLERS] = obj.event_handlers;
		Element.ensureEventHandlers(element, obj.event_handlers);
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
 * Make sure the event handlers will be added to the given element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}   element
 * @param    {Object[]}      event_handlers
 * @param    {boolean}       force
 */
Element.setStatic(function ensureEventHandlers(element, event_handlers, force = false) {

	if (!element || !event_handlers?.length || element[ADDED_EVENT_LISTENERS]) {
		return;
	}

	if (element.is_custom_hawkejs_element && !force && !element.isConnected()) {
		return;
	}

	element[ADDED_EVENT_LISTENERS] = true;

	for (let handler of event_handlers) {
		element.addEventListener(handler.type, e => {
			doHawkejsEventHandler(element, handler, e);
		});
	}
});

/**
 * Actually perform the given event handler
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}   element
 * @param    {Object}        handler
 * @param    {Event}         event
 */
const doHawkejsEventHandler = (element, handler, event) => {

	let renderer = Element.prototype.ensureHawkejsRenderer.call(element);
	let variables = Hawkejs.Variables.cast(element[Hawkejs.VARIABLES], renderer);

	variables.set('$event', event);
	
	renderer.parseExpression(handler.expression, variables);
};

/**
 * Make sure contents are rendered before doing this parent getter/method
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 */
Element.setStatic(function renderBeforeGet(name) {

	let descriptor = Blast.Collection.Object.getPropertyDescriptor(this.prototype, name);

	function getParent() {

		if (this[Hawkejs.DELAY_SYNC_RENDER]) {
			this._renderTemplateSynchronously();
		}

		return getParent.super.apply(this, arguments);
	}

	if (descriptor.value) {
		this.setMethod(name, getParent);
	} else {
		this.setProperty(name, getParent);
	}
});

/**
 * Fix premature undried elements
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Element.setStatic(function fixPrematureUndriedElements(scene, renderer) {

	if (!has_premature_undried_elements) {
		return;
	}

	// This shouldn't take too long, unless lots of debug data is set
	Obj.walk(renderer.variables, function eachEntry(value, key, parent) {
		if (value && typeof value == 'object' && value.__delay_undry) {
			parent[key] = value.__delay_undry();
		}
	});
});

/**
 * Set the custom-element stylesheet handler.
 * Can only be called on the root custom element class.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.18
 * @version  2.3.18
 */
Element.setStatic(function setStylesheetHandler(fnc) {
	custom_stylesheet_handler = fnc;
}, false);

/**
 * Set the role of this element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {String}   value
 */
Element.setStatic(function setRole(value) {
	this.setAttribute('role', {default: value});
});

/**
 * Add an attribute setter/getter
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.8
 * @version  2.1.3
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

	assertPropertyName(name);

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

	this.constitute(function setAttribute() {
		this._setAttribute(name, getter, setter, config);
	});
});

/**
 * Add an attribute setter/getter
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.1
 * @version  2.3.12
 */
Element.setStatic(function _setAttribute(name, getter, setter, config) {

	// Store the custom getters and setters
	config.getter = getter;
	config.setter = setter;

	// Create an object on the constructor
	// so we know which attributes are configured
	if (!this._attributes) {
		this._attributes = {};
	}

	let different_prop_type = false,
	    attribute_name = name,
	    property_name = name,
		type = config.type || 'string',
		is_boolean = false,
		is_number = false,
		is_token_list = false;

	if (name.indexOf('_') > -1) {
		attribute_name = name.replace(/_/g, '-');
	}

	if (name.indexOf('-') > -1) {
		property_name = name.replace(/-/g, '_');
	}

	if (config.boolean) {
		type = 'boolean';
	} else if (config.number) {
		type = 'number';
	}

	config.type = type;

	if (config.type !== 'string') {
		different_prop_type = true;

		is_boolean = type === 'boolean';
		is_number = type === 'number';
		is_token_list = type === 'token_list';
	}

	config.is_boolean = is_boolean;
	config.is_number = is_number;
	config.is_token_list = is_token_list;

	if (setter || different_prop_type) {
		this.addObservedAttribute(attribute_name);
	}

	// Store the attribute configuration
	this._attributes[attribute_name] = config;

	if (config.default != null) {
		this._has_default_attributes = true;
	}

	let names = [attribute_name];

	if (attribute_name != property_name) {
		names.push(property_name);
	}

	// Set the instance property getter/setter
	this.setProperty(names, function attrGetter() {

		var val;

		if (this.constructor.prototype == this) {
			return;
		}

		if (different_prop_type) {
			let map = getPrivate(this);
			val = map.prop_values[attribute_name];

			if (is_token_list && !val) {
				val = new Hawkejs.LinkedTokenList(this, name);
				map.prop_values[attribute_name] = val;
			}
		} else {
			val = this.getAttribute(attribute_name);
		}

		// Custom getters can modify the attribute string
		if (getter) {
			val = getter.call(this, val);
		}

		if (is_boolean) {
			return !!val;
		}

		return val;
	}, function attrSetter(value) {

		if (this.constructor.prototype == this) {
			throw new Error('Unable to assign to setter outside of object instance');
		}

		let newval;

		if (setter) {
			newval = setter.call(this, value);

			// If there was no return value, use the original value
			if (typeof newval == 'undefined') {
				newval = value;
			}
		} else {
			newval = value;
		}

		if (is_boolean) {
			newval = !!newval;

			if (newval) {
				this.setAttributeSilent(attribute_name, newval);
			} else {
				this.removeAttributeSilent(attribute_name);
			}
		} else {
			this.setAttributeSilent(attribute_name, newval);
		}

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
 * Actually add the efinition to the given element class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {Function}   element_class
 * @param    {string}     name
 * @param    {Object}     config
 */
const addStateDefinition = (element_class, name, config) => {

	let definitions = element_class[STATE_DEFINITION];

	if (!definitions) {
		element_class[STATE_DEFINITION] = definitions = new Map();
	}

	definitions.set(name, config);
};

/**
 * Get all the state values in a map.
 * Expected ones will be created.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {Function}   element_class
 * @param    {string}     name
 * @param    {Object}     config
 */
const getAllStateValues = (element) => {

	let values = element[STATE_VALUES],
	    definitions = element.constructor[STATE_DEFINITION];

	// If there are no existing values,
	// and no values have a definition, return nothing
	if (!values && !definitions?.size) {
		return;
	}

	if (definitions?.size) {
		for (let [name, config] of definitions) {
			// Trigger initial state value creation
			element.getStateOptional(name);
		}
	}

	return element[STATE_VALUES];
};

/**
 * Add a state variable definition
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {string}   name
 * @param    {Object}   config
 */
Element.setStatic(function defineStateVariable(name, config) {

	assertPropertyName(name);

	this.constitute(function stateDefiner() {
		addStateDefinition(this, name, config);
	});
});

/**
 * Add a property that is stored in assigned_data
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.1.3
 */
Element.setStatic(function setAssignedProperty(name, getter, setter) {

	if (typeof name == 'function') {
		setter = getter;
		getter = name;
		name = getter.name;
	}

	assertPropertyName(name);

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

		if (Blast.isNode && oldval == null && this.hawkejs_renderer) {
			this.hawkejs_renderer.registerElementInstance(this);
		}

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
 * Add a getter with a query selector
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.19
 *
 * @param    {String|Object}   name
 * @param    {String}          query
 */
Element.setStatic(function addElementGetter(name, query) {

	if (arguments.length == 1 && Obj.isObject(name)) {
		let key;

		for (key in name) {
			this.addElementGetter(key, name[key]);
		}

		return;
	}

	this.setProperty(name, function performQuery() {

		let private_map = getPrivate(this),
		    result = private_map.cached_elements.get(name);

		if (result == null) {
			result = this.querySelector(query);
			private_map.cached_elements.set(name, result);
		}

		return result;
	});
});

/**
 * Add a getter with a query selector for multiple elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.19
 */
Element.setStatic(function addElementsGetter(name, query) {

	if (arguments.length == 1 && Obj.isObject(name)) {
		let key;

		for (key in name) {
			this.addElementsGetter(key, name[key]);
		}

		return;
	}

	this.setProperty(name, function performQuery() {

		let private_map = getPrivate(this),
		    result = private_map.cached_elements.get(name);

		if (result == null) {
			result = this.querySelectorAll(query);
			private_map.cached_elements.set(name, result);
		}

		return result;
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

/**
 * The custom template render function
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {boolean}   re_render   Is this a render done from outside a normal render?
 */
function renderCustomTemplate(re_render) {

	// Get the private map
	let private_map = getPrivate(this);

	// And clear the element cache
	private_map.cached_elements.clear();

	// Get the template of this custom element
	const template = this.inner_template;

	if (!template) {
		return this.prepareRenderVariables();
	}

	// Get the optional slot data
	let slot_data = _extractSlotData.call(this, true, re_render);

	// If there already is a render in progress, resolve it
	if (this[CURRENT_RENDER]) {
		this[CURRENT_RENDER].resolve(false);
	}

	let pledge = new Classes.Pledge.Swift();
	this[CURRENT_RENDER] = pledge;

	// The render variables will go here
	let variables;

	Hawkejs.series(next => {

		// Force re-renders with non-compiled templates to be async
		// This can help re-renders to be cancelled quicker
		if (re_render && !this.constructor.compiled_template) {
			Blast.setImmediate(next);
		} else {
			next();
		}
	}, next => {

		if (typeof this.prepareRenderVariables != 'function') {
			return next();
		}

		Classes.Pledge.Swift.done(this.prepareRenderVariables(), (err, result) => {

			if (err) {
				return next(err);
			}

			variables = result;
			next();
		});
	}, err => {

		if (err) {
			_finishRender.call(this, err);
			return pledge.reject(err);
		}

		try {
			renderContentsWithTemplate(this, template, variables, slot_data, pledge);
		} catch (err) {
			pledge.reject(err);
		}
	});

	return pledge;
}

/**
 * Render the contents of the given element using the provided template
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}        element
 * @param    {Hawkejs.Template}   template
 * @param    {Hawkejs.Variables}  [variables]
 * @param    {Object}             [slot_data]
 * @param    {Pledge}             [pledge]
 */
function renderContentsWithTemplate(element, template, variables, slot_data, pledge) {

	// See if the element has already finished rendering, somehow
	const alreadyDone = () => element[CURRENT_RENDER] && element[CURRENT_RENDER] != pledge || pledge.is_done;

	if (pledge && alreadyDone()) {
		pledge.resolve(false);
		return pledge;
	}

	let renderer = Element.prototype.ensureHawkejsRenderer.call(element);

	if (element.constructor.use_new_renderer_scope || renderer?.dialog_open) {
		renderer = renderer.createSubRenderer();
		renderer.scope_id = renderer.getId();
	}

	if (!pledge) {
		pledge = new Classes.Pledge.Swift();

		if (element[CURRENT_RENDER]) {
			// If there already is a render in progress, resolve it
			element[CURRENT_RENDER].resolve(false);
		}
	}

	element[CURRENT_RENDER] = pledge;

	// Finish the rendering early
	const doEarlyResolve = value => pledge.resolve(value);

	if (element[Hawkejs.VARIABLES]) {
		variables = element[Hawkejs.VARIABLES].overlay(variables);
	} else {
		variables = renderer.prepareVariables(variables);
	}

	// Make sure custom element state values are available as variables
	if (element.is_custom_hawkejs_element) {

		let state_values = getAllStateValues(element);

		// State values always take precedence
		// and are injected into the variables
		if (state_values?.size) {
			variables = variables.overlay(state_values);
		}
	}

	if (slot_data) {
		variables.setFromTemplate('self', element);
		variables.setFromTemplate('child_nodes', slot_data.child_nodes);
	}

	variables.setFromTemplate('$ancestor_element', element);

	Hawkejs.series(next => {
		renderer.renderTemplate(template, variables, String(render_counter++)).done(next);
	}, (next, template) => {

		if (alreadyDone()) {
			doEarlyResolve(false);
			return;
		}

		template.target_block.assemble().done(next);

		// The styles() have to be handled here
		// because not all renders pass handleRendererStyles
		if (Blast.isBrowser) {
			hawkejs.scene.handleRendererStyles(renderer);
		}
	}, (next, block) => {

		if (alreadyDone()) {
			doEarlyResolve(false);
			return;
		}

		Hawkejs.replaceChildren(element, block.toElements());

		_insertSlotData.call(element, slot_data);

		if (typeof element.renderedTemplate == 'function') {
			element.renderedTemplate();
		}

		next();
	}, err => {

		if (alreadyDone()) {
			doEarlyResolve(false);
			return;
		}

		try {
			_finishRender.call(element, err);
		} catch (_err) {
			return pledge.reject(_err);
		}

		doEarlyResolve(false);
	});

	return pledge;
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
 * Set the stylesheet to use for this element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.18
 *
 * @param    {String}   path
 */
Element.setStatic(function setStylesheetFile(path) {

	if (custom_stylesheet_handler) {
		custom_stylesheet_handler(path);
		return;
	}

	this.setProperty('css_file', path);
});

/**
 * Set the template to use for the content
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.9
 *
 * @param    {String}   template      The actual template source
 * @param    {Object}   options
 */
Element.setStatic(function setTemplate(template, options) {

	let hawkejs = Hawkejs.Hawkejs.getInstance();

	if (typeof options == 'boolean') {
		options = {
			plain_html : options
		};
	}

	if (!options) {
		options = {};
	}

	let compiled = hawkejs.compile({
		template_name    : this.name + '_template',
		template         : template,
		cache            : false,
		plain_html       : options.plain_html,
		render_immediate : options.render_immediate,
	});

	this.compiled_template = compiled;

	if (options.render_immediate === false) {
		addTemplateRenderer(this);
	}
});

/**
 * Set the stylesheet contents to use for this element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.1
 * @version  2.0.1
 *
 * @param    {String}   styles
 */
Element.setStatic(function setStylesheet(styles) {
	this.css_style = styles;
});

/**
 * Add an attribute to the observedAttributes getter
 * (Attribute names in this property will then make a call to
 * attributeChangedCallback on change)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.17
 *
 * @param    {String}   name   Name of the attribute to observe
 * @param    {Function} fnc    Optional function to call
 */
Element.setStatic(function addObservedAttribute(name, fnc) {
	this.constitute(function constituteObservedAttribute() {
		_addObservedAttribute.call(this, name, fnc);
	});
});

/**
 * Add an attribute to the observedAttributes getter
 * (Attribute names in this property will then make a call to
 * attributeChangedCallback on change)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.17
 *
 * @param    {String}   name   Name of the attribute to observe
 * @param    {Function} fnc    Optional function to call
 */
function _addObservedAttribute(name, fnc) {

	if (Array.isArray(name)) {
		let entry;

		for (entry of name) {
			_addObservedAttribute.call(this, entry, fnc);
		}

		return;
	}

	if (!name || typeof name != 'string') {
		return;
	}

	if (name.indexOf(' ') > -1) {
		return _addObservedAttribute.call(this, name.trim().split(/\s+/g), fnc);
	}

	let attributes = this[observed_attributes];

	if (!attributes) {

		attributes = this[observed_attributes] = {
			attributes : [],
			callbacks  : {}
		};

		this.setStaticProperty(function observedAttributes() {
			return attributes.attributes.slice(0);
		}, false);
	}

	attributes.attributes.push(name);

	if (fnc) {
		if (!attributes.callbacks[name]) {
			attributes.callbacks[name] = [];
		}

		attributes.callbacks[name].push(fnc);
	}
};

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
 * Get child nodes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 *
 * @type     {Array}
 */
Element.renderBeforeGet('childNodes');

/**
 * Remember this is a custom element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Element.setProperty('is_custom_hawkejs_element', true);

/**
 * Turn the role attribute into a property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 *
 * @type     {String}
 */
Element.setProperty(function role() {
	return this.getAttribute('role');
}, function setRole(role) {
	if (!role) {
		this.removeAttribute('role');
	} else {
		this.setAttribute('role', role);
	}
});

/**
 * The view this was made in (if applicable)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.2.22
 *
 * @type     {Hawkejs.Renderer}
 */
Element.setProperty(function hawkejs_renderer() {

	if (this._hawkejs_renderer) {
		return this._hawkejs_renderer;
	}

	if (Blast.isBrowser) {
		return hawkejs.scene?.general_renderer;
	}

}, function setHawkejsRenderer(view) {

	if (!this._hawkejs_renderer && this.css_file && view) {
		
		// @TODO: Sometimes the renderer has not been undried yet.
		if (view.namespace && view.dry_class) {
			return;
		}

		// If there is a CSS path set, require it now
		// @TODO: Should be possible in the onHawkejsAssembly method,
		// but that gets fired AFTER the createstyles one, so ...
		view.style(this.css_file);
	}

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

/**
 * Get the template to use
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Element.setProperty(function inner_template() {

	if (this.compiled_template) {
		return this.compiled_template;
	}

	if (this.template_file) {
		return this.template_file;
	}

	return this.constructor.compiled_template || this.constructor.template_file;
}, function setInnerTemplate(value) {

	if (typeof value == 'function') {
		this.compiled_template = value;
	} else if (this.compiled_template) {
		this.compiled_template = null;
	}

	this.template_file = value;
});

/**
 * Has this element rendered its contents?
 * If it doesn't have a template, will be true when element is closed
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @type     {Boolean}
 */
Element.setProperty(function has_rendered() {

	let result = false;

	if (this.hasAttribute('he-rendered')) {
		result = true;
	} else if (!this.constructor.template_file && !this.constructor.compiled_template) {
		// @TODO: Check for closing when inside renderer?
		result = true;
	}

	return result;
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
 * Serialize this element for JSON-Dry.
 * This is also used for non-custom HTML elements on the server-side.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  2.4.0
 *
 * @return   {Object}
 */
Element.setMethod(function toDry() {

	let serialize_all,
	    value;
	
	if (Blast.isNode) {

		if (this.hawkejs_renderer) {

			// If this element is being serialized for the client,
			// but it hasn't been registered yet, do so now!
			if (!this.hawkejs_id) {
				this.hawkejs_renderer.registerElementInstance(this);
			}

			// @TODO: checking for parentElement only isn't ideal for these edge cases
			if (this.hawkejs_renderer.is_for_client_side || !this.parentElement) {
				serialize_all = true;
			}
		} else {
			serialize_all = true;
		}
	}

	value = {
		hawkejs_id     : this.hawkejs_id,
		assigned_data  : this.assigned_data,
		variables      : this[Hawkejs.VARIABLES],
		reactive       : this[Hawkejs.REACTIVE_VALUES],
		instructions   : this[Hawkejs.RENDER_INSTRUCTION],
		state_values   : this[STATE_VALUES],
		event_handlers : this[Hawkejs.EVENT_HANDLERS],
	};

	if (serialize_all) {
		value = {
			tagName       : this.tagName,
			attributes    : this.attributes,
			dataset       : this.dataset,
			className     : this.className,
			id            : this.id,
			cssText       : this.style.cssText,
			innerHTML     : this.innerHTML,
			renderer      : this.hawkejs_renderer,
			...value
		};
	}

	return {value: value};
});

/**
 * Get a state variable.
 * Will always return an optional.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {string}   name
 *
 * @return   {Develry.ObservableOptional}
 */
Element.setMethod(function getStateOptional(name) {

	let values = this[STATE_VALUES],
	    optional;

	if (!values) {
		this[STATE_VALUES] = values = new Map();
	}

	optional = values.get(name);

	if (!optional) {
		optional = new Classes.Develry.ObservableOptional();
		values.set(name, optional);

		let definition = this.constructor[STATE_DEFINITION]?.get(name);

		if (definition) {
			if (definition.default != null) {
				if (typeof definition.default == 'function') {
					optional.value = definition.default();
				} else {
					optional.value = definition.default;
				}
			}

			if (definition.on_change) {
				optional.addListener(definition.on_change.bind(this));
			}
		}
	}

	return optional;
});

/**
 * Get a state variable's value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {string}   name
 *
 * @return   {Develry.ObservableOptional}
 */
Element.setMethod(function getState(name) {
	return this.getStateOptional(name).value;
});

/**
 * Set a state value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {string}   name
 * @param    {*}        value
 *
 * @return   {Develry.ObservableOptional}
 */
Element.setMethod(function setState(name, value) {

	if (!name) {
		return;
	}

	if (typeof name == 'object') {
		let key;

		for (key in name) {
			this.setState(key, name[key]);
		}

		return;
	}

	let optional = this.getStateOptional(name);
	optional.value = value;
	return optional;
});

/**
 * Make sure this element has a Renderer attached to it,
 * and return it.
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.2.9
 * @version  2.2.19
 *
 * @type     {Hawkejs.Renderer}
 */
Element.setMethod(function ensureHawkejsRenderer() {

	let renderer = this.hawkejs_renderer;

	if (!renderer) {
		renderer = new Hawkejs.Renderer(this.hawkejs);

		// Mark this as an out-of-tree render
		renderer.base_id = 'extrinsic_' + Date.now() + '_' + this.tagName;

		this.hawkejs_renderer = renderer;
	}

	return renderer;
});

/**
 * Get all child elements that are of the given node name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.1.4
 *
 * @param    {String}   name   The name of the node type (or null for all)
 *
 * @return   {Array<Node>}
 */
Element.setMethod(function getElementsByNodeName(name) {

	let result = [],
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

			if (entry.nodeType == 1) {
				// Do recursive search
				result = result.concat(getElementsByNodeName.call(entry, name));
			}
		}
	}

	return result;
});

/**
 * Set an attribute without triggering a setter
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   attribute_name
 * @param    {String}   value
 */
Element.setMethod(function setAttributeSilent(attribute_name, value) {

	// Remember this value so the setter isn't called again later
	// in the `attributeChangedCallback`
	const new_values = getPrivate(this).new_values;

	new_values[attribute_name] = value;

	// Set the attribute on the element
	this.setAttribute(attribute_name, value);
});

/**
 * Remove an attribute without triggering a setter
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {String}   attribute_name
 */
Element.setMethod(function removeAttributeSilent(attribute_name) {

	// Remember this value so the setter isn't called again later
	// in the `attributeChangedCallback`
	const new_values = getPrivate(this).new_values;

	new_values[attribute_name] = null;

	this.removeAttribute(attribute_name);
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
 * This method will be called when the element is used in a block assemble
 * (Or on a getTextContent or getElementContent call)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
Element.setMethod(function onHawkejsAssemble(renderer) {

	if (typeof this.retained == 'function') {
		this.retained();
	}

	this.ensureCssIsAdded(renderer);
});

/**
 * The renderer has closed the element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.15
 * @version  2.3.17
 */
Element.setMethod(function onHawkejsCloseElement() {

	if (this.has_rendered) {
		// The element has already rendered, see if we need to add slot data
		let slot_data = _extractSlotData.call(this, false, false);
		_insertSlotData.call(this, slot_data);
	}
});

/**
 * Make sure the CSS is added
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.6
 * @version  2.2.19
 */
Element.setMethod(function ensureCssIsAdded(renderer) {

	let identifier = this.css_file || this.tagName,
	    has_string_css = typeof identifier === 'string',
		CSS_MAP;

	if (has_string_css) {
		if (Blast.isBrowser) {
			CSS_MAP = ENSURED_CSS_FILES;
		} else {
			if (!renderer) {
				renderer = this.ensureHawkejsRenderer();
			}

			if (!renderer) {
				return;
			}

			CSS_MAP = renderer.ensured_css_files;
		}

		if (CSS_MAP.has(identifier)) {
			return;
		}

		CSS_MAP.set(identifier, true);
	}

	if (!renderer) {
		renderer = this.ensureHawkejsRenderer();
	}

	// Use the general renderer when there is no inner template.
	// The render functions will not have been executed, and any custom style
	// would not have been added.
	// And this element might have an old, inherited renderer which will never
	// actually add the style to the browser
	if (Blast.isBrowser && !this.inner_template) {
		renderer = hawkejs.scene?.general_renderer || renderer;
	}

	if (!renderer) {
		return;
	}

	if (typeof this.constructor.css_style != 'undefined') {
		renderer.style(this.tagName, {
			inline : true,
			source : this.constructor.css_style
		});
	} else if (this.css_file) {
		renderer.style(this.css_file);
	}
});

/**
 * If the current element has no `Hawkejs.RESULT` symbol set,
 * this method is executed when getting the HTML
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.2.9
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
Element.setMethod(function toHawkejsString(renderer) {

	if (this.hawkejs_id) {
		this.setIdentifier(this.hawkejs_id);

		// Don't stringify the element now, only to recreate it later
		// (possibly breaking any other references)
		// Instead: put a placeholder that'll insert this element
		// as soon as it is inserted in the DOM
		if (Blast.isBrowser) {
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
 * @version  2.2.8
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

	if (Blast.isNode && this.hawkejs_renderer) {
		this.hawkejs_renderer.registerElementInstance(this);
	}

	return data;
});

/**
 * Set a variable
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.4.0
 */
Element.setMethod(function setVariable(name, value) {

	let variables = this[Hawkejs.VARIABLES];

	if (!variables) {
		variables = this[Hawkejs.VARIABLES] = this.hawkejs_renderer.prepareVariables();
	}

	variables.set(name, value);
});

/**
 * Get a variable, from this or a parent
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.4.0
 */
Element.setMethod(function getVariable(name) {

	let variables = this[Hawkejs.VARIABLES];

	if (variables && variables.has(name)) {
		return variables.get(name);
	}

	if (this.parentElement) {
		return getVariable.call(this.parentElement, name);
	}
});

/**
 * Emit an event
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.2
 * @version  2.1.0
 *
 * @param    {String}   name
 * @param    {Object}   options
 *
 * @return   {CustomEvent}
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

	return event;
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
 * Update the rendered time
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.6
 * @version  2.2.6
 */
Element.setMethod(function updateRenderedTime() {

	let render_time = 1;

	if (Blast.isBrowser) {
		render_time = ~~Blast.performanceNow();
	}

	this.setAttribute('he-rendered', render_time);
});

/**
 * Callback when attached to the DOM
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.2
 * @version  2.3.19
 */
Element.setMethod(function connectedCallback() {

	var allow_render_event,
	    has_introduced = typeof this.introduced == 'function',
	    has_template = !!this.inner_template,
	    that = this,
	    data;

	this.ensureCssIsAdded();

	if (typeof this[Hawkejs.CREATED_MANUALLY] == 'undefined') {

		if (document.readyState == 'loading' || this.hasAttribute('he-rendered')) {

			// Allow emitting the rendered event
			allow_render_event = true;

			// It's not created manually, it comes from the server
			this[Hawkejs.CREATED_MANUALLY] = false;
		} else {
			// It's probably made manually, since elements made
			// during a render have this set to false
			this[Hawkejs.CREATED_MANUALLY] = true;
		}
	}

	if (has_introduced || has_template) {

		let construction_delayed = 0;

		// Delay by a little bit so all the other custom elements
		// can get registered in time
		Element.sceneReady(function whenReady() {

			var data = getPrivate(that);

			// The introduced function should only be called once!
			if (data.has_been_introduced) {
				return;
			}

			// Wait until the element has been fully constructed
			if (!that[Hawkejs.CONSTRUCTED]) {
				construction_delayed++;

				if (construction_delayed < 10) {
					Blast.setImmediate(whenReady);
					return;
				}
			}

			if (allow_render_event) {
				that.emit('rendered', {bubbles: false});
			}

			let event_handlers = that[Hawkejs.EVENT_HANDLERS];

			if (event_handlers) {
				Element.ensureEventHandlers(that, event_handlers, true);
			}

			if (has_template && that[Hawkejs.CREATED_MANUALLY] && that[Hawkejs.RENDER_CONTENT] && !that.has_rendered) {

				let rendering = that[Hawkejs.RENDER_CONTENT]();

				if (!that.hasAttribute('he-rendered')) {
					that.updateRenderedTime();
				}

				data.has_been_introduced = true;

				if (has_introduced && rendering && rendering.then) {
					Classes.Pledge.Swift.done(rendering, function done() {
						that.introduced();
					});
				}

				return;
			}

			data.has_been_introduced = true;

			if (has_introduced) {
				that.introduced();
			}
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
 * @version  2.2.18
 *
 * @param    {String}   name                     The name of the attribute
 * @param    {String}   previous_string_value    The previous string value
 * @param    {String}   new_string_value         The new value
 * @param    {Boolean}  created                  If this attribute was set on creation
 */
Element.setMethod(function attributeChangedCallback(name, previous_string_value, new_string_value, created) {

	let config;

	// If the attribute is configured, add it as a property too
	if (this.constructor._attributes && this.constructor._attributes[name]) {
		config = this.constructor._attributes[name];
	} else if (!this.constructor[observed_attributes] || !this.constructor[observed_attributes].callbacks[name]) {
		return;
	}

	if (Blast.isBrowser && !hawkejs?.scene?.general_renderer) {

		if (!Blast.hasBeenSeen('hawkejs_init')) {
			// The callback can be called before the hawkejs scene is created
			Blast.afterOnce('hawkejs_init', () => {
				this.attributeChangedCallback(name, previous_string_value, new_string_value, created);
			});
		}

		return;
	}

	let prop_val,
	    changed;

	// Get the private instance variable
	let map = getPrivate(this);

	// Get the previous stored value
	let previous_prop_value = map.prop_values?.[name];

	// Store the new attribute value
	map.values[name] = new_string_value;

	// Normalize the attribute string
	if (config) {
		if (config.is_boolean) {
			if (new_string_value === 'false' || new_string_value === false) {
				new_string_value = false;
			} else if (new_string_value === 'null' || new_string_value == null) {
				new_string_value = null;
			} else {
				new_string_value = true;
			}
		} else if (config.is_number) {
			new_string_value = Number(new_string_value);
		}
	}

	// If there is a setter, call it now
	if (config == null || config.setter) {
		if (map.new_values[name] !== new_string_value) {
			changed = true;

			// Is there an explicit setter?
			if (config && config.setter) {
				prop_val = config.setter.call(this, new_string_value);
			}
		}

		map.new_values[name] = undefined;
	} else if (previous_string_value != new_string_value) {
		changed = true;
	}

	if (this.constructor[observed_attributes] && this.constructor[observed_attributes].callbacks[name]) {
		if (changed) {
			let i;

			for (i = 0; i < this.constructor[observed_attributes].callbacks[name].length; i++) {
				this.constructor[observed_attributes].callbacks[name][i].call(this, new_string_value);
			}
		}

		// If there is no setter, remember this new value
		if (!config) {
			map.new_values[name] = new_string_value;
		}
	}

	if (config) {

		// We need a prop val, and it should not be undefined
		// If there was no setter, or if there was a setter but it
		// returned nothing, we use the input val
		if (typeof prop_val === 'undefined') {
			prop_val = new_string_value;
		}

		if (config.is_token_list) {
			if (!previous_prop_value || typeof previous_prop_value != 'object') {
				previous_prop_value = new Hawkejs.LinkedTokenList(this, name);
			}

			if (changed) {
				if (new_string_value == null) {
					new_string_value = '';
				}

				previous_prop_value.value = new_string_value;
			}

			prop_val = previous_prop_value;
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
 * @version  2.2.12
 */
Element.setMethod(function createElement(name) {

	if (this.hawkejs_view) {
		if (!Blast.isBrowser || !this.hawkejs_view.has_finished) {
			return this.hawkejs_view.createElement(name);
		}
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

/**
 * Execute the given callback after this has been rendered
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.0.4
 * @version  2.2.3
 *
 * @param    {Function}   callback
 */
Element.setMethod(function afterRender(callback) {

	callback = callback.bind(this);

	this.addEventListener('rendered', callback);

	if (this.has_rendered) {
		Blast.setImmediate(callback);
	}
});

/**
 * Extract slot data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.3.17
 *
 * @param    {boolean}   clear_content
 * @param    {boolean}   re_render
 *
 * @return   {Object}
 */
function _extractSlotData(clear_content, re_render) {

	let slot_name,
	    has_slots = false,
	    child,
	    slots,
	    i;
	
	if (clear_content == null) {
		clear_content = true;
	}

	for (i = 0; i < this.children.length; i++) {
		child = this.children[i];

		if (!child.getAttribute) {
			continue;
		}

		slot_name = child.getAttribute('slot');

		if (!slot_name && re_render) {
			slot_name = child.getAttribute('data-he-slot');
		}

		if (!slot_name) {
			continue;
		}

		has_slots = true;

		if (!slots) {
			slots = {};
		}

		slots[slot_name] = child;
	}

	// If this element is being re-rendered, the slots have already been used.
	// We need to extract them from the children
	if (re_render) {
		let slot_elements = this.querySelectorAll('[data-he-slot]');

		for (i = 0; i < slot_elements.length; i++) {
			child = slot_elements[i];
			slot_name = child.getAttribute('data-he-slot');

			if (!slots) {
				slots = {};
			}

			if (slots[slot_name]) {
				continue;
			}

			slots[slot_name] = child;
			has_slots = true;
		}
	}

	let child_nodes;

	if (!re_render) {
		// Get the original child nodes
		child_nodes = Bound.Array.cast(this.childNodes).slice(0);
	}

	if (clear_content) {
		// Now remove them from the actual element
		Hawkejs.removeChildren(this);
	} else {
		for (let key in slots) {
			slots[key].remove();
		}
	}

	if (!has_slots) {
		slots = false;
	}

	return {
		slots       : slots,
		child_nodes : child_nodes,
	};
};

/**
 * Insert the given slot data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {Object}   slot_data
 */
function _insertSlotData(slot_data) {

	if (!slot_data || !slot_data.slots) {
		return;
	}

	let slots = Hawkejs.getElementsByAttribute(this, 'data-he-slot'),
	    slot,
	    name,
	    i;

	for (i = 0; i < slots.length; i++) {
		slot = slots[i];
		name = slot.dataset.heSlot;

		if (slot_data.slots[name]) {
			Hawkejs.replaceChildren(slot, slot_data.slots[name].childNodes);
		}
	}
};

/**
 * Indicate the render has finished
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.3.15
 */
function _finishRender(err) {

	let render_time,
	    promise;

	if (Blast.isBrowser) {
		render_time = ~~Blast.performanceNow();
	} else {
		render_time = 1;
	}

	this.setAttribute('he-rendered', render_time);

	if (typeof this.rendered == 'function') {
		promise = this.rendered();
	}

	if (promise && Blast.Classes.Pledge.hasPromiseInterface(promise)) {

		Hawkejs.getRenderTasks(this).addPreTask(promise);

		Hawkejs.doNextSync(promise, () => {
			_resolveRender.call(this, err);
		});

	} else {
		_resolveRender.call(this, err);
	}
}

/**
 * Resolve the render things & emit events
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.4.0
 */
function _resolveRender(err) {

	if (err) {
		const renderer = this.hawkejs_renderer;
		let message = renderer.hawkejs.handleError(renderer, this.start_template?.name || 'unknown', this.start_line_nr, err);
		let pre = this.createElement('pre');
		pre.textContent = message;
		this.append(pre);
	}

	if (Blast.isBrowser) {
		this.emit('rendered', {bubbles: false});
	}
}

/**
 * Render the given template for this element immediately
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.4.0
 *
 * @param    {Function}   fnc
 */
Element.setMethod(function applyCompiledTemplate(fnc) {

	if (typeof fnc != 'function') {
		throw new Error('Element#applyCompiledTemplate() expects a function argument');
	}

	// Extract slot data
	let slot_data = _extractSlotData.call(this);

	let renderer = this.ensureHawkejsRenderer();

	let render_vars;

	if (this[Hawkejs.VARIABLES]) {
		render_vars = this[Hawkejs.VARIABLES].overlay();
	} else {
		render_vars = renderer.prepareVariables();
	}

	render_vars.setEphemeralGetter('self', () => {

		// Ensure the element options are ready
		this.ensureConstructed();

		return this;
	});

	render_vars.setEphemeralGetter('$ancestor_element', () => {

		// Ensure the element options are ready
		this.ensureConstructed();

		return this;
	});

	let elements = renderer.evaluate(fnc, render_vars),
	    i;

	for (i = 0; i < elements.length; i++) {
		this.append(elements[i]);
	}

	_insertSlotData.call(this, slot_data);

	_finishRender.call(this);
});

/**
 * Make sure this element is ready for use.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.9
 * @version  2.2.9
 */
Element.setMethod(function ensureConstructed() {
	this.ensureHawkejsRenderer().ensureElementOptions(this);
});

/**
 * Synchronously render this element's contents
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.2.15
 */
Element.setMethod(function _renderTemplateSynchronously() {

	this[Hawkejs.DELAY_SYNC_RENDER] = null;

	if (Blast.isNode || !this.constructor.compiled_template.plain_html) {
		this.applyCompiledTemplate(this.constructor.compiled_template);
	} else {

		// Get all the slot data first!
		let slot_data = _extractSlotData.call(this);

		// We can safely assign the plain HTML on the client-side
		// and let the browser generate the elements
		this.innerHTML = this.constructor.compiled_template.plain_html;

		// We still need to assign the renderer though
		if (this.hawkejs_renderer) {
			setRendererOnElements(this.hawkejs_renderer, this.children);
		}

		_insertSlotData.call(this, slot_data);
	}

	this.updateRenderedTime();
});

/**
 * Set the renderer on the child elements
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.1.0
 */
function setRendererOnElements(renderer, elements) {

	let element,
	    i;

	for (i = 0; i < elements.length; i++) {
		element = elements[i];

		if (element && element instanceof Hawkejs.Element) {
			element.hawkejs_renderer = renderer;
		}

		setRendererOnElements(renderer, element.children);
	}
}

/**
 * Delay the assemble of this element until the function or promise is run
 * If it's a function, the function will be called immediately
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.1.0
 * @version  2.1.3
 *
 * @param    {Function|Promise}   task
 */
Element.setMethod(function delayAssemble(task) {

	if (typeof task == 'function') {
		task = task.call(this);
	}

	Hawkejs.getRenderTasks(this).addPreTask(task);
});

/**
 * Wait for all the tasks attached to this element to be completed
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.2.6
 * @version  2.2.10
 */
Element.setMethod(function waitForTasks() {

	let tasks = [];
	Hawkejs.recurseLineTasks([this], tasks, tasks, this.hawkejs_renderer);
	let pledge = Hawkejs.parallel(tasks);

	return pledge;
});

/**
 * Re-render this element if possible.
 * This is also used to re-render non-custom elements.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.4.0
 */
Element.setMethod(function rerender() {

	const IS_CUSTOM_ELEMENT = this.is_custom_hawkejs_element;

	if (IS_CUSTOM_ELEMENT && !this.inner_template) {
		return;
	}

	// Let's assume a rerender always happens after the element has been
	// rendered once before.
	// It sometimes doesn't have this symbol set,
	// because that could have been done on the server.
	this[Hawkejs.APPLIED_OPTIONS] = true;

	// Indicate a rerender is currently happening
	this.setAttribute('data-he-rerendering', '');

	// Remove the rendered time
	this.removeAttribute('he-rendered');

	// If there already is a render in progress, resolve it now.
	// (We can't cancel it, because other areas of the code might be waiting for it)
	// We have to do this now so any rerendering attributes will be undone
	if (this[CURRENT_RENDER]) {
		this[CURRENT_RENDER].resolve(false);
		this[CURRENT_RENDER] = null;
	}

	// Get the current dimensions
	let client_rects = Blast.isBrowser ? this.getClientRects()?.[0] : null,
	    new_width,
	    new_height,
	    previous_width,
	    previous_height;

	if (client_rects?.width) {
		previous_width = this.style.width;
		previous_height = this.style.height;

		this.style.width = new_width = ~~(client_rects.width) + 'px';
		this.style.height = new_height = ~~(client_rects.height) + 'px';
	}

	let pledge;

	if (IS_CUSTOM_ELEMENT) {
		pledge = renderCustomTemplate.call(this, true);

		if (pledge) {
			this.delayAssemble(pledge);
		}
	} else {
		let instructions = this[Hawkejs.RENDER_INSTRUCTION];

		if (instructions) {
			try {
				this[CURRENT_RENDER] = null;
				renderContentsWithTemplate(this, instructions, null, null, pledge);
			} catch (err) {
				pledge = Classes.Pledge.reject(err);
			}
		}
	}

	Classes.Pledge.Swift.done(pledge, err => {

		// Remove the rerendering attribute
		this.removeAttribute('data-he-rerendering');

		if (client_rects?.width) {

			// Reset the original width & height,
			// but only if they haven't been changed in the meantime
			if (this.style.width == new_width) {
				this.style.width = previous_width;
			}

			if (this.style.height == new_height) {
				this.style.height = previous_height;
			}

			if (this.getAttribute('style') == '') {
				this.removeAttribute('style');
			}
		}
	});

	return pledge;
});

/**
 * The following code is only for the browser
 */
if (Blast.isNode) {
	return;
}

// Make sure contents have been rendered before calling these properties/methods
Element.renderBeforeGet('children');
Element.renderBeforeGet('querySelector');
Element.renderBeforeGet('querySelectorAll');