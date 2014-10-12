module.exports = function(Hawkejs, Blast) {

	/**
	 * The Helper Class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {ViewRender}   view
	 */
	var Helper = Blast.Classes.Informer.extend(function Helper(view) {

		// Set the view render instance
		this.view = view;
	});

	/**
	 * Override the original extend static method
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Function}   newConstructor
	 *
	 * @return   {Function}
	 */
	Helper.setStatic(function extend(newConstructor) {

		var name = Blast.Bound.String.beforeLast(newConstructor.name, 'Helper');

		Hawkejs.helpers[name] = newConstructor;

		return Blast.Collection.Function.inherits(newConstructor, this);
	});

	/**
	 * Print out something to the view
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Helper.setMethod(function print(data) {
		this.view.print(data);
	});

	Hawkejs.Helper = Helper;
};