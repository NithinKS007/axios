const users = require('../models/userModel')
const bcrypt = require('bcrypt')
const utils = require('../utils/otpUtils')
const OTP = require('../models/otpModel')
const products = require('../models/productModel')
const brands = require('../models/brandModel')
const categories = require('../models/categoryModel')
const cart = require('../models/cartModel')
const userAddress = require('../models/addressModel')
const mongoose = require('mongoose')
const { ObjectId } = mongoose.Types;

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

        const productsArray =await products.find({}).populate('brand').populate('category')
       
        return res.status(200).render("user/home",{productsArray:productsArray})

    } catch (error) {
        
        console.log(`error while loading the home page before logging in`,error.message);

        return res.status(500).send("Internal server Error")

    }
}
//loading the registraion page 
const loadRegister = async (req,res) => {
    try {
        
        return res.status(200).render('user/signup')
        
    } catch (error) {

        console.log(`cannot render signup page`,error.message);

        return res.status(500).send("Internal server Error")

        
    }
}

//verifying user

const generateOtp = async (req,res) => {

    req.session.formData = req.body
    const {email}        = req.session.formData
   

    try {

        const otp = await utils.generateOtp()

        console.log(`first otp form generate otp `,otp)

        const otpDocument = new OTP({ email, otp })

        await otpDocument.save() //saving the otp to database 

        await utils.sendOtpEmail(email,otp)

        return res.status(200).redirect('/verifyOtp')
        
    } catch (error) {

        console.log(`cannot render otpverification page or generate otp`,error.message);

        return res.status(500).send("Internal server Error")

        
    }
}

//loading the otp verification page 
const otpVPage = async (req, res) => {
    try {

        return res.status(200).render('user/otpVerification')

    } catch (error) {

        console.error('Error loading the OTP verification page:', error.message)

        return res.status(500).send('Internal Server Error')
        
    }
}

//resend otp function

const resendOtp = async (req,res) =>{

    const {email}        = req.session.formData

    try {

        const otp = await utils.generateOtp()

        console.log(`resend otp`,otp)

        const otpDocument = new OTP({ email, otp })

        await otpDocument.save() //saving the otp to database 

        await utils.sendOtpEmail(email,otp)

        return res.status(200).json({success:true,message : "OTP send to your email"})
        
    } catch (error) {

        console.log(`error while resending the otp`,error.message)
        
        return res.status(500).json({ success: false, message: "Error sending OTP. Please try again" })
    }
}

//verifying the otp 

const verifyOtp = async (req,res) => {
   
    try {

        const otp    = req.body.otp
        
        const email  = req.session.formData.email

        const userDataSession = req.session.formData

        const otpDataBase = await OTP.findOne({email,otp})

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

                return res.status(200).json({success :true, message:"otp validaton successfull"})

            }else{

                return res.status(500).json({ success: false, message: "Something went wrong while registering" })

            }
        }else{

            return res.status(401).json({success:false,message:"Invalid OTP or Expired"})
        }
        
    } catch (error) {

        console.log(`otp verification is not working`,error.message)
        
        return res.status(500).json({ success: false, message: "Error during OTP verification" })
        
    }

}


//loading the signin page
const loadsignin = async (req,res) =>{

    try {
        
       return res.status(200).render("user/signin")

    } catch (error) {
        
        console.log(`error while loading the login page`,error.message);

        return res.status(500).send("Internal server Error")

    }
}


//verifying the user from the signin page
const verifySignin = async (req,res) => {

    const {email,password} = req.body

    try {

        const userData = await users.findOne({email:email,isBlocked:false})
        
        if (!userData) {

            return res.status(401).render('user/signin', { message: "No user found or you can't access" });
        }

        const passwordMatch = await bcrypt.compare(password,userData.password)
        
        if(!passwordMatch){

            return res.render("user/signin",{message:"email or password is incorrect"})
        }

    
        req.session.userId = userData._id
        
       return res.status(200).redirect("/home")

    } catch (error) {

        console.log(`error in the signin function`,error.message);

        return res.status(500).send("Internal server Error")

        
    }

}

