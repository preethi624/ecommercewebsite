const Category=require("../../models/categorySchema")
const Product=require("../../models/productSchema");
const mongoose = require("mongoose");




const categoryInfo=async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1;
        const limit=4;
        const skip=(page-1)*limit;
        const categoryData=await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);
        const totalCategories=await Category.countDocuments()
        const totalPages=Math.ceil(totalCategories/limit)
        res.render("category",{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories
        });
        
    } catch (error) {
        console.error(error);
        res.redirect("/pageError")
        
    }
}
const addCategory=async (req,res)=>{
    const {name,description}=req.body;
    try {
        if (!name || !description) {
            return res.status(400).json({ error: "Name and description are required" });
        }

        const existingCategory=await Category.findOne({name})
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"})
        }
        const newCategory=new Category({
            name,
            description
        })
        await newCategory.save();
        return res.json({message:"Category added successfully"})
        
    } catch (error) {
        return res.status(500).json({error:"Internal server error"})
        
    }
}
const addCategoryOffer = async (req, res) => {
    try {
        console.log("Request body:", req.body); // Add this line in your addCategoryOffer function

        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;  
        console.log("Received categoryId:", categoryId);

        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({ status: false, message: "Invalid category ID" });
        }

        const category = await Category.findById(categoryId); // Find category by its _id
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });
        const hasProductOffer = products.some((product) => product.productOffer > percentage);

        if (hasProductOffer) {
            return res.json({ status: false, message: "Products in this category already have offers" });
        }

        // Update the category offer
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        // Reset product offers and prices
        for (const product of products) {
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }

        res.json({ status: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const removeCategoryOffer=async (req,res)=>{
    try {
        const categoryId=req.body.categoryId;
        const category=await Category.findById(categoryId);
        if(!category){
            return res.staus(404).json({status:false,message:"Category not found"})

        }
        const percentage=category.categoryOffer;
        const products=await Product.find({category:category._id});
        if(products.length>0){
            for(const product of products){
                product.salePrice +=Math.floor(product.regularPrice*(percentage/100))
                product.productOffer=0;
                await product.save()
            }
        }
        category.categoryOffer=0;
        await category.save();
        res.json({status:true})
        
    } catch (error) {
        res.status(500).json({status:false,message:"Internal server error"})
        
    }
}
module.exports={categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,

}