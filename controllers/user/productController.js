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
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Razorpay = require('razorpay');
require('dotenv').config();

var razorpayInstance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
const addToCart=async(req,res)=>{
  
    try {
      
        const user=req.session.user
       
        const{quantity}=req.body;
       
        const productId=req.params.productId
       
        const product=await Product.findById(productId)
        
       
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
 
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId)
    .populate({
      path: 'cart.product',
      populate: { path: 'category', select: 'categoryOffer' }
    })
    .populate('addresses');
    let totalRegularPrice = 0;
    let totalDiscountedPrice = 0;

    user.cart.forEach(item => {
      if (item.product && item.product.regularPrice) {
        const regularPrice = item.product.regularPrice * item.quantity;
        const categoryOffer = item.product.category?.categoryOffer || 0;
        const productOffer = item.product.productOffer || 0;
        const applicableOffer = categoryOffer > 0 ? categoryOffer : productOffer;

        // Apply the applicable offer as a percentage discount
        const discountAmount = (regularPrice * applicableOffer) / 100;
        const discountedPrice = regularPrice - discountAmount;

        totalRegularPrice += regularPrice;
        totalDiscountedPrice += discountedPrice;
      }
    });
    const totalDiscountAmount = totalRegularPrice - totalDiscountedPrice;
    const effectiveDiscountPercentage = totalRegularPrice > 0 
      ? (totalDiscountAmount / totalRegularPrice) * 100 
      : 0;

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

     const cartRegularTotal = user.cart.length > 0 
      ? user.cart.reduce((total, item) => {
          if (item.product && item.product.regularPrice) {
            return total + (item.product.regularPrice )* item.quantity;
          }
          return total;
        }, 0)
      : 0;
      

    res.render('cart.ejs', { cart: user.cart, addresses: user.addresses, user: user, cartTotal: cartTotal, effectiveDiscountPercentage: effectiveDiscountPercentage.toFixed(2),cartRegularTotal});
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).send('An error occurred while fetching the cart');
  }
};


