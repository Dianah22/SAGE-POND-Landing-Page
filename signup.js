
const submit = document.getElementById('submit')
const name1 = document.getElementById('name')
const email = document.getElementById('email')
const password = document.getElementById('password')
async function handleSignUp(email, password,name) {
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password,name}),
      });    
      const data = await response.json();
      if (data.success) {
        // Handle successful signup (redirect, store user data)
        console.log('Signup successful!');
      } else {
        console.error('Signup failed:', data.error);
        alert('Signup failed! Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again later.');
    }
  }
submit.addEventListener('click',e=>{
  e.preventDefault()
  handleSignUp(email.value,password.value,name1.value)
})
