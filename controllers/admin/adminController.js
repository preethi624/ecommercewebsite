const User=require("../../models/userSchema")
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");


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
            req.session.admin={id:findAdmin._id,name:findAdmin.name}
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
module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageError,
}