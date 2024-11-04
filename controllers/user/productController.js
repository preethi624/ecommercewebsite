const mongoose = require('mongoose');
const User = require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const Product=require("../../models/productSchema")
const Cart=require("../../models/cartSchema")
const router = require("../../routes/userRouter");
const Order=require("../../models/orderSchema")
const Coupon=require("../../models/couponSchema")
const Wishlist=require("../../models/wishlistSchema")
const Transaction=require("../../models/transactionSchema")
const Razorpay = require('razorpay');
require('dotenv').config();
var razorpayInstance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
const addToCart=async(req,res)=>{
  
    try {
        console.log("session",req.session)
        const user=req.session.user
       
        const{quantity}=req.body;
        console.log("quantity",quantity)
        const productId=req.params.productId
        console.log("product id",productId)
        const product=await Product.findById(productId)
        
        console.log("product quantity",product.quantity)
        if(product.quantity>=quantity){
            const user = await User.findById(req.session.user.id);
           
            const cartItem = user.cart.find(item => item.product.equals(productId));
          
            if (cartItem) {
                // If product is already in the cart, update the quantity
                await User.updateOne(
                  { _id: req.session.user._id, 'cart.product': productId },
                  { $inc: { 'cart.$.quantity':Number(quantity) } }
                );
              } else{
                await User.updateOne(
                    { _id: req.session.user.id },
                    { $push: { cart: { product: product._id,quantity:Number(quantity) } } })
    
                   
            }
            return res.redirect('/cart');

              }
          
         

    else{
            return res.send('Not enough stock.');
        }



        
    } catch (error) {
        console.log("error",error)
        
    }
}
const getCart = async (req, res) => {
  console.log("get cart triggered");
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).populate('cart.product').populate('addresses');
    
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Calculate cart total only if there are products in the cart
    const cartTotal = user.cart.length > 0 
      ? user.cart.reduce((total, item) => {
          if (item.product && item.product.regularPrice) {
            return total + (item.product.salePrice )* item.quantity;
          }
          return total;
        }, 0)
      : 0;

    res.render('cart.ejs', { cart: user.cart, addresses: user.addresses, user: user, cartTotal: cartTotal });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).send('An error occurred while fetching the cart');
  }
};


