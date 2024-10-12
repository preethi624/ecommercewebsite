const { request } = require("express");
const User=require("../models/userSchema");
const userAuth=(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            console.log("user data",data)
            if(data&&!data.isBlocked){
                next()
            }
            else{
                res.redirect("/logout")
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware",error)
            res.status(500).send("Internal server error")
        })
    }else{
        res.redirect("/login")
    }
}
const adminAuth=(req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        console.log("user data",data)
        if(data){
            next()
        }else{
            res.redirect("/admin/login")
        }
    })
    .catch(error=>{
        console.log("Error in adminauth middleware")
        res.status(500).send("Internal server error")
    })
}
// Middleware to check if the user is logged in and is an admin
const adminAuth1 = (req, res, next) => {
    if (req.session && req.session.admin ) {
        next(); // User is authenticated and is an admin, proceed to the next middleware or route
    } else {
        res.redirect('/admin/login'); // Redirect to login if not authenticated or not an admin
    }
};
const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    } else {
      res.redirect('/login');
    }
  };
  

module.exports={
    userAuth,
    adminAuth,
    adminAuth1,
    ensureAuthenticated,
}