const removeCart=async(req,res)=>{
    try {
        
        const productId=req.params.productId;
        const user=req.session.user

        const userId=user.id;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { cart: { product: productId } } }, 
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
      await User.updateOne(
        { _id: userId, 'cart.product': productId },
        { $set: { 'cart.$.quantity': newQuantity } }
      );

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
  const quantity = req.query.quantity || 1;//new commet
  
  
  const user = await User.findById(userId).populate('addresses');
  const product = await Product.findById(productId).populate('category');
  
  if (!product) {
    return res.status(404).send('Product not found.');
  }
  
  const discount=product.category.categoryOffer?product.category.categoryOffer:product.productOffer
 
  const cartTotal = product.salePrice * quantity;
  
  
  res.render('orderSummary', {
    user,
    product,
  
    cartTotal,
    
    quantity,
    discount
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
    const flag=0;
    
    
    const user = await User.findById(userId).populate('addresses').populate('cart.product');
    
    
    productId = Array.isArray(productId) ? productId : [productId];
    quantity = Array.isArray(quantity) ? quantity.map(q => parseInt(q)) : [parseInt(quantity)];
    
    
    if (!productId || productId.length === 0) {
      if (user.cart.length === 0) {
        return res.redirect('/cart'); 
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
        user,
        flag
        
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
        address: defaultAddress,
      
      },
      user,
      flag
      
    });

  } catch (error) {
    console.error('Error fetching checkout page:', error);
    res.status(500).send('An error occurred while preparing the checkout.');
  }
};
const itemCheckout=async(req,res)=>{
  try{
    const userId = req.session.user.id;
  const productId=req.query.productId;
  const quantity=req.query.quantity;
  const flag=1;
  const user = await User.findById(userId).populate('addresses');
    
  // Fetch the product details by productId
  const product = await Product.findById(productId).populate('category');

  if (!product) {
    return res.status(404).send('Product not found.');
  }

  // Calculate the total price for the single product
  const totalPrice = product.salePrice * quantity;

  // Determine the default address for the user
  const defaultAddress = user.addresses.find(
    (addr) => addr._id.toString() === user.defaultAddress.toString()
  );

  // Render the checkout page with the single product
  res.render('checkout', {
    order: {
      items: [
        {
          product,
          quantity,
          total: totalPrice,
        },
      ],
      total: totalPrice,
      address: defaultAddress,
    },
    user,
    flag
  });

  }catch(error){

   console.error('Error fetching single product checkout page:', error);
    res.status(500).send('An error occurred while preparing the checkout.');
  }
  


}
const postCheckout = async (req, res) => {
  const generateOrderId=async()=>{
    let orderId;
    let isUnique=false;
    while(!isUnique){
      orderId=Math.floor(100000+Math.random()*900000);
      const existingOrder=await Order.findOne({orderId})
      if(!existingOrder){
        isUnique=true;
      }
    }
    return orderId
  }
  const flag = req.params.flag;
 

  try {
    const userId = req.session.user.id;
    let { paymentMethod, productId, quantity, grandtotal, discountAmount, address } = req.body;
   

    let orderItems = [];
    let totalPrice = 0;
    const user = await User.findById(userId).populate("addresses").populate("cart.product");
    const referralCredits = user.referralCredits || 0;

    if (flag === "1") {
      // For single product purchase
      const product = await Product.findById(productId);

      if (!product || product.quantity < quantity) {
        return res.status(400).send(`Insufficient quantity for product: ${product ? product.name : "Unknown"}`);
      }
      
      const defaultAddress = user.addresses.find(
        addr => addr._id.toString() === user.defaultAddress?.toString()
      );

      if (!defaultAddress) {
        
        return res.redirect("/userProfile"); // Prompt to add an address if not set
      }

      address = defaultAddress;

      orderItems.push({
        product: product._id,
        quantity,
        price: product.salePrice,
        status: "Pending",
        deliveryStatus: "order not placed",
        paymentStatus: "pending",
      });

      totalPrice += product.salePrice * quantity;

      // Ensure address is provided
      if (!address) {
        return res.status(400).send("Address is required for placing an order.");
      }
    } else {
      // For cart checkout
      if (!Array.isArray(quantity)) {
        quantity = [Number(quantity)];
      } else {
        quantity = quantity.map(qty => Number(qty));
      }

      if (!user || user.cart.length === 0) {
        return res.redirect("/cart");
      }

      const defaultAddress = user.addresses.find(
        addr => addr._id.toString() === user.defaultAddress?.toString()
      );

      if (!defaultAddress) {
        return res.redirect("/userProfile"); // Prompt to add an address if not set
      }

      address = defaultAddress;

      orderItems = user.cart.map((item, index) => ({
        product: item.product._id,
        quantity: quantity[index],
        price: item.product.salePrice,
        status: "Pending",
        deliveryStatus: "order not placed",
        paymentStatus: "pending",
      }));

      for (let i = 0; i < user.cart.length; i++) {
        const cartItem = user.cart[i];
        const product = await Product.findById(cartItem.product._id);

        if (product.quantity < quantity[i]) {
          return res.status(400).send(`Insufficient quantity for product: ${cartItem.product.name}`);
        }
      }

      totalPrice = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
    }

    // Apply discounts
    let discount = Number(discountAmount) || 0;
    let referralDiscount = 0;
    if (referralCredits > 0) {
      referralDiscount = Math.min(referralCredits, totalPrice - discount);
      discount += referralDiscount;
    }

    const finalAmount = totalPrice - discount;
    const orderId = await generateOrderId();

    const newOrder = new Order({
      user: userId,
      orderId,
      orderedItems: orderItems,
      totalPrice,
      discount,
      finalAmount,
      address, // Use the validated address
      invoiceDate: new Date(),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expected delivery in 7 days
    });

    await newOrder.save();

    // Update user's order history
    await User.findByIdAndUpdate(
      userId,
      { $push: { orderHistory: newOrder._id } },
      { new: true }
    );

    return res.redirect(`/order/confirmation/${newOrder._id}`);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Post checkout failed");
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
      const totalPrice = order.finalAmount+30

    if (!order) {
      return res.status(404).send("Order not found");
    }
    const defaultAddress = userData?.addresses
    ? userData.addresses.find(addr => addr._id.toString() === userData.defaultAddress?.toString())
    : null;
    
    if(req.body['paymentMethod']=='cod'){
      
      await order.save();
      return res.render("cod-confirmation.ejs",order)
    }else{
     const options={
      amount:totalPrice*100,
      currency:'INR',
      receipt:orderId,
      payment_capture:1
     }
    
     try{
      const razorpayOrder=await razorpayInstance.orders.create(options);
     
      return res.render('confirmation.ejs',{
       razorpayOrderId: razorpayOrder.id,
       amount: razorpayOrder.amount,
       currency: razorpayOrder.currency,
       orderId: orderId,
       order:order,
       user:userData,
       


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
    const {Id,productId}=req.params;
   
    const order = await Order.findById(Id)
      .populate({
        path: 'orderedItems.product',
        select:'_id productImage'
        
      })
     

      const item = order.orderedItems.find(
      (orderedItem) => orderedItem.product._id.toString() === productId.toString()
    );
    
    if (!item) {
      return res.status(404).send('Item not found in order');
    }
      res.render("cancel.ejs",{order:order,orderId:Id,item})
    
  } catch (error) {
    console.error(error)
    
  }
}
const cancelOrder=async(req,res)=>{
  const {orderId,productId}=req.body
  
  try {
    const userId=req.session.user.id
    const order=await Order.findById(orderId).populate({path:'orderedItems.product',select:'_id'})
    if(!order){
      return res.status(404).send('Order not found');
    }
   
   
    const item = order.orderedItems.find(
      (orderedItem) => orderedItem.product._id.toString() ===productId.toString( ) 
    );
    if (!item) {
      return res.status(404).send('Item not found in order');
    }

    if (['Shipped', 'Delivered', 'Cancelled'].includes(item.status)) {
      return res.status(400).send('Order cannot be cancelled');
    }
    
    const length=order.orderedItems.length
    
    const couponShared=order.discount/Number(length)
    let refundAmount=(item.price*item.quantity)+couponShared
 
    
    const hasActiveItems = order.orderedItems.some(
      (orderedItem) =>
        orderedItem._id.toString() !== item._id.toString() &&
        !['Shipped', 'Delivered', 'Cancelled'].includes(orderedItem.status)
    );
    if (!hasActiveItems) {
      refundAmount += 30; 
    }
    
    if(item.paymentStatus==='paid'){
      
      await User.findByIdAndUpdate(
        userId,
        { $inc: { wallet: refundAmount } }
      );
      const transaction = new Transaction({
        userId,
        amount: refundAmount,
        type: 'credit', 
        description: `Refund for cancelled order ID: ${orderId}`,
      });
      await transaction.save();
      item.paymentStatus='pending'

    }
    
    item.deliveryStatus='order not placed'
    item.status = 'Cancelled';
    await order.save();
    
    res.redirect("/orders")
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).send('Internal Server Error');
    
  }

}
const orderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user.id;
    
    const userData = await User.findById(userId)
      .populate({
        path: 'orderHistory',
        populate: {
          path: 'orderedItems.product',
          model: 'Product'
        }
      })
      .populate('addresses');

    if (!userData) {
      return res.redirect("/login");
    }

    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId).populate('orderedItems.product');
    if (!order) {
      return res.status(404).send('Order not found');
    }
    const length=order.orderedItems.length
    const itemCouponShare=order.discount/Number(length);

    
    const item = order.orderedItems.find(i => i._id.toString() === itemId);
    if (!item) {
      return res.status(404).send('Item not found in this order');
    }

    
    const itemPrice = item.price * item.quantity + 30-itemCouponShare;

    
    const orderAddress = userData.addresses.find(
      address => address._id.toString() === order.address.toString()
    );

    if (!orderAddress) {
      return res.status(404).send('Address not found for the order');
    }


   
    const options = {
      amount: itemPrice * 100, 
      currency: 'INR',
      receipt:orderId.toString(), 
     
      payment_capture: 1
    };

    try {
      const razorpayOrder = await razorpayInstance.orders.create(options);
    

      return res.render('orderDetails.ejs', {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderId: orderId,
        item: item, 
        user: userData,
        defaultAddress: userData.defaultAddress,
        orderAddress,
        order,
        itemCouponShare
      });

    } catch (error) {
      console.log(error);
      return res.status(500).send('Payment setup failed.');
    }

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).send('Internal Server Error');
  }
};