const removeCart=async(req,res)=>{
    try {
        console.log("session-user",req.session.user)
        const productId=req.params.productId;
        const user=req.session.user

        const userId=user.id;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { cart: { product: productId } } }, // Pull the product out of the user's cart array
            { new: true } // Return the updated user
          );
          if (updatedUser) {
            return res.redirect("/cart");
          } else {
            return res.status(404).send("User or product not found.");
          }
        

        
    } catch (error) {
        console.log(error)
        res.status(500).send("Error removing item from cart");
        
    }
}
const updateCart=async(req,res)=>{
  try {
    const productId=req.params.productId;
    const{quantity}=req.body
    let cartItem = req.session.cart.find(item => item.product._id.toString() === productId);
    if (cartItem) {
      cartItem.quantity = Math.max(1, parseInt(quantity)); 
      const updatedTotal = (cartItem.product.regularPrice-((cartItem.product.regularPrice*cartItem.product.productOffer)/100)) * cartItem.quantity;
      const cartTotal = req.session.cart.reduce((total, item) => total + (item.product.salePrice * item.quantity), 0);
      res.json({ success: true, updatedTotal, cartTotal });
    }
    
  } catch (error) {
    
  }
}
const getOrderSummary=async(req,res)=>{
  try {
      const userId = req.session.user.id;
  const productId = req.params.productId;
  
  const user = await User.findById(userId).populate('addresses');
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).send('Product not found.');
  }
  
  const quantity = 1; // Default quantity. You can modify to allow selection.
  const cartTotal = product.salePrice * quantity;
  const shippingFee=3
  const taxes=80
  
  res.render('orderSummary', {
    user,
    product,
    quantity,
    cartTotal,
    shippingFee,
    taxes
  })
      
  } catch (error) {
      console.error('Error fetching order summary:', error);
  res.status(500).send('An error occurred while fetching the order summary.'); 
      
  }
}
const getCheckout = async (req, res) => {
  try {
    const userId = req.session.user.id;
    let { productId, quantity } = req.query;
    
    // Fetch user with populated cart and addresses
    const user = await User.findById(userId).populate('addresses').populate('cart.product');
    
    // Ensure productId and quantity are arrays, even for a single product
    productId = Array.isArray(productId) ? productId : [productId];
    quantity = Array.isArray(quantity) ? quantity.map(q => parseInt(q)) : [parseInt(quantity)];
    
    // If no productId is provided, handle checkout for all products in the cart
    if (!productId || productId.length === 0) {
      if (user.cart.length === 0) {
        return res.redirect('/cart'); // Redirect to cart if it's empty
      }
      
      const cartItems = user.cart.map((item, index) => {
        const productQuantity = quantity[index] || item.quantity; // Use provided quantity or default
        return {
          product: item.product,
          quantity: productQuantity,
          
          total: item.product.salePrice * productQuantity
        };
      });
    

      const totalPrice = cartItems.reduce((total, item) => total + item.total, 0);
      const defaultAddress = user.addresses.find(addr => addr._id.toString() === user.defaultAddress.toString());
     
      return res.render('checkout', {
        order: {
          items: cartItems,
          total: totalPrice,
          address: defaultAddress
        },
        user
      });
    }
    
    // If productId exists, handle checkout for the selected products
    const cartItems = [];
    
    productId.forEach((id, index) => {
      const cartItem = user.cart.find(item => item.product._id.toString() === id);
      if (!cartItem) {
        return res.status(404).send(`Product not found in cart for productId: ${id}`);
      }

      const productQuantity = quantity[index] || cartItem.quantity;
      cartItems.push({
        product: cartItem.product,
        quantity: productQuantity,
        total: cartItem.product.salePrice * productQuantity
      });
    });

    const totalPrice = cartItems.reduce((total, item) => total + item.total, 0);
    const defaultAddress = user.addresses.find(addr => addr._id.toString() === user.defaultAddress.toString());
    
    res.render('checkout', {
      order: {
        items: cartItems,
        total: totalPrice,
        address: defaultAddress
      },
      user
    });

  } catch (error) {
    console.error('Error fetching checkout page:', error);
    res.status(500).send('An error occurred while preparing the checkout.');
  }
};
const postCheckout = async (req, res) => {
  try {
    const userId = req.session.user.id;
    let { paymenentMethod, productId, quantity, grandtotal ,discountAmount} = req.body;
    console.log("disc1",discountAmount)

    // Ensure quantity is always an array
    if (!Array.isArray(quantity)) {
      quantity = [Number(quantity)];
    } else {
      quantity = quantity.map(qty => Number(qty));
    }

    const user = await User.findById(userId)
      .populate('addresses')
      .populate('cart.product');
    
    if (!user || user.cart.length === 0) {
      return res.redirect('/cart');
    }

    const defaultAddress = user.addresses.find(
      addr => addr._id.toString() === user.defaultAddress.toString()
    );

    if (!defaultAddress) {
      return res.redirect('/userProfile'); // Prompt to add an address if not set
    }

    // Map quantity array to the cart items
    const orderItems = user.cart.map((item, index) => ({
      product: item.product._id,
      quantity: quantity[index], // Map quantity from the array
      price: item.product.salePrice
    }));
    console.log("items",orderItems)

    // Validate if there's enough stock for each product
    for (let i = 0; i < user.cart.length; i++) {
      const cartItem = user.cart[i];
      const product = await Product.findById(cartItem.product._id);
      const purchaseQuantity = quantity[i];

      if (product.quantity < purchaseQuantity) {
        return res.status(400).send(`Insufficient quantity for product: ${cartItem.product.name}`);
      }
    }

    // Calculate total price
    const totalPrice = orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const referralCredits = user.referralCredits || 0;


     console.log("grandtotal",grandtotal)
     console.log("dicountamount",discountAmount)
     let discount=Number(discountAmount);
     let referralDiscount=0;
     if (referralCredits > 0) {

       referralDiscount = Math.min(referralCredits, totalPrice - discount); 
       console.log("referel",referralDiscount)
       console.log("discb",discount)
      discount += Number(referralDiscount);
      console.log("disca",discount)
      // Deduct the used referral credits
    }
      
     
    const finalAmount = totalPrice-discount;
    console.log("finalamount",finalAmount)

    // Create new order
    const newOrder = new Order({
      user: userId,
      orderedItems: orderItems,
      totalPrice,
      discount,
      finalAmount,
      address: defaultAddress._id,
      status: 'Pending',
      invoiceDate: new Date(),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expected delivery in 7 days
    });

    await newOrder.save();
   
    await User.findByIdAndUpdate(
      userId,
      { $push: { orderHistory: newOrder._id } },
      { new: true } // Optional: returns the updated document
    );
    
    
   

    // Update product quantities in the inventory
   

    // Clear the cart after successful checkout
    

    return res.redirect(`/order/confirmation/${newOrder._id}`);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Post checkout failed');
  }
};


