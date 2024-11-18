const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema");
const User=require("../../models/userSchema")
const Order=require("../../models/orderSchema")
const Coupon=require("../../models/couponSchema")
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


const fs=require("fs")
const path=require("path")
const sharp=require("sharp");






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
        }).limit(limit*1).skip((page-1)*limit).populate('category');
        productData.forEach(async (product) => {
            if (product.category && product.category.categoryOffer > 0) {
                product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (product.category.categoryOffer / 100));
                await product.save();
            }
        });
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
const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        
        // Find the product by ID
        const findProduct = await Product.findOne({ _id: productId });
        
        // If product is not found, return an error
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Find the category of the product
        const findCategory = await Category.findOne({ _id: findProduct.category });
        
        // If the category is not found, return an error
        if (!findCategory) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Check if there is an existing category offer
        if (findCategory.categoryOffer > 0) {
            
                 console.log("Product saved with salePrice:", findProduct.salePrice); //      
            
            return res.json({ status: false, message: "Cannot add product offer because the category has an existing offer" });
        }

        // Calculate the new sale price
        findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        
        // Set the product offer percentage
        findProduct.productOffer = parseInt(percentage);
        
        // Save the updated product
        await findProduct.save();
        
        // Set the category offer to 0 after successfully applying product offer
        findCategory.categoryOffer = 0;
        await findCategory.save();

        // Return success response
        res.json({ status: true, message: "Product offer added successfully" });

    } catch (error) {
        console.error("Error applying product offer:", error);
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
};

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

        // Extract form data
        const {
            productName,
            description,
            regularPrice,
            salePrice,
            quantity,
            color,
            category: categoryId,
            replaceImages, // Checkbox for replacing the first image
            imagesToRemove = [],
        } = req.body;
        const newImages = req.files || []; // Uploaded files as an array

        // Find the category by ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ error: 'Category not found' });
        }

        // Fetch the product to edit
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Clone the current product images array
        let updatedImages = [...product.productImage];

        // Check if the replaceImages checkbox is checked
        if (replaceImages === 'true' && newImages.length > 0) {
            // Replace the first image with the first new image
            const firstNewImage = newImages[0].filename;

            // Delete the existing first image file from the server
            const oldImagePath = path.join(__dirname, '../uploads/product-images', updatedImages[0]);
            fs.unlink(oldImagePath, (err) => {
                if (err) console.error(`Error deleting image ${updatedImages[0]}:`, err);
            });

            // Replace the first image in the array with the new one
            updatedImages[0] = firstNewImage;

            // Add any remaining new images to the end of the array
            for (let i = 1; i < newImages.length; i++) {
                updatedImages.push(newImages[i].filename);
            }
        } else {
            // If replaceImages is not checked, simply add new images to the end
            newImages.forEach((file) => {
                updatedImages.push(file.filename);
            });
        }

        // Remove any images selected for deletion
        imagesToRemove.forEach((imageToRemove) => {
            const imageIndex = updatedImages.indexOf(imageToRemove);
            if (imageIndex > -1) {
                // Delete the existing image file from the server
                const filePath = path.join(__dirname, '../uploads/product-images', imageToRemove);
                fs.unlink(filePath, (err) => {
                    if (err) console.error(`Error deleting image ${imageToRemove}:`, err);
                });
                // Remove the image from the array
                updatedImages.splice(imageIndex, 1);
            }
        });

        // Convert numerical fields
        const regularPriceNum = parseFloat(regularPrice);
        const salePriceNum = parseFloat(salePrice);
        const quantityNum = parseInt(quantity, 10);

        // Construct the updated product data
        const updatedProductData = {
            productName,
            description,
            regularPrice: regularPriceNum,
            salePrice: salePriceNum,
            quantity: quantityNum,
            color,
            category: category._id,
            productImage: updatedImages, // Updated image list
        };

        // Update the product in the database
        await Product.findByIdAndUpdate(productId, updatedProductData, { new: true });

        // Redirect or respond with success
        res.redirect('/admin/product');

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
const getOrders=async(req,res)=>{
    try {
        const orders = await Order.find().populate('orderedItems.product').sort({invoiceDate:-1});
        res.render("orders",{orders})
        
    } catch (error) {
        console.error('Error fetching orders:', error);
    res.status(500).send('Internal Server Error');
        
    }
}
const editOrder=async(req,res)=>{
    try {
        const{Id,itemId}=req.params;
        console.log("id only",Id)
        const{status}=req.body
        const order = await Order.findById(Id);
        const item = order.orderedItems.find((item) => item._id.toString() === itemId);
        if (!item) {
            return res.status(404).send("Item not found");
        }

        // Conditional logic for status updates
        if (status === "Delivered" && (item.paymentStatus !== "paid" || item.deliveryStatus !== "confirmed"||item.status==='Return Request'||item.status==='Cancelled')) {
            return res.status(400).send("Cannot mark as Delivered without payment and confirmation.");
        }
        
        if (status === "Cancelled" && (item.status === "Shipped" || item.status === "Delivered")) {
            return res.status(400).send("Cannot cancel an order that has already been shipped or delivered.");
        }

        if (status === "Return Request" && item.status !== "Delivered") {
            return res.status(400).send("Can only request a return if the order has been delivered.");
        }

        if (status === "Returned" && item.status !== "Delivered") {
            return res.status(400).send("Can only mark as Returned if the order has been delivered.");
        }

        if (status === "Processing" && item.status !== "Pending") {
            return res.status(400).send("Can only mark as Processing if the order is still Pending.");
        }

        await Order.updateOne(
            { _id: Id, "orderedItems._id": itemId },
            { $set: { "orderedItems.$.status": status } }
        );
       
       res.redirect("/admin/orders");
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).send('Internal Server Error'); 
        
    }
}
const updateStatus=async(req,res)=>{
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        order.status = status
        await order.save();
        res.redirect("/admin/orders")
        
    } catch (error) {
        console.error('Error updating order status:', error);
    res.status(500).send('Internal Server Error');
        
    }
}
const cancelOrder=async(req,res)=>{
    try {
        const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    order.status = "Cancelled";
    await order.save();

    res.redirect("/admin/orders");
        
    } catch (error) {
        console.error("Error cancelling order:", error);
    res.status(500).send("Internal Server Error");
        
    }
}
const replaceImage=async(req,res)=>{
    try {
        const { imageId, productId } = req.body;
        const newImage=req.file;
        if (!imageId || !productId || !newImage) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        const oldImage = product.images.find(image => image._id === imageId); 
        if (!oldImage) {
            return res.status(404).json({ success: false, message: 'Image not found.' });
        }
        const oldImagePath = path.join(__dirname, '../uploads/product-images', oldImage.fileName); 
        if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
        }
        const newImagePath = newImage.filename;
        product.images = product.images.map(image => {
            if (image._id == imageId) {
                return { ...image, fileName: newImagePath }; // Replace the image details
            }
            return image;
        });
        await product.save();
        return res.status(200).json({ success: true, newImage: newImagePath });
       
        
    } catch (error) {
        console.error('Error replacing image:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
        
    }
}
const getCoupon=async(req,res)=>{
    try {
        const coupons=await Coupon.find()
        res.render("coupon",{coupons})
        
    } catch (error) {

        res.status(500).send('Error fetching coupons');
    }
}
const createCoupon=async(req,res)=>{
    try {
        const { code, discountType, discountValue, minPurchaseAmount, maxDiscount, expiryDate, usageLimit } = req.body;
        const newCoupon=new Coupon({
            code,
            discountType,
            discountValue,
            minPurchaseAmount,
            
            maxDiscount,
            expiryDate,
            usageLimit
        });
        await newCoupon.save();
        res.redirect('/admin/coupons')
        
    } catch (error) {
        
        res.status(400).send('Error creating coupon: ' + error.message);
    }

}
const deleteCoupon=async(req,res)=>{
    try {
        const couponId=req.params.id;
        const coupon=await Coupon.findByIdAndDelete(couponId)
        res.redirect('/admin/coupons')
        
    } catch (error) {

      res.status(500).send('Error deleting coupon');   
    }
}
const salesReport = async (req, res) => {
    try {
        let { startDate, endDate,format ,reportType} = req.query;
        if (!reportType) {
            reportType = 'weekly';
        }

        console.log("reporttype",reportType)
        let adjustedStartDate = startDate ? new Date(startDate) : null;
        let adjustedEndDate = endDate ? new Date(endDate) : new Date();

      const page = parseInt(req.query.page) || 1; // Current page number, default to 1
    const limit = 5; // Number of orders per page
    const skip = (page - 1) * limit;

        // Adjust dates based on selected filter if no explicit startDate and endDate are provided
        if (!adjustedStartDate && reportType) {
            const now = new Date();
            switch (reportType) {
                case 'weekly':
                    adjustedStartDate = new Date(now);
                    adjustedStartDate.setDate(now.getDate() - 7);

                    console.log("djust",adjustedStartDate)
                    adjustedEndDate = now; 
                    break;
                case 'monthly':
                    adjustedStartDate = new Date(now);
                    adjustedStartDate.setMonth(now.getMonth() - 1);
                    adjustedEndDate = now; 
                    break;
                case 'yearly':
                    adjustedStartDate = new Date(now);
                    adjustedStartDate.setFullYear(now.getFullYear() - 1);
                    adjustedEndDate = now; 
                    break;
                default:
                    break;
            }
        }
        console.log('Adjusted Start Date:', adjustedStartDate);
        console.log('Adjusted End Date:', adjustedEndDate);

        // Ensure dates are defined
        /*if (!adjustedStartDate || !adjustedEndDate) {
            return res.status(400).json({ message: 'Start and end dates are required' });
        }*/

        const orders = await Order.find({
            invoiceDate: { $gte: adjustedStartDate, $lte: adjustedEndDate },
            'orderedItems.status': "Delivered"
        }).populate({
            path: 'orderedItems.product',
            populate: {
                path: 'category',
                model: 'Category'
            }
        }).skip(skip)
        .limit(limit);
        const totalOrders = await Order.countDocuments({
            invoiceDate: { $gte: adjustedStartDate, $lte: adjustedEndDate },
            'orderedItems.status': "Delivered"
        });
        const totalPages = Math.ceil(totalOrders / limit);



        let totalSalesCount = 0;
        let overallOrderAmount = 0;
        let couponDeduction = 0;
        let netSales = 0;
        let totalOffersApplied = 0;
        const allOrders = await Order.find({
            invoiceDate: { $gte: adjustedStartDate, $lte: adjustedEndDate },
            'orderedItems.status': "Delivered"
        }).populate({
            path: 'orderedItems.product',
            populate: {
                path: 'category',
                model: 'Category'
            }
        });

        allOrders.forEach(order => {
            totalSalesCount += 1;
           
            couponDeduction += order.discount || 0;
            netSales += order.finalAmount || 0;

            order.orderedItems.forEach(item => {
                overallOrderAmount += item.product.regularPrice*item.quantity || 0;
                const categoryOffer = item.product.category?.categoryOffer || 0;
                const productOffer = item.product.productOffer || 0;
                const appliedOffer = categoryOffer || productOffer;

                const offerAmount = (item.price * item.quantity) * (appliedOffer / 100);
                totalOffersApplied += offerAmount;
            });
           // const offerAmount=overallOrderAmount-order.totalPrice
            

             // totalOffersApplied = offerAmount;
            
        });

        if (format === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
            doc.pipe(res);
        
            // Title
            doc.fontSize(20).text('Sales Report', { align: 'center' });
            doc.moveDown();
        
            // Summary Section
            doc.fontSize(14).text('Summary', { underline: true });
            doc.moveDown();
            doc.fontSize(12);
            doc.text(`Total Sales Count: ${totalSalesCount}`);
            doc.text(`Overall Order Amount: Rs ${overallOrderAmount.toFixed(2)}`);
            doc.text(`Coupon Deduction: Rs ${couponDeduction.toFixed(2)}`);
            doc.text(`Net Sales: Rs ${netSales.toFixed(2)}`);
            doc.text(`Total Offers Applied: Rs ${totalOffersApplied.toFixed(2)}`);
            doc.moveDown();
        
            // Order Details Table Header
            doc.fontSize(14).text('Order Details', { underline: true });
            doc.moveDown();
        
            // Define column widths
            const columnWidths = [80, 150, 50, 100, 80, 80];
            const startX = 50; // Left padding for the table
            let currentY = doc.y;
        
            // Table Header
            doc.fontSize(12).font('Helvetica-Bold');
            const headers = ['Order ID', 'Product', 'Quantity', 'Regular Total Price', 'Discount', 'Sold Price'];
            headers.forEach((header, i) => {
                doc.text(header, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, { width: columnWidths[i], align: 'left' });
            });
            currentY += 20; // Move down for rows
        
            // Draw header underline
            doc.moveTo(startX, currentY).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), currentY).stroke();
            currentY += 10;
        
            // Table Rows
            doc.font('Helvetica').fontSize(10); // Set font for table rows
            allOrders.forEach(order => {
                order.orderedItems.forEach(item => {
                    const row = [
                        order.orderId,
                        item.product.productName || "No product name",
                        item.quantity || 0,
                        `Rs ${(item.product.regularPrice * item.quantity).toFixed(2)}`,
                        `Rs ${order.discount || 0}`,
                        `Rs ${order.finalAmount || 0}`
                    ];
        
                    // Render each column in the row
                    row.forEach((cell, i) => {
                        doc.text(cell, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, { width: columnWidths[i], align: 'left' });
                    });
        
                    currentY += 20; // Move down for the next row
        
                    // Draw row underline for separation
                    doc.moveTo(startX, currentY).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), currentY).stroke();
                    currentY += 10;
                });
            });
        
            doc.end();
        }
        
        
         else if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            
            // Summary Sheet
            const summarySheet = workbook.addWorksheet('Summary');
            summarySheet.columns = [
                { header: 'Metric', key: 'metric', width: 25 },
                { header: 'Value', key: 'value', width: 30 }
            ];
            summarySheet.addRows([
                { metric: 'Total Sales Count', value: totalSalesCount },
                { metric: 'Overall Order Amount', value: `Rs ${overallOrderAmount.toFixed(2)}` },
                { metric: 'Coupon Deduction', value: `Rs ${couponDeduction.toFixed(2)}` },
                { metric: 'Net Sales', value: `Rs ${netSales.toFixed(2)}` },
                { metric: 'Total Offers Applied', value: `Rs ${totalOffersApplied.toFixed(2)}` }
            ]);

            // Order Details Sheet
            const ordersSheet = workbook.addWorksheet('Order Details');
            ordersSheet.columns = [
                { header: 'Order ID', key: 'orderId', width: 25 },
                { header: 'Product', key: 'product', width: 25 },
                { header: 'Quantity', key: 'quantity', width: 10 },
                { header: 'Regular Total Price', key: 'regularTotalPrice', width: 20 },
                { header: 'Discount', key: 'discount', width: 15 },
                { header: 'couponDeduction', key: 'couponDeduction', width: 15 },
                { header: 'Sold Price', key: 'soldPrice', width: 15 }
            ];

            // Adding Order Details Rows
            allOrders.forEach(order => {
                order.orderedItems.forEach(item => {
                    

                    ordersSheet.addRow({
                        orderId: order._id,
                        product: item.product.productName||"No product name" ,
                        quantity: item.quantity || 0,
                        regularTotalPrice: `Rs ${(item.product.regularPrice * item.quantity || 0).toFixed(2)}`||0,
                        discount: `Rs ${(order.discount ?? 0).toFixed(2)}`||0,
                        couponDeduction: `Rs ${(order.couponDeduction ?? 0).toFixed(2)}`||0,
                        soldPrice: `Rs ${(order.finalAmount ?? 0).toFixed(2)}`||0
                    });
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
            await workbook.xlsx.write(res);
            res.end();

        }  else {
            res.render("sales.ejs", {
                totalSalesCount,
                overallOrderAmount,
                couponDeduction,
                netSales,
                startDate: adjustedStartDate,
                endDate: adjustedEndDate,
                totalOffersApplied,
                reportType,
                orders,
                totalOrders,
                totalPages,
                currentPage:page

            });
        }

    } catch (error) {
        console.error("Error generating sales report:", error);
        res.status(500).json({ message: "Error generating report" });
    }
};
const newEdit=async(req,res)=>{
    const { productId, productName, category, regularPrice, productOffer, quantity } = req.body;
      const productImage = req.file ? req.file.filename : null; // Check if a new file was uploaded
  
    try {
      const updateData = {
        productName,
        category,
        regularPrice,
        productOffer,
        quantity
      }
  
      if (productImage) {
              updateData.productImage = productImage;
          }
          await Product.findByIdAndUpdate(productId, updateData);
          res.redirect('/admin/products') 
  
    } catch (error) {
      console.error("Error updating product:", error);
          res.redirect(`/admin/editProduct/${productId}`);
      
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
    getOrders,
    editOrder,
    updateStatus,
    cancelOrder,
    replaceImage,
    getCoupon,
    createCoupon,
    deleteCoupon,
    salesReport,
    newEdit,
    addProducts,
   
    
    
}