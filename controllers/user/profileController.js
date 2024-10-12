const User=require('../../models/userSchema')
const Order=require("../../models/orderSchema")
const Product=require("../../models/productSchema")
const nodemailer=require("nodemailer")
const bcrypt=require("bcrypt")
const env=require("dotenv").config()
const session=require("express-session")
const { getMaxListeners } = require('nodemailer/lib/xoauth2')
const mongoose = require('mongoose');
function generateOtp(){
    const digits="1234567890"
    let otp="";
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp
    
}
const sendVerificationEmail=async(email,otp)=>{
    try {
        const transporter=nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD,
            }
        })
        const mailOptions={
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            suject:"your otp for password reset",
            text:`Your OTP is${otp}`,
            html:`<b><h4>Your OTP:${otp}</h4><br></b>`
        }
        const info=await transporter.sendMail(mailOptions);
        console.log("email sent:",info.messageId)
        return true;



    } catch (error) {
        console.error("error sending email",error)
        return false;
        
    }
}


const securePassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10);
        return passwordHash;
        
    } catch (error) {
        
    }

}
const getForgotPassPage=async(req,res)=>{
    try {
        res.render("forgot-password")
        
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}
const forgotEmailValid=async(req,res)=>{
    try {
        const{email}=req.body
        const findUser=await User.findOne({email:email})
        if(findUser){
            const otp=generateOtp();
            const emailSent=await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp=otp;
                req.session.email=email;
                res.render("forgotPass-otp");
                console.log("OTP",otp);
            }
            else{
                res.json({success:false,message:"failed to send otp please try again"})
            }
        }else{
            res.render("forgot-password",{
                message:"User with this email does not exist"
            });
        }
        
    } catch (error) {
        console.error(error)
        res.redirect("/pageNotFound")

        
    }
}
const verifyForgotPassOtp=async(req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
            res.json({success:false,message:"OTP not matching"})
        }
        
    } catch (error) {
        res.status(500).json({success:false,message:"An errror occured please try again"})
        
    }
}
const getResetPassPage=async(req,res)=>{
    try {
        res.render("reset-password.ejs")
        
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}
const resendOtp=async(req,res)=>{
    try {
        const otp=generateOtp();
        req.session.userOtp=otp;
        const email=req.session.email
        console.log("Resending otp to email:",email)
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("ResendOTP:",otp)
            res.status(200).json({success:true,message:"Resend OTP successful"})
        }
        
    } catch (error) {
        console.error('Error in resnd otp',error)
        res.status(500).json({success:false,message:"Internal server error"})
        
        
    }
}
const postNewPassword=async(req,res)=>{
    try {
        const{newPass1,newPass2}=req.body;
        const email=req.session.email;
        if(newPass1===newPass2){
            const passwordHash=await securePassword(newPass1)
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login")
        }else{
            res.render("reset-password",{message:"passwords are not matching"})
        }
        
    } catch (error) {
        res.redirect("/pageNotFound");
        
    }
}
const demo=async(req,res)=>{
    req.session.user={username:'user',role:'user',id: new mongoose.Types.ObjectId(), isDemo:true}
    
res.redirect('/')


}
const getUserProfile=async(req,res)=>{
    try {
        
       
       
        const user=req.session.user
       /* if(user.isDemo){
            return res.render('user-profile.ejs', { user });
        }*/
        
        const userId=user.id;
        console.log(userId)
        
        
        const userData = await User.findById(userId).populate('orderHistory').populate('addresses')
        if(!userData){
            return res.redirect("/login")
        }

       if (!userData.addresses) {
            userData.addresses = [];
        }
        
        res.render('user-profile.ejs', { user:userData, orderHistory: user.orderHistory || [] });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
        
    }
}
const addAddress=async(req,res)=>{
    const user=req.session.user
    const userId=req.session.user.id
    console.log(req.session.user)
   
    const addresses=[];
    for (let i = 0; i < req.body.fullName.length; i++) {
        const address = {
            fullName: req.body.fullName[i],
            address: req.body.address[i],
            city: req.body.city[i],
            postalCode: req.body.postalCode[i],
            country: req.body.country[i],
        };

     addresses.push(address);
     
    } 
    try {
       
        await User.findByIdAndUpdate(userId, { $push: { addresses: { $each: addresses } } });
        res.redirect('/userProfile'); // Redirect to profile or any other page
    }catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}