const confirmation=async(req,res)=>{
  try {
    const user=req.session.user
    userId=user.id
    
    const orderId = req.params.newOrderId;
    const userData = await User.findById(userId).populate('addresses'); 

    
    const order = await Order.findById(orderId)
      .populate({
        path:"orderedItems",
        populate:{
          path:'product',
          model:'Product'
        }
      })
      const totalPrice = order.finalAmount

    if (!order) {
      return res.status(404).send("Order not found");
    }
    const defaultAddress = userData?.addresses
    ? userData.addresses.find(addr => addr._id.toString() === userData.defaultAddress?.toString())
    : null;
    console.log(userData)
    if(req.body['paymentMethod']=='cod'){
      return res.render("cod-confirmation.ejs",order)
    }else{
     const options={
      amount:totalPrice*100,
      currency:'INR',
      receipt:orderId,
      payment_capture:1
     }
     console.log("options",options)
     try{
      const razorpayOrder=await razorpayInstance.orders.create(options);
      console.log("details",razorpayOrder.amount, razorpayOrder.currency, razorpayOrder.id);
      return res.render('confirmation.ejs',{
       razorpayOrderId: razorpayOrder.id,
       amount: razorpayOrder.amount,
       currency: razorpayOrder.currency,
       orderId: orderId,
       order:order,
       user:userData

     });

     }catch(error){
     console.log(error)
      return res.status(500).send('Payment setup failed.');

     }
    


    }

    

   
    
  } catch (error) {

    console.error("Error retrieving order confirmation:", error);
    res.status(500).send("Internal Server Error");
  }
}
const orderCancel=async(req,res)=>{
  try {
    const orderId=req.params.orderId;
    const order = await Order.findById(orderId)
      .populate({
        path: 'orderedItems.product',
        model: 'Product'
      })
      
      res.render("cancel.ejs",{order:order,orderId:orderId})
    
  } catch (error) {
    console.error(error)
    
  }
}
const cancelOrder=async(req,res)=>{
  const {orderId,productId}=req.body
  try {
    const userId=req.session.user.id
    const order=await Order.findById(orderId)
    if(!order){
      return res.status(404).send('Order not found');
    }
    console.log('Order status:', order.status); 

    if (['Shipped', 'Delivered', 'Cancelled'].includes(order.status)) {
      return res.status(400).send('Order cannot be cancelled');
    }
    console.log("order",order)
    const refundAmount=order.totalPrice
    console.log("refund",refundAmount)
    await User.findByIdAndUpdate(
      userId,
      { $inc: { wallet: refundAmount } }
    );
    const transaction = new Transaction({
      userId,
      amount: refundAmount,
      type: 'credit', // Since it's a refund
      description: `Refund for cancelled order ID: ${orderId}`,
    });
    await transaction.save();
    order.status = 'Cancelled';
    await order.save();
    
    res.redirect("/orders")
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).send('Internal Server Error');
    
  }

}
const orderDetails=async(req,res)=>{
  try {
    
    const user=req.session.user
    const userId=user.id
    const userData = await User.findById(userId).populate({
      path: 'orderHistory',
      populate: {
          path: 'orderedItems.product',
          model: 'Product'
      }
  }).populate('addresses')
  if(!userData){
    return res.redirect("/login")
}

if (!userData.addresses) {
    userData.addresses = [];
}

  

    const orderId=req.params.orderId
    console.log(orderId)
  
    const order=await Order.findById(orderId).populate('orderedItems.product')
    
    if (!order) {
      return res.status(404).send('Order not found');
    }
    const orderAddress=userData.addresses.find(address=>address._id.toString()===order.address.toString())
    if (!orderAddress) {
      return res.status(404).send('Address not found for the order');
    }
    res.render('orderDetails',{user:userData,order,defaultAddress: userData.defaultAddress,orderAddress})
    
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).send('Internal Server Error');
    
  }
}
const codConfirmation=async(req,res)=>{
  try {
    const userId=req.session.user.id
    let user=await User.findById(userId)

    for (let i = 0; i < user.cart.length; i++) {
      const cartItem = user.cart[i];
      const quantity=cartItem.quantity
      const product = await Product.findById(cartItem.product._id);
      product.quantity -= quantity; // Deduct the quantity from the stock
      await product.save();
    }
    user.cart = [];
    user.hasPurchased=true;
    user.referralCredits=0;
    await user.save();
   res.render("cod-confirmation.ejs")
  } catch (error) {
    console.log("error",error)
    
  }
}
const orderConfirmation=async(req,res)=>{
  try{
    const userId=req.session.user.id
    let user=await User.findById(userId)

    for (let i = 0; i < user.cart.length; i++) {
      const cartItem = user.cart[i];
      const quantity=cartItem.quantity
      const product = await Product.findById(cartItem.product._id);
      product.quantity -= quantity; // Deduct the quantity from the stock
      await product.save();
    }
    user.cart = [];
    user.hasPurchased=true;
    user.referralCredits=0;
    await user.save();

 const { payment_id, order_id } = req.query;
  res.render('order-confirmation', { payment_id, order_id });

  }catch{

  }
 
}
const applyCoupon=async(req,res)=>{
  try {
    const {code,totalAmount}=req.body
    const userId=req.session.user.id
    const coupon=await Coupon.findOne({code:code,isActive:true})
    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code or inactive coupon.' });
  }
  if(coupon.usersUsed.length>coupon.usageLimit){
    return res.status(400).json({ success: false, message: 'Coupon usage limit exceeded.' });

  }
  coupon.usersUsed.push(userId)
  if (coupon.usersUsed.length >= coupon.usageLimit) {
    coupon.isActive = false;
  }
  await coupon.save(); 

  if (new Date(coupon.expiryDate) < new Date()) {
    return res.status(400).json({ success: false, message: 'Coupon has expired.' });
}
let discountAmount=coupon.discountValue
console.log("disce",discountAmount)
if(coupon.discountType==='percentage'){
  discountAmount = (discountAmount / 100) * totalAmount;
}

if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
  discountAmount = coupon.maxDiscount;
}
return res.json({ success: true, message: 'Coupon applied successfully!', discountAmount });
    
  } catch (error) {
    console.error('Error applying coupon:', error);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    
  }
}
const getCoupon=async(req,res)=>{
  try {
    const today=new Date()
    today.setHours(0, 0, 0, 0);
    coupon=await Coupon.find({ isActive:true, expiryDate: { $gte: today }})
    console.log('Coupons fetched:', coupon);
    res.render("coupons.ejs",{coupon})
    
  } catch (error) {
    console.error('Error getting coupon', error);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    
  }

}
const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Use $addToSet to ensure the product is added only once
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { wishlist: productId } }, // Add productId to wishlist
      { new: true }  // Return the updated user document
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ message: "Product added to wishlist", wishlist: user.wishlist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred while adding to wishlist" });
  }
};


