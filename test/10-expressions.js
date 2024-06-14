var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

let Blast;

const Optional = (value) => new Blast.Classes.Develry.ObservableOptional(value);

describe('Expressions', function() {

	before(function() {
		Blast = __Protoblast;
		hawkejs = createHawkejsInstance();
		hawkejs.parallel_task_limit = 1;
		hawkejs.addViewDirectory(__dirname + '/templates');

		Hawkejs.Renderer.setCommand(function __(key, param) {

			if (param) {
				key = __Protoblast.Bound.String.assign(key, param);
			}

			return key;
		});

	});

	describe('Elements', function() {

		let tests = [
			[
				'<ul><li><ol><% for(var i=0; i < 5; i++) { %><li></li><% } %></ol></li></ul>',
				'<ul><li><ol><li></li><li></li><li></li><li></li><li></li></ol></li></ul>'
			],
		];

		createTests(tests);
	});

	describe('If', function() {
		var tests = [
			['{% if true %}TRUE{% /if %}', 'TRUE'],
			['{% if false %}TRUE{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if "a" eq "a" %}TRUE{% else %}ELSE{% /if %}', 'TRUE'],
			['{% if "a" eq "b" %}TRUE{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if "a" eq "b" %}TRUE{% /if %}', ''],
			['{% if empty_arr %}TRUE{% /if %}', ''],
			['{% if empty_arr %}TRUE{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if non.existing.variable.path %}TRUE{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if 1 eq 1 %}eq{% /if %}', 'eq'],
			['{% if 2 gt 1 %}gt{% /if %}', 'gt'],
			['{% if 2 lt 1 %}lt{% /if %}', ''],
			['{% if empty_arr %}WRONG{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if full_arr %}TRUE{% /if %}', 'TRUE'],
			['{% if empty_obj %}WRONG{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if "" %}WRONG{% /if %}',    ''],
			['{% if 0 %}WRONG{% /if %}',     ''],
			['{% if false %}WRONG{% /if %}', ''],
			['{% if "a" %}TRUE{% /if %}',    'TRUE'],
			['{% if 1 %}TRUE{% /if %}',      'TRUE'],
			['{% if none.existing.variable %}WRONG{% /if %}', ''],
			['{% if "" emptyhtml %}TRUE{% /if %}', 'TRUE'],
			['{% if "<p></p>" emptyhtml %}TRUE{% /if %}', 'TRUE'],
			['{% if "<p>a</p>" emptyhtml %}WRONG{% /if %}', ''],
			['{% if success %}SUCCESS{% /if %}', 'SUCCESS'],
			['{% if success %}SUCCESS{% else %}NOPE{% /if %}', 'SUCCESS'],
			['{% if error %}ERR{% /if %}', 'ERR'],
			['{% if my_obj.c eq "a" or my_obj.b eq "a" %}ERR{% elseif my_obj.a eq "a" and my_obj.b eq "b" %}AB{% else %}ERRTOO{% /if %}', 'AB'],
			['{% if opt_str %}{{ opt_str }}{% /if %}', 'truthy'],
			['{% if opt_empty %}OOPS{% /if %}', ''],
			// @TODO: ['{% if 1 emptyhtml %}WRONG{% /if %}', ''],
		];

		createTests(tests);
	});

	describe('Else', function() {
		var tests = [
			['{% if false %}WRONG{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if 0 %}WRONG{% else %}ELSE{% /if %}',     'ELSE'],
			['{% if none.existing.variable %}WRONG{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if falsy %}NOPE{% else %}FALSY{% /if %}', 'FALSY'],
			['{% if true %}{% if true %}TRUE{% /if %}{% else %}ELSE{% /if %}', 'TRUE'],
			['{% if true %}1{% if true %}2{% if true %}3{% /if %}2{% /if %}1{% else %}ELSE{% /if %}', '12321'],
			['{% if true %}1{% if false %}FALSE{% else %}2{% if true %}3{% /if %}2{% /if %}1{% else %}ELSE{% /if %}', '12321'],
		];

		createTests(tests);
	});

	describe('Elseif', function() {

		var tests = [
			[
				'{% if c eq "a" %}A{% elseif c eq "b" %}B{% elseif c eq "1" %}1{% elseif c eq "c" %}C{% else %}ELSE{% /if %}',
				'C'
			],
			[
				'{% if str_bla eq "a" %}A{% elseif str_bla eq "b" %}B{% elseif str_bla eq "1" %}1{% elseif str_bla eq "c" %}C{% else %}ELSE{% /if %}',
				'ELSE'
			],
			[
				'{% if my_obj.b eq "a" %}A{% elseif my_obj.b eq "b" %}B{% elseif my_obj.b eq "1" %}1{% elseif my_obj.b eq "c" %}C{% else %}ELSE{% /if %}',
				'B'
			],
			[
				'{% if empty_obj.a %}A{% elseif empty_obj.b %}B{% else %}{% if true %}TRUE{% else %}ELSE{% /if %}{% /if %}',
				'TRUE'
			],
			[
				'{% if empty_obj.a %}A{% elseif empty_obj.b %}B{% else %}{% if false %}FALSE{% else %}ELSE{% /if %}{% /if %}',
				'ELSE'
			],
			[
				`{% if 1 %}{% if 0 %}0{% elseif 2 %}2{% else %}3{% /if %}{% /if %}`,
				`2`
			],
			[
				`{% if not 0 %}{% if false %}false{% elseif my_obj.a %}A{% else %}NOPE{% /if %}{% /if %}`,
				`A`
			],
			[
				`{% if true %}{% if 0 %}0{% else %}{% with numbers as number %}{% each %}{% if 0 %}{% elseif number %},{% /if %}{%= number %}{% /each %}-{% if 0 %}0{% else %}{% if 0 %}0{% elseif 1 %}1{% else %}ELSE{% /if %}{% /if %}{% /with %}{% /if %}{% /if %}`,
				`0,1,2,3-1`
			],
			{
				template: 'elseif_nested',
				result  : '\n\t\t\t\tELSEIF\n\t\t\t\n\t\t\t\tELSEIF\n\t\t\t'
			},
			{
				template: 'elseif_test',
				result  : 'c:C-\nbla:ELSE-\nB-'
			}
		];

		createTests(tests);
	});

	describe('Conditional', () => {

		let tests = [
			[
				`{{ (c eq "a") ? "A" : "NO" }}`,
				`NO`
			],
			[
				`{{ (c eq "c") ? "C" : "NO" }}`,
				`C`
			],
			[
				`{{ true_primitive ? "TRUE" : "FALSE" }}`,
				`TRUE`
			],
			[
				`{{ true_optional ? "TRUE" : "FALSE" }}`,
				`TRUE`
			],
		];

		createTests(tests);
	});

	describe('Switch', function() {

		var tests = [
			[
				'{% switch c %}{% case "b" %}B{% case "1" %}1{% case "c" %}C{% default %}ELSE{% /switch %}',
				'C'
			],
			[
				'{% switch c %}{% case "b" %}B{% default %}DEFAULT{% /switch %}',
				'DEFAULT'
			]
		];

		createTests(tests);
	});

	describe('Not', function() {

		var tests = [
			['{% if not true %}1{% else %}0{% /if %}',    '0'],
			['{% if not false %}1{% else %}0{% /if %}',   '1'],
			['{% if (not false) %}1{% else %}0{% /if %}', '1'],
			['{% if 1 not eq 0 %}TRUE{% /if %}',          'TRUE'],
			['{% if 1 not gt 0 %}WRONG{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if 1 neq 0 %}TRUE{% /if %}',          'TRUE'],
			['{% if 1 neq 1 %}WRONG{% else %}ELSE{% /if %}', 'ELSE'],
		];

		createTests(tests);
	});

	describe('Break', function() {

		var tests = [
			['{% if true %}1{% break %}WRONG{% else %}0{% /if %}', '1'],
			['{% if false %}WRONG{% break %}WRONG{% else %}ELSE{% break %}WRONG{% /if %}', 'ELSE'],
			['{% if true %}1{% if true %}1{% break %}WRONG{% /if %}1{% /if %}', '111'],
		];

		tests.push([
			`{% each deep.numbers as number %}{% if number %}{{ number }}{% break %}{{ number }}{% /if %}{% /each %}`,
			`123`,
		]);

		tests.push([
			`{% each deep.numbers as number %}{% if number %}{{ number }}{% break 2 %}{{ number }}{% /if %}{% /each %}`,
			`1`,
		]);

		
		tests.push([
			`{% if true %}-{% if true %}{% break 2 %}{% /if %}NOPE{% /if %}`,
			`-`,
		]);

		tests.push([
			`{% if true %}1{% if true %}2{% if true %}33{% /if %}2{% /if %}1{% /if %}`,
			`123321`,
		]);

		tests.push([
			`{% if true %}1{% if true %}2{% if true %}3{% break 1 %}3{% /if %}2{% /if %}1{% /if %}`,
			`12321`,
		]);

		tests.push([
			`{% if true %}1{% if true %}2{% if true %}3{% break 2 %}3{% /if %}2{% /if %}1{% /if %}`,
			`1231`,
		]);

		tests.push([
			`{% if true %}1{% if true %}2{% if true %}3{% break 3 %}3{% /if %}2{% /if %}1{% /if %}`,
			`123`,
		]);

		createTests(tests);
	});

	describe('Include', function() {

		let tests = [
			[
				`{% include "partials/template_slot_test" %}`,
				`<slot name="main">Default main slot</slot>`
			],
			[
				`{% include "partials/print_title_var" title="Test" %}`,
				`Test-Test`
			]
		];

		createTests(tests);
	});

	describe('Macro', function() {

		let tests = [];

		tests.push([
			`{% macro testMe %}Simple macro{% /macro %}:{% run testMe %}:`,
			`:Simple macro:`
		]);

		tests.push([
			`{% macro withDef nr=1 %}Number={{ nr }}{% /macro %}-{% run withDef %}-{% run withDef nr=2 %}`,
			`-Number=1-Number=2`
		]);

		tests.push([
			`{% macro withDef nr=1 %}Number={{ nr }}{% /macro %}-{% run withDef %}-{% run withDef nr=2+2 %}`,
			`-Number=1-Number=4`
		]);

		createTests(tests);
	});

	describe('Trim', function() {

		var tests = [
			['Bla bla {% trim %} bla bla',        'Bla blabla bla'],
			['Bla bla\t{% trim %}\nbla bla',      'Bla blabla bla'],
			['Bla bla {% trim left %}\tbla bla',  'Bla bla\tbla bla'],
			['Bla bla {% trim right %}\tbla bla', 'Bla bla bla bla'],
			['Bla bla\t\t{% trim right %} {%= bla %}\n bla bla', 'Bla bla\t\tbla bla'],
			['<p></p>{% trim blank %}',            ''],
			[' <p> </p>{% trim blank %}',          ''],
			[' <p id="p"> </p >{% trim blank %}',  ''],
			['<p id="p"><span>S</span></p >{% trim blank %}',  '<p id="p"><span>S</span></p>'],
			['TEST<p></p>{% trim blank %}',        'TEST<p></p>'],
		];

		createTests(tests);
	});

	describe('Print', function() {
		var tests = [
			['Test: {%= test.name %}',              'Test: testname'],
			['One: {%= test.one %}',                'One: 1'],
			['Four: {%= test.two.three.four %}',    'Four: 4'],
			['Nothing: {%= that.does.not.exist %}', 'Nothing: '],
			['Nothing: {%= nope.nope %}{% trim %}', 'Nothing:'],
			['Literal: {%= "literal" %}',           'Literal: literal'],
			['Sum: {%= 1 + 1 %}',                   'Sum: 2'],
			['Minus: {%= 1 - 1 %}',                 'Minus: 0'],
			["Single quote: {%= 'single' %}",       'Single quote: single'],
			['Inline print is unsafe by default: &euro;', 'Inline print is unsafe by default: &euro;'],
		];

		createTests(tests);
	});

	describe('SafePrint', function() {
		var tests = [
			['{{test.name}}',       'testname'],
			['{{html}}',            '&lt;p&gt;This is &lt;bold&gt;HTML&lt;/bold&gt;&lt;/p&gt;'],
			['{{"test <3"}}',       'test &lt;3'],
			['{{this is not\nsp}}', '{{this is not\nsp}}'],
			['{{ internal("string") }}', 'internal string'],
			['{{ internal("test").nested.value }}', 'test'],
			['{{ numbers[0] }}-{{ numbers[1] }}', '0-1'],
			['{{ people[0]["name"] }}', 'Jelle'],
			['{{ people.0.name }}', 'Jelle'],
			['{{ people.0["name"] }}', 'Jelle'],
		];

		createTests(tests);
	});

	describe('With', function() {

		var tests = [
			[
				`{% with str_bla.split('') as c %}{% each %}{{c}}-{% /each %}{% /with %}`,
				'b-l-a-',
			],
			[
				`{% with numbers as number %}{% multiple %}{% each %}{%= number %},{% /each %}{% /multiple %}{% /with %}`,
				'0,1,2,3,'
			],
			[
				`{% with numbers as number %}{% each %}{%= number %},{% /each %}{% /with %}`,
				'0,1,2,3,'
			],
			[
				`{% with numbers as number %}{% single %}SINGLE:{% /single %}{% each %}{%= number %},{% /each %}{% /with %}`,
				'0,1,2,3,'
			],
			[
				`{% with single as number %}{% each %}{%= number %},{% /each %}{% /with %}`,
				'0,'
			],
			[
				`{% with single as number %}{% each %}{%= number %},{% /each %}{% /with %}`,
				'0,'
			],
			[
				`{% with single as number %}{% single %}SINGLE:{% /single %}{% each %}{%= number %},{% /each %}{% /with %}`,
				'SINGLE:0,'
			],
			[
				`{% with my_obj as value %}{% each %}{%= value %}{% /each %}{% /with %}`,
				'abc'
			],
			[
				`{% with people as block %}{% each %}<hr name="{% block.gender %}">{% /each %}{% /with %}`,
				'<hr name="m"><hr name="m"><hr name="f"><hr name="m"><hr name>'
			],
			[
				`{% with people as person %}{% each %}{% with person.children as child %}{% all %}{%= person.name %}: {% /all %}{% each %}{%= child %},{% /each %}{% all %}-{% /all %}{% /with %}{% /each %}{% /with %}`,
				`Griet: Jelle,-Patrick: Jelle,-`
			],
			[
				`{% with people as person %}{% all %}-{% /all %}{% each %}{% if person.gender %}{%= person.name %},{% else %}-{% /if %}{% /each %}{% all %}-{% /all %}{% /with %}`,
				`-Jelle,Roel,Griet,Patrick,--`
			],
			[
				`{% with people as person %}A{%= $amount %}-{% if $amount le 100 %}LESS{% /if %}{% /with %}`,
				`A5-LESS`
			],
			[
				`{% if 1 %}
	IF1
	{% if 2 %}
		IF2

		{% with people as person %}
			{% each %}
				{{ person.name }}

				{% if false %}
					NO
				{% elseif true %}
					YES
				{% else %}
					NO
				{% /if %}

				{% if false %}
					NO
				{% elseif false %}
					NO
				{% else %}
					YES
				{% /if %}
			{% /each %}
		{% /with %}
	{% /if %}
{% else %}
NO
{% /if %}`,
				`IF1 IF2 Jelle YES YES Roel YES YES Griet YES YES Patrick YES YES Voltorb YES YES`
			]
		];

		createTests(tests);
	});

	describe('With ... where', function() {
		var tests = [
			[
				`{% with people as person where person.gender eq "m" %}{% each %}{%= person.name %},{% /each %}{% /with %}`,
				'Jelle,Roel,Patrick,'
			],
			[
				`{% with people as person where person.gender eq "f" %}{% each %}{%= person.name %},{% /each %}{% /with %}`,
				'Griet,'
			],
			[
				`{% with people as person where person.gender %}{% each %}{%= person.name %},{% /each %}{% /with %}`,
				'Jelle,Roel,Griet,Patrick,'
			],
			[
				`{% with people as person where not person.gender %}{% each %}{%= person.name %},{% /each %}{% /with %}`,
				'Voltorb,'
			],
		];

		createTests(tests);
	});

	describe('Each ... as', function() {

		var tests = [
			[
				`{% each str_bla.split('') as c %}{{c}}-{% /each %}`,
				'b-l-a-',
			],
			[
				`{% each people as key, person %}{%= person.name %},{% /each %}`,
				`Jelle,Roel,Griet,Patrick,Voltorb,`
			],
			[
				`{% each people as key, person where person.gender eq "nope" %}{%= person.name %},{% /each %}`,
				``
			],
			[
				`{% each does_not_exist as key, person %}{%= person.name %},{% /each %}`,
				``
			],
			[
				`{% each my_obj as key, val %}{%= key %}:{%= val %},{% /each %}`,
				`a:a,b:b,c:c,`
			],
			[
				`{% each deep.numbers as index, nr %}{%= index %}:{%= nr %},{% /each %}`,
				`0:1,1:2,2:3,`
			],
			[
				`{% each iterable as index, nr %}{%= index %}:{%= nr %},{% /each %}`,
				`0:0,1:1,2:2,3:3,4:4,`
			],
			[
				`{% each clients as client where client.visible_as_case and client.image %}
	<span>
		<% if (client.color) $0.style.setProperty('background-color', client.color) %>
		{{ client.name }}
	</span>
{% /each %}`,
				`<span style="background-color:red;"> 1 </span> <span style="background-color:green;"> 2 </span> <span style="background-color:blue;"> 3 </span> `
			],
			[
				`{% each entries as entry %}<a href="#{% entry.id %}">{{ entry.title }}</a>{% /each %}`,
				`<a href="#a">A</a>`
			],
			[
				`{% each iterators.custom_list as entry %}{{ entry }}{% /each %}`,
				`ABC`,
			],
			[
				`{% each iterators.set_list as entry %}{{ entry }}{% /each %}`,
				`ABC`,
			],
			[
				`{% each iterators.simple_map as entry %}{{ entry }}{% /each %}`,
				`ABC`,
			],
			[
				`{% each iterators.simple_map as key, entry %}{{ key}}{{ entry }}{% /each %}`,
				`aAbBcC`,
			],
			[
				`{% each iterators.my_deck as value %}{{ value }}{% /each %}`,
				`XYZ`,
			],
			[
				`{% each iterators.my_deck as key, value %}{{key}}{{ value }}{% /each %}`,
				`xXyY_pushed_2Z`,
			],
			[
				`{% each iterators.simple_map as key, value where value eq "C" %}{{key}}{{ value }}{% /each %}`,
				`cC`,
			],
			[
				`{% each iterators.simple_map as key, value where key eq "a" and value eq "C" %}{{key}}{{ value }}{% /each %}`,
				``,
			],
			[
				`{% each iterators.simple_map as key, value where key eq "a" or value eq "C" %}{{key}}{{ value }}{% /each %}`,
				`aAcC`,
			]
		];

		createTests(tests);
	});

	describe('Or operator', function() {
		var tests = [
			[
				`{%= does.not.exist || test.name %}`,
				'testname'
			],
			[
				`{%= does.not.exist || neither.does.this || "fallback" %}`,
				'fallback'
			],
			[
				`{%= test.name || neither.does.this || "fallback" %}`,
				'testname'
			],
			[
				`{% if does.not.exist || test.name %}TRUE{% /if %}`,
				'TRUE'
			],
			[
				`{% if does.not.exist || neither.does.this %}WRONG{% /if %}`,
				''
			],
			['{% if (falsy) or (true) %}OK{% /if %}', 'OK'],
			['{% if falsy or true %}OK{% /if %}', 'OK'],
		];

		createTests(tests);
	});

	describe('And operator', function() {
		var tests = [
			[
				`{%= does.not.exist && test.name %}`,
				''
			],
			[
				`{%= false && test.name %}`,
				'false'
			],
			[
				`{%= test.one && test.name %}`,
				'testname'
			],
			[
				`{%= test.one && test.name && "ALL OK" %}`,
				'ALL OK'
			],
			[
				`{% if does.not.exist && test.name %}WRONG{% /if %}`,
				''
			],
			[
				`{% if does.not.exist && neither.does.this %}WRONG{% /if %}`,
				''
			],
			[
				`{% if test.one && test.name %}TRUE{% /if %}`,
				'TRUE'
			],
			['{% if (falsy) and (true) %}ERR{% /if %}', ''],
		];

		createTests(tests);
	});

	describe('Starts with operator', function() {
		var test = [
			['{% if test.name starts with "test" %}OK{% /if %}', 'OK'],
			['{% if test.name starts with ("nope") %}ERR{% /if %}', ''],
			['{% if does.not.exist starts with "nope" %}ERR{% /if %}', ''],
			['{% if does.not.exist starts with "" %}ERR{% /if %}', '']
		];

		createTests(test);
	});

	describe('Plus operator', function() {
		var tests = [
			[`{%= 1 + 1 %}`, '2'],
			[`{%= 1 + 1 + 1 %}`, '3'],
			[`{%= 1 + 2 + 2 %}`, '5'],
			[`{%= test.one + test.three %}`, '4'],
			[`{%= test.one + test.three + 1 %}`, '5'],
		];

		createTests(tests);
	});

	describe('Literals', function() {

		var tests = [
			[`{%= [1, 2, 3] %}`,                           '1,2,3'],
			[`{%= [my_obj.a, my_obj.b, my_obj.c] %}`,      'a,b,c'],
			[`{%= [test.three, test.three + 1] %}`,        '3,4'],
			[`{%= JSON.stringify({three: test.three}) %}`,      '{"three":3}'],
			[`{%= __('test.with.{curly}', {curly: 'test'}) %}`, 'test.with.test'],
			[`{%= JSON.stringify({a: 1,}) %}`,                  '{"a":1}'],
			[`{%= JSON.stringify([1,]) %}`,                     '[1]'],
			['{%= JSON.stringify({a: 1, b: 2, c: 3}) %}', '{"a":1,"b":2,"c":3}'],
			[`{%= JSON.stringify({
				a: 1,
				b: 2,
				c: 3
			}) %}`, '{"a":1,"b":2,"c":3}'],
		];

		createTests(tests);
	});

	describe('Set', function() {

		var tests = [
			[`{% set my_string = "alpha" %}{{ my_string }}`, 'alpha'],
			[
				`{% if false %}
					{% set my_val = "if" %}
				{% else %}
					{% set my_val = "else" %}
				{% /if %}
				{{ my_val }}`,
				'else'
			],
			[
				`{%
					if false;
						set my_val = "if";
					else;
						set my_val = "else";
					/if;

					print(my_val);
				%}`,
				'else'
			],
			[
				`{% if false; set my_val = "if"; else; set my_val = "else"; /if; print(my_val); %}`,
				'else'
			]
		];

		createTests(tests);
	});

	describe('Block', function() {

		var tests = [
			[
				`{% block "test" %}TESTING{% /block %}<he-block data-he-name="test"></he-block>`,
				`<he-block data-he-name="test" data-hid="hserverside-0" data-he-template="test_178">TESTING</he-block>`
			],
			[
				`€{% if true %}€<span>€</span>{% /if %}`,
				`&euro;&euro;<span>&euro;</span>`
			]
		];

		createTests(tests);
	});

	describe('Options', function() {

		var tests = [
			[`{%= show(a=1 b="two" c=) %}`,         '{"a":1,"b":"two","c":null}'],
			[`{%= show(str_bla a=1 b="two" c=) %}`, '"bla"-{"a":1,"b":"two","c":null}'],
			[`{%= show(a=1+1 b="two" c=) %}`,       '{"a":2,"b":"two","c":null}'],
		];

		createTests(tests);
	});

	describe('Method calls', function() {

		var tests = [
			[`{%= test.name.slice(0,1) %}`,                't'],
			[`{%= test.name.toUpperCase() %}`,             'TESTNAME'],
			[`{%= Object.keys({a: 1, b: 1}) %}`,           'a,b'],
			[`{%= 'bla'.toUpperCase() %}`,                 'BLA'],
			[`{%= stuff.slice(2).charAt(0) %}`,            'u'],
			[`{%= Object.keys({a: 1, b: 1}).join('|') %}`, 'a|b'],
			[`{%= Object.keys([0])`,                       '0'],
			[`{%= Object.keys([0,])`,                      '0'],
			[`{%= Object.keys([0,1])`,                     '0,1'],
			[`{%= [1, 2, 3].join('|') %}`,                 '1|2|3'],
			[`{%= [1, 2, 3,].join('|') %}`,                '1|2|3'],
			[`{%= [].concat(1,2,3).join('-') %}`,          '1-2-3'],
			[`{%= __('test.{cost}', {cost: 5}) %}`,        'test.5'],
			[`{%= __('test.{cost}', {cost: test.three}) %}`,                   'test.3'],
			[`{%= [].concat(1).concat(2).concat(3).join('-') %}`,              '1-2-3'],
			[`{%= empty_arr.concat(1).concat(2).concat(3).join('-') %}`,       '1-2-3'],
			[`{%= empty_arr.concat(1,2).concat(3,4).concat(5,6).join('-') %}`, '1-2-3-4-5-6'],
			[`{%= 'r'.padStart(2,'_').padEnd(4, '+').padEnd(6, '=') %}`,       '_r++=='],
		];

		createTests(tests);
	});

	describe('Comments', function() {

		var tests = [
			[`{# bla #}1`,                '1'],
			[`{# bla #}\n{# bla #}\n1`,   '\n\n1'],
		];

		createTests(tests);
	});

	
	describe('HTML Comments', function() {

		let tests = [
			[
				`<span>TEXT<!-- Comment --></span>`,
				`<span>TEXT</span>`,
			],
			[
				`<span>TEXT<!-- {{ "Comment" }} --></span>`,
				`<span>TEXT</span>`,
			]
		];

		createTests(tests);
	});

	describe('Dynamic HTML tags', function() {
		let tests = [
			[
				`<{% "div" %}>TEST</{% "div" %}>`,
				`<div>TEST</div>`,
			],
			[
				`<span><{% "div" %}><span>TEST</span></{% "div" %}></span>`,
				`<span><div><span>TEST</span></div></span>`,
			],
		];

		createTests(tests);
	});

	describe('Optionally closing HTML elements', function() {

		let tests = [
			[
				`<ul><li>1<li>2<li>3</ul>`,
				`<ul><li>1</li><li>2</li><li>3</li></ul>`,
			],
			[
				`<ul><li>1<li>2<li><ul><li>3</li><li>4<li>5</ul></ul>`,
				`<ul><li>1</li><li>2</li><li><ul><li>3</li><li>4</li><li>5</li></ul></li></ul>`,
			],
			[
				`<ul><li><p>1<p>2<li>3</ul>`,
				`<ul><li><p>1</p><p>2</p></li><li>3</li></ul>`,
			],
			[
				`<ul><li><p>1<p>2<li>3</ul>`,
				`<ul><li><p>1</p><p>2</p></li><li>3</li></ul>`,
			],
		];

		createTests(tests);

	});

	describe('Markdown', function() {
		it('should accept markdown in a template or as a variable', function(next) {

			var template = 'markdown_test';

			var vars = {
				my_markdown_string: `# String-test\n---\n\nThis is a markdown from a **string** test!`,
				multiple_md: [
					{md_code: '`code`'},
					{md_code: '**b**'},
					{md_code: '_i_'}
				]
			};

			var renderer = hawkejs.render(template, vars, function done(err, html) {

				if (err) {
					throw err;
				} else {
					assertEqualHtml(html, `<p>Pre-markdown-paragraph!</p>

<h1 id="heading-1">Heading 1</h1>
<p><a href="#allowed">allowed html</a></p>
<p><code>&lt;span id="my-id"&gt;escaped html&lt;/span&gt;</code></p>
<h2 id="heading-2">Heading 2</h2>
<h2 id="-thisisalsoescaped-">{%= this.is.also.escaped %}</h2>


This should be a converted variable:
<h1 id="string-test">String-test</h1>
<hr>
<p>This is a markdown from a <strong>string</strong> test!</p>


# This is NOT markdown!

» <p><code>code</code></p>
<p><strong>b</strong></p>
<p><em>i</em></p>
«`)
				}

				next();
			});

		});
	});

	describe('Multiline expressions', function() {
		var tests = [
			[`<span>
	»
	{%
		print(1);
		print(2);
		print(3);
		print(4);
	%}
	«
	</span>`, '<span> » 1234 « </span>'],
			[
				`<span>»{% print(1); print(2); print(3); %}«</span>`,
				`<span>»123«</span>`
			],
			[
				`<span>»{% print(1); print(2); print(3); %}«</span>
					{% markdown %}
						**cool**
					{% /markdown %}
					{%
						print('-');
						print('-');
					%}
				`,
				`<span>»123«</span> <p><strong>cool</strong></p> --`
			]
		];

		createTests(tests);
	});

	describe('Overlapping elements & statements', function() {

		let tests = [
			[
				`{% if false %}<p>{% else %}<div>{% /if %}<span>P or div?</span>{% if false %}</p>{% else %}</div>{% /if %}`,
				`<div><span>P or div?</span></div>`
			],
			[
				`{% if true %}<p>{% else %}<div>{% /if %}<span>P or div?</span>{% if true %}</p>{% else %}</div>{% /if %}`,
				`<p><span>P or div?</span></p>`
			],
			[
				`{% with people as person %}
{% all %}<all>{% /all %}
<div>
{% each %}<each>{{ person.name }}</each>{% /each %}
{% all %}</all>{% /all %}
</div>
{% /with %}`,
				`<all> <div> <each>Jelle</each><each>Roel</each><each>Griet</each><each>Patrick</each><each>Voltorb</each> </div> </all>`
			],
		]

	});

	describe('EJS', function() {

		let tests = [
			[
				`<% if (bla?.bla?.bla) { %>BLA<% } else { %>NO BLA<% } %>`,
				`NO BLA`
			],
			[
				`<%= test?.two?.three?.four %>`,
				`4`
			],
			[
				`<%= test?.two?.doesnotexist ?? my_obj?.a %>`,
				`a`
			],
			[
				`<%= is_null ?? my_obj?.a %>`,
				`a`
			],
			[
				`<% obj = {[str_bla]: test.name} %><%= obj.bla %>`,
				`testname`
			],
			[
				`<% obj = {str_bla: test.name} %><%= obj.bla %>`,
				``
			],
			[
				`<% obj = {str_bla: test.name} %><%= obj.str_bla %>`,
				`testname`
			],
			[
				`<% obj = {[str_bla]: test.name, [my_obj.a]: "test", ["__" + my_obj.a]: "a2", [my_obj.c + '_' + my_obj.a]: 9} %><%= JSON.stringify(obj) %>`,
				`{"bla":"testname","a":"test","__a":"a2","c_a":9}`
			],
			[
				`<% i = 1 %><% i++ %><% i+=1 %><% i*=2 %><% i|=402 %><%= i /* 406 */ %><% i-- %><% i**=2 %>,<%= i /* 164025 */ %><% i >>>= 1 %>,<%= i /* 82012 */ %>`,
				`406,164025,82012`
			]
		];

		createTests(tests);
	});

	describe('Reactive variables', () => {

		let state;

		let tests = [
			[
				(vars) => vars.set('ref_title', Optional('Original title')),
				`<span>{{ &ref_title }}</span>`,
				`<span>Original title</span>`,
				(vars) => {vars.get('ref_title').value = 'New title'},
				`<span>New title</span>`,
				(vars) => {vars.get('ref_title').value = 'Third attempt'},
				`<span>Third attempt</span>`,
			],
			[
				(vars) => vars.set('ref_bool', Optional(false)),
				`<span>Ref bool is: {% if &ref_bool %}{{ ref_bool }}{% else %}FALSE{% /if %}</span>`,
				`<span>Ref bool is: FALSE</span>`,
				(vars) => {vars.get('ref_bool').value = 'str'},
				`<span>Ref bool is: str</span>`,
				(vars) => {vars.get('ref_bool').value = null},
				`<span>Ref bool is: FALSE</span>`,
			],
			[
				(vars) => vars.set('ref_el', Optional()),
				`<span :ref={% ref_el %}>INNER</span><div>{{ &ref_el.textContent }}</div>`,
				`<span>INNER</span><div>INNER</div>`,
				(vars) => {
					// Get the reference again
					let ref_el = vars.get('ref_el');

					// Get the element it is referring
					let el = ref_el.value;

					// Change the content of the element directly
					el.textContent = 'CHANGED';

					// Trigger a change
					ref_el.value = null;
					ref_el.value = el;
				},
				`<span>CHANGED</span><div>CHANGED</div>`,
			],
			[
				// Prepare the state & variables
				(vars) => {
					state = {};
					vars.set('ref_el', Optional()).addListener(val => state.last_ref_el = val);
					vars.set('ref_attr', Optional('-'));
					vars.set('ref_static', Optional('static'));
					state.ref_counter = vars.set('ref_counter', Optional(1));
				},
				// The initial test template (first string is always the template)
				`
					<div>
						{{ &ref_static }}
						<span :ref={% ref_el %} data-attr={% &ref_attr %}>
							{{ ref_counter }}
						</span>
					</div>
				`,
				// The expected result
				`
					<div>
						static
						<span data-attr="-">
							1
						</span>
					</div>
				`,
				// New function to change things
				(vars) => {
					state.current_span = state.last_ref_el;
					vars.get('ref_attr').value = 'changed!';

					// Even though we change it, it should not trigger a rerender
					// since the variable was not used reactively in the template
					vars.get('ref_counter').value = 2;
				},
				// New expected result
				`
					<div>
						static
						<span data-attr="changed!">
							1
						</span>
					</div>
				`,
				(vars) => {
					// The reference element should still be the same
					// (The first div should not have re-rendered its contents)
					assert.strictEqual(state.last_ref_el, state.current_span);
				},
			],
			[
				// Prepare the state & variables
				(vars) => {
					state = {};
					vars.set('ref_static', Optional('static'));
					state.ref_counter = vars.set('ref_counter', Optional(1));
					state.info_counter = vars.set('info_counter', Optional(0));
				},
				// The initial test template (first string is always the template)
				`
					<div>
						{{ &ref_static }}
						<span>
							<% info_counter.value += 1 %>
							Info counter: {{ &ref_counter }}

							<span>
								<% info_counter.value += 1 %>
								Nested info counter: {{ &ref_counter }}
							</span>
							Text
						</span>
					</div>
				`,
				// The expected result
				`
					<div>
						static
						<span>
							Info counter: 1

							<span>
								Nested info counter: 1
							</span>
							Text
						</span>
					</div>
				`,
				(vars) => {
					assert.strictEqual(state.info_counter.value, 2, 'The info counter should have been increased twice');
					state.ref_counter.value = 2;
				},
				// New expected result
				`
					<div>
						static
						<span>
							Info counter: 2

							<span>
								Nested info counter: 2
							</span>
							Text
						</span>
					</div>
				`,
				(vars) => {
					let value = state.info_counter.value;
					assert.strictEqual(value, 4, 'The info counter should have been increased twice to four, but it is ' + value);
					state.ref_counter.value = 3;
				},
				`
					<div>
						static
						<span>
							Info counter: 3

							<span>
								Nested info counter: 3
							</span>
							Text
						</span>
					</div>
				`,
			],
			[
				(vars, renderer) => {
					state = {};
					vars.set('my_injected_value', Optional('alpha'));
					renderer.serverVar('my_server_var', Optional('beta'));
				},
				`
					<print-variables +injected={% my_injected_value %}></print-variables>
				`,
				`
					<print-variables>
						<div>
							Injected: alpha
							Servervar: beta
						</div>
					</print-variables>
				`,
			],
			[
				(vars, renderer) => {
					state = {};
					state.ref_el = vars.set('ref_el', Optional());
					state.ref_bool = vars.set('ref_bool', Optional(false));
				},
				`
					<button :ref={% ref_el %} #disabled={% &ref_bool %}>Click me</button>
				`,
				`
					<button>Click me</button>
				`,
				(vars) => {
					let el = state.ref_el.value;
					
					if (!el) {
						throw new Error('Element reference should have been set');
					}

					assert.strictEqual(el.disabled, false, 'The button should not be disabled');

					state.ref_bool.value = true;
				},
				`
					<button disabled="true">Click me</button>
				`,
				(vars) => {
					let el = state.ref_el.value;
					
					if (!el) {
						throw new Error('Element reference should have been set');
					}

					assert.strictEqual(el.disabled, true, 'The button should be disabled');
				},
			],
			// Reactive sub-variables
			[
				// Prepare the state & variables
				(vars) => {
					state = {};
					state.holder = vars.set('holder', Optional({}));
					state.holder.value.sub = Optional('subvalue');
				},
				// The initial test template (first string is always the template)
				`
					<div>
						<span>{{ holder{:}.sub }}</span>
						<span>{{ holder.sub{:} }}</span>
					</div>
				`,
				// The expected result
				`
					<div>
						<span>subvalue</span>
						<span>subvalue</span>
					</div>
				`,
				(vars) => {
					assert.strictEqual(state.holder.value.sub.value, 'subvalue');
					state.holder.value.sub.value = 'changed';
					assert.strictEqual(state.holder.value.sub.value, 'changed');
				},
				// New expected result
				`
					<div>
						<span>subvalue</span>
						<span>changed</span>
					</div>
				`,
			],
			[
				// Prepare the state & variables
				(vars) => {
					state = {};
					state.my_boolean = vars.set('my_boolean', Optional(false));
				},
				// The initial test template (first string is always the template)
				`
					<div>
						{% if my_boolean{:} %}TRUE{% else %}FALSE{% /if %}
						»{{ my_boolean OR 'default' }}«
						<span data-bool={% my_boolean OR 'default' %}><i></i></span>
					</div>
				`,
				// The expected result
				`
					<div>
						FALSE
						»default«
						<span data-bool="default"><i></i></span>
					</div>
				`,
				(vars) => {
					state.my_boolean.value = true;
				},
				// New expected result
				`
					<div>
						TRUE
						»true«
						<span data-bool="true"><i></i></span>
					</div>
				`,
			],
			[
				// Prepare the state & variables
				(vars) => {
					state = {};
					state.my_name = vars.set('my_name', Optional('first'));
				},
				// The initial test template (first string is always the template)
				`
					<my-text
						id="l"
						name="t1"
						state:message={% my_name %}
					>
						{{ state:message }}-{{ attr:name }}-{{ prop:id }}
						<span>{{ state:message }}-{{ attr:name }}-{{ prop:id }}</span>
					</my-text>
				`,
				// The expected result
				`
					<my-text id="l" name="t1">
						first-t1-l
						<span>first--</span>
					</my-text>
				`,
				(vars) => {
					state.my_name.value = 'second';
				},
				// We don't expect any changes because the `my_name` value
				// was not set using the `{:}` reactive suffix
				`
					<my-text id="l" name="t1">
						first-t1-l
						<span>first--</span>
					</my-text>
				`,
			],
			[
				// Prepare the state & variables
				(vars) => {
					state = {};
					state.my_name = vars.set('my_name', Optional('init'));
					state.foo = vars.set('foo', Optional('bar'));
				},
				// The initial test template (first string is always the template)
				`
					<my-text
						id="l"
						name="t1"
						state:message={% my_name{:} %}
					>
						{{ state:message{:} }}-{{ attr:name }}-{{ prop:id }}
						<span>{{ state:message{:} }}-{{ attr:name }}-{{ prop:id }}</span>
						<div>{{ var:foo{:} }}</div>
					</my-text>
				`,
				// The expected result
				`
					<my-text id="l" name="t1">
						init-t1-l
						<span>init--</span>
						<div>bar</div>
					</my-text>
				`,
				(vars) => {
					state.my_name.value = 'second';
					state.foo.value = 'baz';
				},
				// New expected result
				`
					<my-text id="l" name="t1">
						second-t1-l
						<span>second--</span>
						<div>baz</div>
					</my-text>
				`,
			]
		];

		createReactiveTests(tests);
	});

	return;

	describe('None existing method calls', function() {

		var tests = [
			[`{%= empty_arr.does_not_exist() or 'nope' %}`, 'nope'],
		];

		createTests(tests);
	});
});