const editAddress = async (req, res) => {
    try {
        const user = req.session.user;

    if (!user) {
        return res.status(401).send('User not logged in');
    }
   
        console.log("session",req.session.user)
        const userId = req.session.user.id
        console.log("user id",userId)
        const { addressId } = req.params
        console.log("address id",addressId)
        const { fullName, address, city, postalCode, country } = req.body;
        const userData = await User.findById(userId);
        console.log("user data",userData)
        const addressIndex = userData.addresses.findIndex(a => a._id.toString() ===addressId);
        if (!userData.addresses) {
            return res.status(404).send('Addresses not found'); // Handle case when addresses is undefined
        }

        if (addressIndex === -1) {
            return res.status(404).send('Address not found');
        }
        userData.addresses[addressIndex] = {
            _id: addressId,
            fullName,
            address,
            city,
            postalCode,
            country
        };

        await userData.save();
        res.redirect('/userProfile');
    } catch (error) {

        console.error("Error updating address", error);
        res.status(500).send('Server error');
    }
}
const deleteAddress=async(req,res)=>{
    try {
        const userId=req.session.user.id
        const addressId=req.params.id;
        await User.updateOne(
            { _id: userId },
            { $pull: { addresses: { _id: addressId } } } 
          );
          res.redirect('/userProfile')
        
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error'); 

    }
}
const defaultAddress=async(req,res)=>{
    try {
        console.log("default triggerd")
        const user=req.session.user
        const userId = user.id;
        const addressId = req.params.addressId;
        await User.findByIdAndUpdate(userId, { defaultAddress: addressId });
        console.log(user)
        res.redirect('/userProfile');
        
    } catch (error) {
        console.error(error);
        res.status(500).send("Error setting default address");
        
    }
}
const addresses=async(req,res)=>{
    try {
        const user=req.session.user;
        if(!user){
            return res.status(401).send("Unauthorized");
        }
        const userRecord = await User.findById(user.id);
        console.log("user address",userRecord.address)
        res.render('addresses.ejs', { addresses: userRecord.addresses, user: userRecord });
        
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.status(500).send("Error fetching addresses");
        
    }
}
const getProducts=async(req,res)=>{
    try {
        const { search, sort, showOutOfStock } = req.query;
        const query = {};

        if (search) {
            query.productName = { $regex: search, $options: 'i' }; // Case-insensitive search
        }
        if (!showOutOfStock) {
            query.quantity = { $gt: 0 }; // Only show products with stock > 0
          }
      

        // Fetch products from database with potential filtering
        let products = await Product.find(query);  // Use the 'query' object here


        // Sorting logic
        switch (sort) {
            case 'priceLowToHigh':
                products.sort((a, b) => a.salePrice- b.salePrice);
                break;
            case 'priceHighToLow':
                products.sort((a, b) => b.salePrice - a.salePrice);
                break;
            case 'averageRatings':
                products.sort((a, b) => b.ratings - a.ratings); // Adjust based on your ratings structure
                break;
            case 'newArrivals':
                products.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                break;
            case 'aToZ':
                products.sort((a, b) => a.productName.localeCompare(b.productName));
                break;
            case 'zToA':
                products.sort((a, b) => b.productName.localeCompare(a.productName));
                break;
        }

        res.render('products.ejs', { products, showOutOfStock });
    
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
        
    }
}



module.exports={
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    demo,
    getUserProfile,
    addAddress,
    editAddress,
    deleteAddress,
    defaultAddress,
    addresses,
    getProducts,
}