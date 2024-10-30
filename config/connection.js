// // db connect cheyyan vendi

// const mongoose = require('mongoose');

// const state = {
//     db: null
// };

// module.exports.connect = function (done) {
//     const url = 'mongodb://localhost:27017/shoping'; // Updated to include the database name in the URL

//     mongoose.connect(url, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true
//     })
//     .then(() => {
//         state.db = mongoose.connection; // No need for `.db()` here
//         done(); // Call the done callback when the connection is successful
//     })
//     .catch((err) => {
//         done(err); // Return error if connection fails
//     });
// };

// module.exports.get = function () {
//     return state.db;
// };
 //get()  evide vilichalum aa state.db nammak  kittum 
//  state.bd il ane db connection ulath
const mongoose = require('mongoose');

const state = {
    db: null
};

module.exports.connect = function (done) {
    const url = 'mongodb://localhost:27017/shoping'; // Include your database name in the URL

    mongoose.connect(url)
        .then(() => {
            state.db = mongoose.connection; // Mongoose automatically connects to the right database
            done(); // Call the done callback when connection is successful
        })
        .catch((err) => {
            done(err); // Return error if connection fails
        });
};

module.exports.get = function () {
    return state.db; // Access the database connection from anywhere in the app
};
