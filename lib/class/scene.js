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
		this.Hawkeye = parent;

		// The loaded scripts
		this.scripts = {};
		this.styles = {};

	};

	Scene.prototype.addScript = function addScript(path) {

	};

	Hawkejs.Scene = Scene;
};