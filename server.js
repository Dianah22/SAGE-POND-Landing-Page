const {initializeApp} = require('firebase/app')
const {doc, setDoc, Timestamp,getFirestore, collection,getDocs,updateDoc,arrayUnion,getDoc, query, orderBy} = require('firebase/firestore')
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
const {uid} = require('uid')
const {getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, onAuthStateChanged, browserSessionPersistence} = require('firebase/auth')
const auth = getAuth(fb)
const express = require('express')
const path = require('path') 
const bodyParser = require('body-parser');
const app = express()
const helmet = require('helmet'); // Added Helmet
const rateLimit = require('express-rate-limit'); // Added rate limiter
const validator = require('validator');
let initial_path = __dirname 
const port = process.env.PORT || 4000
app.use(express.static(initial_path))
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
defaultSrc: ["'self'"], // Restrict most resources to self
scriptSrc: ["'self'", 'https://www.google.com/recaptcha/api.js','https://cdn.jsdelivr.net/npm/dompurify@3.1.0/dist/purify.min.js'], // Allow specific script (e.g., Google reCAPTCHA)
styleSrc: ["'self'", 'https://fonts.googleapis.com/','https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'], // Allow specific styles (e.g., Google Fonts)
imgSrc: ["'self'", 'data:'], // Restrict image sources
},
}));
app.get('/', (req, res) => {
    res.sendFile(path.join(initial_path, "index.html"));
  });
app.get('/login', (req, res) => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // If user is already logged in, redirect to /app
            res.redirect('/app');
        } else {
            // Otherwise, serve the login page
            res.sendFile(path.join(__dirname, 'login.html'));
        }
    });
});
app.get('/about',(req,res)=>{
  res.sendFile(path.join(initial_path,"about.html"))
  })
  const isAuthenticated = async (req, res, next) => {
    try {
        const user = await new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe(); // Ensure the listener is removed after being called
                resolve(user);
            }, reject);
        });

        if (user) {
            req.user = user; // Attach user to request
            console.log('User is authenticated:', user.uid);
            next(); // Proceed to the next middleware or route handler
        } else {
            if (!res.headersSent) {
                console.log('User is not authenticated, redirecting to login');
                res.redirect('/login'); // Redirect to login if no user is signed in
            }
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
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
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email and password are required' 
        });
    }

    try {
        // Set persistence to SESSION (cleared when browser tab closes)
        await setPersistence(auth, browserSessionPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        res.json({ 
            success: true, 
            uid, 
            redirectTo: '/app' 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});
  app.post('/send-message', async (req, res) => {
    const db = getFirestore(fb)
    const userId = auth.currentUser.uid
    const message = req.body.message; // Get message from request body
    const chatId = req.body.chatId;
    try {
      const newMessage = {
        sender: userId,
        content: message,
        timestamp: Timestamp.now(),
      };
      const docData = {
        chatid: chatId,
        messages: [
  
  
        ],
        createdBy: userId,
        dateCreated: Timestamp.now(),
      };
      docData.messages.push(newMessage);
      const docRef = doc(db, 'chats', chatId)
      await updateDoc(docRef, {messages: arrayUnion(newMessage)});
      res.send({success:true})
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: 'Failed to send message' });
    }
  });
  app.post('/create-chat', async (req, res) => {
    try {
      const db = getFirestore(fb)
      const { message } = req.body;
      const chatId = uid(16);
      const userId = auth.currentUser.uid
      const docData = {
        chatid: chatId,
        messages: [
         {content:message,sender:userId,timestamp:Timestamp.now()}
  ],
        createdBy: userId, 
        dateCreated: Timestamp.now(),
      };
      const docRef = doc(db, 'chats', chatId);
      await setDoc(docRef, docData)
      console.log(chatId)
      res.json({chatId });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error!!!');
    }
  });
  app.get('/app/:chatId', async(req, res) => {
    const chatId = req.params.chatId;
  const db = getFirestore(fb)
  const docRef = await doc(db, "chats", chatId)
  const docSnap = await getDoc(docRef);
if (docSnap.exists() && docSnap.data().createdBy==auth.currentUser.uid) {
  const messages = docSnap.data().messages || []; // Extract messages array or empty arra
  messages.sort((a, b) => a.timestamp - b.timestamp);
  res.json({ messages });
}else{
}
//res.sendFile(path.join(initial_path, "chat.html"))
})
app.get('/welcome',(req,res)=>{
  res.sendFile(path.join(initial_path,'welcome.html'))
})
  app.post('/chatIds', async (req, res) => {
    try {
      const db = getFirestore(fb)
      const userId = auth.currentUser.uid
      const chatIds = [];
      const chatIdsCol = collection(db, 'chats'); // Get the chatIds collection reference
      const snapshot = await getDocs(chatIdsCol); // Get all documents in the collection
      snapshot.forEach(doc => {
        if (doc.data().createdBy === userId) {
        chatIds.push(doc.id);
      }
      });
      res.status(200).send({ chatIds }); // Send chat IDs as a response
    } catch (error) {
      console.error('Error fetching chat IDs:', error);
      res.status(500).send({ message: 'Error fetching chat IDs' });
    }
  });

// Blog routes
app.get('/blog/:id', async (req, res) => {
  try {
    const blogId = req.params.id;
    const db = getFirestore(fb);
    const blogDoc = await getDoc(doc(db, 'blogs', blogId));
    
    if (blogDoc.exists()) {
      res.sendFile(path.join(initial_path, "blog.html"));
    } else {
      res.status(404).send('Blog post not found');
    }
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/blog/:id', async (req, res) => {
  try {
    const blogId = req.params.id;
    const db = getFirestore(fb);
    const blogDoc = await getDoc(doc(db, 'blogs', blogId));
    
    if (blogDoc.exists()) {
      res.json({ success: true, blog: { id: blogDoc.id, ...blogDoc.data() } });
    } else {
      res.status(404).json({ success: false, message: 'Blog post not found' });
    }
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get('/api/blogs', async (req, res) => {
  try {
    const db = getFirestore(fb);
    const blogsQuery = query(collection(db, 'blogs'), orderBy('publishedAt', 'desc'));
    const querySnapshot = await getDocs(blogsQuery);
    
    const blogs = [];
    querySnapshot.forEach((doc) => {
      blogs.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, blogs });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.use((req,res)=>{
    res.send('404')
  })
  app.listen(port,()=>{
    console.log(`listening on Port ${port}`)
  })
