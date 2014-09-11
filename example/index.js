var path    = require('path'),
    express = require('express'),
    lessmw  = require('less-middleware'),
    Hawkejs = require('../index'),
    app     = express(),
    hawkejs;

hawkejs = new Hawkejs();

hawkejs.addViewDirectory(__dirname + '/views/', 1000);
hawkejs.addViewDirectory(__dirname + '/../test/templates/', 500);

hawkejs.configureExpress(app, express);

// Enable hawkejs debug
hawkejs._debug = true;

// Add client side suport
// hawkejs.enableClientSide(
//     app,     // The express app
//     express, // Express itself
//     path.join(__dirname, 'templates'), // Where the original view files are
//     path.join(__dirname, 'js')         // Where we can store them for the client
//);

// Express configurations
app.configure(function(){

	var bootstrapPath = path.join(__dirname, '..', 'node_modules', 'bootstrap');
	//app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());

	app.use(function(req, res, next) {

		res.locals({
			hawkejs: {
				req: req,
				res: res
			}
		});

		next();
	});

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
	//app.use(hawkejs.middleware);
	
	app.use(app.router);
});

// Sample "database records"
var db = {
	20: {
		id: 20,
		title: "Heading 20",
		text: "Standard heeft de openingswedstrijd van de 24ste speeldag in onze vaderlandse competitie gewonnen. De Luikenaars klopten in eigen huis KV Kortrijk met 2-0, Michy Batshuayi blonk uit met een doelpunt...",
	},
	21: {
		id: 21,
		title: "Scores injured in clashes as Egypt marks revolution",
		text: "Police fire teargas at stone-throwing protesters as supporters and opponents of President Mohamed Morsy clash in Cairo on the second anniversary of Egypt's revolution"
	},
	22: {
		id: 22,
		title: "Unlocking new smartphone becomes harder Saturday",
		text: "Smartphones purchased after Saturday can't be legally unlocked without permission from the carrier, according to a recent ruling by the Library of Congress."
	},
	47: {
		id: 47,
		title: "Newsitem 47",
		text: "Newsitem text 47"
	}
}

//app.use(, express.static(hawkejs.createClientFile()));
app.get('/hawkejs/hawkejs-client.js', function(req, res) {
	hawkejs.createClientFile(function(err, path) {
		res.sendfile(path);
	})
});

app.get('/', function(req, res){
	res.render('pages/index', {firstname: "Riza", lastname: "Hawkeye", newsitem: db[21]});
});

app.get('/news/:id', function(req, res){
	var newsitem = db[req.params.id];
	res.render('elements/image', {firstname: "Riza", lastname: "Hawkeye", newsitem: newsitem});
});

app.get('/test:id.js', function(req, res) {
	// To test we add a random timeout
	setTimeout(function() {
		res.end('console.log("%c[DEBUG] ", "font-weight:bold;color:red;", "Loaded testfile ' + req.params.id + '");');
	}, ~~(Math.random()*20)*10);
});

var nr = 0,
	colors = [
		'#8329D9',
		'#987186',
		'#717298',
		'#988B00',
		'#FF6666',
		'#9C9080',
		'#7A8D9B',
		'#F76819',
		'#F03D05',
		'#2C2218'
	];

app.get('/style:nr.css', function(req, res) {
	setTimeout(function() {
		res.end('.styletest-' + nr + ' { background-color: ' + colors[nr] + ';display: floxgorn;}');
		nr++;
	}, ~~(Math.random()*20)*10);
});

app.post('/hawkejs/template', function(req, res) {
	hawkejs.getTemplatePath(req.body.name, function(err, path) {
		if (!path) {
			res.send(404, 'error');
		} else {
			res.sendfile(path);
		}
	});
});

app.listen(3000);
console.log('Listening on port 3000');