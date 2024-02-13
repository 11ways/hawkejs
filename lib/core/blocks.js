/**
 * Blocks are array-like objects
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.0.3
 */
const Blocks = Fn.inherits('Hawkejs.Base', function Blocks() {
	this.values = new Map();
});

/**
 * Revive the object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.0.3
 */
Blocks.setStatic(function unDry(value) {

	let result = new Blocks();

	result.values = new Map(value.entries);

	return result;
});

/**
 * Iterator method (return the map)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.0.3
 */
Blocks.setMethod(Symbol.iterator, function* iterate() {

	let entry;

	for (entry of this.values) {
		yield entry[1];
	}
});

/**
 * Get a certain block
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.0.3
 *
 * @param    {String}   name
 */
Blocks.setMethod(function get(block_name) {

	if (typeof block_name != 'string') {
		block_name = String(block_name);
	}

	return this.values.get(block_name);
});

/**
 * See if the given block exists
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.0.3
 *
 * @param    {String}   name
 *
 * @return   {Boolean}
 */
Blocks.setMethod(function has(block_name) {
	return !!this.get(block_name);
});

/**
 * Set a certain block
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.0.3
 *
 * @param    {String}   name
 */
Blocks.setMethod(function set(block_name, block) {

	if (typeof block_name != 'string') {
		block_name = String(block_name);
	}

	// Make sure the block gets stored under the correct name
	// if it was originally an empty string
	if (!block_name && block.name && !this.has(block.name)) {
		this.set(block.name, block);
	}

	this.values.set(block_name, block);
});

/**
 * Get all blocks in an array
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.0.3
 */
Blocks.setMethod(function getAll() {
	return Array.from(this.values.values());
});

/**
 * Dry this object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.3
 * @version  2.0.3
 */
Blocks.setMethod(function toDry() {

	let result = {
		value : {
			entries: Array.from(this.values.entries())
		}
	};

	return result;
});

/**
 * Prepare this for cloning
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.16
 * @version  2.3.16
 *
 * @param    {Renderer}   renderer
 */
Blocks.setMethod(function _prepareClone(renderer, wm, custom_method) {

	let blocks = new Blocks();

	for (let [key, entry] of this.values) {
		entry = Bound.JSON.clone(entry, custom_method || 'toHawkejs', null, wm);
		blocks.values.set(key, entry);
	}

	return blocks;
});

/**
 * Copy over blocks if this isntance doesn't have them
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.9
 * @version  2.2.9
 */
Blocks.setMethod(function adopt(blocks, renderer) {

	if (!blocks || !blocks.values) {
		return;
	}

	for (let [key, value] of blocks.values) {
		if (this.has(key)) {
			continue;
		}

		value.renderer = renderer;

		this.set(key, value);
	}

});