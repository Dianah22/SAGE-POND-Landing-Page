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
                
                // Attempt to authenticate as admin
                const adminAuthResponse = await fetch('/api/admin-auth', { // New endpoint for admin check
                    method: 'POST',
                    credentials: 'include', // Important for cookies
                    headers: {
                        'Content-Type': 'application/json',
                        // 'Authorization': 'Bearer ' + token // Sending token in body for this example
                    },
                    body: JSON.stringify({ token })
                });

                const adminAuthData = await adminAuthResponse.json();

                if (adminAuthResponse.ok && adminAuthData.success && adminAuthData.isAdmin) {
                    // Wait for session cookie to be set by the /api/admin-auth endpoint
                    // The server should set the session cookie if admin check is successful
                    // Then redirect to the admin panel
                    console.log('Admin login successful, session cookie should be set.');
                    window.location.href = '/admin'; // Or the path to admin.html if served directly by a protected route
                } else if (adminAuthResponse.ok && adminAuthData.success && !adminAuthData.isAdmin) {
                    // If the user is valid but not an admin, redirect to the regular app or show message
                    
                     window.location.href = '/app';
                } else {
                    // Handle other errors (e.g., token verification failed, user not found, etc.)
                    console.error('Admin authentication failed:', adminAuthData.message);
                    alert(adminAuthData.message || 'Admin login failed. Please try again.');
                    // Optionally, sign out the user if login was partially successful but admin check failed
                    // await auth.signOut(); 
                }

            } catch (error) {
                // This catches errors from signInWithEmailAndPassword or network errors for fetch
                console.error('Error during login:', error);
                let errorMessage = 'Login failed! Please check your credentials and try again.';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errorMessage = 'Invalid email or password.';
                } else if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'Network error. Please check your connection.';
                }
                alert(errorMessage);
            }
        }
        // Removed waitForSessionCookie as session cookie setting is now handled by the backend auth endpoint

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