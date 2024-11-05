const db = require('../config/connection')
var collection=require('../config/collection')
const { Collection } = require('mongoose');
const { response } = require('express');
const { promise, reject } = require('bcrypt/promises');
const ObjectId = require('mongoose').Types.ObjectId;


module.exports = {
 addProduct: (product, callback) => {
    // Insert the product into the 'product' collection
    db.get().collection('product').insertOne(product)
        .then((data) => {
            callback(null, data.insertedId);  // Use insertedId to get the new product's ID
        })
        .catch((err) => {
            console.error("Error inserting product:", err);
            callback(err);  // Pass the error to the callback on failure
        });
},

    //  data base le data edukan 
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            try {
                // Fetch all products from the database
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
    
                // Calculate discounted price for each product, if applicable
                products = products.map(product => {
                    if (product.Discount) {
                        // Calculate the discounted price based on original price and discount
                        const originalPrice = parseFloat(product.Price);
                        const discountPercentage = parseFloat(product.Discount);
                        const discountedPrice = originalPrice * (1 - discountPercentage / 100);
    
                        // Set the discounted price in a separate property
                        product.discountedPrice = discountedPrice.toFixed(2);
                    }
                    return product;
                });
    
                resolve(products); // Resolve the promise with the modified products array
            } catch (error) {
                console.error("Error fetching products:", error);
                reject(error); // Reject the promise in case of an error
            }
        });
    },
    
    


     deleteproduct: (prodId) => {
        return new Promise(async (resolve, reject) => {
            // string il kedakkunna data ne object id lek matanam 
            await db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(prodId) });
            resolve()
        })

},

// getProductDetails: (proId) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) });
//             resolve(product); // Resolve with the single product document
//         } catch (error) {
//             reject(error); // Handle any errors that occur
//         }
//     });
getProductDetails: (proId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) });
            
            // Check if the product has a discount and calculate the discounted price if it does
            if (product && product.Discount) {
                product.discountedPrice = product.Price - (product.Price * (product.Discount / 100));
            }
            
            resolve(product); // Resolve with the single product document
        } catch (error) {
            reject(error); // Handle any errors that occur
        }
    });
},


updateProduct: (proId, ProDetails) => {
    return new Promise((resolve, reject) => {
        db.get().collection(collection.PRODUCT_COLLECTION) // Use PRODUCT_COLLECTION
            .updateOne({ _id: new ObjectId(proId)}, {
                $set: {
                    Name: ProDetails.Name,
                    Details: ProDetails.Details, // Assuming Details is the description
                    Price: ProDetails.Price,
                    Category: ProDetails.Category, // Consistent capitalization
                    Size: ProDetails.size,
                    Discount:ProDetails.Discount
                }
            }).then((response) => {
                resolve()
            }).catch((err) => {
                reject(err) // Ensure proper error handling
            });
    });
},

getDetailsofProduct:  (proId) => {
    return new Promise(async (resolve, reject) => {
        console.log(proId)
        try {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) });
            
            resolve(product); // Resolve with the single product document
        } catch (error) {
            reject(error); // Handle any errors that occur
        }
    });
},
getPlacedProductDetails: () => {
    return new Promise(async (resolve, reject) => {
        try {
            // Fetch all orders related to the specified adminId
            let products = await db.get().collection(collection.ORDER_COLLECTION)
                .find() // Assuming each order has an `adminId` field
                .toArray(); // Converts the result to an array

            console.log(products); // Log the fetched products
            resolve(products); // Resolve the array of products
        } catch (error) {
            console.error("Error fetching placed products:", error);
            reject(error); // Reject with error if any issues occur
        }
    });
},

// updateUserOrderStatus: (orderId) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             const order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: new ObjectId(orderId) });
//             // console.log(order)
//             console.log(orderId)

//             if (order && order.status === "Placed") {
//                 // Update the status to "Shipped"
//                 await db.get().collection(collection.ORDER_COLLECTION).updateOne(
//                     { _id: new ObjectId(orderId) },
//                     { $set: { status: "Shipped" } }
//                 );
//                 resolve();
//             } else {
//                 reject(new Error("Order status is not 'Placed' or order not found"));
//             }
//         } catch (error) {
//             reject(error);
//         }
//     });
// }
// 
getorderedProductDetailsAdmin: (orderId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let productDetails = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: new ObjectId(orderId) } // Match by orderId instead of userId
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


};

