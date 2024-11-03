const mongoose = require('mongoose');
const { Schema } = mongoose; // Destructure Schema from mongoose

const productSchema = new Schema({
    productName:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
   /* brand:{
        type:String,
        required:true
    },*/
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
       default:null
    },
    productOffer:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        default:1
    },
    color:{
        type:String,
        required:true
        
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","Out of stock","Discontinued"],
        required:true,
        default:"Available"
    },
    isDeleted:{type:Boolean,default:false},
},{timestamps:true});
productSchema.pre('save', function(next) {
    if (this.salePrice == null) {
        this.salePrice = this.regularPrice;
    }
    next();
});
const Product=mongoose.model("Product",productSchema)
module.exports=Product;