// ===========================
// SAGE POND LOGIN JAVASCRIPT
// ===========================

import { auth } from "./firebase-config.js";

import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

// Get form elements
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

// Login
loginForm.addEventListener("submit", async function(event){

event.preventDefault();

const email = document.getElementById("email").value.trim();
const password = document.getElementById("password").value.trim();


try{

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
    );

    const user = userCredential.user;


    // Check if email is verified
    if(user.emailVerified){

        loginMessage.textContent = "Login successful! Redirecting...";
        loginMessage.style.color = "green";

        setTimeout(()=>{

            // Future dashboard/home page
            window.location.href = "index.html";

        },1500);

    }

    else{

    await auth.signOut();

    loginMessage.textContent =
    "Please verify your email before logging in.";

    loginMessage.style.color = "red";

}
}

catch(error){

    loginMessage.textContent = error.message;
    loginMessage.style.color = "red";

}


});
