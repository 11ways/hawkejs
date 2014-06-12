var Nuclei,
    async,
    use;

if (typeof alchemy !== 'undefined' && alchemy.use) {
	use = alchemy.use;
} else {
	use = require;
}

Nuclei = use('nuclei').Nuclei;
async  = use('async');

// CODE //

module.exports = Hawkejs;