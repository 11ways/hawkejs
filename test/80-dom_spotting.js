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
		});

		it('should call back with initial, existing values', async function() {

			await evalPage(function() {

				let span = document.createElement('span');
				span.textContent = 'span2';

				span.setAttribute('my-attribute', 0);

				document.body.append(span);

				span.setAttribute('my-attribute', 1);
			});

			let changes = await evalPage(function() {
				return window.my_attribute_changes;
			});

			assert.deepStrictEqual(changes, [
				{ value: '1', old_value: null, initial: true },
				{ value: '1', old_value: '0', initial: false }
			]);
		});

		it('should check existing elements upon creation', async function() {

			// Elements & listener added in the same tick
			await evalPage(function() {
				let span = document.createElement('span');
				span.textContent = 'span';
				span.setAttribute('my-other-attribute', 'init');
				document.body.append(span);

				window.my_attribute_changes = [];

				hawkejs.constructor.onAttribute('my-other-attribute', function(element, value, old_value, initial) {

					my_attribute_changes.push({
						value     : value,
						old_value : old_value,
						initial   : initial
					});
				});
			});

			let changes = await evalPage(function() {
				return window.my_attribute_changes;
			});

			assert.strictEqual(changes.length, 1, 'The callback should have only been called once');

			assert.deepStrictEqual(changes, [
				{ value: 'init', old_value: null, initial: true },
			]);

			// Elements added first
			await evalPage(function() {
				let span = document.createElement('span');
				span.textContent = 'span';
				span.setAttribute('my-third-attribute', 'start');
				document.body.append(span);
			});

			await __Protoblast.Classes.Pledge.after(20);

			await evalPage(function() {
				window.my_attribute_changes = [];

				hawkejs.constructor.onAttribute('my-third-attribute', function(element, value, old_value, initial) {

					my_attribute_changes.push({
						value     : value,
						old_value : old_value,
						initial   : initial
					});
				});
			});

			await __Protoblast.Classes.Pledge.after(20);

			changes = await evalPage(function() {
				return window.my_attribute_changes;
			});
		});
	});

});