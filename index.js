import  express  from "express";
import bodyParser from "body-parser";
import pg from "pg"
import bcrypt from "bcrypt";
import env from "dotenv"
import session from 'express-session';
import passport from 'passport';
import { body, validationResult } from 'express-validator';
import { Strategy } from 'passport-local';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port =  process.env.PORT || 3000;
const saltRounds = 15;
const __dirname = dirname(fileURLToPath(import.meta.url));
env.config();

/*const db = new pg.Client({
    user: process.env.DBUSER,
    host:process.env.DBHOST,
    password: process.env.DBPASSWORD,
    database: process.env.DB,
    port: process.env.DBPORT
});*/


  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

app.set('view engine', 'ejs');

//middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized:true,
    cookie: { maxAge: 1000*60
    },
}))

try {
    await db.connect();
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1); 
  }

  
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(passport.initialize());
app.use(passport.session());



app.get("/",(req,res)=>{   
    res.render(__dirname+"/public/views/HomePage.ejs")
})

app.get("/register",(req,res)=>{
    res.render(__dirname+"/public/views/register.ejs")
})

//Login user
app.get("/Login",(req,res)=>{
   if(req.isAuthenticated()){
    res.render(__dirname+"/public/views/loggedIn.ejs", { user: userData })
   }
   else{
    res.render(__dirname+"/public/views/Login.ejs")
   }
  })


  /*Display user Account Page if Authetication is succsefull otherwise redirect to login page*/
  app.get("/loggedIn",(req,res)=>{
    console.log(req.user);
    if(req.isAuthenticated()){
        res.render(__dirname+"/public/views/loggedIn.ejs", { user: userData })
    }

    else{
        res.redirect("/login")
    }
    })

/*Display user Account Page if Authetication is succsefull otherwise redirect to login page*/
    app.post("/login",passport.authenticate("local",{
        successRedirect: "/loggedIn",
        failureRedirect: "/Login"
    }))

    
    /*LOGGED IN PAGE START*/
    const userData = {
        name: 'Xylo ',
        email: 'xyloDemo@xylo.com',
        plan: 'Pro',
        planDescription: 'You are on the Pro plan with advanced features and priority support.',
        products: [
          { name: 'Product 1', description: 'Description of product 1' },
          { name: 'Product 2', description: 'Description of product 2' }
        ]
      };
    
  
          
      // Route to serve the user dashboard
      app.get('/loggedIn', async (req, res) => {

        try {
           /*Retrieve customer information from database*/
           if(req.isAuthenticated()){


           }
        // Pass user data to the EJS template for rendering
        res.render('userDashboard', { user: userData });
    }
        catch (error) {
            console.log(error.message)
        }
      });      
    /*LOGGED IN PAGE END */ 


/*BASKET*/

// Display Cart Page
app.get('/Cart', (req, res) => {
    const cartItems = req.session.cart || [];
    const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    res.render(__dirname+'/public/views/Cart', { cartItems, cartTotal });
  });
  
  // Update Cart Item Quantity
  app.post('/Cart/update/:id', (req, res) => {
    const itemId = req.params.id;
    const newQuantity = parseInt(req.body.quantity, 10);
  
    // Update quantity in cart
    req.session.cart = req.session.cart.map(item => {
      if (item.id == itemId) {
        item.quantity = newQuantity;
      }
      return item;
    });
  
    res.redirect('/Cart');

  });
  
  // Remove Item from Cart
  app.post('/Cart/remove/:id', (req, res) => {
    const itemId = req.params.id;
  
    // Remove item from cart
    req.session.cart = req.session.cart.filter(item => item.id != itemId);
    res.redirect('/Cart');

  });  
/*BASKET END */  

/*SHOP START*/
// Add item to cart
app.post('/Cart/add', (req, res) => {
    const { id, name, price } = req.body;
  
    // Initialize cart if not already done
    if (!req.session.cart) {
      req.session.cart = [];
    }
  
    // Check if item is already in the cart
    const existingItemIndex = req.session.cart.findIndex(item => item.id == id);
  
    if (existingItemIndex !== -1) {
      // If item already exists, increment the quantity
      req.session.cart[existingItemIndex].quantity += 1;
    } else {
      // Add new item to cart
      req.session.cart.push({ id, name, price: parseFloat(price), quantity: 1 });
    }
  
    // Redirect back to the shop page
    res.redirect('/Shop');
  });
  
  // View Cart
  app.get('/Cart', (req, res) => {
    const cart = req.session.cart || [];
    const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  
    res.render(__dirname+'/public/views/Cart', { cartItems: cart, cartTotal });
  });
  
  // Update Item Quantity in Cart
  app.post('/cart/update/:id', (req, res) => {
    const itemId = req.params.id;
    const newQuantity = parseInt(req.body.quantity, 10);
  
    req.session.cart = req.session.cart.map(item => {
      if (item.id == itemId && newQuantity > 0) {
        item.quantity = newQuantity;
      }
      return item;
    });
  
    res.redirect('/Cart');
  });
  
  // Remove Item from Cart
  app.post('/Cart/remove/:id', (req, res) => {
    const itemId = req.params.id;
  
    req.session.cart = req.session.cart.filter(item => item.id != itemId);
  
    res.redirect('/Cart');
  });
  
  app.get('/Shop', (req, res) => {
    const cart = req.session.cart || [];
  
    // Calculate total items and total price
    const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  
    // Pass totalQuantity and cartTotal to the shop page
    res.render(__dirname+'/public/views/Shop', { cartTotal, totalQuantity });
  });
  
