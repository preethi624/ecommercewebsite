const express=require("express")
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require("../middleware/auth")
const customerController=require("../controllers/admin/cusomerController")


const categoryController=require("../controllers/admin/categoryController")
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

module.exports=router
