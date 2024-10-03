const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController.js');

const profileController=require('../controllers/user/profileController.js')
const passport=require("passport");
const { adminAuth } = require('../middleware/auth.js');
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
router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password",profileController.postNewPassword)
router.get("/productDetails",userController.productDetails)
router.get('/demoUser',adminAuth,profileController.demo)
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback route
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/demoUser');
    }
);





module.exports = router;