const codConfirmation=async(req,res)=>{
  try {
   
    const orderId=req.params.id
    const userId=req.session.user.id
    let user=await User.findById(userId)

    for (let i = 0; i < user.cart.length; i++) {
      const cartItem = user.cart[i];
      const quantity=cartItem.quantity
      const product = await Product.findById(cartItem.product._id);
      product.quantity -= quantity; 
      await product.save();
    }
   
      user.cart = [];

    
    
    user.hasPurchased=true;
    user.referralCredits=0;
    await user.save();
   
    const order=await Order.findById(orderId)
    order.orderedItems.forEach(item=>{
      item.paymentStatus='pending'
    item.deliveryStatus='confirmed'
    item.status='Pending'

    })
    
    order.updatedDate=new Date();
    order.paymentMethod='Cash on delivery'

    await order.save()

   res.redirect('/orders')
  } catch (error) {
    console.log("error",error)
    res.status(500).send("Internal server error");
    
  }
}
const orderConfirmation = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { payment_id, order_id, system_order_id, item_id } = req.query;

    let user = await User.findById(userId);

    const order = await Order.findById(system_order_id);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (item_id) {
      // Handle single item purchase
      const item = order.orderedItems.find(item => item._id.toString() === item_id);
      if (!item) {
        return res.status(404).send("Item not found in this order");
      }

      const product = await Product.findById(item.product);
      product.quantity -= item.quantity;
      await product.save();

      item.paymentStatus = "paid";
      item.deliveryStatus = "confirmed";

      // Remove only the purchased item from the cart
      user.cart = user.cart.filter(cartItem => cartItem.product.toString() !== item.product.toString());
    } else {
      // Handle multiple item purchase
      for (let orderedItem of order.orderedItems) {
        const product = await Product.findById(orderedItem.product);
        product.quantity -= orderedItem.quantity;
        await product.save();

        orderedItem.paymentStatus = "paid";
        orderedItem.deliveryStatus = "confirmed";

        // Remove each purchased item from the cart
        user.cart = user.cart.filter(cartItem => cartItem.product.toString() !== orderedItem.product.toString());
      }
    }

    user.hasPurchased = true;
    user.referralCredits = 0;
    await user.save();

    order.updatedDate = new Date();
    order.paymentMethod = "Online payment";
    await order.save();

    res.redirect("/orders");
  } catch (error) {
    console.error("Error in order confirmation:", error);
    res.status(500).send("Internal Server Error");
  }
};

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

   
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { wishlist: productId } }, 
      { new: true }  
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
    const {id,itemId}=req.params;
    
    const order = await Order.findById(id)
      .populate({
        path: 'orderedItems.product',
        model: 'Product'
      })
      if (!order) {
        return res.status(404).send("Order not found");
      }
      const item = order.orderedItems.find(orderedItem => orderedItem.product._id.toString() === itemId);
      
    if (!item) {
      return res.status(404).send("Item not found in order");
    }
      res.render("return.ejs",{order:order,id,item,itemId})
    
  } catch (error) {
    console.error(error)
    
  }
}



