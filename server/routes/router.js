const route = require('express').Router()
const store = require('../middleware/multer');
const ImageModel = require('../models/image');
const middleware = require("../middleware/index");
const fs = require('fs');
const passport = require("passport");
const User = require("../models/user");

//root route
route.get("/", function(req, res){
    res.render("landing");
});

// show register form
route.get("/register", function(req, res){
   res.render("register"); 
});

//handle sign up logic
route.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Successfully Signed Up! Nice to meet you " + req.body.username);
           res.redirect("/Images"); 
        });
    });
});

//show login form
route.get("/login", function(req, res){
   res.render("login"); 
});

//handling login logic
route.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/Images",
        failureRedirect: "/login"
    }), function(req, res){
});

// logout route
route.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "LOGGED YOU OUT!");
   res.redirect("/");
});



route.get('/Images',async (req, res) => {
		const images = await ImageModel.find();
		res.render('index',{images : images });
});

//new
route.get('/Images/new', (req,res) => {
	if (req.isAuthenticated()) {
		res.render('new');
	}
	else{
		res.render('login');	
	}
});
//create
route.post('/Images',middleware.isLoggedIn,store.array('images',4), (req,res,next) => {
	const files = req.files;
	
	if(!files){
		const error = new Error('choose file');
		error.httpStatusCode = 400;
		return next(error)
	}
	//convert images into base64 encoding
	let imageArray = files.map((file) =>{
		let img = fs.readFileSync(file.path);
		
		return encode_image = img.toString('base64');
	})
	const result = imageArray.map((src,index) => {
		//create object to create in db collection
		const finalImg = {
			filename : files[index].originalname,
			contentType: files[index].mimetype,
			imageBase64: src,
			author : {
        			id: req.user._id,
       			 	username: req.user.username
    		}
		}
		
		const newUpload = new ImageModel(finalImg);
		return newUpload
			.save()
			.then(() =>
			{
				return { msg : `${files[index].originalname} uploaded successfully..!`}
			})
			.catch(error =>{
                    if(error){
                        if(error.name === 'MongoError' && error.code === 11000){
                            return Promise.reject({ error : `Duplicate ${files[index].originalname}. File Already exists! `});
                        }
                        return Promise.reject({ error : error.message || `Cannot Upload ${files[index].originalname} Something Missing!`})
                    }
                })
		});
	
	Promise.all(result)
	.then( msg => {
		res.redirect('/Images');
	})
	.catch(error => {
		res.json(error);
	})
});

//show
route.get('/Images/:id', function(req,res){
    	ImageModel.findById(req.params.id).exec(function(err, foundImage){
        if(err){
            console.log(err);
        } else {
            res.render('show', {image: foundImage});
        }
    });
});
//edit
route.get("/Images/:id/edit", middleware.checkUserImage, function(req, res){
   ImageModel.findById(req.params.id, function(err, foundImage){
        res.render("edit", {image : foundImage});
    });
});

route.put("/Images/:id",middleware.checkUserImage, function(req, res){
    ImageModel.findByIdAndUpdate(req.params.id, req.body.image, function(err, updatedImage){
       if(err){
            res.redirect("back");
       } else {
           res.redirect("/Images/" + req.params.id);
       }
    });
});

// Delete Images
route.delete("/Images/:id",middleware.checkUserImage, function(req, res){
   ImageModel.findByIdAndRemove(req.params.id, function(err){
      if(err){
          res.redirect("/Images");
      } else {
          res.redirect("/Images");
      }
   });
});
//Greensscreen
//new
route.get('/Greenscreen',async (req, res) => {
		if (req.isAuthenticated()) {
		res.render('Greenscreen/new');
	}
	else{
		res.render('login');	
	}
});


module.exports = route;