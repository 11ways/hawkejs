var options,
    Hawkejs,
    Blast = __Protoblast;

// Get the Hawkejs namespace
Hawkejs = Blast.Bound.Function.getNamespace('Hawkejs');

Hawkejs.helpers = {};

if (Blast.isBrowser) {
	Blast.Globals.Blast = Blast;
}

// Set the argument info
Blast.arguments.hawkejs = {
	names  : ['Hawkejs', 'Blast', 'Bound',      'Classes',      'Fn'],
	values : [ Hawkejs,   Blast,   Blast.Bound,  Blast.Classes,  Blast.Collection.Function]
};

// Construct the requirement options
options = {
	// Don't let protoblast require it on load on the client-side,
	// this bootstrap file will do that
	is_extra   : false,

	// Extra name to make requirement unique on the client side
	extra_name : 'hawkejs',

	// The arguments to add to the wrapper function
	arguments  : 'hawkejs'
};

if (Blast.isNode) {
	// The starting directory, where to look for ths files
	options.pwd = __dirname;
}

Blast.requireAll([
	['core',   'base'],
	['core',   'scopes'],
	['core',   'hawkejs'],
	['core',   'templates'],
	['core',   'template'],
	['core',   'variables'],
	['core',   'renderer'],
	['core',   'blocks'],
	['core',   'block_buffer'],
	['core',   'helper_collection'],
	['core',   'helper'],
	['parser', 'base_parser'],
	['parser', 'token_parser'],
	['parser', 'directives_parser'],
	['parser', 'expressions_parser'],
	['parser', 'marked'],
	['parser', 'markdown_parser'],
	['parser', 'builder'],
	['parser', 'subroutine']
], options);

if (Blast.isNode) {
	// Don't load the rest on the client
	options.client = false;

	Blast.requireAll([
		['server', 'hawkejs_server'],
		['server', 'template'],
		['dom',    'node'],
		['dom',    'attribute'],
		['dom',    'style'],
		['dom',    'class_list'],
		['dom',    'html_element'],
		['dom',    'dom_string_map'],
		['dom',    'named_node_map']
	], options);

	// And do load the next on the client again
	options.client = true;
}

// The next are only required on the client side
options.server = false;

Blast.requireAll([
	['client', 'is_visible']
], options);

Blast.require(['client', 'register_element'], Object.assign({}, options, {
	server   : false,
	versions : {
		chrome  :  {max: 35},
		opera   :  {max: 25},
		firefox :  {max: 63},
		safari  :  {max: 10.1}
	}
}));

Blast.require(['client', 'formdata'], Object.assign({}, options, {
	server   : false,
	versions : {
		chrome  :  {max: 50},
		opera   :  {max: 25},
		firefox :  {max: 39},
		safari  :  {max: 11},
		edge    :  {max: 18}
	}
}));

Blast.require(['client', 'html_shims'], Object.assign({}, options, {
	server   : false,
	versions : {
		chrome  :  {max: 54},
		opera   :  {max: 39},
		firefox :  {max: 49},
		safari  :  {max: 10},
		edge    :  {max: 17}
	}
}));

// The next are required everywhere
options.server = true;

Blast.requireAll([
	['element',    'custom_element'],
	['element',    'html_element_extensions'],
	['element',    'he_placeholder'],
	['element',    'he_bottom'],
	['element',    'he_block'],
	['element',    'he_dialog'],
	['element',    'he_context_menu'],
	['expression', 'expression'],
	['expression', 'block'],
	['expression', 'break'],
	['expression', 'each'],
	['expression', 'extend'],
	['expression', 'if'],
	['expression', 'include'],
	['expression', 'macro'],
	['expression', 'markdown'],
	['expression', 'print'],
	['expression', 'subkeyword'],
	['expression', 'trim'],
	['expression', 'with'],
	['expression', 'switch'],
	['expression', 'set'],
	['expression', 'run'],
], options);

// The next are not allowed on the server
options.server = false;

Blast.requireAll([
	['client', 'hawkejs_client'],
	['client', 'scene'],
	['client', 'dom_spotting'],
	['client', 'template']
], options);