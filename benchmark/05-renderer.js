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

const RENDERER = hawkejs.createRenderer();
__Protoblast.Bound.JSON.toDryObject(RENDERER);

const VARIABLE_TEST_TEMPLATE = hawkejs.compile('variable_test', `
NUMBER: {{ a_number }}
STRING: {{ b_string }}
BOOL: {{ c_boolean }}
ARR: {{ d_array.join('-') }}
MAP: {{ e_object.map.get('a') }}
DATE: {{ f_date }}
`);

const RAW_VARIABLES = {
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
	},
	f_date     : new Date('2024-04-27 14:33:01'),
	g_string   : '<p><br><a>',
	h_array    : [],
};

const createRawVariables = () => {
	return {...RAW_VARIABLES};
};

const PREPARED_VARIABLES = RENDERER.prepareVariables(createRawVariables());
const LAYERED_VARIABLES = PREPARED_VARIABLES.overlay({e_object: {a: 10}});

//RENDERER.renderHTML(VARIABLE_TEST_TEMPLATE, createRawVariables()).done((err, result) => console.log(err, result))
//console.log();

suite('Renderer', function() {

	bench('new', function() {
		hawkejs.createRenderer();
	});

	bench('prepareVariables()', () => {
		let raw_variables = createRawVariables();
		let prepared = RENDERER.prepareVariables(raw_variables);
	});

	bench('renderHTML() (Nested element test)', function() {
		let renderer = hawkejs.createRenderer();
		return renderer.renderHTML('nested_test');
	});

	bench('renderHTML() (Variable test)', function() {
		let renderer = hawkejs.createRenderer();
		return renderer.renderHTML(VARIABLE_TEST_TEMPLATE, createRawVariables());
	});

	bench('renderHTML() (Full example)', function() {
		let renderer = hawkejs.createRenderer();
		return renderer.renderHTML('bench', createRawVariables());
	});

	bench('toDry()', function() {
		let renderer = hawkejs.createRenderer();
		let variables = main.createTestVariables();
		renderer.variables = variables;
		__Protoblast.Bound.JSON.toDryObject(renderer)
	});
});

suite('Variables', () => {

	bench('get(key)', () => {
		let nr = PREPARED_VARIABLES.get('a_number');
		nr += PREPARED_VARIABLES.get('e_object').a;
		
		if (nr !== 15) {
			throw new Error('Invalid result: ' + nr);
		}

		let overlayed_nr = LAYERED_VARIABLES.get('a_number');
		overlayed_nr += LAYERED_VARIABLES.get('e_object').a;

		if (overlayed_nr !== 24) {
			throw new Error('Invalid result: ' + overlayed_nr);
		}
	});

});
