const express=require("express")
const path=require('path')
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const {userAuth,adminAuth,adminAuth1}=require("../middleware/auth")
const customerController=require("../controllers/admin/cusomerController")
const productController=require("../controllers/admin/productController")
const multer = require('multer');


const categoryController=require("../controllers/admin/categoryController")
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/product-images'); 
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); 
    }
});


const uploads = multer({ storage: productStorage }); 


router.get("/pageError",adminController.pageError)
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/",adminAuth1,adminController.loadDashboard)
router.get("/logout",adminAuth1,adminController.logout)
router.get("/users",adminAuth1,customerController.customerinfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth1,customerController.customerunBlocked);
router.get("/category",adminAuth1,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth1,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth1,categoryController.editCategory)

router.post("/softDeleteCategory", adminAuth, categoryController.softDeleteCategory);
router.get("/soft",adminAuth1,categoryController.viewSoftDeleted);
router.post("/restoreCategory",categoryController.restore);
router.get("/addProducts",adminAuth1,productController.getProductAddPage)
router.post("/addProducts",adminAuth1,uploads.array("images",4),productController.addProducts)
router.get("/product",adminAuth1,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer)
router.get("/editProduct",adminAuth1,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth1,uploads.array("images",4)
,productController.editProduct)
router.post("/deleteImage",adminAuth1,productController.deleteSingleImage)
router.post("/softDeleteProduct",adminAuth1,productController.softDeleteProduct)
router.get('/softProducts',adminAuth1,productController.viewSoftDeletedProduct)
router.post("/restoreProduct",adminAuth,productController.restore)
router.get("/demoAdmin",adminAuth1,customerController.demo)

module.exports=router
