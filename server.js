
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
const fb = initializeApp(firebaseConfig);
const {getAuth,createUserWithEmailAndPassword,updateProfile,signInWithEmailAndPassword} = require('firebase/auth')
const auth = getAuth(fb)
const express = require('express')
const path = require('path')
const {uid} = require('uid')
const crypto = require('crypto');
const bodyParser = require('body-parser');
const app = express()
let initial_path = __dirname
const port = process.env.PORT || 4000
app.use(express.static(initial_path))
app.use(bodyParser.json())
app.get('/', (req, res) => {
    const chatId = uuid.v4();
    console.log(chatId)
    res.sendFile(path.join(initial_path, "index.html"));
  });
  app.get('/login',(req,res)=>{
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
        // User is not authenticated, redirect to login page
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
    res.sendFile(path.join(initial_path,"signup.html"))
  }) 
  app.post('/api/signup', async (req, res) => {
    const { email, password ,name} = req.body;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const username = await updateProfile(auth.currentUser,{displayName:name})
      const uid = userCredential.user.uid;
      res.json({ success: true, uid }); // Send user ID back to front-end
    } catch (error) {
      console.error(error);
      res.status(400).json({ success: false, message: error.message }); // Handle specific errors
    }
  });  
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      res.json({ success: true, uid,redirectTo: '/app' }); // Send user ID back to front-end
    } catch (error) {
      console.error(error);
      res.status(400).json({ success: false, message: error.message }); // Handle specific errors
    }
  });
  app.post('/create-chat', async (req, res) => {
    try {
      // Generate a unique chat ID
      const chatId = uid(16); // 16-character alphanumeric ID
      const db = getFirestore(fb)
          // Create a new chat document in Firestore
          const docData = {
            chatid: chatId,
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
  
app.use((req,res)=>{
    res.send('404')
  })
  app.listen(port,()=>{
    console.log(`listening on Port ${port}`)
  })
  