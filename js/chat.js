import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, arrayUnion, Timestamp, getDoc } from 'firebase/firestore';

// DOM Elements
const chatbtn = document.getElementById('new_chat');
const recent = document.getElementById('recent');
const chat_window = document.getElementById('chat_window');
const editor = document.getElementById('editor');
const send = document.getElementById('send');
const query_div = document.querySelector('.query');
const menuBtn = document.querySelector('.menuButton');
const content = document.querySelector('.chatarea');
const nav = document.querySelector('.nav');
const side_btn = document.querySelector('.side-button');
const side_b = document.querySelector('.side-b');
const chat_history = document.querySelector('.chat_history');
const recents = document.querySelector('.recent');
const history = document.querySelector('.chat_history');
const welcome_screen = document.querySelector('.welcome_screen');

let clickCount = 0;
let isMenuOpen = false;

// Ensure token is available before making any requests
async function ensureToken(auth) {
    if (!auth.currentUser) {
        return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const token = await user.getIdToken();
                    unsubscribe();
                    resolve(token);
                } else {
                    window.location.href = '/login';
                }
            });
        },500);
    }
    return auth.currentUser.getIdToken();
}

// --- Firebase ready promise for DOMContentLoaded handler ---
let firebaseReadyResolve;
const firebaseReady = new Promise((resolve) => { firebaseReadyResolve = resolve; });

// Initialize Firebase and setup chat functionality
(async () => {
    try {
        const response = await fetch('/api/firebase-config', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer secure-fetch-key',
            },
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error('Failed to fetch Firebase config');
        }

        const app = initializeApp(data.config);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // Wait for token before proceeding
        const token = await ensureToken(auth);
        
        // Firebase Functions
        async function createNewChat(message) {
            try {
                const token = await auth.currentUser.getIdToken();
                const response = await fetch('/create-chat', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ message })
                });
                
                const data = await response.json();
                if (!data.success) {
                    throw new Error('Failed to create chat');
                }


                const chatId = data.chatId;
                const user = auth.currentUser;

                await setDoc(doc(db, 'chats', chatId), {
                    createdBy: user.uid,
                    createdAt: Timestamp.now(),
                    messages: [{
                        content: message,
                        sender: user.uid,
                        timestamp: Timestamp.now()
                    }]
                });

                return chatId;
            } catch (error) {
                console.error('Error creating chat:', error);
                throw error;
            }
        }

        async function sendMessage(chatId, message) {
            try {
                console.log(chatId, message);
                const user = auth.currentUser;
                const docRef = doc(db, 'chats', chatId);
                
                await updateDoc(docRef, {
                    messages: arrayUnion({
                        content: message,
                        sender: user.uid,
                        timestamp: Timestamp.now()
                    })
                });

                return true;
            } catch (error) {
                console.error('Error sending message:', error);
                return false;
            }
        }

        async function loadChatHistory(chatId) {
            try {
                const docRef = doc(db, 'chats', chatId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    return docSnap.data().messages || [];
                }
                return [];
            } catch (error) {
                console.error('Error loading chat history:', error);
                return [];
            }
        }

        async function loadUserChats(userId) {
            try {
                const chatIds = [];
                const chatIdsCol = collection(db, 'chats');
                const snapshot = await getDocs(chatIdsCol);
                snapshot.forEach(doc => {
                    if (doc.data().createdBy === userId) {
                        chatIds.push({ id: doc.id, ...doc.data() });
                    }
                });
                renderChatList(chatIds);
            } catch (error) {
                console.error('Error loading chats:', error);
            }
        }

        // Event Handlers
        send.addEventListener('click', async (e) => {
            const message = sanitizeInput(editor.textContent);
            if (clickCount === 0) {
                const chatId = await createNewChat(message);
                window.history.pushState({}, 'conversation', `/app/${chatId}`);
                await sendMessage(chatId, message);
                // Hide welcome screen and show chat window
                welcome_screen.style.display = 'none';
                chat_window.style.display = '';
                // Load chat history for new chat
                const messages = await loadChatHistory(chatId);
                renderChatMessages(messages);
            } else {
                const chatId = window.location.pathname.split('/')[2];
                await sendMessage(chatId, message);
                // Hide welcome screen and show chat window
                welcome_screen.style.display = 'none';
                chat_window.style.display = '';
                // Load chat history for existing chat
                const messages = await loadChatHistory(chatId);
                renderChatMessages(messages);
            }
            clickCount++;
            editor.innerHTML = '';
            send.disabled = true;
        });
       side_btn.addEventListener('click',  (e) => {
        if (window.location.pathname != '/app') {

            window.history.pushState({}, 'main', '/app');
                        welcome_screen.style.display = 'block';
            chat_window.innerHTML = '';
        }})
        recents.addEventListener('click', async (e) => {
            const chatItem = e.target.closest('[data-chat-id]');
            if (!chatItem) return;

            const chatId = chatItem.dataset.chatId;
            welcome_screen.style.display = 'none';
            
            const messages = await loadChatHistory(chatId);
            renderChatMessages(messages);
            
            window.history.pushState({}, 'Chat', `/app/${chatId}`);
        });

        // Initialize
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('User is signed in:', user.uid);
                await loadUserChats(user.uid);
            } else {
                console.log('User is signed out');
                window.location.href = '/login';
            }
        });

        // At the end of successful Firebase setup:
        firebaseReadyResolve({ loadChatHistory, renderChatMessages, welcome_screen, chat_window });
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
})();

