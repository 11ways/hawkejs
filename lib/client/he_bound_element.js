module.exports = function hawkejsRegisterElement(Hawkejs, Blast) {

	/**
	 * The he-bound element can communicate with the server
	 * and update itself if needed
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.registerElement('he-bound', {
		created: function created() {
			console.log('Created bound element', this);
		}
	});
};