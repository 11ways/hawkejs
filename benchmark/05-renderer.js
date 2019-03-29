var bench = require('./init.js'),
    suite = new bench.Suite();

var hawkejs = bench.hawkejs;
var source = `
<ul>
<% for (i = 0; i < teacher.Links.length; i++) { %>
	<% link = teacher.Links[i] %>
	<li><%= link.title %></li>
<% } %>
</ul>
`;

var compiled = hawkejs.compile('test', source);
function onComplete(event) {
	console.log(String(event.target));
}

var renderer;
var variables;

renderer = hawkejs.createRenderer();
__Protoblast.Bound.JSON.toDryObject(renderer);

suite.add('new Renderer()', {
	fn: function() {
		hawkejs.createRenderer();
	},
	onComplete
});

suite.add('#renderHTML()', {
	setup: function() {
		renderer = hawkejs.createRenderer();
	},
	fn: function(deferred) {
		renderer.renderHTML('nested_test').done(function() {
			deferred.resolve()
		})
	},
	defer: true,
	onComplete
});

global.__zever_setup = function() {
	renderer = hawkejs.createRenderer();
	variables = bench.createTestVariables();
	renderer.variables = variables;
};

suite.add('#toDry()', {
	setup: function() {
		__zever_setup();
	},
	fn: function() {
		__Protoblast.Bound.JSON.toDryObject(renderer);
	},
	onError: function(event) {
		console.log('*** Error in ' + event.target.name + ': ***');
		console.log('\t' + event.target.error);
		console.log('*** Test invalidated. ***');
	},
	onComplete
});

suite.run();