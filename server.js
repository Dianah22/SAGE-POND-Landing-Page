
const {initializeApp} = require('firebase/app')
const firebaseConfig = {
    apiKey: "AIzaSyDyXWSxpBqk7lgomflc_Sl3BCXp8Dvffbg",
    authDomain: "localhost"
};
const fb = initializeApp(firebaseConfig);
const {getAuth,createUserWithEmailAndPassword,updateProfile,signInWithEmailAndPassword} = require('firebase/auth')
const auth = getAuth(fb)
const express = require('express')
const path = require('path')
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
    console.log(req)
  res.sendFile(path.join(initial_path,"about.html"))
  })
  app.get('/app',(req,res)=>{
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
      console.log(userCredential.user)
      res.json({ success: true, uid }); // Send user ID back to front-end
    } catch (error) {
      console.error(error);
      res.status(400).json({ success: false, message: error.message }); // Handle specific errors
    }
  });
app.use((req,res)=>{
    res.send('404')
  })
  app.listen(port,()=>{
    console.log(`listening on Port ${port}`)
  })
  