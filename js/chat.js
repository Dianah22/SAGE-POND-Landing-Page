import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, arrayUnion, Timestamp, getDoc } from 'firebase/firestore';

// DOM Elements
const chatbtn = document.getElementById('new_chat');
const recent = document.getElementById('recent');
const recent_title = document.getElementById('recent_title');
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
        });
    }
    return auth.currentUser.getIdToken();
}

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
                await createNewChat(message);
            } else {
                const chatId = window.location.pathname.split('/')[2];
                await sendMessage(chatId, message);
            }
            clickCount++;
            editor.innerHTML = '';
            send.disabled = true;
        });

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

    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
})();

// UI Functions
function renderChatMessages(messages) {
    chat_window.innerHTML = messages.map(message => `
        <div class="user_query h-[100px]">
            <div class="image-container">
                <img src="images/caleb.jpg" class="w-10 rounded-full">
            </div>
            <div class="info text-ellipsis text-xl">
                <h2>${message.content}</h2>
            </div>
        </div>
    `).join('');
}

function renderChatList(chats) {
    recent.innerHTML = chats.map(chat => `
        <div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2">
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
    const calc = 100 - 25;
    if (!isMenuOpen && window.innerWidth > 768) {
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", x: "0%" });
        gsap.to(content, { duration: 0.3, ease: 'power3.inOut', left: "25%", width: `${calc}%` });
        gsap.to(side_b, { duration: 0.3, ease: 'power2.inOut', width: '100%' });
        gsap.to(side_btn, { duration: 0.3, ease: 'power2.inOut', width: '100%' });
        gsap.to(recents, { duration: 0.3, ease: 'power2.inOut', width: '50%' });
    } else if (isMenuOpen == true && window.innerWidth > 768) {
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", width: "50%" });
        gsap.to(side_b, { duration: 0.4, ease: 'Power3.inOut', width: '45px' });
        gsap.to(content, { duration: 0.3, ease: 'power3.inOut', left: "5%", width: '95%' });
        gsap.to(recents, { duration: 0.3, ease: 'power2.inOut', width: '25%' });
    } else if (window.innerWidth <= 768 && isMenuOpen == true) {
        gsap.to(side_btn, { duration: 0.4, ease: 'power2.inOut', width: '0%', display: 'none', opacity: '0' });
        gsap.to(content, { duration: 0.2, left: "0%", width: '100%' });
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", width: "0%" });
        gsap.to(recents, { duration: 0.05, ease: 'power2.inOut', width: '0%' });
    } else if (window.innerWidth <= 768 && isMenuOpen == false) {
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", width: "70%" });
        gsap.to(content, { duration: 0.3, ease: 'power3.inOut', left: "0%", width: `100%` });
        gsap.to(side_btn, { duration: 0.4, ease: 'power2.inOut', width: '100%', display: 'grid', opacity: '1' });
        gsap.to(recents, { duration: 0.3, ease: 'power2.inOut', width: '100%' });
    }
    isMenuOpen = !isMenuOpen;
}

function sanitizeInput(userInput) {
    const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'em', 'i'];
    const allowedAttributes = ['class', 'style'];

    const config = {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: allowedAttributes
    };

    return DOMPurify.sanitize(userInput, config);
}

window.addEventListener('load', function () {
    if (window.innerWidth > 768) {
        isMenuOpen = true;
    }
});

    if (window.innerWidth <= 768) {
        isMenuOpen = false;
        nav.style.width = '0%';
        content.style.width = '100%';
        content.style.left = '0%';
        side_btn.style.display = 'none';
    }

editor.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.execCommand('insertHTML', false, '<p><br></p>');
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