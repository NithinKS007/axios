const users = require('../models/userModel')
const bcrypt = require('bcrypt')
const utils = require('../utils/otpUtils')
const OTP = require('../models/otpModel')
const products = require('../models/productModel')
const brands = require('../models/brandModel')
const categories = require('../models/categoryModel')

// //hashing the password
const securePassword = async(password)=>{
    try {
       const passwordHash = await bcrypt.hash(password,10)  

        return passwordHash;

    } catch (error) {

        console.log(`cannot hash the password`,error.message);
        
    }
}

//loading the home page 

const loadHome = async (req,res) => {
    
    try {

        const productsArray =await products.find({}).populate('brand')
       
        return res.status(200).render("user/home",{productsArray:productsArray})

    } catch (error) {
        
        console.log(`error while loading the home page before logging in`,error.message);
    }
}
//loading the registraion page 
const loadRegister = async (req,res) => {
    try {
        
        res.status(200).render('user/signup')
        
    } catch (error) {

        console.log(`cannot render signup page`,error.message);
        
    }
}

//verifying user

const generateOtp = async (req,res) => {

    req.session.formData = req.body
    const {email}        = req.session.formData

    try {

        const otp = await utils.generateOtp()

        console.log(otp)

        const otpDocument = new OTP({ email, otp })

        await otpDocument.save() //saving the otp to database 

        await utils.sendOtpEmail(email,otp)

        return res.status(200).redirect('/verify-otp')
        
    } catch (error) {

        console.log(`cannot render otpverification page or generate otp`,error.message);
        
    }
}

//loading the otp verification page 

const otpVPage = async (req,res) =>{

    try {
        
        return res.status(200).render('user/otpVerification')

    } catch (error) {
        
        console.log(`error loading the otp verification page`,error.message);
    }
}
//verifying the otp 

const verifyOtp = async (req,res) => {
   

    try {

        const otp    = req.body.otp
        
        console.log(`otp from verificaton page`,otp);

        const email  = req.session.formData.email

        const userDataSession = req.session.formData

        const otpDataBase = await OTP.findOne({email,otp}).exec()

        if(otpDataBase){
                 
                   
            const hashedPassword = await securePassword(userDataSession.password)

            const user = new users({

                fname:userDataSession.fname,
                lname:userDataSession.lname,
                email:userDataSession.email,
                phone:userDataSession.phone,
                password:hashedPassword     
            })
    
           const userData = await user.save()

            if(userData){

                return res.status(200).render("user/home")

            }else{

               return  res.send('Something went wrong while registering')

            }
        }
        
    } catch (error) {

        console.log(`otp verification is not working`,error.message);
        
    }

}

//loading signinpage
const loadsignin = async (req,res) => {

    try {
        
        res.render('user/signin')
        
    } catch (error) {

        console.log(error.message);
        
    }

}

//loading mens page
const loadMens = async (req,res) =>{

    try {

        const categoriesArray = await categories.find({})
        const productsArray = await products.find({targetGroup:"men"}).populate('brand')

        console.log(productsArray);
        res.status(200).render("user/mens-collection",{categoriesArray,productsArray})

    } catch (error) {
        
        console.log(`error while loading mens page`,error.message);
    }
}

//loading womens page

const loadWomens = async (req,res) =>{

    try {

        const categoriesArray = await categories.find({})
        const productsArray = await products.find({targetGroup:"women"}).populate('brand')

        res.status(200).render("user/womens-collection",{categoriesArray,productsArray})

    } catch (error) {
        
        console.log(`error while loading mens page`,error.message);
    }
}

//loading kids page

const loadKids = async (req,res) =>{

    try {

        const categoriesArray = await categories.find({})
        const productsArray = await products.find({targetGroup:"kids"}).populate('brand')

        res.status(200).render("user/kids-collection",{categoriesArray,productsArray})

    } catch (error) {
        
        console.log(`error while loading mens page`,error.message);
    }
}

module.exports = {

    loadRegister,
    // insertUser,
    loadsignin,
    generateOtp,
    verifyOtp,
    otpVPage,
    loadHome,
    loadMens,
    loadWomens,
    loadKids
    
}