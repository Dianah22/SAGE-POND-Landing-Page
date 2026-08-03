gsap.registerPlugin(ScrollTrigger);

function openSignup(){

    document.getElementById("signupModal").style.display="flex";

}


function closeSignup(){

    document.getElementById("signupModal").style.display="none";

}



function openLogin(){

    document.getElementById("loginModal").style.display="flex";

}



function closeLogin(){

    document.getElementById("loginModal").style.display="none";

}


function switchToLogin(){

    closeSignup();

    openLogin();

}


function switchToSignup(){

    closeLogin();

    openSignup();

}


function openReset(){

    closeLogin();

    document.getElementById("resetModal").style.display="flex";

}



function closeReset(){

    document.getElementById("resetModal").style.display="none";

}



function switchToLoginFromReset(){

    closeReset();

    openLogin();

}


// ============================
// LOGIN VALIDATION
// ============================


function validateLogin(){

    let email = document.getElementById("loginEmail").value;

    let password = document.getElementById("loginPassword").value;

    let message = document.getElementById("loginMessage");



    if(email === "" || password === ""){

        message.innerHTML = "⚠ Please fill in all fields.";

        message.className="form-message error-message";

        return;

    }


    if(password.length < 6){

        message.innerHTML = "⚠ Password must be at least 6 characters.";

        message.className="form-message error-message";

        return;

    }



    message.innerHTML="✓ Login successful!";

    message.className="form-message success-message";

}





// ============================
// SIGNUP VALIDATION
// ============================


function validateSignup(){

    let name=document.getElementById("signupName").value;

    let email=document.getElementById("signupEmail").value;

    let password=document.getElementById("signupPassword").value;

    let message=document.getElementById("signupMessage");



    if(name==="" || email==="" || password===""){


        message.innerHTML="⚠ Please fill in all fields.";

        message.className="form-message error-message";

        return;

    }



    if(password.length < 6){


        message.innerHTML="⚠ Password must be at least 6 characters.";

        message.className="form-message error-message";

        return;

    }



    message.innerHTML="✓ Account created successfully!";

    message.className="form-message success-message";

}





// ============================
// RESET VALIDATION
// ============================


function validateReset(){

    let email=document.getElementById("resetEmail").value;

    let message=document.getElementById("resetMessage");



    if(email===""){


        message.innerHTML="⚠ Please enter your email.";

        message.className="form-message error-message";

        return;

    }



    message.innerHTML="✓ Reset link sent successfully.";

    message.className="form-message success-message";

}

// ============================
// PASSWORD VISIBILITY TOGGLE
// ============================


function togglePassword(id, icon){


    let passwordField = document.getElementById(id);



    if(passwordField.type === "password"){


        passwordField.type="text";

        icon.innerHTML="🙈";


    }

    else{


        passwordField.type="password";

        icon.innerHTML="👁";


    }


}

 // Close modal using Escape key

document.addEventListener("keydown", function(event){

    if(event.key === "Escape"){

        closeLogin();

        closeSignup();

        closeReset();

    }

});
// ============================
// GSAP HERO ANIMATION
// ============================

gsap.from(".hero-text h1", {
    duration: 1.2,
    y: 50,
    opacity: 0,
    ease: "power3.out"
});

gsap.from(".hero-text p", {
    duration: 1,
    y: 30,
    opacity: 0,
    delay: 0.4,
    ease: "power3.out"
});

gsap.from(".hero-text button", {
    duration: 0.8,
    scale: 0.8,
    opacity: 0,
    delay: 0.8,
    ease: "back.out(1.7)"
});

gsap.from(".hero-image", {
    duration: 1.2,
    x: 80,
    opacity: 0,
    delay: 0.5,
    ease: "power3.out"
});

// Floating hero image
gsap.to(".hero-image img", {
    y: -15,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
});

// ============================
// SCROLL ANIMATIONS
// ============================


gsap.from(".about h2, .about h3, .about p, .about-btn", {

    scrollTrigger: {
        trigger: ".about",
        start: "top 80%",
    },

    y: 50,
    opacity: 0,
    duration: 1,
    stagger: 0.2,
    ease: "power3.out"

});

