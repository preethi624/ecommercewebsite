const express=require("express")
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require("../middleware/auth")
const customerController=require("../controllers/admin/cusomerController")


router.get("/pageError",adminController.pageError)
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)
router.get("/users",adminAuth,customerController.customerinfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);
module.exports=router
