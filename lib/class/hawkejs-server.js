module.exports = function(Hawkejs) {

	var path = require('path'),
	    fs   = require('fs');

	Hawkejs.prototype.getSource = function getSource(templateName, callback) {

		// If no base template directory has been set, return an error
		if (!this.templateDir) {
			return callback(new Error('No template directory has been set'));
		}

		// Read the actual file
		fs.readFile(path.resolve(this.templateDir, templateName + '.ejs'), {encoding: 'utf8'}, function(err, source) {

			if (err) {
				return callback(err);
			}

			callback(null, source);
		});
	};

};