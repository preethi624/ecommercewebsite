const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema");
const User=require("../../models/userSchema")
const fs=require("fs")
const path=require("path")
const sharp=require("sharp")





const getProductAddPage=async (req,res)=>{
    try {
        const category=await Category.find({isListed:true});
        res.render("product-add",{cat:category})
        
    } catch (error) {
        res.redirect("/pageError")
        
    }
}
const addProducts=async(req,res)=>{
    try {
        const products=req.body;
        const productExists=await Product.findOne({productName:products.productName})
        if(!productExists){
            const images=[];
            if(req.files&&req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath=req.files[i].path;
                    const outputFilename = Date.now() + '-' + req.files[i].originalname;
                    const resizedImagePath=path.join('public','uploads','product-images',outputFilename);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(outputFilename);
                }
            }
            const categoryId=await Category.findOne({name:products.category});
            if(!categoryId){
                return res.status(400).join("Invalid category name")
            }
            const newProduct=new Product({
                productName:products.productName,
                description:products.description,
             
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:'Available',

            })
            await newProduct.save();
            return res.redirect("/admin/addProducts")
        }else{
            return res.status(400).json("Product already exist,try with another name")
        }
    } catch (error) {
        console.error("Error saving product",error)
        
        return res.redirect("/admin/pageError")
    }
}

const getAllProducts=async(req,res)=>{
    try {
        const search=req.query.search||"";
        const page=req.query.page||1;
        const limit=4;
        const productData=await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}}

            ]
        }).limit(limit*1).skip((page-1)*limit).populate('category').exec();
        const count=await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}}

            ] 

        }).countDocuments();
        console.log("Products found:", productData);

        const category=await Category.find({isListed:true});
        if(category){
            res.render("product",{
                data:productData,
                currentPage:page,
                
                totalPages:Math.ceil(count/limit),
                cat:category,

            })
        }else{
            res.render("page-404")
        }
        
    } catch (error) {
        console.log(error)
        res.redirect("/pageError")
        
    }
}

module.exports={
    getProductAddPage,
    addProducts,
    getAllProducts,
}