/* istanbul ignore file */

let assert    = require('assert'),
    Hawkejs   = require('../index.js');

describe('DOM Spotting', function() {

	describe('Hawkejs.onAttribute(name, callback)', function() {
		it('should call back when the attribute changes anywhere', async function() {

			await setLocation('/home');

			await evalPage(function() {
				let span = document.createElement('span');
				span.textContent = 'span';
				document.body.append(span);

				window.my_attribute_changes = [];

				hawkejs.constructor.onAttribute('my-attribute', function(element, value, old_value, initial) {

					my_attribute_changes.push({
						value     : value,
						old_value : old_value,
						initial   : initial
					});
				});

				span.setAttribute('my-attribute', 0);
				span.setAttribute('my-attribute', 1);
			});

			let changes = await evalPage(function() {
				let result = window.my_attribute_changes.slice(0);
				window.my_attribute_changes = [];
				return result;
			});

			assert.deepStrictEqual(changes, [
				{ value: '1', old_value: null, initial: false },
				{ value: '1', old_value: '0', initial: false }
			]);

			await evalPage(function() {

				let span = document.createElement('span');
				span.textContent = 'span2';

				span.setAttribute('my-attribute', 0);

				document.body.append(span);

				span.setAttribute('my-attribute', 1);
			});

			changes = await evalPage(function() {
				return window.my_attribute_changes;
			});

			assert.deepStrictEqual(changes, [
				{ value: '1', old_value: null, initial: true },
				{ value: '1', old_value: '0', initial: false }
			]);
		});
	});

});