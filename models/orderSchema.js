const mongoose = require("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid');

const orderSchema = new Schema({
    orderId : {
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',  // Link to User model
        required: true
    },
    orderedItems:[{

        product:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:false
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        },
        purchaseQuantity:{
            type:[Number],
            default:[]
        },
        status:{
            type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Request','Returned']

        },
        paymentStatus:{
            type:String,
            required:true,
            enum:['pending','paid']
        },
        deliveryStatus:{
            type:String,
            required:true,
            enum:['confirmed','order not placed']
    
        },
        

    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:false
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:'Address',
        required:true
    },
    invoiceDate:{
        type:Date,
        default:Date.now
    },
    deliveryDate:{
        type:Date,
        default:Date.now


    },
   
    expectedDeliveryDate: {
        type: Date
    },
    createdOn :{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    
    updatedDate:{
        type:Date,
        default:Date.now
    }


})


const Order = mongoose.model("Order",orderSchema);
module.exports = Order;