const express = require('express');
const session = require('express-session')
const path = require("path");
const mc = require("mongodb").MongoClient;
const ObjectID = require('mongodb').ObjectID;

let db;


const app = express();
app.use(session({ secret: 'some secret here'}))
app.set("view engine", "pug");

app.use('/userid', express.static("./public"));
app.use('/orderform', express.static("./public"));
app.use(express.json());
app.use(express.urlencoded({extended: true})); 


app.get("/", home); 

app.get("/login", authorize,  (req, res, next)=> { res.render("pages/login");});
app.post("/login",  login);

app.get("/registeration", authorize, (req, res, next)=> { res.render("pages/register", {ErrorMessage: ""});});
app.post("/registeration", checkIfUserNameValid, addUser);


app.get("/profile", userProfile);

app.get("/logout", logout);

app.get("/userid/:pid", RenderUserProfile);
app.get("/users", listUsers);
app.get("/users/:pname", listUsersWithNameParam);
app.post("/togglePrivate", togglePrivacy);



app.get("/orderform", (req, res, next) => res.sendFile(path.join(__dirname+'/public/orderform.html')));
app.post("/orders", addorder);
app.get("/orders/:orderID", showOrder);


function authorize(req, res, next){
    if(req.session.loggedin){
        res.status(200).send("Already logged in.");
        return;
    }
    next();
}

//for profile: 
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
function userProfile(req, res, next){
    let username = req.session.username;
    let newID;
    db.collection("users").findOne({"username": username}, function(err, result){
        if(err){
			res.status(500).send("Error saving to database.");
			return;
		}
        console.log("This is the result: ", result["_id"]);
		newID = result["_id"];
        res.redirect("http://localhost:3000/userid/" + newID);
    });  
}
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////



//for home page
///////////////////////////////////////////
function home(req, res, next){
    res.status(200).render("pages/index", {loggedin: req.session.loggedin});
}
/////////////////////////////////////////


//for login: 
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
function login(req, res, next){
    if(req.session.loggedin){
        res.status(200).send("Already logged in.");
        return;
    }

	let username = req.body.username;
	let password = req.body.password;

    console.log("Logging in with credentials:");
    console.log("Username: " + req.body.username);
    console.log("Password: " + req.body.password);

    if(username == "" || password == ""){
		ErrorMessage = "Please Enter Username and Password.";
		res.status(200).render("pages/login", {ErrorMessage: ErrorMessage});
		return;
	}
    
    db.collection("users").findOne({"username": username}, function(err, result){
		if(err){
			ErrorMessage = "Error finding user to database.";
			res.status(200).render("pages/login", {ErrorMessage: ErrorMessage});
			return;
		}
        console.log(result);
        if(result.password === password){
            req.session.loggedin = true;
            req.session.username = username;
            // res.status(200).render("pages/login", {ErrorMessage: ErrorMessage});
            let newID = result["_id"];
            res.redirect("http://localhost:3000/userid/" + newID);
        }else{
            res.status(401).send("Not authorized. Invalid password.");
        }
	}
	);    
}


//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////




//for logout:
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
function logout(req, res, next){
	if(req.session.loggedin){
		req.session.loggedin = false;
        req.session.username = undefined;
		res.status(200).render("pages/index");
	}else{
		res.status(200).send("You cannot log out because you aren't logged in.");
	}
}

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////


//for registration
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
function checkIfUserNameValid(req, res, next){
    let user = {};
	let ErrorMessage = "";

    console.log(req.body.username);
    user.username = req.body.username;
	user.password = req.body.password;
	user.privacy = false;
	user.orderHistory = {};

	if(user.username == "" || user.password == ""){
		ErrorMessage = "Please Enter Username and Password.";
		res.status(200).render("pages/register", {ErrorMessage: ErrorMessage});
		return;
	}
	db.collection("users").findOne({"username": req.body.username}, function(err, result){
		if(err){
			ErrorMessage = "Error finding user to database.";
			res.status(200).render("pages/register", {ErrorMessage: ErrorMessage});
			return;
		}
        console.log(result);
		if(result){
			ErrorMessage = "User name already exists in the database.";
			res.status(200).render("pages/register", {ErrorMessage: ErrorMessage});
			return;
		}
		req.user = user;
		next();
	}
	);
}

function addUser(req, res, next){
	User = req.user;
	db.collection("users").insertOne(User, function(err, result){
		if(err){
			res.status(500).send("Error saving to database.");
			return;
		}
		let newID = result.insertedId;
        req.session.loggedin = true;
        req.session.username = User.username;
		//Redirect to the view page for the new user
		res.redirect("http://localhost:3000/userid/" + newID);
	});
}

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////



//for users
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

