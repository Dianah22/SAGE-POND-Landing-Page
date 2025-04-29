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
const {getAuth} = require('firebase/auth')
const auth = getAuth(fb)
const express = require('express')
const path = require('path') 
const bodyParser = require('body-parser');
const app = express()
const helmet = require('helmet'); // Added Helmet
const rateLimit = require('express-rate-limit'); // Added rate limiter
const validator = require('validator');
const admin = require('firebase-admin'); // Added Firebase Admin SDK

const serviceAccount = require('./sage-pond-gen-ai-firebase-adminsdk-9u1h2-7a16893d3f.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://sage-pond-gen-ai-default-rtdb.firebaseio.com"
    });
}

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
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://www.google.com/recaptcha/api.js",
        "https://cdn.jsdelivr.net/npm/dompurify@3.1.0/dist/purify.min.js",
      ],
      styleSrc: [
        "'self'",
        "https://fonts.googleapis.com/",
        "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
      ],
      imgSrc: ["'self'", "data:"],
      connectSrc: [
        "'self'",
        "https://identitytoolkit.googleapis.com", // Allow Firebase Auth API
      ],
    },
  })
);
app.get('/', (req, res) => {
    res.sendFile(path.join(initial_path, "index.html"));
  });

// Middleware to send Firebase config securely when login or signup page is loaded
app.get(['/login', '/signup'], (req, res, next) => {
    const firebaseConfig = {
        apiKey: "AIzaSyDyXWSxpBqk7lgomflc_Sl3BCXp8Dvffbg",
        authDomain: "sage-pond-gen-ai.firebaseapp.com",
        projectId: "sage-pond-gen-ai",
        storageBucket: "sage-pond-gen-ai.appspot.com",
        messagingSenderId: "369426724601",
        appId: "1:369426724601:web:698e582d4e10ff710c5428",
        measurementId: "G-XY1Y3VW550"
    };

    res.locals.firebaseConfig = firebaseConfig; // Attach config to response locals
    next();
});

// Serve login page with Firebase config
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve signup page with Firebase config
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/about',(req,res)=>{
  res.sendFile(path.join(initial_path,"about.html"))
  })

// Refactor isAuthenticated middleware to verify token instead of using Firebase Auth
const isAuthenticated = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log('Authorization Header:', req.headers); // Log the authorization header for debugging
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token from the Authorization header

    try {
        // Verify the token using Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Attach decoded token to the request object
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
    }
};

app.get('/app', isAuthenticated, (req, res) => {
    res.sendFile(path.join(initial_path, 'chat.html'));
});

  app.get('/signup',(req,res)=>{
    res.sendFile(path.join(initial_path,"signup.html"))
  })   
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

app.post('/api/verify-token', isAuthenticated, async (req, res) => {
    const { token } = req.body;

    if (!token) {
        console.log('No token provided in request body');
        return res.status(400).json({ success: false, message: 'Token is required' });
    }

    try {
        // Verify the token using Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        console.log('Token verified for user:', uid);
        res.json({ success: true, uid });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
});

app.all('/api/firebase-config', (req, res) => {
    const firebaseConfig = {
        apiKey: "AIzaSyDyXWSxpBqk7lgomflc_Sl3BCXp8Dvffbg",
        authDomain: "sage-pond-gen-ai.firebaseapp.com",
        projectId: "sage-pond-gen-ai",
        storageBucket: "sage-pond-gen-ai.appspot.com",
        messagingSenderId: "369426724601",
        appId: "1:369426724601:web:698e582d4e10ff710c5428",
        measurementId: "G-XY1Y3VW550"
    };

    // Add a security check to ensure only authorized requests can access this route
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer secure-fetch-key') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, config: firebaseConfig });
});

app.use((req,res)=>{
    res.send('404')
  })
  app.listen(port,()=>{
    console.log(`listening on Port ${port}`)
  })
