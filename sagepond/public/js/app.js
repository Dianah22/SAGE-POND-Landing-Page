const background = document.getElementById('background');
const screenSize = window.screen.width;
if (background) {
    if (screenSize >= 1350) {
        background.src = 'images/1440p.svg';
    } else if (screenSize >= 1728) {
        background.src = 'images/1728.svg';
    } else if (screenSize >= 1152) {
        background.src = 'images/1152.svg';
    } else if (screenSize >= 3280) {
        background.src = 'images/4k.svg';
    } else if (screenSize >= 320) {
        background.src = 'images/768p.svg';
    }
}

/* Waitlist Modal Logic */
const modal = document.getElementById('waitlist-modal');
const joinBtn = document.getElementById('join-waitlist-btn');
const closeBtn = document.getElementById('close-modal');
const waitlistForm = document.getElementById('waitlist-form');
const emailInput = document.getElementById('waitlist-email');
const submitBtn = document.getElementById('submit-waitlist');
const modalMessage = document.getElementById('modal-message');
const turnstileContainer = document.getElementById('turnstile-container');
let turnstileWidgetId = null;
let turnstileToken = '';

const resetTurnstile = () => {
    if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
    }
    turnstileToken = '';
};

const showMessage = (message, isError) => {
    modalMessage.textContent = message;
    modalMessage.classList.remove('hidden', 'text-green-400', 'text-red-400');
    modalMessage.classList.add(isError ? 'text-red-400' : 'text-green-400');
};

const initializeTurnstile = async () => {
    if (!turnstileContainer || !window.turnstile) {
        return;
    }
    if (turnstileWidgetId !== null) {
        return;
    }

    const response = await fetch('/api/public-config');
    const data = await response.json();
    if (!data.success || !data.turnstileSiteKey) {
        throw new Error('Turnstile is not configured.');
    }

    turnstileWidgetId = window.turnstile.render(turnstileContainer, {
        sitekey: data.turnstileSiteKey,
        theme: 'dark',
        callback(token) {
            turnstileToken = token;
        },
        'expired-callback'() {
            turnstileToken = '';
        },
        'error-callback'() {
            turnstileToken = '';
        }
    });
};

const showModal = () => {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
    }, 10);
    initializeTurnstile().catch(() => {
        showMessage('Turnstile failed to load. Please refresh and try again.', true);
    });
};

const hideModal = () => {
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

if (joinBtn) joinBtn.addEventListener('click', showModal);
if (closeBtn) closeBtn.addEventListener('click', hideModal);
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });
}

if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;

        // Rate Limiting: Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Joining...';
        modalMessage.classList.add('hidden');

        if (!turnstileToken) {
            showMessage('Please complete the verification challenge.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Get Early Access';
            return;
        }

        try {
            const response = await fetch('/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, turnstileToken })
            });

            const data = await response.json();

            if (data.success) {
                modalMessage.textContent = 'Success! You are on the list.';
                modalMessage.classList.remove('hidden', 'text-red-400');
                modalMessage.classList.add('text-green-400');
                emailInput.value = '';
                resetTurnstile();
                setTimeout(hideModal, 2000);
            } else {
                showMessage(data.message || 'An error occurred.', true);
                resetTurnstile();
                submitBtn.disabled = false;
                submitBtn.textContent = 'Get Early Access';
            }
        } catch (error) {
            showMessage('Network error. Please try again.', true);
            resetTurnstile();
            submitBtn.disabled = false;
            submitBtn.textContent = 'Get Early Access';
        }
    });
}