//loading mens page
const loadShowCase = async (req,res) =>{

    const targetGroup = req.query.targetGroup
    try {

        const categoriesArray = await categories.find({isBlocked:false})
        const productsArray   = await products.find({targetGroup:targetGroup}).populate('brand').populate('category')
        const latestProducts  = await products.find({targetGroup:targetGroup}).sort({createdAt:-1}).limit(10).populate('brand').populate('category')
        
        return res.status(200).render("user/showCase",{categoriesArray,productsArray,latestProducts,targetGroup})

    } catch (error) {
        
        console.log(`error while loading mens page`,error.message);

        return res.status(500).send("Internal server Error")

    }
}

//loading the product details page 

const loadProductDetails = async (req,res) =>{

    try {

        const productId = req.query.id //getting the id from the query and passing it to the product details page

        let userFromGidSessionOrSession 

        let existingCartItem

        if(req.session.userId){

            userFromGidSessionOrSession = req.session.userId

        }else if(req.user){

            //checking for google session id 
            userFromGidSessionOrSession = req.user.id

        }

        if(userFromGidSessionOrSession){

          existingCartItem = await cart.findOne({user:userFromGidSessionOrSession,items:{$elemMatch:{product:productId}}})
        }

        const productDetails = await products.findById({_id:productId}).populate('category').populate('brand')

        const relatedProducts = await products.find({category:productDetails.category,targetGroup:productDetails.targetGroup}).populate('category').populate('brand')

        if(!productDetails){

            return res.status(404).send("product not found")
        }

       return res.status(200).render("user/productDetails",{productDetails,relatedProducts,existingCartItem})
        
    } catch (error) {
        
        console.log(`error while loading the product details page`,error.message);

        return res.status(500).send("Internal server Error")

    }
}


//loading the profile of user
const loadUserProfile = async (req,res) =>{

    let userFromGidSessionOrSession 

    try {

        if(req.session.userId){

            userFromGidSessionOrSession = req.session.userId

        }else if(req.user){

            //checking for google session id 
            userFromGidSessionOrSession = req.user.id

        }
        const userData = await users.findById({_id:userFromGidSessionOrSession })

        if(!userData){

            return res.status(404).send("user profile not found")
        }
        
        return res.status(200).render("user/profile",{userData:userData})
        
    } catch (error) {
        
        console.log(`error while loading user profile`,error.message);
    }

}


//loggingout for user

const loadUserLogout = async (req,res) =>{

    try {
        
        req.session.destroy(err =>{
            if(err){

                console.log(`failed to destroy session`,err.message);

                return res.status(500).send('failed to logout')
            }

            res.redirect("/")

        })


    } catch (error) {
        
        console.log(`error while logging out`,error.message);
    }

}

//loading cart page
const loadCart = async (req,res) =>{

    try {
        

        let userFromGidSessionOrSession 

        if(req.session.userId){

            userFromGidSessionOrSession = req.session.userId

        }else if(req.user){

            //checking for google session id 
            userFromGidSessionOrSession = req.user.id

        }

        if(userFromGidSessionOrSession){

            const cartDetails = await cart.find({user:userFromGidSessionOrSession}).populate("items.product").exec()

            return  res.status(200).render("user/cart",{cartDetails:cartDetails})

        }


        
        
    } catch (error) {
     
        console.log(`error while loading the cart page`,error.message);
    }

}

//product adding to cart from the product details page