/*SHOP END */

/*CHECK OUT START*/
app.get('/Checkout', (req, res) => {
    // Clear the cart after a successful purchase
    req.session.cart = [];
    
    // Render the checkout success page
    res.render(__dirname+"/public/views/Checkout");
  });
  /*CHECK OUT END*/



//GET ROUTES
app.get("/products",(req,res)=>{
    res.render(__dirname+"/public/views/products.ejs")
})

app.get("/pricing",(req,res)=>{
    res.render(__dirname+"/public/views/pricing.ejs")
})

app.get("/Customers",(req,res)=>{
    res.render(__dirname+"/public/views/Customers.ejs")
})

app.get("/Shop",(req,res)=>{
    res.render(__dirname+"/public/views/Shop.ejs",{CartTotal: cartTotal})
})

app.get('/ContactSales', (req, res) => {
    res.render(__dirname+"/public/views/ContactSales.ejs", { errors: {}, formData: {} });
  });


//POST ROUTES 

//register the user
app.post("/register",async (req,res)=>{
    const username = req.body["username"]
    const password = req.body["password"]

    try {   
    const queryResult = await db.query("SELECT * FROM customers WHERE email = $1",[username]);
    if(queryResult.rows.length > 0){
    console.log("User exists")
    res.sendStatus(500)
    }
    else{
        bcrypt.hash(password,saltRounds, async (err,hashedPassword)=>{
            if(err){
            console.log(err)
            }
        else{
            try 
            { await db.query("INSERT INTO customers VALUES($1,$2)",[username,hashedPassword]);
            res.render(__dirname+"/public/views/Login.ejs")
        
        } 
        catch (error) 
        {
        console.log(error.message)
        }}})}} catch (error) {
            console.log(error.message)
        }
})


/* Contactsales page form validation  */
app.post("/ContactSales",   [
    body('firstname').trim().notEmpty().isAlpha().withMessage('Please complete this required field with alphabetic characters only'),
    body('lastname').trim().notEmpty().isAlpha().withMessage('Please complete this required field with alphabetic characters only'),
    body('email').isEmail().withMessage('Enter a valid email address'),
    body('phonenumber').isMobilePhone().withMessage('Enter a valid phone number'),
    body('interest').notEmpty().isIn(['Point of Sale System', 'Self Service Check Out', 'Card Reader']).withMessage('Please Select an interest'),
    body('howheard').notEmpty().isIn(['socialmedia', 'searchengine', 'friend', 'other']).withMessage('Invalid selection for how you heard about us'),
  ],(req,res)=>{

    const errors = validationResult(req);
     
  if (!errors.isEmpty()) {
    return res.render(__dirname+"/public/views/ContactSales.ejs", {
      errors: errors.mapped(), 
      formData: req.body      
    });
  }

  res.send('Form entered succefully');
})

/*-------------------------Basket-----------------------------*/
const ShoppingCart = [
{id:0,name:'TransactPro',qauntity:0},
{id:1,name:'SwipeEase',qauntity:0},
{id:2,name:'SelfServePro',qauntity:0},
{id:3,name:'selfServe Pro2',qauntity:0},
{id:4,name:'selfServe Pro3',qauntity:0},
{id:5,name:'selfServe Pro4',qauntity:0},
]
let cartTotal = 0;


app.post("/basket",(req,res)=>{
const productId = parseInt(req.body['id'])
let cartItem = ShoppingCart.find(item => item.id === productId)
console.log("The product Id is "+productId)
console.log("The cart item is "+cartItem.name)
res.redirect("/Shop");
})



passport.use(new Strategy ( async function verify(username, password, cb){
    console.log("PassPort middleware running2")
    try {
       
        console.log(username);
        console.log(password);

      const queryResult  =  await db.query("SELECT * FROM customers WHERE email = $1",[username])

        if(queryResult .rows.length > 0)
        {
            const customer = queryResult .rows[0];
            const dbpassword = customer.password;
            bcrypt.compare(password,dbpassword,(error,isPassCorrect)=>{
          if(error){
            return cb(error)
        }
          else{
            if(isPassCorrect) {console.log("Password match Login successful")
            console.log(password);
            console.log(dbpassword )
            return cb(null,customer)
           }
            else{
              
                console.log("Password or username incorrect")
                return(cb(null,false)); 
            }} 
        })

        }
        else{
            console.log("User does not exist")
            return(cb(null,false)); 
        }
    
    } catch (error) {
        console.log(error.message)
    }
}))

passport.serializeUser((customer,cb)=>{
    cb(null,customer);
    console.log("SER CALLED")
})

passport.deserializeUser((customer,cb)=>{
    console.log("DESSER CALLED")
    cb(null,customer);
  
})

app.listen(port,()=>{
    console.log("Port 3K online")
})
