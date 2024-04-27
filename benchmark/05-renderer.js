var main = require('./init.js');

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

suite('Renderer()', function() {
	bench('new', function() {
		hawkejs.createRenderer();
	});

	bench('renderHTML()', function() {
		renderer = hawkejs.createRenderer();
		return renderer.renderHTML('nested_test');
	});

	bench('toDry()', function() {
		renderer = hawkejs.createRenderer();
		variables = main.createTestVariables();
		renderer.variables = variables;
		__Protoblast.Bound.JSON.toDryObject(renderer)
	});

	bench('prepareVariables()', () => {

		let raw_variables = {
			a_number  : 14,
			b_string  : 'A string',
			c_boolean : true,
			d_array   : [1, 2, 3],
			e_object  : {
				a: 1,
				b: 2,
				c: 3,
				rx: /regex/,
				map: new Map([['a', 1], ['b', 2]]),
			}
		};

		let prepared = renderer.prepareVariables(raw_variables);
	});
});