gsap.fromTo(".step-card",

{
    opacity:0,
    y:60
},

{
    opacity:1,
    y:0,
    duration:1,
    stagger:0.2,

    scrollTrigger:{
        trigger:".how-it-works",
        start:"top 80%",
        
    }

}

);

gsap.fromTo(".feature-card",

{
    opacity:0,
    y:50
},

{
    opacity:1,
    y:0,
    duration:1,
    stagger:0.2,

    scrollTrigger:{
        trigger:".features",
        start:"top 80%",
    
    }

}

);

// ============================
// RESEARCH SECTION ANIMATION
// ============================

gsap.fromTo(".research-card",

{
    opacity:0,
    y:70
},

{
    opacity:1,
    y:0,
    duration:1,
    stagger:0.2,

    scrollTrigger:{
        trigger:".research",
        start:"top 80%",
        
    }

});

// ============================
// LATEST UPDATES ANIMATION
// ============================

gsap.fromTo(".update-card",

{
    opacity:0,
    y:60
},

{
    opacity:1,
    y:0,
    duration:1,
    stagger:0.2,

    scrollTrigger:{
        trigger:".updates",
        start:"top 80%",
        
    }

});

// ============================
// CAREERS SECTION ANIMATION
// ============================


gsap.from(".careers-text", {

    scrollTrigger:{
        trigger:".careers",
        start:"top 80%"
    },

    x:-80,
    opacity:0,
    duration:1,
    ease:"power3.out"

});


gsap.from(".careers-image", {

    scrollTrigger:{
        trigger:".careers",
        start:"top 80%"
    },

    x:80,
    opacity:0,
    duration:1,
    delay:0.3,
    ease:"power3.out"

});

// ============================
// WHY CHOOSE SECTION ANIMATION
// ============================

gsap.fromTo(".why-card",

{
    opacity:0,
    y:60
},

{
    opacity:1,
    y:0,
    duration:1,
    stagger:0.2,
    ease:"power3.out",

    scrollTrigger:{
        trigger:".why-choose",
        start:"top 80%",
     
    }

});

// ============================
// FOOTER ANIMATION
// ============================


gsap.from(".footer-top", {

    scrollTrigger:{
        trigger:".footer",
        start:"top 85%"
    },

    y:50,
    opacity:0,
    duration:1,
    ease:"power3.out"

});


gsap.from(".footer-columns", {

    scrollTrigger:{
        trigger:".footer",
        start:"top 75%"
    },

    y:40,
    opacity:0,
    duration:1,
    delay:0.3,
    ease:"power3.out"

});


gsap.from(".footer-bottom", {

    scrollTrigger:{
        trigger:".footer",
        start:"top 70%"
    },

    y:30,
    opacity:0,
    duration:1,
    delay:0.5,
    ease:"power3.out"

});

// ============================
// BUTTON HOVER EFFECTS
// ============================


const buttons = document.querySelectorAll("button");


buttons.forEach(button => {


    button.addEventListener("mouseenter",()=>{

        gsap.to(button,{
            scale:1.05,
            duration:0.3,
            ease:"power2.out"
        });

    });


    button.addEventListener("mouseleave",()=>{

        gsap.to(button,{
            scale:1,
            duration:0.3,
            ease:"power2.out"
        });

    });


});

// ============================
// CARD HOVER EFFECTS
// ============================


const cards = document.querySelectorAll(
".feature-card, .step-card, .research-card, .update-card, .why-card"
);


cards.forEach(card=>{


    card.addEventListener("mouseenter",()=>{

        gsap.to(card,{
            y:-10,
            duration:0.3,
            ease:"power2.out"
        });

    });


    card.addEventListener("mouseleave",()=>{

        gsap.to(card,{
            y:0,
            duration:0.3,
            ease:"power2.out"
        });

    });


});

// ============================
// MOBILE MENU
// ============================


function toggleMenu(){

    const menu = document.getElementById("navLinks");

    menu.classList.toggle("active");

}