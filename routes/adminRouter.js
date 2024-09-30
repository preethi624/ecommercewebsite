const express=require("express")
const path=require('path')
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require("../middleware/auth")
const customerController=require("../controllers/admin/cusomerController")
const productController=require("../controllers/admin/productController")
const multer = require('multer');


const categoryController=require("../controllers/admin/categoryController")
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/product-images'); // Destination folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
    }
});
const reImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/re-image'); // Destination for re-images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique name for each image
    }
});

const uploads = multer({ storage: productStorage }); // Create multer instance
const reImageUploads = multer({ storage: reImageStorage });

router.get("/pageError",adminController.pageError)
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)
router.get("/users",adminAuth,customerController.customerinfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)

router.post("/softDeleteCategory", adminAuth, categoryController.softDeleteCategory);
router.get("/soft",adminAuth,categoryController.viewSoftDeleted);
router.post("/restoreCategory",categoryController.restore);
router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/product",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer)
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,reImageUploads.array("images",4),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)



module.exports=router
