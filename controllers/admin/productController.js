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
            return res.redirect("/admin/product")
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
            $and:[{isDeleted:false},
                {productName:{$regex:new RegExp(".*"+search+".*","i")}}

            ]
        }).limit(limit*1).skip((page-1)*limit).populate('category').exec();
        productData.forEach(product => {
            console.log(product.productImage);
        });
        const count=await Product.find({
            $and:[{isDeleted:false},
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

        
        if (!productId) {
            return res.status(400).json({ status: false, message: "Product ID is required" });
        }

        
        const findProduct = await Product.findOne({ _id: productId });

       
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

      
        console.log("Product found:", findProduct);

        
        findProduct.salePrice = findProduct.regularPrice;
        findProduct.productOffer = 0;

       
        await findProduct.save();

       
        console.log("Product offer removed successfully:", findProduct);

        
        return res.json({ status: true, message: "Product offer removed successfully" });
    } catch (error) {
        console.error("Error removing product offer:", error);

      
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
        const productId = req.params.id;

        // Extract the form data
        const { productName, description, regularPrice, salePrice, quantity, color, category: categoryName, existingImages, replaceImages } = req.body;
        const newImages = req.files; // This will be an array of uploaded files

        // Find the category by name to get the ObjectId
        const category = await Category.findOne({ name: categoryName });
        
        if (!category) {
            return res.status(400).send('Category not found');
        }

        // Construct the updated product data
        const updatedProductData = {
            productName,
            description,
            regularPrice,
            salePrice,
            quantity,
            color,
            category: category._id, // Use the ObjectId for the category
        };

        // Check if we should replace existing images
        if (replaceImages) {
            // If replaceImages is true, overwrite existing images
            updatedProductData.productImage = newImages.map(file => file.filename); // Only new uploads
        } else {
            // If not replacing, keep existing images and add new ones
            updatedProductData.productImage = existingImages ? existingImages : []; // Start with existing images
            if (newImages && newImages.length > 0) {
                const newImagePaths = newImages.map(file => file.filename); // Get filenames of new uploads
                updatedProductData.productImage.push(...newImagePaths); // Add new images
            }
        }

        // Update the product in the database
        await Product.findByIdAndUpdate(productId, updatedProductData, { new: true });

        // Redirect or respond with a success message
        res.redirect('/admin/product'); // Redirect to the products list or any other page

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Internal Server Error');
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
    const {productId}=req.body
    
    try {
       
        await Product.findByIdAndUpdate(productId,{$set:{isDeleted:true}});
        res.json({ status: true, message: 'Product deleted successfully' });
        
    } catch (error) {
        console.error(error);
        res.json({ status: false, message: 'Error deleting product' });
        
    }
}
const viewSoftDeletedProduct=async(req,res)=>{
    try {
        const softDeletedProducts = await Product.find({ isDeleted: true });
        
        
        res.render('soft-products.ejs', {
          products: softDeletedProducts
        })
        
    } catch (error) {
        console.error("Error fetching soft-deleted products:", error);
        res.status(500).send("Internal Server Error");
        
    }
}
const restore=async(req,res)=>{
    try {
        console.log("Request body:", req.body);
        console.log(req.body)
        const { id } = req.body;
    await Product.findByIdAndUpdate(id, { isDeleted: false });
    res.json({ status: true, message: 'Product restored successfully' })
        
    } catch (error) {
        console.error('Error restoring product:', error);
    res.status(500).json({ status: false, message: 'Failed to restore product' });
        
        
    }
}
const updateImage=async(req,res)=>{
    try {
        const { productId, oldImage } = req.params;

    // Remove old image
    const oldImagePath = path.join(__dirname, 'public/uploads/product-images/', oldImage);
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }

    // Save the new image path to the product's database record
    const product = await Product.findById(productId);
    const index = product.productImage.indexOf(oldImage);
    if (index !== -1) {
      product.productImage[index] = req.file.filename;
    }
    await product.save();

    res.status(200).send('Image updated successfully');
  
    } catch (error) {

        console.error(error);
    res.status(500).send('Server error');
    }
}

const saveCropped=async(req,res)=>{
    try {
      console.log("save cropped called")
        console.log("request body",req.body)
        
        const croppedImageData = req.body.croppedImage;
    const oldImagePath = req.body.oldImagePath;
    console.log("old image path",oldImagePath)
    const base64Data = croppedImageData.replace(/^data:image\/png;base64,/, "");
    
    // Use the old image path to replace the old image
    const imagePath = path.join(__dirname, oldImagePath);
    fs.writeFile(imagePath,base64Data,'base64',(err)=>{
        if (err) {
            return res.status(500).send('Error replacing image');
        }
        res.status(200).send('Image replaced successfully');
    })
        
    } catch (error) {
        res.status(500).send("server error")
        
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
    viewSoftDeletedProduct,
    restore,
    updateImage,
    saveCropped,
    
    
}