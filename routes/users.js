var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')
var userHelpers=require('../helpers/user-helpers');
const { response } = require('../app');
const session = require('express-session');

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}





// GET home page
router.get('/',async (req, res) => {
    
  req.session.signIn = true;
  
if(req.session.user){
 let cartCount = await userHelpers.getCartCount(req.session.user._id);
  productHelpers.getAllProducts().then((products)=>{
    res.render('user/view-products',{products,user:req.session.user,cartCount})

  })
}else{
  res.render('user/starter',{hideheader:true, admin:false});

}

});
router.get('/design',(req,res)=>{
  res.render('user/design',{hideheader:true, admin:false})
})

//  request to login
router.get('/login', (req, res) => {
 if(req.session.loggedIn){
  res.render('user/login',{hideheader:true})
 }else{
  res.render('user/login',{"loginErr":req.session.loginErr,hideheader:true})
  req.session.loginErr = false; 

 }
 
  })
// });
router.get('/signup',(req,res)=>{

  res.render('user/signup',{hideheader:true},)
})
router.post('/signup', (req, res) => {
  userHelpers.dosignup(req.body).then((response) => {
    console.log(response);
    if(response.status)
    req.session.loggedIn = true;
    req.session.user = response.user;

    // productHelpers.getAllproducts().then((products) => {
      res.redirect('login');
    });
  });


router.post('/login', (req, res) => {

  userHelpers.dologin(req.body).then(async(response) => {
    if (response.status) {
      // Set session variables after successful login
      req.session.loggedIn = true;
      req.session.user = response.user;

      let cartCount = null;
      if (req.session.user) {
        cartCount = await userHelpers.getCartCount(req.session.user._id);
      }

      // Fetch products and render the view with products and user data
      productHelpers.getAllProducts().then((products) => {

        res.render('user/view-products', {
          products,
          admin: false,
          user: req.session.user,
          cartCount, // Use req.session.user instead of user
        });
      });
    } else {
      // Handle login error and set session error message
      req.session.loginErr = "Invalid Email or Password";
      res.redirect('/login');
    }
  }).catch((error) => {
    console.error("Error during login:", error);
    req.session.loginErr = "Something went wrong!";
    res.redirect('/login');
  });
});





router.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.log('Error destroying session:', err);
      return res.redirect('/login'); // Redirect to home or an error page if session destruction fails
    }
    // Redirect to login page after successful logout
    res.redirect('/login');
  });
});






router.get('/cart', verifyLogin, async (req, res) => {

  // const user = req.session.user;
  // let tshirts= await userHelpers.getCartTshirts(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  
  let totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  console.log(products)
  res.render('user/cart', { products, user: req.session.user, totalValue })
})

router.get('/add-to-cart/:id', (req, res) => {
  // console.log('api called')
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})

router.post('/change-product-quantity', (req, res, next) => {
  // console.log(req.body)
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)

    res.json(response)
  })
})
router.post('/remove-cart-item', (req, res) => {
    const { cartId, productId, user } = req.body;
  
    // Log the incoming data for debugging
    console.log("Received data for removal:", { cartId, productId, user });
  
    userHelpers.removeCartItem(cartId, productId, user)
        .then(response => {
            res.json({ status: true, message: 'Product removed successfully' });
        })
        .catch(err => {
            console.error("Error removing cart item:", err); // Log the error
            res.status(500).json({ status: false, message: 'Error removing product' });
        });
  });

router.get('/place-order', verifyLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order', { user: req.session.user, total })
})

router.post('/place-order',verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId)
  const totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if(req.body['payment-method']==='COD'){
      res.json({ codeSuccess: true })
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        console.log(response)
res.json(response)
      })
    }

  })
  console.log(req.body)
})

router.get('/order-placed', verifyLogin, (req, res) => {
  res.render('user/order-placed', { user: req.session.user,hideheader:true })
})

router.get('/orders', verifyLogin, async (req, res) => {
  const orderDetails = await userHelpers.getOrderDetails(req.session.user._id)
  console.log(orderDetails)
  res.render('user/orders', { user: req.session.user, orderDetails })
})

router.get('/view-ordered-products', verifyLogin, async (req, res) => {
  let orderedProductDetails = await userHelpers.getorderedProductDetails(req.session.user._id)
  const orderId = req.query.orderId;
  res.render('user/view-ordered-products', { user: req.session.user, orderedProductDetails })
})

router.post('/verify-payment',(req,res)=>{
  console.log(req.body)
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      res.json({status:true})
    })
  }).catch((err)=>{
    res.json({status:false,errMsg:'error'})
  })
})
router.get('/product-details/:id',async(req,res)=>{
 const id=req.params.id
 if(req.session.user){
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let proData= await productHelpers.getProductDetails(id)
  console.log(proData)

res.render('user/product-details',{user:req.session.user,proData,cartCount})
 }
 
})

router.get('/profile', async (req, res) => {
  if (!req.session.user) {
      // Redirect to login if user is not logged in
      return res.redirect('/login');
  }

  try {
      let user = await userHelpers.userProfileData(req.session.user._id);
      console.log(user);
      res.render('user/profile', { hideheader: true, user });
  } catch (error) {
      console.error("Error fetching profile data:", error);
      res.status(500).send("Error loading profile.");
  }
});



module.exports = router;
