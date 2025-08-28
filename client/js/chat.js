import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, arrayUnion, Timestamp, getDoc } from 'firebase/firestore';
const recent = document.getElementById('recent');
const chat_window = document.getElementById('chat_window');
const editor = document.getElementById('editor');
const send = document.getElementById('send');
const menuBtn = document.querySelector('.menuButton');
const content = document.querySelector('.chatarea');
const nav = document.querySelector('.nav');
const side_menu = document.querySelector('.side')
const side_btn = document.querySelector('.side-button');
const side_b = document.querySelector('.side-b');
const recents = document.querySelector('.recent');
const welcome_screen = document.querySelector('.welcome_screen');
let isMenuOpen = true;
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

                const chatDocRef = doc(db, 'chats', chatId);
                const existing = await getDoc(chatDocRef);
                if (!existing.exists()) {
                    await setDoc(chatDocRef, {
                        createdBy: user.uid,
                        createdAt: Timestamp.now(),
                        messages: [{
                            content: message,
                            sender: user.uid,
                            timestamp: Timestamp.now()
                        }]
                    });
                } else {
                    // If doc already exists, append the message instead of overwriting
                    await updateDoc(chatDocRef, {
                        messages: arrayUnion({
                            content: message,
                            sender: user.uid,
                            timestamp: Timestamp.now()
                        })
                    });
                }

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

                // Send message to the model endpoint
                const modelUrl = `/api/unveyl`;

                try {
                    const modelResponse = await fetch(modelUrl,{
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${await auth.currentUser.getIdToken()}` // Assuming you might want to protect this too
                        },
                        body: JSON.stringify({ prompt: message }),
                    });
                    
                    if (!modelResponse.ok) {
                        const errorText = await modelResponse.text();
                        throw new Error(`Model API request failed with status ${modelResponse.status}: ${errorText}`);
                    }

                    const modelData = await modelResponse.json();
                    
                    await updateDoc(docRef, {
                        messages: arrayUnion({
                            content: modelData.response, // Assuming server sends { response: "..." }
                            sender: "assistant", 
                            timestamp: Timestamp.now()
                        })
                    });
                } catch (error) {
                    console.error('Error sending message to model or saving assistant message:', error);
                     await updateDoc(docRef, {
                        messages: arrayUnion({
                            content: "Error: Could not get response from assistant.",
                            sender: "system", 
                            timestamp: Timestamp.now()
                        })
                    });
                }

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

        // Inserted scrollToBottom function to resolve ReferenceError

        // Event Handlers
        send.addEventListener('click', async (e) => {
            const messageContent = sanitizeInput(editor.textContent);
            if (messageContent.length === 0) return;
            editor.innerHTML = '';
            send.disabled = true;
            let chatId = window.location.pathname.split('/')[2];
            // Only treat as new chat if there is no chatId in the URL.
            const isNewChat = !chatId;
            if (isNewChat) {
                chatId = await createNewChat(messageContent);
                window.history.pushState({}, 'conversation', `/app/${chatId}`);
                welcome_screen.style.display = 'none';
                chat_window.style.display = ''; // Ensure chat window is visible
            } else {
                // Save the new user message to Firestore for an existing chat
                const user = auth.currentUser; // Ensure auth is available
                if (!user) {
                    console.error("User not authenticated");
                    // Optionally, redirect to login or show an error
                    return; 
                }
                const docRef = doc(db, 'chats', chatId);
                await updateDoc(docRef, {
                    messages: arrayUnion({
                        content: messageContent,
                        sender: user.uid, // Make sure this is correctly set
                        timestamp: Timestamp.now()
                    })
                });
            }

            // Render current messages (including the one just sent by the user)
            let messages = await loadChatHistory(chatId);
            renderChatMessages(messages);
            
            const prompt = messageContent;
            const modelUrl = `/api/unveyl`; // Corrected: remove trailing slash if not intended

            try {
                const token = await auth.currentUser.getIdToken(); // Ensure token is fresh
                const modelResponse = await fetch(modelUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Add Authorization header
                    },
                    body: JSON.stringify({ prompt: prompt }) // Send as JSON object
                });

                if (!modelResponse.ok) {
                    const errorData = await modelResponse.text(); 
                    console.error('Model API request failed:', modelResponse.status, errorData);
                    // Save an error message to Firestore to display in chat
                    const docRef = doc(db, 'chats', chatId);
                    await updateDoc(docRef, {
                        messages: arrayUnion({
                            content: `Error: Model request failed (${modelResponse.status}). ${errorData}`,
                            sender: "system",
                            timestamp: Timestamp.now()
                        })
                    });
                    messages = await loadChatHistory(chatId); // Reload messages
                    renderChatMessages(messages);
                    
                    send.disabled = false; // Re-enable send button
                    return;
                }

                const modelData = await modelResponse.json();
                console.log('Model response data:', modelData);
                const assistantMessageContent = modelData.response; // Assuming server sends { response: "..." }

                if (assistantMessageContent) {
                    const docRef = doc(db, 'chats', chatId);
                    await updateDoc(docRef, {
                        messages: arrayUnion({
                            content: assistantMessageContent,
                            sender: "assistant",
                            timestamp: Timestamp.now()
                        })
                    });
                    messages = await loadChatHistory(chatId); // Reload messages
                    renderChatMessages(messages);
                    
                } else {
                    console.warn("Model did not return a message or 'response' field is missing.");
                    const docRef = doc(db, 'chats', chatId);
                    await updateDoc(docRef, {
                        messages: arrayUnion({
                            content: "Model did not return a valid message.",
                            sender: "system",
                            timestamp: Timestamp.now()
                        })
                    });
                    messages = await loadChatHistory(chatId); // Reload messages
                    renderChatMessages(messages);
                    
                }
            } catch (error) {
                console.error('Error fetching from model or saving assistant message:', error);
                const docRef = doc(db, 'chats', chatId);
                await updateDoc(docRef, {
                    messages: arrayUnion({
                        content: "Error communicating with the model.",
                        sender: "system",
                        timestamp: Timestamp.now()
                    })
                });
                messages = await loadChatHistory(chatId); // Reload messages
                renderChatMessages(messages);
                
            } finally {
                send.disabled = false; // Re-enable send button in all cases
            }
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
        // Render messages as escaped text, convert newlines to <br>, and allow only <br> tags
        chat_window.innerHTML = messages.map(message => {
            const isUser = message.sender !== "assistant"; // Check if sender is not assistant
            const raw = message.content || '';
            // Escape any HTML in the stored content to prevent injection
            const escaped = escapeHtml(raw);
            // Convert newline characters to <br> for display
            const withBreaks = escaped.replace(/\r\n|\r|\n/g, '<br>');
            // Sanitize the resulting fragment but only allow <br>
            const safeContent = DOMPurify.sanitize(withBreaks, { ALLOWED_TAGS: ['br'], ALLOWED_ATTR: [] });

            return `
                <div class="flex w-full mb-4 ${isUser ? 'justify-end pr-20' : 'justify-start pl-4'}">
                    <div class="max-w-[70%] px-4 py-2 rounded-2xl shadow-md text-base ${isUser ? 'bg-gray-900 text-white ml-auto' : ' text-gray-200 mr-auto  text-6xl'}">
                        <div class="flex items-center gap-2">
                            ${isUser ? '' : ''}
                            <span class="message-content">${safeContent}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Helper to escape HTML special characters in plain text
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
    window.addEventListener('resize', handleResize);
    menuBtn.addEventListener('click', toggleMenu);
    window.addEventListener('load', handleResize); // Initialize menu state on load based on window size

    // Refactored menu logic
    let menuShouldBeOpen = window.innerWidth > 1000; // Default state based on initial width

    function applyMenuState(open) {
        // Guard: ensure required elements exist
        if (!nav || !content || !side_btn || !side_b || !recents || !side_menu) {
            return;
        }

        const isDesktop = window.innerWidth > 1000;
        let navWidth, contentLeft, contentWidth;
        if (isDesktop) {
            navWidth = open ? '25%' : '0%';
            contentLeft = navWidth;
            contentWidth = open ? `calc(100% - ${navWidth})` : '100%';
        } else {
            navWidth = open ? '50%' : '0%';
            // On mobile, do not adjust the chat area dimensions
            contentLeft = '0';
            contentWidth = '100%';
        }

        // Apply display changes immediately (GSAP doesn't animate display)
        side_btn.style.display = open ? '' : 'none';
        recents.style.display = open ? '' : 'none';
        if (side_menu) {
            // On desktop show side_menu when open, hide on mobile
            side_menu.style.display = (open && isDesktop) ? '' : 'none';
        }
        // Animate layout properties with GSAP if available, otherwise fallback to direct styles
        try {
            if (typeof gsap !== 'undefined' && gsap.to) {
                gsap.to(nav, { duration: 0.25, ease: 'power3.inOut', width: navWidth });
                gsap.to(content, { duration: 0.25, ease: 'power3.inOut', left: contentLeft, width: contentWidth });
                gsap.to(side_b, { duration: 0.25, ease: 'power2.inOut' });
                if (side_menu) gsap.to(side_menu, { duration: 0.25, ease: 'power2.inOut', autoAlpha: (open && isDesktop) ? 1 : 0 });
            } else {
                nav.style.width = navWidth;
                content.style.left = contentLeft;
                content.style.width = contentWidth;
                if (side_menu) side_menu.style.display = (open && isDesktop) ? '' : 'none';
            }
        } catch (err) {
            // If animation fails, apply direct styles
            nav.style.width = navWidth;
            content.style.left = contentLeft;
            content.style.width = contentWidth;
            console.error('applyMenuState animation error:', err);
        }

        // For mobile, ensure the menu (nav) has a higher z-index when open
        if (!isDesktop && nav) {
            nav.style.zIndex = open ? '9999' : '';
        } else if (isDesktop && nav) {
            nav.style.zIndex = '';
        }

        // Apply chat_window horizontal margins only for desktop
        try {
            if (chat_window) {
                if (isDesktop) {
                    chat_window.style.marginLeft = '176px';
                    chat_window.style.marginRight = '176px';
                } else {
                    chat_window.style.marginLeft = '';
                    chat_window.style.marginRight = '';
                }
            }
        } catch (err) {
            console.error('applyMenuState chat_window margin error:', err);
        }

        // Update actual visual state
        isMenuOpen = open;
    }

    function toggleMenu() {
        // Toggle based on the currently visible state (isMenuOpen)
        const newState = !isMenuOpen;
        // Keep the intended desktop preference in menuShouldBeOpen
        menuShouldBeOpen = newState;
        applyMenuState(newState);
    }

    // Initialize menu to desired state on load
    applyMenuState(menuShouldBeOpen);

    function handleResize() {
        if (window.innerWidth > 1000) {
            // On desktop, respect the intended state
            applyMenuState(menuShouldBeOpen);
        } else {
            // On mobile collapse by default (but keep intended preference false)
            applyMenuState(false);
            menuShouldBeOpen = false;
        }
    }

    function sanitizeInput(userInputHtml) {
        // Accept HTML from the editor and sanitize it, allowing simple formatting and line breaks
        const allowedTags = ['p', 'br', 'b', 'em', 'i', 'strong', 'u', 'span'];
        const allowedAttributes = ['class', 'style'];

        const config = {
            ALLOWED_TAGS: allowedTags,
            ALLOWED_ATTR: allowedAttributes,
            KEEP_CONTENT: false
        };

        // DOMPurify will clean the HTML. Normalize newlines: convert plain line breaks to <br> if any.
        let html = userInputHtml || '';
        // Some browsers insert <div> blocks for newlines in contentEditable; keep as-is.
        // Sanitize and return safe HTML.
        return DOMPurify.sanitize(html, config);
    }
    editor.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) { // Added !event.shiftKey to allow Shift+Enter for new lines
            event.preventDefault();
            if (!send.disabled) {
                send.click();
            }
        }
    });

    const placeholder = editor.dataset.placeholder;
    // Set placeholder only if editor is empty, to avoid clearing user input on reload or script re-execution
    if (editor.textContent.trim() === '' || editor.textContent === placeholder) {
        editor.textContent = placeholder;
    }


    editor.addEventListener('focus', function () {
        if (editor.textContent === placeholder) {
            editor.textContent = '';
        }
    });

    editor.addEventListener('blur', function () {
        if (editor.textContent.trim() === '') { // Check trim to ensure empty spaces don't prevent placeholder
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