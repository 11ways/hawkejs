var path = require('path');
var express = require('express');
var lessmw = require('less-middleware')
var hawkejs = require('../lib/hawkejs');

// Initialize express
var app = express();

// Use hawkejs as our template engine, map it to the .ejs extension
app.engine('ejs', hawkejs.__express);

// Enable hawkejs debug
hawkejs._debug = true;

// Add client side suport
hawkejs.enableClientSide(path.join(__dirname, 'js'), 'js');

// Express configurations
app.configure(function(){

	var bootstrapPath = path.join(__dirname, '..', 'node_modules', 'bootstrap');
	console.log(bootstrapPath);
	app.set('views', __dirname + '/templates');
	app.set('view engine', 'ejs');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());

	// Make the templates publicly accessible
	app.use('/hawkejs', express.static(path.join(__dirname, 'templates')));
	
	// Add the javascript files
	app.use('/hawkejs/vendor', express.static(path.join(__dirname, '..', 'vendor')));
	app.use('/js', express.static(path.join(__dirname, 'js')));
	
	// Do the same for other thigns
	app.use('/img', express.static(path.join(bootstrapPath, 'img')));
	app.use('/js/bootstrap', express.static(path.join(bootstrapPath, 'js')));
	
	
	app.use(lessmw({src    : path.join(__dirname, 'less'),
					paths  : [path.join(bootstrapPath, 'less')],
					dest   : path.join(__dirname, 'css'),
					prefix : '/css'
					}));
	
	app.use('/css', express.static(path.join(__dirname, 'css')));
	
	// Add Hawkejs' middleware
	app.use(hawkejs.middleware);
	
	app.use(app.router);
});

// Sample "database records"
var db = {
	20: {
		title: "Heading 20",
		text: "Standard heeft de openingswedstrijd van de 24ste speeldag in onze vaderlandse competitie gewonnen. De Luikenaars klopten in eigen huis KV Kortrijk met 2-0, Michy Batshuayi blonk uit met een doelpunt...",
	},
	21: {
		title: "Scores injured in clashes as Egypt marks revolution",
		text: "Police fire teargas at stone-throwing protesters as supporters and opponents of President Mohamed Morsy clash in Cairo on the second anniversary of Egypt's revolution"
	},
	22: {
		title: "Unlocking new smartphone becomes harder Saturday",
		text: "Smartphones purchased after Saturday can't be legally unlocked without permission from the carrier, according to a recent ruling by the Library of Congress."
	}
}

app.get('/', function(req, res){
  res.render('pages/index', {firstname: "Riza", lastname: "Hawkeye", newsitem: db[21]});
});

app.get('/news/:id', function(req, res){
	
	var newsitem = db[req.params.id];
	
  res.render('elements/image', {firstname: "Riza", lastname: "Hawkeye", newsitem: newsitem});
});

app.listen(3000);
console.log('Listening on port 3000');