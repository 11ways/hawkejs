module.exports = function(Hawkejs) {

	/**
	 * Sort function
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var sorter = function sorter(a, b) {
		if (a.weight < b.weight) {
			return 1;
		} else if (a.weight > b.weight) {
			return -1;
		} else {
			// Smaller ids get preference here
			if (a.id < b.id) {
				return -1;
			} else if (a.id > b.id) {
				return 1;
			} else {
				return 0;
			}
		}
	};

	/**
	 * The Hashmap class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Hashmap = Hawkejs.create(function Hashmap() {

		this.init = function init() {
			this.insertCount = 0;
			this.dict = {};
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
			src += 'var a = new Hawkejs.Hashmap();';
			src += 'a.insertCount=' + JSON.stringify(this.insertCount) + ';';
			src += 'a.dict=' + JSON.stringify(this.dict) + ';';
			src += 'return a;'
			src += '}())';

			return src;
		};

		/**
		 * Get the value of the wanted key
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.get = function get(key) {

			if (this.dict[key]) {
				return this.dict[key].value;
			}
		};

		/**
		 * Add a key-value pair with an optional order
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 */
		this.push = function push(key, value, weight) {

			var item = this.dict[key];

			if (!item) {
				item = {
					id: ++this.insertCount
				};
			}

			if (typeof weight !== 'number') {
				weight = 100;
			}

			item.key = key;
			item.value = value;
			item.weight = weight;

			this.dict[key] = item;

			return item.id;
		};

		/**
		 * Iterate over the items in the dictionary
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    1.0.0
		 * @version  1.0.0
		 *
		 * @param    {Function}   fnc
		 */
		this.forEach = function forEach(fnc) {

			var values = Hawkejs.Utils.Object.values(this.dict);

			// Sort by weight and id
			values.sort(sorter);

			values.forEach(function(item, index) {
				fnc(item.value, item.key, index, item);
			});
		};

	});

	Hawkejs.Hashmap = Hashmap;
};