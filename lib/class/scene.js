module.exports = function(Hawkejs) {

	/**
	 * The Scene class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	function Scene(parent) {

		// The parent Hawkeye instance
		this.Hawkejs = parent;

		// The loaded scripts
		this.scripts = new Hawkejs.Hashmap();
		this.styles = {};

	};


	Scene.prototype.addScript = function addScript(path, options) {

		if (!options || typeof options !== 'object') {
			options = {};
		}

		if (!options.id) {
			options.id = path;
		}

		if (!options.path) {
			options.path = path;
		}

		this.scripts.push(options);
	};

	Hawkejs.Scene = Scene;
};