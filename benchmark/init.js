var Hawkejs = require('../index.js'),
    hawkejs = new Hawkejs(),
    libpath = require('path');

function createTestVariables() {
	var result = {
		a: 'a',
		b: 'b',
		c: 'c',
		my: {
			ref: {
				to: {
					alpha: 'alpha'
				}
			}
		},
		stuff: 'stuff',
		activity: {
			Teachers: [
				{title: 1}
			]
		},
		teacher: {
			Links: [
				{title: 'First link title', _href: 'href'},
				{title: 'Second link title'}
			]
		},
		empty_obj: {},
		test: {
			name: 'testname',
			one : 1,
			three: 3
		}
	};

	return result;
};

global.hawkejs = hawkejs;
global.Hawkejs = Hawkejs;

require('../test/helpers/_load.js')(hawkejs);
hawkejs.skip_set_err = true;

module.exports = {
	Hawkejs   : Hawkejs,
	hawkejs   : hawkejs,
	createTestVariables
};