function RenderUserProfile(req, res, next){
	let id = req.params.pid;
	console.log("ID: " + id);
	let oid;
	try{
		oid = new ObjectID(id);
	}catch{
		res.status(404).send("That ID does not exist.");
		return;
	}
	
	db.collection("users").findOne({"_id": oid}, function(err, result){
		if(err){
			res.status(500).send("Error reading database.");
			return;
		}else{	
			db.collection("orders").find({"username": result.username}).toArray(function(error, listOfOrderForCurrUser){
				if(error){
					res.status(500).send("Error reading database.");
					return;
				}else{
					console.log(listOfOrderForCurrUser);
					if(result.privacy && req.session.username != result.username){
						res.send(404);
					}else if(req.session.username == result.username){
						res.status(200).render("pages/UserProfile", {orderHistory: listOfOrderForCurrUser, users: result, loggedin: req.session.loggedin});
					}else if(!result.privacy && req.session.username != result.username){
						res.status(200).render("pages/UserProfile", {orderHistory: listOfOrderForCurrUser, users: result, loggedin: req.session.loggedin});
					}
				}				
			});	
		}
	});
}

function listUsers(req, res, next){
	db.collection("users").find({}).toArray(function(err, result){
		if(err){
			res.status(500).send("Error reading database.");
			return;
		}
		res.status(200).render("pages/users", {loggedin: req.session.loggedin, users: result});
	});
}

function listUsersWithNameParam(req, res, next){
	// console.log("We're in list users");
	let name = req.params.pname;
	// new RegExp(thename, "i")
	db.collection("users").find({'username': {$regex : new RegExp(name, "i") }}).toArray(function(err, result){
		if(err){
			let ErrorMessage = "Error finding user to database.";
			res.status(200).render("pages/users", {ErrorMessage: ErrorMessage});
			return;
		}
		console.log(result);
		res.status(200).render("pages/users", {loggedin: req.session.loggedin, users: result});
		
		}
	);	
}

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

//for orders
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////

function showOrder(req, res, next){
	let id = req.params.orderID;
	console.log("ID: " + id);
	let oid;
	try{
		oid = new ObjectID(id);
	}catch{
		res.status(404).send("That ID does not exist.");
		return;
	}
	
	db.collection("orders").findOne({"_id": oid}, function(err, result){
		if(err){
			res.status(500).send("Error reading database.");
			return;
		}else{	
			db.collection("users").find({"username": result.username}).toArray(function(error, userOfThisOrder){
				if(error){
					res.status(500).send("Error reading database.");
					return;
				}else{
					console.log(userOfThisOrder);
					if(!userOfThisOrder.privacy){
						res.status(200).render("pages/orderSummary", {order: result, user: userOfThisOrder, loggedin: req.session.loggedin});
					}else if(userOfThisOrder.username === req.session.username){
						res.status(200).render("pages/orderSummary", {order: result, user: userOfThisOrder, loggedin: req.session.loggedin});
					}else{
						res.send(403, "Unauthorized Access");
					}
				}				
			});	
		}
	});


}

function addorder(req, res, next){
	let order = req.body;
	// console.log(order);
	order.username = req.session.username;
	db.collection("orders").insertOne(order, function(err, result){
		if(err){
			res.status(500).send("Error saving to database.");
			return;
		}
		//Redirect to the view page for the new user
		res.redirect("http://localhost:3000/orderform");
	});
}

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////



function togglePrivacy(req, res, next){
	console.log("This is toggle Privacy: ");
	let username = req.session.username;
	db.collection("users").findOne({"username": username}, function(err, result){
		if(err){
			res.status(500).send("Error reading database.");
			return;
		}
		let newID = result["_id"];

		db.collection("users").updateOne({"_id": newID}, {$set: {privacy: !result.privacy}}, function(err1 ,result1){
			if(err1) throw err1;
			console.log(result1);
			res.redirect("http://localhost:3000/userid/" + newID);
		});	
	});
}



mc.connect("mongodb://localhost:27017", function(err, client) {
	if (err) {
		console.log("Error in connecting to database");
		console.log(err);
		return;
	}

	let userNames = ["winnifred", "lorene", "cyril", "vella", "erich", "pedro", "madaline", "leoma", "merrill",  "jacquie"];
	let users = [];

	userNames.forEach(name =>{
		let u = {};
		u.username = name;
		u.password = name;
		u.privacy = false;
		users.push(u);
	});


mc.connect("mongodb://localhost:27017/", function(err, client) {
if(err) throw err;	

db = client.db('a4');

db.listCollections().toArray(function(err, result){
	if(result.length == 0){
		db.collection("users").insertMany(users, function(err, result){
			if(err){
				throw err;
			}
			console.log(result.insertedCount + " users successfully added (should be 10).");
		});
	}
});
});
	
	//Set the app.locals.db variale to be the 'a4' database
	db = client.db("a4");
	app.listen(3000);
	console.log("Server listening on port 3000");
})