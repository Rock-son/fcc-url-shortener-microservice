var express = require("express"),
    MongoClient = require("mongodb").MongoClient,
    path = require("path"),
    port = process.env.PORT || 3000,    
    dbUrl = "mongodb://" + process.env.DBUSER + ":" + process.env.DBPASS +"@ds245715.mlab.com:45715/fcc_projects",
    collection = "url_shortener",
    maxId = 1,

    app = express();

// middleware
app.use(express.static(path.join(__dirname, "/public")));  //app.use(require('stylus').middleware(path.join(__dirname + '/public')))

// NEW URL
app.get('/new/*', function(req, res) {
    var url = req.url.replace(/\/new\//, "");
    
    if (/^(?:https?\:\/\/[^\.]|www\.(?=[a-zA-Z0-9]))((\.)?[\w\-\w])+(\.[a-zA-Z0-9]{2,3}|\.[a-zA-Z0-9]{2,3}(?=\/)[\/\w\-\p{L}\p{M}]*[^\-\_\:]*)$/.test(url)) { // check validity of internet domain address
        //CONNECT
        MongoClient.connect(dbUrl, function(err, db) {
            if (err) throw err;

            //FIND URL
            db.collection(collection).find(
                {url: {$eq: url}},              // first parameter: find
                {url: 1, url_nr: 1, _id: 0}     // second parameter: return values
            
            ).toArray(function(error, documents) {
                if (error) throw error;
                if (documents.length) {
                    res.writeHead(200, { 'content-type': 'text/html' });
                    res.end(JSON.stringify({"original_url": documents[0].url,
                                            "short_url":"<a target='_blank' href='https://url-shortener-microservice-rok.herokuapp.com/" + documents[0].url_nr + "'>" + 
                                                "https://url-shortener-microservice-rok.herokuapp.com/" + documents[0].url_nr +"</a>"}));
                    db.close();
                } else {
                //OR INSERT if not found
                    db.collection(collection).find().sort({url_nr:-1}).limit(1).toArray(function(err, data) {
                        if (error) throw error;
                        maxId = data.length ? data[0].url_nr : 1000;
                        maxId++;                
                        insertDB(db, collection, maxId, url, res);
                    });
                }                
            });
        });   
    } else {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end(JSON.stringify({"error":"Wrong url format, make sure you have a valid protocol and real site."}));
    }
});

// EXISTING SHORT URL
app.get('/:id', function(req, res) {
       
    var url_nr = 0;
    //IF PASSED STRING IS A NUMBER
    if (url_nr = parseInt(req.params.id)) {
        
        MongoClient.connect(dbUrl, function(err, db) {
            if (err) throw err;
            //FIND url nr
            db.collection(collection).find(
                    {url_nr: {$eq: url_nr}},       // first parameter: find
                    {url: 1, url_nr: 1, _id: 0}     // second parameter: return values

                ).toArray(function(error, documents) {
                    if (error) throw error;
                    if (documents.length) {
                        res.redirect(documents[0].url);
                        db.close();
                    } else {
                        res.writeHead(200, { 'content-type': 'text/plain' });
                        res.end(JSON.stringify({"error":"This url is not in the database."}));
                        db.close();
                    }
                });        
        });
    } else {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end(JSON.stringify({"error":"You need to pass a number to the url OR wrong path! Index deleted!"}));
    }
});



app.listen(port);





function insertDB(db, collection, maxUrlNr, url, res) {

    //INSERT
    db.collection(collection).insert({
        url_nr: maxUrlNr < 1000 ? 1000 : +maxUrlNr,
        url: url,
        time: new Date()
    }, function(error, data) {
        if (error) throw error;
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(JSON.stringify({"original_url": url,
                                "short_url":"<a target='_blank' href='https://url-shortener-microservice-rok.herokuapp.com/" + maxUrlNr + "'>" + 
                                        "https://url-shortener-microservice-rok.herokuapp.com/" + maxUrlNr +"</a>"}));
    });
    db.close();
}