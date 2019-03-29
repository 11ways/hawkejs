/**
 * Server-side Attribute class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Attribute = Fn.inherits(null, 'Hawkejs', function Attribute(name, value) {
	if (name) {
		this.name = name;

		if (typeof value == 'undefined') {
			this.value = '';
		} else {
			this.value = String(value);
		}
	}
});
