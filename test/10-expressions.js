var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('Expressions', function() {

	before(function() {
		hawkejs = new Hawkejs();
		hawkejs.addViewDirectory(__dirname + '/templates');

		Hawkejs.Renderer.setCommand(function __(key, param) {

			if (param) {
				key = __Protoblast.Bound.String.assign(key, param);
			}

			return key;
		});

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
			['{% if my_obj.c eq "a" or my_obj.b eq "a" %}ERR{% elseif my_obj.a eq "a" and my_obj.b eq "b" %}AB{% else %}ERRTOO{% /if %}', 'AB']
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

	describe('Not', function() {

		var tests = [
			['{% if not true %}1{% else %}0{% /if %}',    '0'],
			['{% if not false %}1{% else %}0{% /if %}',   '1'],
			['{% if (not false) %}1{% else %}0{% /if %}', '1'],
			['{% if 1 not eq 0 %}TRUE{% /if %}',          'TRUE'],
			['{% if 1 not gt 0 %}WRONG{% else %}ELSE{% /if %}', 'ELSE']
		];

		createTests(tests);
	});

	describe('Break', function() {

		var tests = [
			['{% if true %}1{% break %}WRONG{% else %}0{% /if %}', '1'],
			['{% if false %}WRONG{% break %}WRONG{% else %}ELSE{% break %}WRONG{% /if %}', 'ELSE'],
			['{% if true %}1{% if true %}1{% break %}WRONG{% /if %}1{% /if %}', '111'],
		];

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
			["Single quote: {%= 'single' %}",       'Single quote: single']
		];

		createTests(tests);
	});

	describe('SafePrint', function() {
		var tests = [
			['{{test.name}}',       'testname'],
			['{{html}}',            '&#60;p&#62;This is &#60;bold&#62;HTML&#60;/bold&#62;&#60;/p&#62;'],
			['{{"test <3"}}',       'test &#60;3'],
			['{{this is not\nsp}}', '{{this is not\nsp}}'],
		];
	});

	describe('With', function() {

		var tests = [
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
		];

		createTests(tests);
	});

	describe('Block', function() {

		var tests = [
			[
				`{% block "test" %}TESTING{% /block %}<he-block data-he-name="test"></he-block>`,
				`<he-block data-he-name="test" data-hid="hserverside-0" data-he-template="compiledView">TESTING</he-block>`
			],
			[
				`€{% if true %}€<span>€</span>{% /if %}`,
				`€€<span>€</span>`
			]
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
					assert.strictEqual(html, `<p>Pre-markdown-paragraph!</p>

<h1>Heading 1</h1>
<p><a href="&#35;allowed">allowed html</a></p>
<p><code>&lt;span id=&quot;my-id&quot;&gt;escaped html&lt;/span&gt;</code></p>
<h2>Heading 2</h2>
<h2>{%= this.is.also.escaped %}</h2>


This should be a converted variable:
<h1>String-test</h1>
<hr>
<p>This is a markdown from a <strong>string</strong> test!</p>


# This is NOT markdown!

»<p><code>code</code></p>
<p><strong>b</strong></p>
<p><em>i</em></p>
«`)
				}

				next();
			});

		});
	});

	describe('None existing method calls', function() {

		var tests = [
			[`{%= empty_arr.does_not_exist() or 'nope' %}`, 'nope'],
		];

		createTests(tests);
	});
});

function createTests(tests) {
	for (let i = 0; i < tests.length; i++) {

		let template,
		    result,
		    title,
		    code,
		    test = tests[i];

		if (Array.isArray(test)) {
			code = tests[i][0];
			title = tests[i][0].replace(/\n/g, '\\n').replace(/\t/g, '\\t');
			result = tests[i][1];
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
				c         : 'c',
				str_bla   : 'bla',
				empty_arr : [],
				full_arr  : [0],
				single    : [0],
				numbers   : [0, 1, 2, 3],
				empty_obj : {},
				falsy     : false,
				success   : true,
				error     : new Error('Some error'),
				stuff     : 'stuff',
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
				html: '<p>This is <bold>HTML</bold></p>'
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

			vars.iterable = iterable;


			hawkejs.render(compiled, vars, function done(err, res) {

				if (err) {
					return next(err);
				}

				assert.strictEqual(res, result);
				next();
			});
		});
	}
}