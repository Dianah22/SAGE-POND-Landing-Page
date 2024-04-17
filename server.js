
const {initializeApp} = require('firebase/app')
const {doc, setDoc, Timestamp,getFirestore, addDoc} = require('firebase/firestore')
const firebaseConfig = {
  apiKey: "AIzaSyDyXWSxpBqk7lgomflc_Sl3BCXp8Dvffbg",
  authDomain: "sage-pond-gen-ai.firebaseapp.com",
  projectId: "sage-pond-gen-ai",
  storageBucket: "sage-pond-gen-ai.appspot.com",
  messagingSenderId: "369426724601",
  appId: "1:369426724601:web:698e582d4e10ff710c5428",
  measurementId: "G-XY1Y3VW550"
};
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true }); // Store token in a cookie
const fb = initializeApp(firebaseConfig);
const {getAuth,createUserWithEmailAndPassword,updateProfile,signInWithEmailAndPassword} = require('firebase/auth')
const auth = getAuth(fb)
const express = require('express')
const path = require('path')
const { v4: uuid } = require('uuid')
const crypto = require('crypto');
const bodyParser = require('body-parser');
const app = express()
const helmet = require('helmet'); // Added Helmet
const rateLimit = require('express-rate-limit'); // Added rate limiter
const validator = require('validator');
let initial_path = __dirname
const port = process.env.PORT || 4000
const cookieParser = require('cookie-parser');
app.use(express.static(initial_path))
app.use(cookieParser())
app.use(csrfProtection)
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))
app.use(bodyParser.json())
app.use(helmet.frameguard({ action: 'deny' }))
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }))
app.use(helmet.hsts({ // Enable HSTS with a max age of 31536000 seconds (1 year)
  maxAge: 31536000,
  includeSubDomains: true, // Include subdomains
  preload: true, // Send the preload flag
}));

app.use(helmet.crossOriginEmbedderPolicy({ policy: 'require-corp' })); // Restricts embedding to the same corporation
app.use(helmet.xssFilter())
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff())
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ['\'self\''], // Restrict most resources to self
    scriptSrc: ['\'self\'', 'https://www.google.com/recaptcha/api.js'], // Allow specific script (e.g., Google reCAPTCHA)
    styleSrc: ['\'self\'', 'https://fonts.googleapis.com/','https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'], // Allow specific styles (e.g., Google Fonts)
    imgSrc: ['\'self\'', 'data:'], // Restrict image sources
  },
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(initial_path, "index.html"));
  });
  app.get('/login',csrfProtection,(req,res)=>{
    //const token = req.csrfToken();
    res.sendFile(path.join(initial_path,'login.html'))
  })
  app.get('/about',(req,res)=>{
  res.sendFile(path.join(initial_path,"about.html"))
  })
  const isAuthenticated = async (req, res, next) => {
    try {
      // Check if user is logged in using Firebase Authentication
      const user = await auth.currentUser;
      if (user) {
        // User is authenticated, proceed to the route handler
        next();
      } else {

        res.status(401).redirect('/login'); // Adjust redirect path as needed
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      res.status(500).send('Internal Server Error'); // Handle errors appropriately
    }
  };
  app.get('/app',isAuthenticated,(req,res)=>{
    res.sendFile(path.join(initial_path,"chat.html"))
  })
  app.get('/signup',(req,res)=>{
    res.sendFile(path.join(initial_path,"signup.html"),{csrfToken: req.csrfToken()})
  }) 
  app.post('/api/signup', async (req, res) => {
    
    const { email, password ,name} = req.body;
    const receivedToken = req.body._csrf
    try {
      await req.csrf.verify(receivedToken);
      if (!validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      if (!validator.isStrongPassword(password)) {
        return res.status(400).json({ success: false, message: 'Password is too weak' });
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const username = await updateProfile(auth.currentUser,{displayName:name})
      const uid = userCredential.user.uid;
      res.json({ success: true, uid }); // Send user ID back to front-end
    } catch (error) {
      console.error(error);
      res.status(400).json({ success: false, message: error.message });
    }
  });   
  app.post('/api/login',csrfProtection, async (req, res) => {
    const { email, password } = req.body;
   
    try {
      //await req.csrf.verify(csrfToken);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      res.json({ success: true, uid,redirectTo: '/app' });
    } catch (error) {
      console.error(error);
      res.status(400).json({ success: false, message: error.message }); // Handle specific errors
    }
  });
  app.post('/create-chat', async (req, res) => {
    try {
      const chatId = uid(16);
      const userId = auth.currentUser.uid
      const db = getFirestore(fb)
      const docData = {
        chatid: chatId, // Use 'chatid' to match your security rule field name
        createdBy: userId, // Use the currently authenticated user's ID
        dateCreated: Timestamp.now(),
      };
      const docRef = doc(db, 'chats', chatId);
          await setDoc(docRef, docData);
      const chatLink = `http://localhost:${port}/app/${chatId}`;
      res.json({ chatLink });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error creating chat');
    }
  });
  app.post('/signup', async (req, res) => {
    const { idToken } = req.body;
  
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      // Additional user data from Google Sign-in (optional)
      const name = decodedToken.name;
      const email = decodedToken.email;
      // Check if user exists in your database (replace with your logic)
      res.send({ message: 'User signed up successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'An error occurred during signup.' });
    }
  });
app.use((req,res)=>{
    res.send('404')
  })
  app.listen(port,()=>{
    console.log(`listening on Port ${port}`)
  })
  