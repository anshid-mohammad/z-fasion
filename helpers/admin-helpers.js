const { response } = require('express');
const collection = require('../config/collection')
var db=require('../config/connection')
const { resource } = require('../app');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');




module.exports={

    doAdminSignup: async (adminData) => {
        try {
            // Hash the password
            adminData.password = await bcrypt.hash(adminData.password, 10);
            
            // Insert admin data into the collection
            const result = await db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData);
            
            // Return the inserted document's ID
            return result.insertedId;
        } catch (error) {
            throw error; // Reject the promise if an error occurs
        }
    },
    doAdminLogin:(adminData)=>{
        return new Promise(async (resolve, reject) =>{
            let loginStatus = true
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email })
            if (admin) {
                bcrypt.compare(adminData.password, admin.password).then((status) => {
                    if (status) {
                        console.log('Login successful')
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('Login faild')
                        resolve({ status: false })
                    }
                });
            } else {
                console.log('login failed')
                resolve({ status: false })
            }
        })
    },
    // doAdminLogin:(adminData)=>{
    //     return new Promise(async (resolve, reject) =>{
    //         let loginStatus = true
    //         let response = {}
    //         let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email })
    //         if (admin) {
    //             bcrypt.compare(adminData.password, admin.password).then((status) => {
    //                 if (status) {
    //                     console.log('Login successful')
    //                     response.admin = admin
    //                     response.status = true
    //                     resolve(response)
    //                 } else {
    //                     console.log('Login faild')
    //                     resolve({ status: false })
    //                 }
    //             });
    //         } else {
    //             console.log('login failed')
    //             resolve({ status: false })
    //         }
    //     })
    // },

    
    
  

}
