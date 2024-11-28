const User=require('../../models/userSchema')
const Order=require("../../models/orderSchema")
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const Transaction=require("../../models/transactionSchema")
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
      
      
        const userId=user.id;
        
       

        

      
            
        
        const userData = await User.findById(userId).populate({
            path: 'orderHistory',
            populate: {
                path: 'orderedItems.product',
                model: 'Product'
            }
        }).populate('addresses')
        
        
        
        if(!userData){
            return res.redirect("/login")
        }
       
       if (!userData.addresses) {
            userData.addresses = [];
        }
        const orderHistory = await Order.find({ user: userId })
            
            .populate({
                path: 'orderedItems.product',
                model: 'Product'
            })
            

        
        const totalOrders = await Order.countDocuments({ user: userId });
        
        res.render('user-profile.ejs', { 
            user: userData, 
            orderHistory: orderHistory,
           
           
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
        
    }
}
const addAddress=async(req,res)=>{
    const user=req.session.user
    const userId=req.session.user.id
    
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
   
       
        const userId = req.session.user.id
       
        const { addressId } = req.params
        
        const { fullName, address, city, postalCode, country } = req.body;
        const userData = await User.findById(userId);
        
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
       
        const user=req.session.user
        const userId = user.id;
        const addressId = req.params.addressId;
        await User.findByIdAndUpdate(userId, { defaultAddress: addressId });
       
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
        
        res.render('addresses.ejs', { addresses: userRecord.addresses, user: userRecord });
        
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.status(500).send("Error fetching addresses");
        
    }
}
const getProducts=async(req,res)=>{
    try {
        const { search, sort, showOutOfStock ,category} = req.query;
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const limit = parseInt(req.query.limit) || 3; 
        let query = {
            isDeleted: false, // Exclude deleted products
          };

        if (search) {
            query.productName = { $regex: search, $options: 'i' }; // Case-insensitive search
        }
        if (category) {
            
            const categoryObj = await Category.findOne({ name: category });
            if (categoryObj) {
                query.category = categoryObj._id; 
            }
        }
        if (!showOutOfStock) {
            query.quantity = { $gt: 0 }; // Only show products with stock > 0
          }
          const totalProducts = await Product.countDocuments(query);

        // Fetch products from database with potential filtering
        let products = await Product.find(query) 
        .skip((page-1)*limit)
        .limit(limit);
        const totalPages = Math.ceil(totalProducts / limit);


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

        res.render('products.ejs', { products, showOutOfStock ,currentPage:page,totalPages,search,category,sort,limit});
    
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error fetching products");
        
    }
}  
const getWallet=async(req,res)=>{
    const user=req.session.user
    const userId=user.id
    const { page = 1, limit = 10 } = req.query; // Default values for pagination
        const skip = (page - 1) * limit;
    const transactions = await Transaction.find({ userId }).sort({ date: -1 }).skip(skip)
    .limit(parseInt(limit));
    const totalTransactions = await Transaction.countDocuments({ userId });
        const totalPages = Math.ceil(totalTransactions / limit);
    const updatedUser=await User.findById(userId)
    if (!updatedUser) {
        return res.status(404).send('User not found');
    }
    const walletBalance=updatedUser.wallet
    res.render("wallet",{walletBalance:walletBalance,transactions:transactions,user:user,currentPage: parseInt(page),
        totalPages,limit})
}  
const addWallet=async(req,res)=>{
    try {
        const user=req.session.user;
        const userId=user.id
        const amount=req.body.amount
        if (!amount || amount <= 0) {
            return res.status(400).send('Invalid amount');
          }
          const updatedUser=await User.findByIdAndUpdate(userId,{$inc:{wallet:amount}},{new:true})
          if (!updatedUser) {
            return res.status(404).send('User not found');
          }

      res.redirect('/wallet');
      

        
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the wallet balance');
        
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
    getWallet,
    addWallet,
}