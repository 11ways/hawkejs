let assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    renderer,
    hawkejs;

let Blast,
    Bound;

describe('Variables', () => {

	before(() => {
		hawkejs = createHawkejsInstance();
		hawkejs.parallel_task_limit = 1;
		hawkejs.addViewDirectory(__dirname + '/templates');
		Blast = __Protoblast;
		Bound = Blast.Bound;
		renderer = hawkejs.createRenderer();
	});

	describe('instanceof', () => {
		it('should return true even though it is a proxy', () => {
			let vars = renderer.prepareVariables({});
			assert.strictEqual(vars instanceof Blast.Classes.Hawkejs.Variables, true);
		});
	});

	describe('setter', () => {
		it('should allow variables to be set via a setter', () => {

			let vars = renderer.prepareVariables({});
			vars.getProxy().bla = 47;

			assert.strictEqual(vars.get('bla'), 47);

			const proxy = vars.getProxy();
			proxy.i = 0;
			proxy.i++;
			proxy.i++;
			assert.strictEqual(vars.get('i'), 2);
			assert.strictEqual(proxy.i, 2);
		});
	});

	describe('#length', () => {
		it('should return the amount of variables in the instance', () => {
			let vars = renderer.prepareVariables({alpha: 47, beta: 100});
			assert.strictEqual(vars.length, 2);

			vars.getProxy().beta = 48;
			vars.getProxy().gamma = 49;
			assert.strictEqual(vars.length, 3);
		});

		it('should ignore inherited values', () => {

			let vars = renderer.prepareVariables({alpha: 47, beta: 100});
			let overlay = vars.overlay({beta: 48});

			assert.strictEqual(overlay.length, 1);

			overlay.getProxy().alpha = 47;
			assert.strictEqual(overlay.length, 2);
		});
	});

	describe('#overlay(new_variables)', () => {
		it('should overlay the new variables', () => {

			let vars = renderer.prepareVariables({alpha: 47, beta: 100});
			let new_vars = vars.overlay({beta: 48});

			assert.strictEqual(vars.get('alpha'), 47);
			assert.strictEqual(vars.get('beta'), 100);

			assert.strictEqual(new_vars.get('alpha'), 47);
			assert.strictEqual(new_vars.get('beta'), 48);
		});
	});

	describe('#toJSON()', () => {
		it('should return a JSON representation of the variables', () => {

			let vars = renderer.prepareVariables({alpha: 47, beta: 100, obj: {a: 1}});
			let json_obj = vars.toJSON();

			assert.deepStrictEqual(json_obj, {alpha: 47, beta: 100, obj: {a: 1}});

			let overlay = vars.overlay({beta: 48});
			json_obj = overlay.toJSON();
			assert.deepStrictEqual(json_obj, {alpha: 47, beta: 48, obj: {a: 1}});
		});
	});

	describe('#getOwnDict()', () => {
		it('should return all the own properties in a dictionary', () => {
			let vars = renderer.prepareVariables({alpha: 47, beta: 100, obj: {a: 1}});
			let dict = vars.getOwnDict();

			assert.deepStrictEqual(dict, {alpha: 47, beta: 100, obj: {a: 1}});

			let overlay = vars.overlay({beta: 48});
			dict = overlay.getOwnDict();
			assert.deepStrictEqual(dict, {beta: 48});
		});
	});

	describe('#toHawkejs()', () => {
		it('should be used as a JSON-DRY cloning method', () => {

			let vars = renderer.prepareVariables({alpha: 47, beta: 100, obj: {a: 1}});
			let cloned = Bound.JSON.clone(vars, 'toHawkejs');

			assert.strictEqual(vars.get('alpha'), 47);
			assert.strictEqual(cloned.get('alpha'), 47);

			let original_obj = vars.get('obj');
			let cloned_obj = cloned.get('obj');

			assert.strictEqual(original_obj.a, 1);
			assert.strictEqual(cloned_obj.a, 1);

			assert.deepStrictEqual(original_obj, cloned_obj);
			assert.notStrictEqual(original_obj, cloned_obj);
			assert.strictEqual(cloned instanceof Blast.Classes.Hawkejs.Variables, true);

			vars = Hawkejs.Variables.cast({obj: {a: 2}}, renderer);
			cloned = Bound.JSON.clone(vars, 'toHawkejs');

			original_obj = vars.get('obj');
			cloned_obj = cloned.get('obj');

			assert.strictEqual(original_obj.a, 2);
			assert.strictEqual(cloned_obj.a, 2);
			assert.deepStrictEqual(original_obj, cloned_obj);
			assert.notStrictEqual(original_obj, cloned_obj);
			assert.strictEqual(cloned instanceof Blast.Classes.Hawkejs.Variables, true);
		});
	});

	describe('#getShallowClone()', () => {
		it('should return a shallow clone', () => {

			let vars = renderer.prepareVariables({alpha: 47, beta: 100, obj: {a: 1}});
			let clone = vars.getShallowClone();

			assert.strictEqual(vars.get('alpha'), 47);
			assert.strictEqual(vars.get('obj').a, 1);

			assert.strictEqual(clone.get('alpha'), 47);
			assert.strictEqual(clone.get('obj').a, 1);

			assert.strictEqual(vars.get('obj'), clone.get('obj'));

			clone.get('obj').a = 2;
			assert.strictEqual(vars.get('obj').a, 2);
			assert.strictEqual(clone.get('obj').a, 2);
		});

		it('should work when being overlayed', () => {

			let initial = Hawkejs.Variables.cast({alpha: 47, beta: 100}, renderer);

			let base_variables = initial.overlay();
			let shallow_clone = base_variables.getShallowClone();

			let extra_variables = renderer.prepareVariables({beta: 48, gamma: 49});

			let overlayed = shallow_clone.overlay(extra_variables);

			assert.strictEqual(overlayed.get('alpha'), 47);
			assert.strictEqual(overlayed.get('beta'), 48);
			assert.strictEqual(overlayed.get('gamma'), 49);
		});
	});

	describe('#getExistingCloneIfValied(symbol)', () => {
		it('should return the existing clone if it is valid', () => {

			const CLONE_SYMBOL = Symbol();

			let vars = renderer.prepareVariables({alpha: 47, beta: 100, obj: {a: 1}});
			let clone = vars.getExistingCloneIfValid(CLONE_SYMBOL);

			if (clone) {
				throw new Error('Should not have found a clone');
			}

			clone = Bound.JSON.clone(vars, 'toHawkejs', [renderer]);
			clone[CLONE_SYMBOL] = clone;
			vars[CLONE_SYMBOL] = clone;

			assert.strictEqual(vars.get('alpha'), 47);
			assert.strictEqual(vars.get('obj').a, 1);

			assert.strictEqual(clone.get('alpha'), 47);
			assert.strictEqual(clone.get('obj').a, 1);

			vars.get('obj').a = 2;
			assert.strictEqual(vars.get('obj').a, 2);
			assert.strictEqual(clone.get('obj').a, 1);

			let new_clone = vars.getExistingCloneIfValid(CLONE_SYMBOL);
			assert.strictEqual(new_clone, clone);
		});
	});
});