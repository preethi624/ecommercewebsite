const mongoose=require('mongoose')
const {schema}=mongoose
const userSchema=new Schema({
    name:{
        type:String,
        required:false
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:true,
        unique:true
        
    },
    googleId:{
        type:String,
        unique:true
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.types.ObjectId,
        ref:"cart",

    }],
    wallet:{
        type:Number,
        default:0,
    },
    wishlist:{
        type:Schema.Types.ObjectId,
        ref:"wishlist"
    },
    orderHistoy:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
    referelCode:{
        type:String
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:{
        type:Schema.Types.ObjectId,
        ref:"User"

    },
    searchHistory:[{
        ctegory:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }

    }]
})
const User=mongoose.model("User",userSchema);
module.exports=User;