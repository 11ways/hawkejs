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
	var Helper = Blast.Classes.Informer.extend(function Helper() {

		// Call the Informer constructor
		Helper.super.call();

		// Set the view render instance
		this.view = view;
	});

	Hawkejs.Helper = Helper;
};