const addToCart = async (req,res) =>{

    const {productId} = req.body

    let  userFromGidSessionOrSession

    try {

        if(req.session.userId){

            userFromGidSessionOrSession = new ObjectId(req.session.userId) 

        }else if(req.user){

           
            userFromGidSessionOrSession = new ObjectId(req.user.id) 

        }
  
        const findExistingCart = await cart.findOne({user:userFromGidSessionOrSession}).exec()
        
        const productSalesPrice = await products.findOne({_id:productId},{salesPrice:1,_id:0})

        if(!findExistingCart){

            
            const cartItem = new cart({
    
                user:userFromGidSessionOrSession,
                items:[{
    
                    product:productId,
                    price:productSalesPrice.salesPrice
    
                }]
    
            })
            
            const savedCartData = await cartItem.save()
    
            if (!savedCartData) {
    
                return res.status(404).json({
    
                    success: false,
    
                    message: "Cannot save the cart data"
    
                })
    
            }
    
            return res.status(200).json({
    
                success:true,
                message:"new cart created for the user and added the product to items array successfully",
    
            })
     
        }else{

            await cart.updateOne({user:userFromGidSessionOrSession},{$push:{items:{product:productId,price:productSalesPrice.salesPrice}}})

            return res.status(200).json({
        
                success:true,
                message:"product added to items array for the existing cart successfully",
    
            })
        }

       
       
    } catch (error) {
        
        console.log(`error while adding product to cart from product details page backend`,error.message);
    }
}

//product removing from the cart
const removeFromCart = async (req, res) => {

    try {

      const { productId } = req.body
  
      let userFromGidSessionOrSession
  
      if (req.session.userId) {

        userFromGidSessionOrSession =  new ObjectId(req.session.userId) 

      } else if (req.user) {
       
        userFromGidSessionOrSession = new ObjectId (req.user.id)

      }
    
     
     const deletedProductFromCart =  await cart.updateOne({user: userFromGidSessionOrSession},{$pull:{items:{product: productId}}})

     const productName = await products.findById(productId);
     

     const isCartEmpty = await cart.findOne({user:userFromGidSessionOrSession})


     const isEmpty = isCartEmpty.items.length === 0

            if (deletedProductFromCart) {
            return res.status(200).json({
                success: true,
                message: "Item deleted from the cart successfully",
                isEmpty:isEmpty,
                productName:productName
            });
            } else {
            return res.status(500).json({
                success: false,
                message: "Something went wrong while deleting item from the cart"
            });
            }

     
    } catch (error) {

      console.log('Error while removing an item from the cart', error.message)

      return res.status(500).send('Internal Server Error')

    }
  }

  //increasing the quantity of the product inside the cart
  const updateQuantityFromCart = async (req,res) =>{

    try {
        let userFromGidSessionOrSession

        if (req.session.userId) {

          userFromGidSessionOrSession = new ObjectId(req.session.userId)

        } else if (req.user) {

          userFromGidSessionOrSession = new ObjectId(req.user.id)

        }
    
        const { itemId, quantity } = req.body
    
        const cartItem = await cart.findOne({"items._id":itemId })

        if (!cartItem) {

          return res.status(404).json({ error: 'Cart not found for the user' });

        }
        if (quantity < 1 || quantity > 5) {

            return res.status(400).json({ message: `Quantity must be between 1 and ${quantity}` });

          }
        const updatedItem = await cart.updateOne({user:userFromGidSessionOrSession,"items._id":itemId},{$set:{"items.$.quantity":quantity}})
       
        return res.status(200).json({ success: true, updatedItem })

      } catch (error) {

        res.status(500).json({ error: 'Error updating quantity' })

      }

  }

 const updatedSelectedItems = async (req,res) =>{

    try {

        let userFromGidSessionOrSession

        if (req.session.userId) {

          userFromGidSessionOrSession = new ObjectId(req.session.userId)

        } else if (req.user) {

          userFromGidSessionOrSession = new ObjectId(req.user.id)

        }
        
        const { selectedProductIds } = req.body;

        console.log(selectedProductIds);

        const cartDetails = await cart.findOne({user:userFromGidSessionOrSession})

        if(!cartDetails){

            return res.status(400).json({ success: false})

        }

        console.log(cartDetails);
        cartDetails.items = cartDetails.items.map((item)=>{

            if(selectedProductIds.includes(item.product.toString())){

                item.isSelected = true

            }else{

                item.isSelected = false
            }

            return item;
        })

        await cartDetails.save()

        return  res.status(200).json({ message: 'Cart updated successfully'});
        

    } catch (error) {
        
        console.log(`error while updating the selection `,error.message);
    }
 }