// On page load, if on /app/:chatId, load chat history and show chat UI
window.addEventListener('DOMContentLoaded', async () => {
    const chatId = window.location.pathname.split('/')[2];
    console.log('Chat ID from URL:', chatId);
    if (chatId) {
        const { loadChatHistory, renderChatMessages, welcome_screen, chat_window } = await firebaseReady;
        const messages = await loadChatHistory(chatId);
        renderChatMessages(messages);
        welcome_screen.style.display = 'none';
        chat_window.style.display = '';
    }
});

// UI Functions
function renderChatMessages(messages) {
    chat_window.innerHTML = messages.map(message => {
        const isUser =  true
        return `
            <div class="flex w-full mb-4 ${isUser ? 'justify-end pr-20' : 'justify-start'}">
                <div class="max-w-[70%] px-4 py-2 rounded-2xl shadow-md text-base ${isUser ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-200 text-gray-900 mr-auto'}">
                    <div class="flex items-center gap-2">
                        ${isUser
                            ? ''
                            : '<img src="images/caleb.jpg" class="w-8 h-8 rounded-full">'}
                        <span>${message.content}</span>
                        ${isUser
                            ? '<img src="images/caleb.jpg" class="w-8 h-8 rounded-full">'
                            : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderChatList(chats) {
    recent.innerHTML = chats.map(chat => `
        <div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2 flex flex-wrap justify-center content-center items-center">
            <button data-chat-id="${chat.id}">new chat</button>
        </div>
    `).join('');
}

// UI Setup
send.disabled = true;
editor.addEventListener('input', (e) => {
    const content = editor.textContent.trim();
    send.disabled = content.length === 0;
});

menuBtn.addEventListener('click', toggleMenu);

function toggleMenu() {
    const isMobile = window.innerWidth <= 965;
    if (!isMenuOpen && !isMobile) {
        // Open menu on desktop
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", x: "0%", width: "25%" });
        gsap.to(content, { duration: 0.3, ease: 'power3.inOut', left: "25%", width: "75%" });
        gsap.to(side_b, { duration: 0.3, ease: 'power2.inOut', width: '100%' });
        gsap.to(side_btn, { duration: 0.3, ease: 'power2.inOut', width: '100%' });
        gsap.to(recents, { duration: 0.3, ease: 'power2.inOut', width: '50%' });
        nav.style.display = 'block';
    } else if (isMenuOpen && !isMobile) {
        // Close menu on desktop
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", width: "50%" });
        gsap.to(side_b, { duration: 0.4, ease: 'Power3.inOut', width: '45px' });
        gsap.to(content, { duration: 0.3, ease: 'power3.inOut', left: "5%", width: '95%' });
        gsap.to(recents, { duration: 0.3, ease: 'power2.inOut', width: '25%' });
    } else if (isMobile) {
        // Always hide menu on mobile
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", width: "0%", x: "-100%" });
        gsap.to(content, { duration: 0.2, left: "0%", width: '100%' });
        gsap.to(side_btn, { duration: 0.4, ease: 'power2.inOut', width: '0%', display: 'none', opacity: '0' });
        gsap.to(recents, { duration: 0.05, ease: 'power2.inOut', width: '0%', display: 'none' });
        //nav.style.display = 'none';
    }
    isMenuOpen = !isMenuOpen && !isMobile;
}
window.addEventListener('resize',toggleMenu)
function sanitizeInput(userInput) {
    const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'em', 'i'];
    const allowedAttributes = ['class', 'style'];

    const config = {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: allowedAttributes
    };

    return DOMPurify.sanitize(userInput, config);
}
window.addEventListener('resize', function () {
    if (window.innerWidth > 1000) {
        isMenuOpen = true;
    }
    if (window.innerWidth > 965 && isMenuOpen == false) {
    
    }
    if (window.innerWidth <= 965) {
        isMenuOpen = false;
        menuBtn.style.display='block'
        nav.style.width = '0%';
        content.style.width = '100%';
        content.style.left = '0%';
        side_btn.style.display = 'none';
    }
});

editor.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        if (!send.disabled) {
            send.click();
        }
    }
});

const placeholder = editor.dataset.placeholder;
editor.textContent = placeholder;

editor.addEventListener('focus', function () {
    if (editor.textContent === placeholder) {
        editor.textContent = '';
    }
});

editor.addEventListener('blur', function () {
    if (editor.textContent === '') {
        editor.textContent = placeholder;
    }
});

// --- Editor dynamic style for wrapping and overflow ---
function applyEditorStyles() {
    editor.style.display = 'block';
    editor.style.width = '100%'; // or set a fixed px width if needed
   
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.wordBreak = 'break-word';
    editor.style.overflowY = 'hidden';
    editor.style.overflowX = 'hidden';
    editor.style.boxSizing = 'border-box';
}

function checkEditorOverflow() {
    if (editor.scrollHeight > editor.clientHeight) {
        editor.style.overflowY = 'auto';
    } else {
        editor.style.overflowY = 'hidden';
    }
}

applyEditorStyles();

editor.addEventListener('input', checkEditorOverflow);
window.addEventListener('resize', checkEditorOverflow);