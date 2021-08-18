var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('Directives', function() {

	before(function() {
		hawkejs = createHawkejsInstance();
		hawkejs.parallel_task_limit = 1;
		hawkejs.addViewDirectory(__dirname + '/templates');
	});

	describe('Empty attributes', function() {
		var tests = [
			['<p hidden whatever></p >', '<p hidden whatever></p>'],
			['<p hidden whatever=""></p >', '<p hidden whatever></p>']
		];

		createTests(tests);
	});

	describe('Expression values', function() {
		var tests = [
			[
				`<span value={% date.getFullYear() %}></span>`,
				'<span value="2019"></span>'
			]
		];

		createTests(tests);
	});

	describe('Expressions in attribute values', function() {

		var tests = [
			[
				`<span value="{% "test" %}"></span>`,
				`<span value="test"></span>`
			],
			[
				`<span value="A {% "B" %} C"></span>`,
				`<span value="A B C"></span>`
			],
			[
				`<span value="1 {% 1+1 %} 3"></span>`,
				`<span value="1 2 3"></span>`
			]
		];

		createTests(tests);
	});

	describe('Code in attribute values', function() {

		var tests = [
			[
				`<span value="<% "test" %>"></span>`,
				`<span value="test"></span>`
			],
			[
				`<span value="A <% "B" %> C"></span>`,
				`<span value="A B C"></span>`
			],
			[
				`<span value="1 <% 1+1 %> 3"></span>`,
				`<span value="1 2 3"></span>`
			],
			[
				`<span value="1 <% print("test") %> 3"></span>`,
				`<span value="1 test 3"></span>`
			],
			[
				`<span value="1 <%= String("test" || '').toUpperCase() %> 3"></span>`,
				`<span value="1 TEST 3"></span>`
			]
		];

		createTests(tests);
	});

	describe('Unquoted values', function() {
		var tests = [
			[
				`<span value=3></span>`,
				`<span value="3"></span>`
			],
			[
				`<span value=alpha><i></i></span>`,
				`<span value="alpha"><i></i></span>`
			],
			[
				`<span value=alpha foo=bar class="test" azerty= ok><i></i></span>`,
				`<span class="test" value="alpha" foo="bar" azerty="ok"><i></i></span>`
			]
		];

		createTests(tests);
	});

	describe('Boolean attributes', function() {
		var tests = [
			[
				`<div id="bla" hidden>Content</div>`,
				`<div id="bla" hidden>Content</div>`
			]
		];

		createTests(tests);
	});

	describe('Code in tag openings', function() {

		var tests = [
			[
				`<figure <% if (true) print('class="bla"') %>></figure>`,
				`<figure class="bla"></figure>`
			],
			[
				`<figure class="test" <% if (true) print('id="bla"') %>></figure>`,
				`<figure id="bla" class="test"></figure>`
			],
			[
				`<figure class="test" <% if (true) print('id="bla"') %> data-ok="ok"></figure>`,
				`<figure id="bla" class="test" data-ok="ok"></figure>`
			],
			[
				`<figure class="test" data-ok="ok" <% if (true) print('hidden') %> ></figure>`,
				`<figure class="test" hidden data-ok="ok"></figure>`
			],
			[
				`<h2
	class="underscore m"
	<% if (truthy) print('data-editable-name="title" data-editable-type="string"') %>
>TEXT</h2>`,
				`<h2 class="underscore m" data-editable-name="title" data-editable-type="string">TEXT</h2>`
			],
			// This can't work due to how attributes are interpreted
			// [
			// 	`<h2 class="test" {% if true %} my-attribute="true" {% /if %}>Test</h2>`,
			// 	`<h2 class="test" my-attribute="true">Test</h2>`
			// ]
		];

		createTests(tests);

		it('should correctly escape certain characters', function(next) {

			var compiled = hawkejs.compile({
				template_name : 'test_escape_1',
				template      : `<input value="<% name %>" html="<% html %>">`,
				throw_error   : true
			});

			var vars = {
				name : '#hashtag',
				html : '"<i>test</i>"',
			};

			hawkejs.render(compiled, vars, function done(err, res) {

				if (err) {
					return next(err);
				}

				assertEqualHtml(res, `<input value="#hashtag" html="&quot;&lt;i&gt;test&lt;/i&gt;&quot;">`);

				next();
			});
		});
	});

	describe('Set properties using the # syntax', function() {
		var tests = [
			[
				`<i #testing="ok"><%= $0.testing %></i>`,
				`<i>ok</i>`
			]
		];

		createTests(tests);
	});

	describe('Apply directives using the ! syntax', function() {

		var tests = [
			[
				`<i !Test></i>`,
				`<i id="done"></i>`
			],
			[
				`<i !Test="val"></i>`,
				`<i id="val"></i>`
			],
			[
				`<i !Test="bla" data-delay=50></i>`,
				`<i id="bla" data-delay="50" data-delayed="50"></i>`
			]
		];

		createTests(tests);
	});

	describe('Set specific variables for custom elements', function() {

		var tests = [
			[
				`<element-specific-variables +my_specific_variable="test"></element-specific-variables>`,
				`<element-specific-variables he-rendered="1">my_specific_variable: test</element-specific-variables>`
			],
			[
				`<element-specific-variables +my_specific_variable={% 1 + 1 %}></element-specific-variables>`,
				`<element-specific-variables he-rendered="1">my_specific_variable: 2</element-specific-variables>`
			],
		];

		createTests(tests);

	});

	describe('Error handling', function() {

		it('should throw an error when closing wrong tags', function(next) {

			var message;

			const old_error = console.error;

			console.error = function error(err, msg) {
				message = msg;
				console.error = old_error;
			}

			hawkejs.render('template_with_error', function donePartial(err, result) {

				// Restore console.log method
				console.error = old_error;

				let found_error = message.indexOf('»»»  46 | 		<h4>This should throw an error</h5>') > -1;

				if (found_error) {
					return next();
				}

				console.log(message);

				throw new Error('Got wrong error line in template_with_error');
			});
		});

		it('should give the correct line number when the template was compiled inline', function(next) {

			let source = `<h4>ERROR</h5>`;
			let compiled = hawkejs.compile(source);
			let message;

			const old_error = console.error;

			console.error = function error(err, msg) {
				message = msg;
				console.error = old_error;
			}

			hawkejs.render(compiled, {}, function done(err, html) {
				let found_error = message.indexOf('»»»   1 | <h4>ERROR</h5>') > -1;

				if (found_error) {
					return next();
				}

				console.log(message);

				throw new Error('Got wrong error line in inlined template');
			});

		});

		it('should give the correct line number even when handling markdown content', function(next) {

			var message;

			const old_error = console.error;

			console.error = function error(err, msg) {
				message = msg;
				console.error = old_error;
			}

			hawkejs.render('template_with_error_markdown', function donePartial(err, result) {

				// Restore console.log method
				console.error = old_error;

				let found_error = message.indexOf('»»»  9 | <h4>This will throw an error</h5>') > -1;

				if (found_error) {
					return next();
				}

				console.log(message);

				throw new Error('Got wrong error line in template_with_error_markdown');
			});

		});
	});
});

function createTests(tests) {
	for (let i = 0; i < tests.length; i++) {
		let code = tests[i][0],
		    title = tests[i][0].replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t'),
		    result = tests[i][1];

		if (title.length > 74) {
			title = title.slice(0, 72) + '…';
		}

		it(title, function(next) {
			test_id++;

			var compiled = hawkejs.compile({
				template_name: 'test_' + test_id,
				template: code,
				throw_error: true
			}),
			    vars;

			vars = {
				empty_arr : [],
				full_arr  : [0],
				single    : [0],
				numbers   : [0, 1, 2, 3],
				empty_obj : {},
				truthy    : 'truthy',
				date      : new Date('2019-03-07'),
				test      : {
					name  : 'testname',
					one   : 1,
					three : 3,
					two   : {
						three: {
							four: 4
						}
					}
				}
			};

			hawkejs.render(compiled, vars, function done(err, res) {

				if (err) {
					return next(err);
				}

				assertEqualHtml(res, result);
				next();
			});
		});
	}
}