const loadAddress = async (req,res) =>{

    let userFromGidSessionOrSession

    if (req.session.userId) {

      userFromGidSessionOrSession =  new ObjectId(req.session.userId) 

    } else if (req.user) {
     
      userFromGidSessionOrSession = new ObjectId (req.user.id)

    }

    const addressDetails = await userAddress.find({userId:userFromGidSessionOrSession})


    try {
        
         return res.status(200).render("user/address",{addressDetails})
         
    } catch (error) {
        
        console.log(`error while loading the address page`,error.message);
    }
}

const loadAddAddress = async (req,res) =>{


    try {

        return res.status(200).render("user/addAddress")
        
    } catch (error) {
        
        console.log(`error while loading the address adding page`,error.message);
    }
}
const addAddress = async (req,res) =>{

    const { name, phone, pincode, locality, address, cityDistTown, state, landMark, altPhone, email, addressType } = req.body
      
    let userFromGidSessionOrSession

    if (req.session.userId) {

      userFromGidSessionOrSession =  new ObjectId(req.session.userId) 

    } else if (req.user) {
     
      userFromGidSessionOrSession = new ObjectId (req.user.id)

    }
    try {
        
        const newAddress = await new userAddress({

            name :name,
            userId:userFromGidSessionOrSession,
            phone:phone,
            pincode:pincode,
            locality:locality,
            address:address,
            cityDistTown:cityDistTown,
            state:state,
            landMark:landMark,
            altPhone:altPhone,
            email:email,
            addressType:addressType
        })

        const addressData = await newAddress.save()

        const pushAddressIntoUser = await users.findByIdAndUpdate({_id:userFromGidSessionOrSession},{$push:{addressId:addressData._id}},{ new: true } )

        if(addressData&&pushAddressIntoUser){

            
            return res.redirect('/address');
        }

    } catch (error) {
        
        console.log(`error while adding the address`,error.message);

    }
}

const removeAddress = async (req,res) =>{

    try {

        const {addressId} = req.body
        
        console.log(`req.body`,addressId);
        
      let userFromGidSessionOrSession
  
      if (req.session.userId) {

        userFromGidSessionOrSession =  new ObjectId(req.session.userId) 

      } else if (req.user) {
       
        userFromGidSessionOrSession = new ObjectId (req.user.id)

      }
        
      const deletedAddressFromCollection = await userAddress.deleteOne({userId:userFromGidSessionOrSession,_id:addressId})

      const isAddressEmpty = await userAddress.countDocuments({ userId: userFromGidSessionOrSession })

    
      if (deletedAddressFromCollection) {
        return res.status(200).json({
            success: true,
            message: "Item deleted from the address collection successfully",
            isAddressEmpty:isAddressEmpty,
            deletedAddressFromCollection:deletedAddressFromCollection
           
        });
        } else {
        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting item from the address collection"
        });
        }

    } catch (error) {
        
        console.log(`error while deleting the address`,error.message);
    }
}
module.exports = {

    loadRegister,
    loadsignin,
    generateOtp,
    resendOtp,
    verifyOtp,
    otpVPage,
    loadHome,
    loadShowCase,
    loadProductDetails,
    verifySignin,
    loadUserLogout,
    loadUserProfile,
    loadCart,
    addToCart,
    removeFromCart,
    updateQuantityFromCart,
    updatedSelectedItems,
    loadAddress,
    addAddress,
    loadAddAddress,
    removeAddress
 
    
}