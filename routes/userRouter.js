const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController.js');

const profileController=require('../controllers/user/profileController.js')
const productController=require("../controllers/user/productController.js")
const {userAuth,adminAuth}=require("../middleware/auth")
const { ensureAuthenticated } = require('../middleware/auth');
const passport=require("passport");

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
router.get('/demoUser',profileController.demo)
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get("/userProfile",profileController.getUserProfile)
router.post("/profile/add-address",profileController.addAddress)
router.post("/profile/edit-address/:addressId",profileController.editAddress)
router.post("/profile/delete-address/:id",profileController.deleteAddress)
router.post("/cart/add/:productId",productController.addToCart)
router.get("/cart",productController.getCart)
router.post("/cart/remove/:productId",productController.removeCart)
router.post("/profile/set-default-address/:addressId",profileController.defaultAddress)
router.get("/user/addresses",profileController.addresses)
router.get('/products',profileController.getProducts)
router.get("/order/summary/:productId",productController.getOrderSummary)
router.get("/order/checkout/:productId?",productController.getCheckout)
router.post("/order/checkout/",productController.postCheckout)
router.get("/order/confirmation/:newOrderId",productController.confirmation)
router.post("/userprofile/cancel-order/:orderId",productController.cancelOrder)



router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
       
        res.redirect('/demoUser');
    }
);





module.exports = router;
