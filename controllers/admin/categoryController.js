const Category=require("../../models/categorySchema")
const Product=require("../../models/productSchema");
const mongoose = require("mongoose");




const categoryInfo=async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1;
        const limit=4;
        const skip=(page-1)*limit;
        const categoryData=await Category.find({isDeleted:false})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);
        const totalCategories=await Category.countDocuments({isDeleted:false})
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
    let  {name,description}=req.body;
    name=name.toLowerCase()
    
    try {
        if (!name || !description) {
            return res.status(400).json({ error: "Name and description are required" });
        }

        const existingCategory=await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }})
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
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({ status: false, message: "Invalid category ID" });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        // Update category offer
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        // Reset product offers and prices
        for (const product of products) {
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }

        res.json({ status: true, message: "Category offer added, product offers reset" });

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

const getListCategory=async (req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category")
        
    } catch (error) {
        res.redirect("/pageError")
        
    }
}
const getUnlistCategory=async (req,res)=>{
    try {
        let id=req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category")
        
    } catch (error) {
        res.redirect("/pageError")
        
    }
}
const getEditCategory=async (req,res)=>{
    try {
        const id=req.query.id;
        const category=await Category.findOne({_id:id})
        res.render("edit-category",{category:category})
        
    } catch (error) {
        
        res.redirect("/pageError")
    }
}
const editCategory=async (req,res)=>{
    try {
        const id=req.params.id;
        const {categoryName,description}=req.body;
        const existingCategory = await Category.findOne({
            _id: { $ne: id },  // Exclude the current category from duplicate check
            name: { $regex: new RegExp(`^${categoryName}$`, 'i') }  // Case-insensitive regex match
        })
        if(existingCategory){
            return res.status(400).json({error:"Category exists,please choose another name"})
        }
        const updatedCategory=await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description
        },{new:true})
        if(updatedCategory){
            res.redirect("/admin/category")
        }else{
            res.status(400).json({error:"Category not found"})
        }

        
    } catch (error) {
        res.status(500).json({error:"Internal server error"})
        
    }

}
const softDeleteCategory=async (req,res)=>{
    const categoryId=req.body.id;
    try {
        const result=await Category.updateOne({_id:categoryId},{$set:{isDeleted:true}});
        if(result.nModified===0){
            return res.stautus(404).json({status:false,message:"Category not found or already soft deleted"});

        }
        return res.json({ status: true, message: 'Category successfully soft-deleted' });
        
    } catch (error) {
        return res.status(500).json({ status: false, error: 'Failed to soft delete the category' });
        
    }

}

const viewSoftDeleted=async(req,res)=>{
    try {
        
        const softDeletedCategories = await Category.find({ isDeleted: true });
        
        
        res.render('soft.ejs', {
          categories: softDeletedCategories
        });
      } catch (error) {
        console.error("Error fetching soft-deleted categories:", error);
        res.status(500).send("Internal Server Error");
      }
}
const restore=async (req,res)=>{
    try {
        
        const { id } = req.body;
    await Category.findByIdAndUpdate(id, { isDeleted: false });
    res.json({ status: true, message: 'Category restored successfully' })
    } catch (error) {
        console.error('Error restoring category:', error);
    res.status(500).json({ status: false, message: 'Failed to restore category' });
        
    }
}


module.exports={categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    softDeleteCategory,
    viewSoftDeleted,
    restore,
    

    
   

}