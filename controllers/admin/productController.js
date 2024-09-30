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
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath).catch((error)=>{
                        console.error("Error processing image",error)
                    });
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
        const page=parseInt(req.query.page)||1;
        const limit=4;
        const productData=await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}}

            ]
        }).limit(limit*1).skip((page-1)*limit).populate('category').exec();
        productData.forEach(product => {
            console.log(product.productImage);
        });
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
const addProductOffer=async(req,res)=>{
    try {
        const {productId,percentage}=req.body
        const findProduct=await Product.findOne({_id:productId});
        const findCategory=await Category.findOne({_id:findProduct.category})
        if(findCategory.categoryOffer>percentage){
            return res.json({status:false,message:"This products category already has a category offer"})

        }
        findProduct.salePrice=findProduct.salePrice-Math.floor(findProduct.regularPrice*(percentage/100))
        findProduct.productOffer=parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer=0;
        await findCategory.save();
        res.json({status:true})
        
    } catch (error) {
        console.error("Error applying product offer:", error);

       
        return res.status(500).json({ status: false, message: "Internal server error" });
        
    }
}
const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;

        // Check if productId is provided
        if (!productId) {
            return res.status(400).json({ status: false, message: "Product ID is required" });
        }

        // Find the product by ID
        const findProduct = await Product.findOne({ _id: productId });

        // Check if product exists
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Log product details before updating
        console.log("Product found:", findProduct);

        // Reset the sale price to regular price and product offer to 0
        findProduct.salePrice = findProduct.regularPrice;
        findProduct.productOffer = 0;

        // Save the updated product
        await findProduct.save();

        // Log after saving
        console.log("Product offer removed successfully:", findProduct);

        // Send success response
        return res.json({ status: true, message: "Product offer removed successfully" });
    } catch (error) {
        console.error("Error removing product offer:", error);

        // Return an error response
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
};
const getEditProduct=async(req,res)=>{
    try {
        const id=req.query.id;
        const product=await Product.findOne({_id:id});
        const category=await Category.find({});
        console.log(product)
        res.render("edit-product",{
            product:product,
           
            cat:category
        })
    } catch (error) {
        console.log(error)
        
        res.redirect("/pageError")
    }
}
const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product=await Product.findOne({_id:id})
        const data = req.body;

        
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id },
        });
        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try another name." });
        }

       

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename); // Collect new images
            }
           
        }

 const updateFields = {
            productName: data.productName,
            description: data.description,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color,
        };
       if(req.files.length>0){
        updateFields.$push={productImage:{$each:images}};
       }
       await Product.findByIdAndUpdate(id,  updateFields , { new: true });
        
        res.redirect("/admin/product");
        
    } catch (error) {
        console.error(error);
        res.redirect("/pageError");
    }
};


const deleteSingleImage=async(req,res)=>{
    console.log("deleteSingleImage route hit");
    console.log(req.body)
    try {
        const {imageNameToServer,productIdToServer,newImage}=req.body;
        console.log('Image Name:', imageNameToServer);  // Log destructured values
        console.log('Product ID:', productIdToServer);
        const product=await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
        const imagePath=path.join("public","uploads","re-image",imageNameToServer)
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer}deleted successfully`)
        }else{
            console.log(`Imagem${imageNameToServer} not found`)
        }
        res.send({status:true})
        
    } catch (error) {
        console.log(error)
        res.redirect("/pageError")
        
    }
}
const softDeleteProduct=async(req,res)=>{
    const productId=req.body._id
    
    try {
       
        await Product.findByIdAndUpdate(productId,{isDeleted:true});
        res.json({ status: true, message: 'Product deleted successfully' });
        
    } catch (error) {
        console.error(error);
        res.json({ status: false, message: 'Error deleting product' });
        
    }
}

module.exports={
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    softDeleteProduct,
}