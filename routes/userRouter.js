const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController.js');
const passport=require("passport")
router.get('/', userController.loadHomepage);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get("/pageNotFound",userController.pageNotFound)


router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    console.log("Google authentication successful,user:",req.user)
    res.redirect('/')
})
router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userController.logout)




module.exports = router;
