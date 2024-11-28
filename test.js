const postCheckout = async (req, res) => {
    flag=req.params.flag
    console.log("flag",flag)
    
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
    try {
      const userId = req.session.user.id;
      let { paymenentMethod, productId, quantity, grandtotal ,discountAmount} = req.body;
     
  
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
        price: item.product.salePrice,
        status: 'Pending',
         deliveryStatus:'order not placed',
        paymentStatus:'pending'
  
      }));
     
  
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
  
  
       
       let discount=Number(discountAmount);
       let referralDiscount=0;
       if (referralCredits > 0) {
  
         referralDiscount = Math.min(referralCredits, totalPrice - discount); 
         
        discount += Number(referralDiscount);
       
        
      }
        
       
      const finalAmount = totalPrice-discount;
      
      const orderId = await generateOrderId();
  
      // Create new order
      const newOrder = new Order({
        user: userId,
        orderId,
        orderedItems: orderItems,
        totalPrice,
        discount,
        finalAmount,
        address: defaultAddress._id,
       
        invoiceDate: new Date(),
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expected delivery in 7 days
       
      });
  
      await newOrder.save();
     
      await User.findByIdAndUpdate(
        userId,
        { $push: { orderHistory: newOrder._id } },
        { new: true } 
      );
      
      
     
  
      
      
  
      return res.redirect(`/order/confirmation/${newOrder._id}`);
    } catch (error) {
      console.error(error);
      return res.status(500).send('Post checkout failed');
    }
  };