module.exports = function(Hawkejs) {

	/**
	 * The Scene class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Scene = Hawkejs.create(function Scene() {

		this.init = function init(parent) {
			// The parent Hawkeye instance
			this.hawkejs = parent;

			// The loaded scripts
			this.scripts = new Hawkejs.Hashmap();
			this.styles = {};
		};

		/**
		 * Get the source code representation of this object
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.toSource = function toSource() {

			var src = '(function(){';
			src += 'var a = new Hawkejs.Scene();';
			src += 'a.scripts = ' + this.scripts.toSource() + ';';
			src += 'return a;';
			src += '}())';

			return src;
		};

		/**
		 * Load a script in the current scene
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.addScript = function addScript(path, options) {

			if (!options || typeof options !== 'object') {
				options = {};
			}

			if (!options.id) {
				options.id = path;
			}

			if (!options.path) {
				options.path = path;
			}

			this.scripts.push(options.id, options, options.weight);
		};
	});

	Hawkejs.Scene = Scene;
};