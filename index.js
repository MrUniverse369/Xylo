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

const db = new pg.Client({
    user: process.env.DBUSER,
    host:process.env.DBHOST,
    password: process.env.DBPASSWORD,
    database: process.env.DB,
    port: process.env.DBPORT
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
db.connect();
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
app.get("/login",(req,res)=>{
   if(req.isAuthenticated()){
    res.render(__dirname+"/public/views/loggedIn.ejs")
   }
   else{
    res.render(__dirname+"/public/views/login.ejs")
   }
  })

  app.get("/loggedIn",(req,res)=>{
    console.log(req.user);
    if(req.isAuthenticated()){
        res.render(__dirname+"/public/views/loggedIn.ejs")
    }
    else{
        res.redirect("/login")
    }
    })

    app.post("/login",passport.authenticate("local",{
        successRedirect: "/loggedIn",
        failureRedirect: "/login"
    }))


//register the user
app.post("/register",async (req,res)=>{
    const username = req.body["username"]
    const password = req.body["password"]
   console.log(username)
   console.log(password)
   const queryResult = await db.query("SELECT * FROM customers WHERE email = $1",[username])
console.log(queryResult.rows)
;
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
        res.render(__dirname+"/public/views/login.ejs")
    
    } 
    catch (error) 
    {
    console.log(error.message)
    }}})
}})


//GET ROUTES
app.get("/Products",(req,res)=>{
    res.render(__dirname+"/public/views/Products.ejs")
})

app.get("/Pricing",(req,res)=>{
    res.render(__dirname+"/public/views/Pricing.ejs")
})

app.get("/Customers",(req,res)=>{
    res.render(__dirname+"/public/views/Customers.ejs")
})

app.get("/Cart",(req,res)=>{
    res.render(__dirname+"/public/views/Cart.ejs")
})


app.get("/Shop",(req,res)=>{
    res.render(__dirname+"/public/views/Shop.ejs",{CartTotal: cartTotal})
})

app.get('/ContactSales', (req, res) => {
    res.render(__dirname+"/public/views/ContactSales.ejs", { errors: {}, formData: {} });
  });


//POST ROUTES 

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
      errors: errors.mapped(), // `mapped()` converts array of errors to an object for easier use
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

if(cartItem.name === 'TransactPro'){
cartTotal += 50;
}
if(cartItem.name === 'SwipeEase'){
cartTotal += 150;
}
if(cartItem.name === 'SelfServePro'){
    cartTotal += 250;
}

if(cartItem.name === 'selfServe Pro2'){
    cartTotal += 250;
}
if(cartItem.name === 'selfServe Pro3'){
    cartTotal += 150;
}
if(cartItem.name === 'selfServe Pro4'){
    cartTotal += 350;
}
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
