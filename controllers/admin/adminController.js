const User=require("../../models/userSchema")
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");
const { isAdmin } = require("../../middleware/auth");


const pageError=async (req,res)=>{
    res.render("admin-error")
}
const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("admin/dashboard")
    }
    res.render("admin-login",{message:null})
}


const login=async (req,res)=>{
    try {
        const {email,password}=req.body
        const findAdmin= await User.findOne({isAdmin:true,email:email})
        if(!findAdmin){
            return res.render("admin-login",{message:"Admin not found"})
    
        }
    
    const passwordMatch=await bcrypt.compare(password,findAdmin.password)
            if(!passwordMatch){
                return res.render("admin-login",{message:"Incorrect password"})
    
            }
            req.session.admin={id:findAdmin._id,name:findAdmin.name,isAdmin:true}
            res.redirect("/admin" )
        
    } catch (error) {
        console.log("Login error",error)
        res.redirect("/pageError")
        
    }
    


}
const loadDashboard=async(req,res)=>{
    if(req.session.admin){
        try {
            res.render("dashboard")
            
        } catch (error) {
            res.redirect("/pageError")
            
        }

    }
}
const logout=async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err);
                return res.redirect("/pageError")
            }
            
            res.redirect("/admin/login")

        })
        
        
    } catch (error) {
        console.log("unexpected error during logout",error)
        res.redirect("/pageError")
        
    }
}
module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    
}