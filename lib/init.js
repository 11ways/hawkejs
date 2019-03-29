var options,
    Hawkejs,
    Blast;

// Get an existing Protoblast instance or create a new one
if (typeof __Protoblast != 'undefined') {
	Blast = __Protoblast;
} else {
	Blast = require('protoblast')(false);
}

// Get the Hawkejs namespace
Hawkejs = Blast.Bound.Function.getNamespace('Hawkejs');

// Load the bootstrap file
Blast.require(['bootstrap'], {pwd: __dirname});

// Export the Hawkejs namespace
module.exports = Hawkejs;