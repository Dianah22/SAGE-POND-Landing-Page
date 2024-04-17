const sub = document.getElementById('login')
async function handleLogin(email, password) {
  const csrfToken = document.querySelector('input[name="_csrf"]').value;
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