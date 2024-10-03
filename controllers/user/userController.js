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
        const user = req.session.user;  // Fetch the session data for the user
        const categories = await Category.find({ isListed: true });
        
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) }
        });

        // Sort products by creation date and limit to 8
        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 8);

        res.setHeader('Cache-Control', 'no-store');

        if (user) {
            // If the user is a demo user, render the home page with demo-specific logic
            if (user.isDemo) {
                return res.render("home", { user: user.username, products: productData });
            } 
            
            // Handle regular user
            if (user.id) {
                const userData = await User.findOne({ _id: user.id });
                
                if (userData) {
                    return res.render("home", { user: userData.username, products: productData });
                }
            }
        }

        // If no user is logged in, or user details aren't available, render home without user
        return res.render("home", { products: productData });

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
        const { username, phone, email, password } = req.body;
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists." });
        }
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email.error");
        }
        req.session.userOtp = otp;
        req.session.userData = { username, phone, email, password };
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
                password:passwordHash
            })
            await saveUserData.save()
            req.session.user=saveUserData._id;
            res.json({success:true,redirectUrl:"/"})
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
        const product=await Product.findById(productId);
        if(!product){
            return res.status(404).send("product not found")
        }
        res.render('product-details.ejs',{product})
        
    } catch (error) {
        res.status(500).send("server error")
        
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
    
};
