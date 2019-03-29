var bench = require('./init.js'),
    suite = new bench.Suite();

var source = `
	<div>
		This is a test!
		<%= "print this" %>
		<%= a + "1" %>
	</div>`;

suite.add('Hawkejs#compile(source)', {
	fn: function() {
		bench.hawkejs.compile(source);
	},
	onComplete: function(event) {
		console.log(String(event.target));
	}
});

suite.run();