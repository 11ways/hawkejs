module.exports = function(Hawkejs) {

	var async = require('async'),
	    path  = require('path'),
	    fs    = require('fs');

	/**
	 * Get template source file by requesting it from the server
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}     templateName
	 * @param    {Function}   callback
	 */
	Hawkejs.prototype.getSourceInternal = function getSourceInternal(templateName, callback) {

		$.post('/hawkejs/template', {name: templateName}, function sourceReply(data) {
			callback(null, data);
		});
	};
};