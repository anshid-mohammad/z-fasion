var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')
var adminHelpers=require('../helpers/admin-helpers');
const { response } = require('../app');
const session = require('express-session');
const userHelpers = require('../helpers/user-helpers');
/* GET users listing. */
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/admin/admin-login')
  }
}

router.get('/', function(req, res, next) {
  req.session.signIn = true;
  if(req.session.admin){
      productHelpers.getAllProducts().then((products)=>{
        res.render('admin/view-products',{admin:req.session.admin,products})

      })

  }else{
    res.render('admin/admin-login',{hideheader:true});

  }
    

  })
router.get('/admin-signup',(req,res)=>{
  res.render('admin/admin-signup',{hideheader:true})
})

router.post('/admin-signup', (req, res) => {
  adminHelpers.doAdminSignup(req.body).then((response) => {
    req.session.loggedIn = true
    req.session.admin = response.admin
    res.redirect('/admin')
    // console.log(req.body)
  })
})

router.get('/admin-login', (req, res) => {
  const admin = req.session.admin
  if (req.session.loggedIn) {
    res.redirect('/admin/admin-login',{hideheader:true})
  } else {
    res.render('admin/admin-login', { loginErr: req.session.loginErr, hideheader: true, })
    req.session.loginErr = false
  }
})


router.post('/admin-login', (req, res) => {
  // console.log(req.session)
  adminHelpers.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true
      req.session.admin = response.admin
      console.log(req.session);

      productHelpers.getAllProducts().then((products)=>{

        res.render('admin/view-products',{products,admin:req.session.admin})
          })
    } else {
      req.session.loginErr = 'invalid email or password'
      res.redirect('/admin/admin-login')
    }
  })
})

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log('Error destroying session:', err);
      return res.redirect('/admin'); // Redirect back to dashboard if an error occurs
    }
    res.redirect('/admin/admin-login'); // Redirect to login page after logout
  });
});





router.get('/add-product',verifyLogin,(req,res)=>{
  res.render('admin/add-product',{admin:req.session.admin})
})
router.post('/add-product', (req, res) => {
  console.log(req.body);  // Log the form data (product details)
  console.log(req.files.Image);  // Log the uploaded image file

  // Insert the product into the database
  productHelpers.addProduct(req.body, (err, productId) => {
      if (err) {
          console.error("Error adding product:", err);
          return res.status(500).send('Error inserting product');
      }

      console.log("Inserted Product ID:", productId);  // Log the inserted product ID to verify

      // Get the uploaded image
      let image = req.files.Image;

      // Move the image file to the public folder with the product's ID as the file name
      image.mv('./public/product-images/' + productId + '.jpg', (err) => {
          if (!err) {
              console.log("Image saved successfully as " + productId + ".jpg");
              res.redirect('/admin');  // Render the 'add-product' view after product addition
          } else {
              console.error("Error moving image:", err);
              res.status(500).send('Error saving product image');
          }
      });
  });
});

router.get('/delete-prodcut/:id',(req,res)=>{
  let proId=req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response)=>{
    console.log(response)
    res.redirect('/admin')
  })
})

router.get('/delete-product/:id', (req, res) => {
  let prodId = req.params.id;
  productHelpers.deleteproduct(prodId).then(() => {
    res.redirect('/admin');
  })
});



router.get('/edit-product/:id', async (req, res) => {
  let ProdData = await productHelpers.getDetailsofProduct(req.params.id)
  console.log(req.params.id)
  res.render('admin/edit-product', { admin: req.session.admin,ProdData })
})
router.post('/edit-product/:id',  (req, res) => {
  const id = req.params.id
  console.log(id)
  productHelpers.updateProduct(id, req.body).then(() => {
    res.redirect('/admin');
    if(req.files.Image){
      let image =req.files.Image
      image.mv('./public/product-images/' +id + '.jpg', (err) => {
       
    });
    }
  })
})
router.get('/view-orders', async (req, res) => {
  // Check if admin session exists
  if (!req.session.admin) {
      console.log("Admin not logged in. Redirecting to login page.");
      return res.redirect('/admin/login'); // Redirect if not logged in
  }

  try {
      // Fetch orders using admin's ID
      let orderDetails = await productHelpers.getPlacedProductDetails();
      console.log();
      
      // Render the orders page
      res.render('admin/view-orders', {
          admin: req.session.admin,
          orderDetails
      });
  } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).send("Internal Server Error");
  }
});
// router.post('/update-user-order-status', async (req, res) => {
//   const { orderId } = req.body;
//   console.log("Received orderId:", orderId); // Debugging: Check if orderId is received

//   if (!orderId) {
//       return res.status(400).json({ error: "Order ID is missing." });
//   }

//   try {
//       await productHelpers.updateUserOrderStatus(orderId);
//       console.log(orderId)
//       res.json({ message: "Order status updated to Shipped." });
//   } catch (error) {
//       console.error("Error updating order status:", error);
//       res.status(500).json({ error: "Error updating order status." });
//   }
// });
router.get('/view-ordered-product', verifyLogin, async (req, res) => {
  const orderId = req.query.orderId;

  try {
      let orderedProductDetails = await productHelpers.getorderedProductDetailsAdmin(orderId);
      res.render('admin/view-ordered-product', { admin: req.session.admin, orderedProductDetails });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
