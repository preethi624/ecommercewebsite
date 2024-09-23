const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    // Name is required
    username: {
        type: String,
        required: true
    },
    
    // Email field: unique but optional if phone is provided
    email: {
        type: String,
        unique: true,
        sparse: true,  // Makes the index sparse (allows null but unique when provided)
    },
    
    // Phone field: unique but optional if email is provided
    phone:{
        type:String,
        required:false,
        sparse:true,
        unique:true,
        default:null,

    },
    googleId:{
        type:String,
        unique:true,

    },
   
      
    
    // Password is required for signup
    password: {
        type: String,
        required: false
    },
    
    // Google ID (used for Google OAuth logins)
    googleId: {
        type: String,
        unique: true,
        sparse: true  // Only applies to Google OAuth users
    },
    
    // Status fields
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    
    // Optional: Cart and wishlist references
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart",
    }],
    
    wallet: {
        type: Number,
        default: 0
    },
    
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: "Wishlist"
    }],
    
    // Order history references
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    
    // Creation timestamp
    createdOn: {
        type: Date,
        default: Date.now,
    },
    
    // Optional referral-related fields
   /* referalCode: {
        type: String,
        default: null
    },
    
    redeemed: {
        type: Boolean,
        default: false
    },
    
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],*/
    
    // Search history, which may be populated later
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
        },
        brand: {
            type: String,
            default: null
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
});

// Validation to ensure that either email or phone is required
userSchema.path('email').validate(function (value) {
    return this.email || this.phone;
}, 'Either email or phone number is required.');
userSchema.path('phone').validate(function (value) {
    return this.phone || this.email;
}, 'Either phone number or email is required.');

const User = mongoose.model("User", userSchema);

module.exports = User;
