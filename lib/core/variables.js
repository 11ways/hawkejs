const PARENT = Symbol('parent'),
      RENDERER = Symbol('renderer'),
      TRAPLESS = Symbol('trapless'),
      PROXY = Symbol('proxy');

/**
 * This way we can skip transforming ejs `my_value = 1`
 * into complicated calls.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
const TRAPS = {
	set(target, name, value) {

		if (typeof name == 'symbol') {
			target[name] = value;
		} else {
			target.setFromTemplate(name, value);
		}

		return true;
	}
};

/**
 * Simple class to use for storing variables
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Variables = Fn.inherits('Hawkejs.Base', function Variables(renderer, variables) {
	this[Hawkejs.PRE_CLONE] = null;
	this[renderer.clone_symbol] = null;
	this[PARENT] = null;
	this[RENDERER] = renderer;
	this[TRAPLESS] = this;

	if (variables != null) {
		Object.assign(this, variables);
	}
});

/**
 * Make sure the result is a valid Variables instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.16
 *
 * @param    {Mixed}      value
 * @param    {Renderer}   renderer
 *
 * @return   {Hawkejs.Variables}
 */
Variables.setStatic(function cast(value, renderer) {

	if (!renderer) {
		throw new Error('Unable to cast to Variables without renderer instance');
	}

	if (!value || typeof value != 'object') {
		return new Variables(renderer);
	}

	if (value instanceof Variables) {
		return value;
	}

	return new Variables(renderer, value);
});

/**
 * Get the amount of variables in this instance.
 * This ignores the parent's variables.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.13
 * @version  2.2.13
 */
Variables.setProperty(function length() {
	return Object.keys(this).length;
});

/**
 * Get the proxy of this instance.
 * This allows us to set variables without having to use the `set` method.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
Variables.setMethod(function getProxy() {

	if (this[PROXY] == null) {
		this[PROXY] = new Proxy(this, TRAPS);
		this[PROXY][TRAPLESS] = this;
	}

	return this[PROXY];
});

/**
 * Get a specific variable
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
Variables.setMethod(function get(key) {
	return this[key];
});

/**
 * Set a specific variable from a template
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
Variables.setMethod(function setFromTemplate(key, value) {
	return this[key] = value;
});

/**
 * Get this instance's own key-values
 * (Skipping symbols)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 */
Variables.setMethod(function getOwnDict() {

	const keys = Object.keys(this);

	let result = {},
	    key;

	for (key of keys) {
		result[key] = this[key];
	}

	return result;
});

/**
 * Does this have a valid clone?
 * A clone would become invalid if the parent is changed.
 * Currently we only check key length to check this.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.13
 * @version  2.3.16
 *
 * @param    {symbol}   clone_name
 */
Variables.setMethod(function getExistingCloneIfValid(clone_name) {

	if (!Object.hasOwn(this, clone_name)) {
		return;
	}

	let result = this[clone_name];

	if (!result) {
		return;
	}

	if (result.length == this.length) {
		return result;
	}
});

/**
 * Create a new shim
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 */
Variables.setMethod(function createShim() {

	let result = Object.create(this[TRAPLESS]);
	result[PROXY] = null;

	return result;
});

/**
 * Clone the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Hawkejs.Variables}
 */
Variables.setMethod(function toHawkejs(wm) {

	var result = new Variables(this[RENDERER]);

	if (!wm) {
		wm = new WeakMap();
	}

	// Other values might reference this document too,
	// make sure it doesn't clone the same document twice
	wm.set(this, result);

	// Get all the values, of this and all its parents
	let dict = this.toJSON();

	// Clone them
	dict = Bound.JSON.clone(dict, 'toHawkejs', wm);

	// Put the cloned values back into the result
	Object.assign(result, dict);

	return result;
});

/**
 * Get a shallow clone: create a new object with the same keys,
 * and the same primitive values.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.3.7
 */
Variables.setMethod(function getShallowClone() {
	let result = new Variables(this[RENDERER], this.toJSON());
	return result;
});

/**
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.7
 */
Variables.setMethod(function toJSON() {

	let result,
	    key;

	if (this[PARENT]) {
		result = this[PARENT].toJSON();
	} else {
		result = {};
	}

	// Copy all the keys without `Object.assign`,
	// because that will also copy symbols
	for (key in this) {
		result[key] = this[key];
	}

	return result;
});

/**
 * Overlay the given new_variables over these ones
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 */
Variables.setMethod(function overlay(new_variables) {

	var result = this.createShim();

	if (new_variables instanceof Variables) {
		new_variables = new_variables.toJSON();
	}

	if (new_variables) {
		Object.assign(result, new_variables);
	}

	// This will set this instance as the new parent of the variables instance
	// (This can overwrite the parent in the cloned instance)
	result[PARENT] = this[TRAPLESS];

	return result;
});