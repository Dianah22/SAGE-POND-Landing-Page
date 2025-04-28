import { getAuth, onAuthStateChanged } from 'firebase/auth';

const auth = getAuth();

// Monitor authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, get the ID token
        const token = await user.getIdToken();

        // Send the token to the backend for verification
        try {
            const response = await fetch('/api/verify-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();
            if (data.success) {
                console.log('Token verified successfully');
                // Redirect to /app if not already there
                if (window.location.pathname === '/login') {
                    window.location.href = '/app';
                }
            } else {
                console.error('Token verification failed:', data.message);
                // Handle token verification failure (e.g., log out user)
                auth.signOut();
            }
        } catch (error) {
            console.error('Error verifying token:', error);
        }
    } else {
        // User is signed out, redirect to login if not already there
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
});

const sub = document.getElementById('login')
async function handleLogin(email, password) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        // Handle successful login (store user data, redirect)
        window.location.href = data.redirectTo
        console.log('Login successful!');
      } else {
        console.error('Login failed:', data.error);
        alert('Login failed! Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again later.');
    }
  }
const email = document.getElementById('email')
const password = document.getElementById('password')
sub.addEventListener('click',e=>{
    e.preventDefault()
    handleLogin(email.value,password.value)
})