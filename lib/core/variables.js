const PARENT = Symbol('parent'),
      RENDERER = Symbol('renderer');

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

	if (variables != null) {
		Object.assign(this, variables);
	}
});

/**
 * Make sure the result is a valid Variables instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Mixed}      value
 * @param    {Renderer}   renderer
 *
 * @return   {Hawkejs.Variables}
 */
Variables.setStatic(function cast(value, renderer) {

	if (!value || typeof value != 'object') {
		return new Variables(renderer);
	}

	if (value instanceof Variables) {
		return value;
	}

	return new Variables(renderer, value);
});

/**
 * Get this instance's own key-values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Variables.setMethod(function getOwnDict() {
	return Object.assign({}, this);
});

/**
 * Create a new shim
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Variables.setMethod(function createShim() {

	var result = Object.create(this);

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
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Variables.setMethod(function toJSON() {

	var result;

	if (this[PARENT]) {
		result = this[PARENT].toJSON();
	} else {
		result = {};
	}

	Object.assign(result, this);

	return result;
});

/**
 * Overlay the given new_variables over these ones
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
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
	result[PARENT] = this;

	return result;
});