// ===========================
// SAGE POND SIGNUP JAVASCRIPT
// ===========================


import { auth } from "./firebase-config.js";

import { 
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";



// Get form elements

const signupForm = document.getElementById("signupForm");

const signupMessage = document.getElementById("signupMessage");




// Signup function

signupForm.addEventListener("submit", async function(event){


    event.preventDefault();



    const name = document.getElementById("name").value;

    const email = document.getElementById("email").value;

    const password = document.getElementById("password").value;

    const confirmPassword = document.getElementById("confirmPassword").value;



    // Check password match

    if(password !== confirmPassword){

        signupMessage.textContent = "Passwords do not match.";

        signupMessage.style.color = "red";

        return;

    }



    // Check password length

    if(password.length < 8){

        signupMessage.textContent = "Password must be at least 8 characters.";

        signupMessage.style.color = "red";

        return;

    }



    try{


        // Create Firebase account

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );


        const user = userCredential.user;



        // Send verification email

        await sendEmailVerification(user);



        signupMessage.textContent = "Verification email sent!";

        signupMessage.style.color = "green";



        // Redirect to verification page

        setTimeout(() => {

            window.location.href = "verify-email.html";

        }, 1500);



    }


    catch(error){


        signupMessage.textContent = error.message;

        signupMessage.style.color = "red";


    }



});