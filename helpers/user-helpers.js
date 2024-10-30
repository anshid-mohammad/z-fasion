const { reject, promise } = require('bcrypt/promises');
const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const { response } = require('express');
const ObjectId = require('mongoose').Types.ObjectId;
const Razorpay = require('razorpay');
const { resource } = require('../app');
const { promises } = require('node:dns');
const { resolve } = require('node:path');
const crypto = require('crypto');

var instance = new Razorpay({
    key_id: 'rzp_test_D9GPASiEubhLDZ',
    key_secret: 'dI6NzjuXvgz8WXxI5kuwnxdh',
});


module.exports = {
    dosignup: async (userData) => {
        try {
            // Hash the password
            userData.password = await bcrypt.hash(userData.password, 10);
            // Insert user data into the collection
            const result = await db.get().collection(collection.USER_COLLECTION).insertOne(userData);
            return result.insertedId; // Use insertedId instead of ops[0]
        } catch (error) {
            throw error; // Reject the promise on error
        }
    },

    dologin: async (userData) => {
        const response = {};
        const user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });

        if (!user) {
            return { status: false }; // Return early if no user found
        }

        const status = await bcrypt.compare(userData.password, user.password);
        if (status) {
            console.log("Login success");
            response.user = user;
            response.status = true;
            return response;
        } else {
            console.log('Login failed');
            return { status: false };
        }
    },

   
    addToCart: (prodId, userId) => {

        let prodObj = {
            item: new ObjectId(prodId),
            quantity: 1
        }

        return new Promise(async (resolve, reject) => {
            const userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == prodId)
                console.log(proExist)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(prodId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(userId) },
                            {
                                $push: { products: prodObj }
                            }
                        ).then((response) => resolve())
                }
            } else {
                const cartObj = {
                    user: new ObjectId(userId),
                    products: [prodObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },


    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                { $match: { user: new ObjectId(userId) } },
                { $unwind: '$products' },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $addFields: {
                        'product.discountedPrice': {
                            $cond: {
                                if: { $gt: ['$product.Discount', 0] },
                                then: {
                                    $round: [
                                        { 
                                            $multiply: [
                                                { $toDouble: '$product.Price' },
                                                { $subtract: [1, { $divide: [{ $toDouble: '$product.Discount' }, 100] }] }
                                            ]
                                        },
                                        2
                                    ]
                                },
                                else: { $toDouble: '$product.Price' }
                            }
                        }
                    }
                }
            ]).toArray();
            resolve(cartItems);
        });
    },
    
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {

            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new ObjectId(details.cart) },
                        {
                            $pull: { products: { item: new ObjectId(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }
                    ).then((response) => {
                        // resolve({status:true})
                        resolve({ status: true })
                    })
            }
        })
    },
    removeCartItem: async (cartId, productId) => {
        try {
            const response = await db.get().collection(collection.CART_COLLECTION)
                .updateOne(
                    { _id: new ObjectId(cartId) },
                    { $pull: { products: { item: new ObjectId(productId) } } }
                );
            return response;
        } catch (err) {
            console.error("Error in removeCartItem:", err);
            throw err; // Ensure errors are propagated
        }
    },
    getTotalAmount: async (userId) => {
        try {
            const cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                { $match: { user: new ObjectId(userId) } },  // Match the cart by user ID
                { $unwind: '$products' },  // Deconstruct the products array
                {
                    $project: {
                        item: '$products.item',  // Get the product ID
                        quantity: '$products.quantity'  // Get the quantity
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,  // Look up the product details
                        localField: 'item',  // Use the item field from the cart
                        foreignField: '_id',  // Match it to the _id field in the products collection
                        as: 'product'  // Save the product details in 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        // Ensure both Price and Discount are numbers
                        price: {
                            $toDouble: {
                                $cond: {
                                    if: { $gt: [{ $toDouble: { $arrayElemAt: ['$product.Discount', 0] } }, 0] },  // Check if discount > 0
                                    then: {
                                        $multiply: [
                                            { $toDouble: { $arrayElemAt: ['$product.Price', 0] } },
                                            { $subtract: [1, { $divide: [{ $toDouble: { $arrayElemAt: ['$product.Discount', 0] } }, 100] }] }
                                        ]
                                    },
                                    else: { $toDouble: { $arrayElemAt: ['$product.Price', 0] } }  // Original price
                                }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: null,  // Group all results together
                        total: { $sum: { $multiply: ['$quantity', '$price'] } }  // Calculate the total
                    }
                }
            ]).toArray();
    
            return cartItems.length > 0 ? cartItems[0].total : 0;  // Return total or 0 if cart is empty
        } catch (error) {
            console.error("Error calculating total amount:", error);
            throw error;
        }
    },
    
    //     placeOrder:(order,products,total)=>{
    //         return new Promise((resolve,reject)=>{
    //             console.log(order,products,total)
    //             let status=order['payment-method']==='COD'?'placed':'pending'
    // let orderObj={
    //     delivoryDetails:{
    //         mobile:order.mobile,
    //         address:order.address,
    //         pincode:order.pincode    
    //     },
    //     userId: new ObjectId(order.userId),
    //     paymentmethod:order['payment-method'],
    //     products:products,
    //     totalmAount:total,
    //     status:status

    // }
    // db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
    //     resolve()
    // })

    //         })

    //     },
    //     getCartProductsList:(userId)=>{
    //         return new Promise(async(resolve,reject)=>{
    //             let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user: new ObjectId(userId)})
    //             resolve(cart.products)
    //         })
    //     }

    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total)
            const status = order['payment-method'] == 'COD' ? 'placed' : 'pending'
            const orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode,
                },
                userId: new ObjectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                // Delete the cart after the order is placed
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(order.userId) })
                    .then(() => {
                        // Return the inserted order ID
                        resolve(response.insertedId);
                    }).catch((error) => {
                        // Handle any potential errors with deleting the cart
                        reject(error);
                    });
            }).catch((error) => {
                // Handle any potential errors with inserting the order
                reject(error);
            });

        })
    },

    // getCartProductList: (userId) => {
    //     return new Promise(async (resolve, reject) => {
    //         const cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
    //         console.log(cart)
    //         resolve(cart.products)
    //     })
    // },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Fetch the cart for the given user
                const cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });

                if (cart && cart.products) {
                    // Resolve with the list of products if found
                    resolve(cart.products);
                } else {
                    // If no cart or products, resolve with an empty array
                    resolve([]);
                }
            } catch (error) {
                // Reject the promise in case of an error
                console.error('Error fetching cart product list:', error);
                reject(error);
            }
        });
    },


    getOrderDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            const orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray()
            console.log(orders)
            resolve(orders)
        })
    },

    getorderedProductDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let productDetails = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {
                        $match: { userId: new ObjectId(userId) }
                    },
                    {
                        $unwind: "$products"
                    },
                    {
                        $lookup: {
                           from: collection.PRODUCT_COLLECTION,
                            localField: "products.item",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    {
                        $unwind: "$productDetails"
                    },
                    {
                        $project: {
                            _id: '$productDetails._id',
                            productName: "$productDetails.Name",
                            price: { $toDouble: "$productDetails.Price" },
                            quantity: "$products.quantity",
                        }
                    }
                ]).toArray();
                resolve(productDetails);
            } catch (error) {
                reject(error);
            }
        });
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            // Create a Razorpay order
            instance.orders. create({
                amount: total * 100, // Razorpay accepts amounts in paise, so multiply by 100
                currency: "INR",
                receipt: orderId,
                notes: {
                    key1: "value1",
                    key2: "value2"
                }
            }, (err, order) => {
                if (err) {
                    // Reject the promise if there is an error
                    reject(err);
                } else {
                    // Resolve the promise with the order details
                    resolve(order);
                }
            });
        });
    },

   
        verifyPayment: (details) => {
            return new Promise((resolve, reject) => {
                const hmac = crypto.createHmac('sha256', 'dI6NzjuXvgz8WXxI5kuwnxdh');
                
                // Concatenate Razorpay order ID and payment ID for the HMAC
                hmac.update(details['payment[razorpay_order_id]'] + "|" + details['payment[razorpay_payment_id]']);
                const generatedSignature = hmac.digest('hex');
                
                if (generatedSignature === details['payment[razorpay_signature]']) {
                    resolve();
                } else {
                    reject('Signature mismatch');
                }
            });
        },
    
        changePaymentStatus: (orderId) => {
            return new Promise((resolve, reject) => {
                db.get().collection(collection.ORDER_COLLECTION)
                    .updateOne(
                        { _id: new ObjectId(orderId) },
                        { $set: { status: 'placed' } }
                    )
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        console.error('Error updating payment status:', error);
                        reject('Failed to update payment status');
                    });
            });
        },

        getOrderDetailsadmin: (userId) => {
            return new Promise(async (resolve, reject) => {
                const orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray()
                console.log(orders)
                resolve(orders)
            })
        },

 userProfileData : (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userProfile = await db.get().collection(collection.USER_COLLECTION)
                .findOne({ _id: new ObjectId(userId) });
            
            console.log(userProfile);
            resolve(userProfile);
        } catch (error) {
            console.error("Error fetching user profile data:", error);
            reject(error); // Rejecting with error for easier handling on calling side
        }
    });
}

    }

    
    


