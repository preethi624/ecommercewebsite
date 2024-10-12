const express=require("express")
const app=express()
const path=require("path")
const env=require("dotenv").config()
const session=require("express-session")
const db=require("./config/db")
const userRouter=require("./routes/userRouter")
const passport=require("passport")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const adminRouter=require('./routes/adminRouter')

db()
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000

    }
}))
app.use(passport.initialize());
app.use(passport.session())
passport.use(new GoogleStrategy({
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL: '/auth/google/callback' // Callback route
}, function (accessToken, refreshToken, profile, done) {
    // Here, you would usually save the profile information in the database
    // But for this example, we'll just return the profile
    return done(null, profile);
}));

// Serialize and deserialize user (used for session handling)
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});
app.use((req,res,next)=>{
    res.set('cache-control','no-atore')
    next()
})
app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,"views/admin")])
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

app.use("/",userRouter)
app.use('/admin',adminRouter);

app.listen(process.env.PORT,()=>{
    console.log("server is running")
})
module.exports=app