const removeWishlist=async(req,res)=>{
  try{
    const userId=req.session.user.id;
  const productId=req.params.id
 const updatedUser=await User.findByIdAndUpdate(userId,{ $pull: { wishlist: productId  } },{new:true})
 if (updatedUser) {
  return res.redirect("/wishlist");
} else {
  return res.status(404).send("User or product not found.");
}

  }catch(error){
    console.error(error)
  }
  


}
const getWishlist=async(req,res)=>{
  try {
    const user=req.session.user
  
    const userId=user.id
    const userData=await User.findById(userId).populate("wishlist")
    if (!userData) {
      return res.status(404).send('User not found.');
    }
    if (userData.wishlist.length === 0) {
      return res.send('Your wishlist is empty.');
    }
    return res.render("wishlist.ejs",{wishlistProducts:userData.wishlist})
    
  } catch (error) {
    console.error(error);
    res.status(500).send("internal server error")
    
  }
}
const returnOrder=async(req,res)=>{

  try {
    const orderId=req.params.id;
    const order = await Order.findById(orderId)
      .populate({
        path: 'orderedItems.product',
        model: 'Product'
      })
      
      res.render("return.ejs",{order:order,orderId:orderId})
    
  } catch (error) {
    console.error(error)
    
  }
}
const confirmReturn=async(req,res)=>{
  try {
    const {orderId,productId}=req.body;
    console.log("orderId",orderId)
    
    const order=await Order.findById(orderId)
    if (!order) {
      return res.status(404).send("Order not found");
    }
    order.status="Return Request"
    await order.save();
   res.redirect("/orders")
    
  } catch (error) {

    console.error("Error updating return request:", error);
    res.status(500).send("An error occurred while processing the return request.");
  }

}
const getOrders=async(req,res)=>{
  try {

    const user=req.session.user
    const userId=user.id
    const page = parseInt(req.query.page) || 1; // Current page number, default to 1
    const limit = 5; // Number of orders per page
    const skip = (page - 1) * limit;
    const userData=await User.findById(userId).populate({
      path: 'orderHistory',
      populate: {
          path: 'orderedItems.product',
          model: 'Product'
      }
  })
  if(!userData){
    return res.redirect("/login")
}
const orderHistory = await Order.find({ user: userId })
            
            .populate({
                path: 'orderedItems.product',
                model: 'Product'
            }).sort({invoiceDate:-1})
            .skip(skip)
            .limit(limit)
      const totalOrders = await Order.countDocuments({ user: userId });
      const totalPages = Math.ceil(totalOrders / limit);


         res.render('orderHistory.ejs', { 
            user: userData, 
            orderHistory: orderHistory,
            currentPage: page,
           totalPages: totalPages
           
           
        });        

    
  } catch (error) {

     console.error(error);
        res.status(500).send('Server Error');
        
  }
}

module.exports={
    addToCart,
    getCart,
    removeCart,
    updateCart,
    getOrderSummary,
    getCheckout,
    postCheckout,
    confirmation,
    cancelOrder,
    orderDetails,
    codConfirmation,
    orderConfirmation,
    applyCoupon,
    getCoupon,
    addToWishlist,
    removeWishlist,
    getWishlist,
    returnOrder,
    confirmReturn,
    orderCancel,
    getOrders,
    
}