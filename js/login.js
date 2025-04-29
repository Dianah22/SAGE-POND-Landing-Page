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
                // Redirect to /app if on /login
                if (window.location.pathname === '/login') {
                    window.location.href = '/app';
                }
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
                    method: 'POST', // Use POST instead of GET
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`, // Include the token in the Authorization header

                    },
                    body: JSON.stringify({ token }), // Include the token in the body
                });

                const data = await response.json();
                if (data.success) {
                    console.log('Token verified successfully:', data);
                    alert('Login successful! Redirecting to app...');
                    //window.location.href = '/app';
                } else {
                    console.error('Token verification failed:', data.message);
                    alert('Login failed! Please try again.');
                }
            } catch (error) {
                console.error('Error during login:', error);
                alert('Login failed! Please try again.');
            }
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