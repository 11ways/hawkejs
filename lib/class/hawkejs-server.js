module.exports = function(Hawkejs) {

	var path = require('path'),
	    fs   = require('fs');

	Hawkejs.prototype.getSource = function getSource(templateName, callback) {

		// If no base template directory has been set, return an error
		if (!this.templateDir && templateName[0] !== '/') {
			return callback(new Error('No template directory has been set'));
		}

		// Make sure the template path ends with .ejs
		templateName = this.Utils.String.postfix(templateName, '.ejs');

		// Read the actual file
		fs.readFile(path.resolve(this.templateDir, templateName), {encoding: 'utf8'}, function(err, source) {

			if (err) {
				return callback(err);
			}

			callback(null, source);
		});
	};

	/**
	 * Export the express render function through this simple closure
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.prototype.createExpressRenderer = function createExpressRenderer() {
		return this.express.bind(this);
	};

	/**
	 * 
	 *
	 * "options" this object from Express will always contain these elements
	 *
	 * - cache          {boolean}
	 * - settings       {object}
	 * -- env                 {string}
	 * -- json spaces         {integer}
	 * -- jsonp callback name {string}
	 * -- view engine         {string}
	 * -- views               {string}  The path to the views
	 * -- x-powered-by        {boolean} If true, express will send this header
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}    path
	 * @param    {Object}    options
	 * @param    {Function}  callback
	 */
	Hawkejs.prototype.express = function express(path, options, callback) {

		return this.render(path, options, function(err, html) {
			console.log('Error: ' + err)
			console.log(html)

			callback(err, html)
		});
	};

};