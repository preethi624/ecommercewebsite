const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController.js');

const profileController=require('../controllers/user/profileController.js')
const productController=require("../controllers/user/productController.js")
const {userAuth,adminAuth}=require("../middleware/auth")
const { ensureAuthenticated } = require('../middleware/auth');
const passport=require("passport");
const User=require("../models/userSchema.js")

router.get('/', userController.loadHomepage);
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);
router.get("/pageNotFound",userController.pageNotFound)


router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),async(req,res)=>{
    try{
    let user=await User.findOne({googleId:req.user.id})
    if (!user) {
        // If user not found, create a new user document with Google ID
        user = new User({
            username: req.user.displayName,
            email: req.user.emails[0].value,
            googleId: req.user.id
        });
        await user.save();
    }
    req.session.user = req.user
    console.log("Google authentication successful,user:",req.user)
    res.redirect('/')
}catch(error){

console.error("Error during Google sign-in:", error);
            res.redirect('/signup');
}
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
router.get("/order/order-cancel/:Id/:productId",productController.orderCancel)
router.post("/userprofile/cancel-order",productController.cancelOrder)
router.get("/order/orderDetails/:orderId/:itemId",productController.orderDetails)
router.post("/order/codConfirmation/:id",productController.codConfirmation)
router.get("/order-confirmation",productController.orderConfirmation)
router.get("/getCoupons",productController.getCoupon)
router.post("/apply-coupon",productController.applyCoupon)
router.post("/wishlist/add",productController.addToWishlist)
router.post('/wishlist/remove/:id',productController.removeWishlist)
router.get('/wishlist',productController.getWishlist)
router.get("/wallet",profileController.getWallet)
router.post('/wallet/add',profileController.addWallet)
router.get("/userprofile/return/:id/:itemId",productController.returnOrder)
router.post("/orders/confirm-return",productController.confirmReturn)
router.get("/orders",productController.getOrders)
router.post("/cart/update-quantity",productController.updateCart)
router.get('/download-invoice/:orderId/:itemId',productController.downloadInvoice)
router.post('/order/paymentWallet/:id',productController.walletPayment)
router.post("/update-quantity/:itemId",userController.updateQuantity)
router.post("/create-order",productController.createOrder)







router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
       
        res.redirect('/demoUser');
    }
);





module.exports = router;
