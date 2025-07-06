import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
// Fetch Firebase config from the backend
async function fetchFirebaseConfig() {
    try {
        const response = await fetch('/api/firebase-config', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer secure-fetch-key',
            },
        });

        const data = await response.json();
        if (data.success) {
            return data.config;
        } else {
            console.error('Failed to fetch Firebase config:', data.message);
            throw new Error('Failed to fetch Firebase config');
        }
    } catch (error) {
        console.error('Error fetching Firebase config:', error);
        throw error;
    }
}

// Helper function to wait for cookie
function waitForCookie(cookieName, timeout) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
        const checkCookie = setInterval(() => {
            const cookies = document.cookie.split(';');
            const found = cookies.some(cookie => cookie.trim().startsWith(`${cookieName}=`));
            
            if (found) {
                clearInterval(checkCookie);
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkCookie);
                reject(new Error('Cookie wait timeout'));
            }
        }, 100);
    });
}

// Initialize Firebase on the client side
(async () => {
    try {
        const firebaseConfig = await fetchFirebaseConfig();
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        // Monitor authentication state
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('User is signed in:', user.uid);
                // Use Promise chain instead of await
               waitForSessionCookie()
                    .then(() => {
                        alert('Session cookie found!');
                        // Only redirect if we're on the login page
                        if (window.location.pathname === '/login') {
                            window.location.href = '/app';
                        }
                    })
                    .catch((error) => {
                        console.error('Session cookie not found:', error);
                        // If no session cookie, sign out the user
                        auth.signOut().then(() => {
                            window.location.href = '/login';
                        });
                    });
            } else {
                console.log('User is signed out');
                // Redirect to /login if not already there
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        });

        const loginButton = document.getElementById('login');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        async function handleLogin(email, password) {
            try {
                await setPersistence(auth, browserLocalPersistence);
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log('User logged in successfully:', userCredential.user);

                // Get the ID token
                const token = await userCredential.user.getIdToken();  
                // Send the token to the backend for verification
                const response = await fetch('/api/verify-token', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();
                if (data.success) {
                    try {
                        // Wait for session cookie to be set
                        await waitForSessionCookie();
                        console.log('Token verified and session cookie set');
                    } catch (cookieError) {
                        console.error('Session cookie not set:', cookieError);
                        alert('Login failed! Session could not be established.');
                    }
                } else {
                    console.error('Token verification failed:', data.message);
                    alert('Login failed! Please try again.');
                }
            } catch (error) {
                console.error('Error during login:', error);
                alert('Login failed! Please try again.');
            }
        }
        async function waitForSessionCookie(maxAttempts = 2, initialDelay = 300) {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const ping = await fetch('/api/ping-session', {
                    method: 'GET',
                    credentials: 'include',
                });
        
                if (ping.status === 200) {
                    window.location.href = '/app'; // Redirect to /app if session cookie is set
                    console.log(`Session cookie detected on attempt ${attempt}`);
                    return;
                }
        
                const delay = initialDelay * Math.pow(2, attempt - 1); // exponential backoff
                console.log(`Session not yet available (attempt ${attempt}). Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        
            throw new Error('Session cookie setup timeout.');
        }

        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;
            handleLogin(email, password);
        });
       
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
})();