const confirmReturn=async(req,res)=>{
  try {
    const {orderId,productId}=req.body;
   
    const userId=req.session.user.id
    
    const order=await Order.findById(orderId).populate('orderedItems.product');
    if (!order) {
      return res.status(404).send("Order not found");
    }
    const item = order.orderedItems.find(orderedItem => orderedItem.product._id.toString() === productId);
    if (!item) {
      return res.status(404).send("Product not found in order");
    }

    item.status="Return Request"
    const length=order.orderedItems.length
    const couponShared=order.discount/Number(length)
    let refundAmount=(item.price*item.quantity)
    const hasActiveItems = order.orderedItems.some(
      (orderedItem) =>
        orderedItem._id.toString() !== item._id.toString() &&
        !['Shipped', 'Delivered', 'Cancelled'].includes(orderedItem.status)
    );
    if (!hasActiveItems) {
      refundAmount += 30; 
     
    }
    
    if(item.paymentStatus==='paid'){
      await User.findByIdAndUpdate(
        userId,
        { $inc: { wallet: refundAmount } }
      );
      const transaction = new Transaction({
        userId,
        amount: refundAmount,
        type: 'credit', 
        description: `Refund for cancelled order ID: ${orderId}`,
      });
      await transaction.save();
     

    }
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
    const page = parseInt(req.query.page) || 1; 
    const limit = 5;
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
     const itemCouponShare= orderHistory.forEach(order=>{
      const length = order.orderedItems.length;
      const couponSharePerItem = order.discount / length;
      order.orderedItems.forEach(item => {
        item.itemCouponShare = couponSharePerItem; 
        item.itemPrice = item.price * item.quantity + 30- couponSharePerItem;
        
      });

      })
      
      
      


         res.render('orderHistory.ejs', { 
            user: userData, 
            orderHistory: orderHistory,
            currentPage: page,
           totalPages: totalPages,
           
           
           
        });        

    
  } catch (error) {

     console.error(error);
        res.status(500).send('Server Error');
        
  }
}
const downloadInvoice=async(req,res)=>{
  const {orderId,itemId}=req.params;
  
  const user=req.session.user
  const userId=user.id
  const userData = await User.findById(userId).populate({
    path: 'orderHistory',
    populate: {
        path: 'orderedItems.product',
        model: 'Product'
    }
}).populate('addresses')
  const order = await Order.findById(orderId).populate('orderedItems.product')
  .populate('user')
  
  if (!order) {
    return res.status(404).send('Order not found');
  }
  const orderItem=order.orderedItems.find(item=>item._id.toString()===itemId

  )
  if (!orderItem) {
    return res.status(404).send('Item not found in the order');
  }

  const orderAddress=userData.addresses.find(address=>address._id.toString()===order.address.toString())
  if (!orderAddress) {
    return res.status(404).send('Address not found for the order');
  }
 
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Invoice-${orderId}-${itemId}.pdf`);
  const doc = new PDFDocument();
  doc.pipe(res);
  doc.fontSize(20).text('Order Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Order ID: ${order.orderId}`);
  doc.text(`Order Date: ${order.invoiceDate ? new Date(order.invoiceDate).toDateString() : 'Date not available'}`);
  doc.text(`Total Amount: ₹${orderItem.price}`);
  doc.text(`Status: ${orderItem.status}`);
  doc.text(`UpdatedDate: ${order.updatedDate}`);

  doc.moveDown();
 
  if (orderItem.deliveryStatus === 'confirmed') {
    doc.text('Order Confirmed', { fillColor: 'green' });
  } else {
    doc.text('Order Not Placed', { fillColor: 'red' });
  }
  if (orderItem.paymentStatus === 'pending') {
    doc.text('Payment Status: Pending');
  } else {
    doc.text('Payment Status: Paid');
  }
  doc.moveDown().fontSize(16).text('Ordered Items:', { underline: true });
  
    doc.fontSize(12).text(`Product: ${orderItem.product.productName}`);
    doc.text(`Price: ₹${orderItem.product.salePrice}`);
    doc.text(`Description: ${orderItem.product.description}`);
    doc.text(`Quantity: ${orderItem.quantity}`);
    doc.moveDown();

  doc.moveDown().fontSize(16).text('Shipping Address:', { underline: true });
  doc.fontSize(12).text(`Full Name: ${orderAddress.fullName}`);
  doc.text(`Address: ${orderAddress.address}`);
  doc.text(`City: ${orderAddress.city}`);
  doc.text(`Postal Code: ${orderAddress.postalCode}`);
  doc.text(`Country: ${orderAddress.country}`);
  doc.end();
}
const walletPayment=async(req,res)=>{
  try {
    const userId = req.session.user.id;
    const orderId = req.params.id;
    
    

    const user = await User.findById(userId);
    const order = await Order.findById(orderId).populate('orderedItems');
 
    const amount=order.finalAmount+30

    
    if (user.wallet < amount) {
      return res.json({ success: false, message: 'Insufficient wallet balance' });
    }

    
    user.wallet -= amount;
    for (let i = 0; i < user.cart.length; i++) {
      const cartItem = user.cart[i];
      const quantity=cartItem.quantity
      const product = await Product.findById(cartItem.product._id);
      product.quantity -= quantity; 
      await product.save();
    }
    const transaction = new Transaction({
      userId,
      amount: amount,
      type: 'Purchase', 
      description: `debit for ${orderId}`,
    });
    await transaction.save();
    user.cart = [];
    user.hasPurchased=true;
    user.referralCredits=0;
    await user.save();

    order.orderedItems.forEach(item=>{
      item.status='Pending'
      item.paymentStatus='paid'
      item.deliveryStatus='confirmed'

    })

   order.updatedDate=new Date();
   order.paymentMethod='Wallet payment'
   
    await order.save();
    res.json({ success: true, redirect: '/orders' });
  
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Error processing wallet payment' });
  }

}
const createOrder=async(req,res)=>{
  const{amount,currency="INR"}=req.body
  

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
    downloadInvoice,
    walletPayment,
    createOrder,
    itemCheckout,
    
   
    
    
}