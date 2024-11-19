const User = require("../../models/userSchema");
const Category=require("../../models/categorySchema")
const Product=require("../../models/productSchema")

const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};
const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user;  
        const categories = await Category.find({ isListed: true });

        const page = parseInt(req.query.page) || 1;
        const limit = 4; // Number of products per page

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            isDeleted: false,
            category: { $in: categories.map(category => category._id) }
        });
        
        const totalPages = Math.ceil(totalProducts / limit);

        let productData = await Product.find({
            isBlocked: false,
            isDeleted: false,
            category: { $in: categories.map(category => category._id) }
        })
        .sort({ createdAt: -1 }) // Sort by creation date (newest first)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('category');

        
        let wishlistIds = [];
        if (user) {
            const userData = await User.findById(user.id).populate('wishlist');
            if (userData && !userData.isBlocked) {
                wishlistIds = userData.wishlist.map(product => product._id.toString());
            }
        }

      
        productData = productData.map(product => ({
            ...product.toObject(),
            isInWishlist: wishlistIds.includes(product._id.toString())
        }));
        const trendingProducts = await Product.find({
            isBlocked: false,
            isDeleted: false,
            _id: { $nin: productData.map(product => product._id) }, // Exclude main products
            category: { $in: categories.map(category => category._id) }
        })
        .sort({ createdAt: 1 }) // Oldest first to reverse
         // Limit to desired number for trending section
        .populate('category');

        res.setHeader('Cache-Control', 'no-store');

        return res.render("home", {
            user: user ? await User.findById(user.id).populate('wishlist') : null,
            products: productData,
            wishlistIds,
            currentPage: page,
            totalPages,
            categories ,
            trendingProducts: trendingProducts,
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error occurred while loading the homepage.");
    }
};

const loadSignup = async (req, res) => {
    try {
        return res.render("signup");
    } catch (error) {
        console.log("homepage not found", error);
        res.status(500).send("server error");
    }
};

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        });
        await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });
        return true;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}
const signup = async (req, res) => {
    try {
        const { username, phone, email, password, referralCode } = req.body;

        // Check if user exists
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists." });
        }

        // Referral logic
        let referredByUser = null;
        if (referralCode) {
            referredByUser = await User.findOne({ referralCode });
            if (referredByUser) {
                // Credit 10 points to referrer
                referredByUser.referralCredits = referredByUser.referralCredits + 10;
                await referredByUser.save();
            }
        }

        // Create a new referral code
        const newReferralCode = username + Math.floor(Math.random() * 1000);

        // Generate OTP
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.render("signup", { message: "Error sending verification email." });
        }

        // Initialize session data
        req.session.userOtp = otp;
        req.session.userData = { username, phone, email, password, newReferralCode, referredByUser };

        // Render the OTP verification page
        res.render("verify-otp");
        console.log("OTP SENT", otp);
    } catch (error) {
        console.error("signup error", error);
        res.redirect("/pageNotFound");
    }
};


const securePassword = async (password) => {
    try {
        const passwordHash= await bcrypt.hash(password, 10);
        return passwordHash
    } catch (error) {
        console.error("Error hashing password", error);
    }
};

const verifyOtp = async (req, res) => {
    try {
        const {otp}=req.body;
        console.log("Enterd otp",otp)
        console.log("session otp:",req.session.userOtp)
        if(otp===req.session.userOtp){
            const user=req.session.userData
            const passwordHash=await securePassword(user.password)
            const saveUserData=new User({
                username:user.username,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
                referralCode:user.newReferralCode,
                referredBy:user.referredByUser
            })
            await saveUserData.save()
            if (user.referredByUser) {
                await User.updateOne(
                    { _id: user.referredByUser._id },
                    { $inc: { referralCredits: 10 } } // Example field to track rewards
                );
            }
            
            req.session.userOtp=null;
            req.session.userData=null;
           
               return res.json({ success: true, redirectUrl: "/" });
            
          
            
        }else{
            res.status(400).json({success:false,message:"Invalid OTP,please try again"})
        }
        
    } catch (error) {
        console.error("Error verifying Otp",error);
        res.status(500).json({success:false,message:"An error occured"})
        
    }
}
const resendOtp=async (req,res)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})

        }
        const otp=generateOtp();
        req.session.userOtp=otp;
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"OTP resend successfully"})

        }else{
            res.status(500).json({success:false,message:"Failed to resend otp,please try again"})
        }
        
    } catch (error) {
        console.error("Error resending OTP",error)
        res.status(500).json({success:false,message:"Internal server error,please try again"})
        
    }
};
const loadLogin=async(req,res)=>{
    try {
        if(!req.session.user){
            res.setHeader('Cache-Control', 'no-store');
            return res.render("login",{message:""})
        }else{
            res.redirect("/")
        }
        
    } catch (error) {
        res.redirect("/page not found")
        
    }
}
const login=async(req,res)=>{
    try {
        const {email,password}=req.body;
        const findUser=await User.findOne({isAdmin:0,email:email});
        if(!findUser){
            return res.render("login",{message:"user not found"})

        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})

        }
        const passwordMatch=await bcrypt.compare(password,findUser.password)
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect password"})

        }
       
        if(findUser.hasPurchased===false&&findUser.referredBy&&!findUser.redeemed){
            findUser.referralCredits=findUser.referralCredits+10
            findUser.redeemed=true;
            await findUser.save();
        }
        req.session.user={id:findUser._id,name:findUser.name};
        res.redirect("/")

        
    } catch (error) {
        console.error("Login error",error)
        res.render("login",{message:"Login failed please try later"})
        
    }
}
const logout=async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error",err.message)
                return res.redirect("/pageNotFound")
            }
            res.clearCookie('connect.sid');
            res.setHeader('Cache-Control', 'no-store');
            return res.redirect("/login")
        })
        
    } catch (error) {
        console.log("Logout error",error)
        res.redirect("/pageNotFound")
        
    }
}
const products=async (req,res)=>{
    try {
        const productId=req.query.id;
        const product=await Product.findById(productId);
        if(!product){
            return res.status(404).send("product not found")
        }
        res.render("product.ejs",{product})
        
        
    } catch (error) {
        res.status(500).send("server error")
        
    }
}
const productDetails=async(req,res)=>{
    try {
        const productId=req.query.id;
        const product=await Product.findById(productId).populate('category');
        if(!product){
            return res.status(404).send("product not found")
        }
        res.render('product-details.ejs',{product})
        
    } catch (error) {
        res.status(500).send("server error")
        
    }
}
const updateQuantity=async(req,res)=>{
    try {
        const userId=req.session.user.id
        const itemId=req.params.itemId;
        console.log("User ID:", userId);
console.log("Item ID:", itemId);
        const newQuantity=req.body.quantity
        await User.updateOne({_id:userId,"cart._id":itemId},{$set:{"cart.$.quantity": newQuantity}})
        
    } catch (error) {
        console.error('Error updating cart item quantity:', error);
        
    }
}
   


module.exports = {
    pageNotFound,
    loadHomepage,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    productDetails,
    products,
    updateQuantity,
    
};
