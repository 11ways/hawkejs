var main = require('./init.js');

var source = `
	<div>
		This is a test!
		<%= "print this" %>
		<%= a + "1" %>
	</div>`;

suite('Hawkejs', function() {
	bench('#compile(source)', function() {
		hawkejs.compile(source);
	});
});