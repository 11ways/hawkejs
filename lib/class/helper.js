module.exports = function(Hawkejs) {

	var Helper = Hawkejs.create(function Helper() {

		/**
		 * Instantiate a newly created Chimera after this class has been extended
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Function}   parent   The parent class
		 * @param    {Function}   child    The (extended) child class
		 */
		this.__extended__ = function __extended__(parent, child) {
			Hawkejs.registerHelper(child.prototype.name, child);
		};

		/**
		 * Set the render object upon init
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {ViewRender}   view
		 */
		this.init = function init(view) {
			this.view = view;
		};

	});

	Hawkejs.Helper = Helper;
};