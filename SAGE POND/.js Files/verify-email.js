// ===========================
// SAGE POND VERIFY EMAIL JS
// ===========================


import { auth } from "./firebase-config.js";

import {
    sendEmailVerification,
    reload
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";



// Get buttons

const checkVerificationBtn = document.getElementById("checkVerification");

const resendEmailBtn = document.getElementById("resendEmail");

const message = document.getElementById("verifyMessage");



// Check if user exists

let currentUser = null;


auth.onAuthStateChanged((user)=>{


    if(user){

        currentUser = user;

        console.log("Current user:", user.email);

    }

    else{

        window.location.href = "signup.html";

    }


});




// Check verification status

checkVerificationBtn.addEventListener("click", async ()=>{


    if(currentUser){


        await reload(currentUser);



        if(currentUser.emailVerified){


            message.textContent = 
            "Email verified successfully! Redirecting...";


            message.style.color = "green";



            setTimeout(()=>{


                window.location.href = "login.html";


            },2000);



        }


        else{


            message.textContent =
            "Your email is not verified yet. Please check your inbox.";


            message.style.color = "red";


        }


    }


});





// Resend verification email

resendEmailBtn.addEventListener("click", async ()=>{


    if(currentUser){


        await sendEmailVerification(currentUser);



        message.textContent =
        "Verification email sent again. Please check your inbox.";


        message.style.color = "green";


    }


});