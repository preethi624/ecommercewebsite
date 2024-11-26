const User=require("../../models/userSchema")
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const Order=require("../../models/orderSchema")
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");
const { isAdmin } = require("../../middleware/auth");
const pageError=async (req,res)=>{
    res.render("admin-error")
}
const getTopSellingProducts = async (period) => {
   
    const result = await Order.aggregate([
      
        { $unwind: "$orderedItems" },
        {
            $group: {
                _id: "$orderedItems.product",
                totalSales: { $sum: "$orderedItems.quantity" }
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                let: { productId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ["$_id", "$$productId"] }, { $eq: ["$isDeleted", false] }] } } }
                ],
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },
        {
            $project: {
                _id: 0,
                productName: "$productInfo.productName",
                totalSales: 1
            }
        }
    ]);

    return result;
};
const getTopSellingCategories = async (period) => {
    
    const result = await Order.aggregate([
       
        { $unwind: "$orderedItems" },
        {
            $lookup: {
                from: "products",
                localField: "orderedItems.product",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" },
        {
            $lookup: {
                from: "categories",
                localField: "productInfo.category",
                foreignField: "_id",
                as: "categoryInfo"
            }
        },
        { $unwind: "$categoryInfo" },
        {
            $group: {
                _id: "$categoryInfo.name",
                totalSales: { $sum: "$orderedItems.quantity" }
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 }
    ]);

    return result;
};



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
            const resultp = await getTopSellingProducts()
            const results=await getTopSellingCategories()
            const orders = await Order.find({}, 'finalAmount'); 
            const disc=await Order.find({}, 'discount'); 
            const totalSales = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0).toFixed(2);
            const totalDiscount = disc.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed(2);
            res.render("dashboard",{resultp,results,totalSales,totalDiscount})
            
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
const getSalesReportData = async (req, res) => {
    try {
        const { reportType } = req.query;
        let adjustedStartDate = new Date();
        let adjustedEndDate = new Date();

        switch (reportType) {
            case 'weekly':
                adjustedStartDate.setDate(adjustedEndDate.getDate() - 7);
                break;
            case 'monthly':
                adjustedStartDate.setMonth(adjustedEndDate.getMonth() - 1);
                break;
            case 'yearly':
                adjustedStartDate.setFullYear(adjustedEndDate.getFullYear() - 1);
                break;
            default:
                return res.status(400).json({ message: 'Invalid report type' });
        }
       

        // Get orders within the date range and with 'Delivered' status
        const orders = await Order.find({
            invoiceDate: { $gte: adjustedStartDate, $lte: adjustedEndDate },
            'orderedItems.status': 'Delivered'
        });
       

        // Aggregated variables for total sales
        let totalAmount = 0;
        let totalDiscount = 0;
        let salesCount = orders.length;

        orders.forEach(order => {
            totalAmount += order.finalAmount || 0;
            totalDiscount += order.discount || 0;
        });
        

        // Sending a single label and single data point for chart
        res.json({
            labels: [`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Sales`],
            netSales: [totalAmount],
            totalOrders: [salesCount],
            discount: [totalDiscount]
        });
    } catch (error) {
        console.error('Error fetching sales report data:', error);
        res.status(500).json({ message: 'Error generating report data' });
    }
};


module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    getSalesReportData,
    
}