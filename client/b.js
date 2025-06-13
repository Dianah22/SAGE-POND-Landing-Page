
function showPopup(type, title, message) {
            const popup = document.getElementById('popup');
            const overlay = document.getElementById('popupOverlay');
            const iconDiv = document.getElementById('popupIcon');
            
            // Set icon based on type
            const iconSvg = type === 'success' 
                ? '<svg class="h-12 w-12 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                : '<svg class="h-12 w-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            
            iconDiv.innerHTML = iconSvg;
            document.getElementById('popupTitle').textContent = title;
            document.getElementById('popupMessage').textContent = message;
            
            popup.classList.add('show');
            overlay.classList.add('show');
        }

        function closePopup() {
            const popup = document.getElementById('popup');
            const overlay = document.getElementById('popupOverlay');
            popup.classList.remove('show');
            overlay.classList.remove('show');
        }
            const btn = document.getElementById('sub')
        btn.addEventListener('click', async (e) => {
            const email = document.getElementById('email').value;

            e.preventDefault()
            console.log(email);
            
            try {
                const response = await fetch('/beta-signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();
                
                if (data.success) {
                    showPopup(
                        'success',
                        'Thank You!',
                        'Thank you for joining our beta program! Please check your email for confirmation.'
                    );
                    document.getElementById('betaForm').reset();
                } else {
                    showPopup(
                        'error',
                        'Oops!',
                        data.message || 'Something went wrong. Please try again.'
                    );
                }
            } catch (error) {
                console.error('Error:', error);
                showPopup(
                    'error',
                    'Error',
                    'An error occurred. Please try again.'
                );
            }
        });