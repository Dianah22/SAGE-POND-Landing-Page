import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

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

        const submitButton = document.getElementById('submit');
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        async function handleSignUp(email, password, name) {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
                console.log('User signed up successfully:', userCredential.user);
                alert('Signup successful! Redirecting to login...');
                window.location.href = '/login';
            } catch (error) {
                console.error('Error during signup:', error);
                alert('Signup failed! Please try again.');
            }
        }

        submitButton.addEventListener('click', (e) => {
            e.preventDefault();
            const name = nameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            handleSignUp(email, password, name);
        });
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
})();
