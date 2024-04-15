const sub = document.getElementById('login')
async function handleLogin(email, password) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
      if (data.success) {
        // Handle successful login (store user data, redirect)
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
    console.log(email.value)
    console.log(password)
    e.preventDefault()
    handleLogin(email.value,password.value)
})