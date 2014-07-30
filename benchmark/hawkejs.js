var Hawkejs = require('../index.js');

suite('Hawkejs', function () {

	var hawkejs = new Hawkejs(),
	    sources;

	sources = {
		string: {
			compiled: hawkejs.compile('Hello world!'),
			context: {},
		},
		replace_print: {
			compiled: hawkejs.compile('Hello <% print(name) %>! You have <% print(count) %> new messages.'),
			context: {name: 'Mick', count: 30}
		},
		replace: {
			compiled: hawkejs.compile('Hello <%= name %>! You have <%= count %> new messages.'),
			context: {name: 'Mick', count: 30}
		},
		array: {
			compiled: hawkejs.compile('<% for (i = 0; i < names.length; i++) { print(names[i]) }'),
			context: { names: ["Moe", "Larry", "Curly", "Shemp"]}
		},
		complex: {
			compiled: hawkejs.compile(
				"<h1><%= header %></h1>\n"                        +
				"<% if (items && items.length) { %>\n"            +
				"  <ul>\n"                                        +
				"    <% for (i = 0; i < items.length; i++) { %>\n"+
				"      <% if (items[i].current) { %>\n"           +
				"        <li><strong><%= items[i].name %></strong></li>\n"      +
				"      <% } else { %>\n"                                 +
				"        <li><a href=\"<%= items[i].url %>\"><%= items[i].name %></a></li>\n" +
				"      <% } %>\n"                              +
				"    <% } %>\n"                                  +
				"  </ul>\n"                                       +
				"<% } else { %>\n"                                       +
				"  <p>The list is empty.</p>\n"                   +
				"<% } %>"),
			context: {
				header: 'Colors',
				items: [
					{name: "red", current: true, url: "#Red"},
					{name: "green", current: false, url: "#Green"},
					{name: "blue", current: false, url: "#Blue"}
				]
			}
		}
	};

	bench('Simple string output', function(next) {
		hawkejs.render(sources.string.compiled, sources.string.context, function(err, html) {
			next();
		});
	});

	bench('Simple print', function(next) {
		hawkejs.render(sources.replace_print.compiled, sources.replace_print.context, function(err, html) {
			next();
		});
	});

	bench('Simple print using shorttags', function(next) {
		hawkejs.render(sources.replace.compiled, sources.replace.context, function(err, html) {
			next();
		});
	});

	bench('Array iteration print', function(next) {
		hawkejs.render(sources.array.compiled, sources.array.context, function(err, html) {
			next();
		});
	});

	bench('Complex', function(next) {
		hawkejs.render(sources.complex.compiled, sources.complex.context, function(err, html) {
			next();
		});
	});



	// // add tea, pour, ...  

	// bench('sip tea', function() {
	// 	tea.sip('mmmm');
	// });
});