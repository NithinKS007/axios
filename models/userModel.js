const mongoose = require('mongoose');


const userAddressSchema = new mongoose.Schema({
    city: { type: String, required: true },
    locality: { type: String, required: true },
    state: { type: String, required: true }, 
    address: { type: String, required: true }, 
    pinCode: { type: String, required: true }, 
    addressType: { type: String, enum: ['home', 'work', 'other'], required: true },
    landmark: { type: String },
    alternativePhone: { type: String }, 
    defaultAddress: { type: Boolean, default: false }, 
})

const userSchema = new mongoose.Schema({
    fname: {
        type: String,
        required: true
    }, 
    lname: {
        type: String,
        required: true
    },
    dob :{
        type : Date
    },
    image: {

        type: String
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },

    address: {
        type: [userAddressSchema],
        required: true
    },
   
    password: {
        type: String,
        required: true
    },
    is_authorised:{
        type:Boolean,
        default:true
    },
    is_blocked:{
        type:Boolean,
        default:false
    }
      
})

const users = mongoose.model('user',userSchema)

module.exports = users