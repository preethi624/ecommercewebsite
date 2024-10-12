const User = require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const Product=require("../../models/productSchema")
const Cart=require("../../models/cartSchema")
const router = require("../../routes/userRouter");
const Order=require("../../models/orderSchema")
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
const getCart=async(req,res)=>{
    console.log("get cart triggered")
    try {
     
      const userId=req.session.user.id

  const user = await User.findById(userId).populate('cart.product').populate('addresses');
  if (!user) {
    return res.status(404).send('User not found.');
  }
  if (user.cart.length === 0) {
    return res.send('Your cart is empty.');
  }

  const cartTotal = user.cart.reduce((total, item) => {
    // Ensure that the populated product has a salePrice
    if (item.product && item.product.salePrice) {
        return total + (item.product.salePrice * item.quantity);
    }
    return total;
}, 0);



  res.render('cart.ejs', { cart: user.cart,addresses: user.addresses ,user:user,cartTotal:cartTotal});
        
    } catch (error) {

        console.error('Error fetching cart:', error);
    res.status(500).send('An error occurred while fetching the cart')
    }
}
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
      const updatedTotal = cartItem.product.salePrice * cartItem.quantity;
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
    
    // Fetch user with populated cart and addresses
    const user = await User.findById(userId).populate('addresses').populate('cart.product');
    
    // If there's no productId in the request, proceed to checkout for all products in the cart
    const productId = req.params.productId;
    
    // If no productId, handle multiple products in the cart
    if (!productId) {
      if (user.cart.length === 0) {
        return res.redirect('/cart'); // Redirect to cart if it's empty
      }
      
      const cartItems = user.cart.map(item => ({
        product: item.product,
        quantity: item.quantity,
        total: item.product.salePrice * item.quantity
      }));
      
      const totalPrice = cartItems.reduce((total, item) => total + item.total, 0);
      const defaultAddress = user.addresses.find(addr => addr._id.toString() === user.defaultAddress.toString());
      
      return res.render('checkout', {
        order: {
          items: cartItems,
          totalPrice,
          address: defaultAddress
        },
        user
      });
    }
    
    // If productId exists, handle checkout for that specific product
    const cartItem = user.cart.find(item => item.product._id.toString() === productId);
    
    if (!cartItem) {
      return res.status(404).send('Product not found in cart.');
    }
    
    const product = cartItem.product;
    const quantity = cartItem.quantity;
    const total = product.salePrice * quantity;
    
    const defaultAddress = user.addresses.find(addr => addr._id.toString() === user.defaultAddress.toString());
    
    res.render('checkout', {
      order: {
        items:[{product,quantity,total}],
        totalPrice:total,
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
    const { paymentMethod, productId } = req.body; // Check for productId in the form data
    
    const user = await User.findById(userId).populate('addresses').populate('cart.product');
    
    if (!user || user.cart.length === 0) {
      return res.redirect('/cart');
    }
    
    const defaultAddress = user.addresses.find(addr => addr._id.toString() === user.defaultAddress.toString());
    
    if (!defaultAddress) {
      return res.redirect('/userProfile'); // Prompt to add an address if not set
    }
    
    // If productId is provided, handle checkout for the single product
    if (productId) {
      const cartItem = user.cart.find(item => item.product._id.toString() === productId);
      
      if (!cartItem) {
        return res.status(400).send('Product not found in cart.');
      }
      

      const orderItems = [{
        product: cartItem.product._id,
        quantity: cartItem.quantity,
        price: cartItem.product.salePrice
      }];
      
      const totalPrice = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      
      const newOrder = new Order({
        user: userId,
        orderedItems: orderItems,
        totalPrice,
        
        address: defaultAddress._id,
        status: 'Pending',
        invoiceDate: new Date(),
      });
      
      await newOrder.save();
      user.orderHistory.push(newOrder._id);
      await user.save();
      
      const product = await Product.findById(cartItem.product._id);
      product.quantity -= cartItem.quantity;
      await product.save();
      
      // Remove the product from the user's cart
      user.cart = user.cart.filter(item => item.product._id.toString() !== productId);
      await user.save();
      
      return res.redirect(`/order/confirmation/${newOrder._id}`);
    }
    
    // If no productId is provided, handle checkout for all products in the cart
    const orderItems = user.cart.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.salePrice
    }));
    
    const totalPrice = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    console.log("total price",totalPrice)

     const discount = 0; // Replace with your discount calculation logic
    const finalAmount = totalPrice - discount;
    console.log(`Total Price: ${totalPrice}, Discount: ${discount}, Final Amount: ${finalAmount}`);

    const newOrder = new Order({
      user: userId,
      orderedItems: orderItems,
      totalPrice,
      discount,
      finalAmount,
      
      address: defaultAddress._id,
      status: 'Pending',
      invoiceDate: new Date(),
    });
    
    await newOrder.save();
    
    for (const cartItem of user.cart) {
      const product = await Product.findById(cartItem.product._id);
      product.quantity -= cartItem.quantity;
      await product.save();
    }
    
    // Clear the cart after successful checkout
    user.cart = [];
    await user.save();
    
    return res.redirect(`/order/confirmation/${newOrder._id}`);
    
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).send('An error occurred while placing the order.');
  }
};


const confirmation=async(req,res)=>{
  try {
    const orderId = req.params.newOrderId;

    
    const order = await Order.findById(orderId)
      .populate('orderedItems.product') 

    if (!order) {
      return res.status(404).send("Order not found");
    }

   
    res.render("confirmation", {
      order: order,  
      orderedItems: order.orderedItems,
      totalPrice: order.totalPrice,
      finalAmount: order.finalAmount,
      status: order.status,
      address: order.address,
      invoiceDate: order.invoiceDate
    });
    
  } catch (error) {

    console.error("Error retrieving order confirmation:", error);
    res.status(500).send("Internal Server Error");
  }
}
const cancelOrder=async(req,res)=>{
  const {orderId}=req.params
  try {
    const order=await Order.findById(orderId)
    if(!order){
      return res.status(404).send('Order not found');
    }
    console.log('Order status:', order.status); 
    if (['Shipped', 'Delivered', 'Cancelled'].includes(order.status)) {
      return res.status(400).send('Order cannot be cancelled');
    }
    order.status = 'Cancelled';
    await order.save();
    
    res.redirect("/userProfile")
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).send('Internal Server Error');
    
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
}