function createReactiveTests(tests) {
	return createTests(tests);
}

function createTests(tests) {

	const Blast = __Protoblast,
	      Classes = Blast.Classes;

	const CustomList = function CustomList(records) {
		this.should_not_be_visible = 'nope';
		this.records = records;
	};
	CustomList.prototype[Symbol.iterator] = function* iterate() {
		var i;

		for (i = 0; i < this.records.length; i++) {
			yield this.records[i];
		}
	};

	CustomList.prototype.toHawkejs = function toHawkejs() {
		return this;
	};

	let my_deck = new Classes.Deck();
	my_deck.set('x', 'X');
	my_deck.set('y', 'Y');
	my_deck.push('Z');

	for (let i = 0; i < tests.length; i++) {

		let setup_tasks = [],
		    extra_tasks = [],
		    template,
		    result,
		    title,
		    code,
		    test = tests[i];

		if (Array.isArray(test)) {

			if (test.length === 2) {
				code = tests[i][0];
				result = tests[i][1];
			} else {

				let seen_template = false,
				    seen_initial_result = false;

				for (let entry of test) {

					if (typeof entry == 'function') {
						if (!seen_template) {
							setup_tasks.push(entry);
							continue;
						}
					} else if (typeof entry == 'string') {
						if (!seen_template) {
							code = entry;
							seen_template = true;
							continue;
						}

						if (!seen_initial_result) {
							result = entry;
							seen_initial_result = true;
							continue;
						}
					}

					extra_tasks.push(entry);
				}
			}

			//title = code.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
			title = code.trim().replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ');

			// Replace multiple whitespaces with a single space
			title = title.replace(/\s+/g, ' ');
		} else {
			title = test.template;
			template = test.template;
			result = test.result;
		}

		if (title.length > 74) {
			title = title.slice(0, 72) + '…';
		}

		it(title, function(next) {
			test_id++;

			let compiled;

			if (code) {
				compiled = hawkejs.compile('test_' + test_id, code);
			} else {
				compiled = template;
			}

			let vars = {
				__string  : 'internal string',
				__test    : {nested: {value: 'test'}},
				c         : 'c',
				str_bla   : 'bla',
				is_null   : null,
				empty_arr : [],
				full_arr  : [0],
				single    : [0],
				numbers   : [0, 1, 2, 3],
				empty_obj : {},
				falsy     : false,
				success   : true,
				error     : 'some error',//,new Error('Some error'),
				stuff     : 'stuff',
				opt_str   : new Blast.Classes.Develry.Optional('truthy'),
				opt_empty : new Blast.Classes.Develry.Optional(),
				my_obj    : {
					a: 'a',
					b: 'b',
					c: 'c'
				},
				test      : {
					name  : 'testname',
					one   : 1,
					three : 3,
					two   : {
						three: {
							four: 4
						}
					}
				},
				people    : [
					{
						name   : 'Jelle',
						gender : 'm'
					},
					{
						name   : 'Roel',
						gender : 'm'
					},
					{
						name   : 'Griet',
						gender : 'f',
						children : ['Jelle']
					},
					{
						name   : 'Patrick',
						gender : 'm',
						children : ['Jelle']
					},
					{
						name   : 'Voltorb',
						gender : ''
					}
				],
				deep: {
					numbers: [
						1, 2, 3
					]
				},
				html: '<p>This is <bold>HTML</bold></p>',
				clients : [
					{
						visible_as_case : false,
						image           : true,
						name            : 'HIDDEN',
					},
					{
						visible_as_case : true,
						image           : true,
						name            : '1',
						color           : 'red',
					},
					{
						visible_as_case : true,
						image           : false,
						name            : 'HIDDEN',
						color           : 'red',
					},
					{
						visible_as_case : true,
						image           : true,
						name            : '2',
						color           : 'green',
					},
					{
						visible_as_case : true,
						image           : true,
						name            : '3',
						color           : 'blue',
					},
				],
				entries: [
					{id: 'a', title: 'A'}
				],
				iterators: {
					custom_list: new CustomList(['A', 'B', 'C']),
					set_list: new Set(['A', 'B', 'C']),
					simple_map: new Map([['a', 'A'], ['b', 'B'], ['c', 'C']]),
					my_deck,
				},
			};

			vars.show = function show(options, two) {
				let result = JSON.stringify(options);

				if (arguments.length == 2) {
					result += '-' + JSON.stringify(two);
				}

				return result;
			};

			let iterable = {
				records: [
					0, 1, 2, 3, 4
				]
			};

			iterable[Symbol.iterator] = function* iterate() {

				let i;

				for (i = 0; i < this.records.length; i++) {
					yield this.records[i];
				}
			};

			let renderer = hawkejs.createRenderer();
			let variables = renderer.prepareVariables(vars);

			// Set this later, so it won't get cloned
			// (and lose the iterator property)
			variables.set('iterable', iterable);

			// Set an optional with a true value
			variables.set('true_optional', Optional(true));

			// Set the true primitive
			variables.set('true_primitive', true);

			let setup_pledges = [];

			if (setup_tasks) {

				for (let task of setup_tasks) {
					setup_pledges.push(task(variables, renderer));
				}
			}

			Blast.Bound.Function.series(setup_pledges, (err) => {

				if (err) {
					return next(err);
				}

				let is_reactive = setup_pledges?.length > 0;

				renderer.render(compiled, variables).done(async function done(err, block) {

					if (err) {
						return next(err);
					}

					let elements = block.toElements();
					let res = block.toHTML();

					if (is_reactive) {
						res = res.replace(/\s+data-hid=["'].*?["']/g, '');
						res = res.replace(/\s+he-rendered=["'].*?["']/g, '');
					}
	
					try {
						assertEqualHtml(res, result);
					} catch (e) {
						return next(e);
					}

					if (is_reactive) {
						const doCheck = (task) => {
							res = block.toHTML();
							res = res.replace(/\s+data-hid=["'].*?["']/g, '');
							res = res.replace(/\s+he-rendered=["'].*?["']/g, '');
							assertEqualHtml(res, task);
						};

						for (let task of extra_tasks) {

							if (typeof task == 'function') {

								try {
									await task(variables, renderer);
								} catch (err) {
									return next(err);
								}
								continue;
							}

							if (typeof task == 'string') {

								// Simple race condition hack
								await Classes.Pledge.after(3);

								let pledge = new Classes.Pledge();

								// Reactive changes are grouped in an immediate call,
								// we need to make sure we wait until the next group call
								// to continue
								Blast.nextGroupedImmediate(() => {
									pledge.resolve();
								});

								await pledge;

								try {
									// Initial check
									doCheck(task);
								} catch (_) {
									// Most of the time the initial 2 async delays are enough,
									// but sometimes the system is still not done
									await Classes.Pledge.after(10);

									try {
										doCheck(task);
									} catch (err) {
										next(err);
									}
								}
							}
						}
					}
	
					next();
				});

			});
		});
	}
}