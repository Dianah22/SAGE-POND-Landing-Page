const chatbtn = document.getElementById('new_chat')
const recent = document.getElementById('recent' )
const recent_title = document.getElementById('recent_title')
const chat_window = document.getElementById('chat_window')
const editor = document.getElementById('editor')
const send = document.getElementById('send')
const query_div = document.querySelector('.query')
send.disabled = true
editor.addEventListener('input',e=>{
    const content = editor.textContent.trim(); // Get the text content and trim any whitespace
    e.preventDefault()
        if (content.length > 0) {
            send; // Enable the button if there's content
        } else {
            sendButton.setAttribute('disabled', 'disabled'); // Disable the button if there's no content
        }
})
editor.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default behavior (line break)
        document.execCommand('insertHTML', false, '<p><br></p>'); // Insert a paragraph
    }
});
    const placeholder = editor.dataset.placeholder;
    // Set the initial content to the placeholder value
    editor.textContent = placeholder;
    // Add a class when the div is focused to mimic the placeholder behavior
    editor.addEventListener('focus', function() {
        if (editor.textContent === placeholder) {
            editor.textContent = '';
        }
    });

    textInput.addEventListener('blur', function() {
        if (editor.textContent === '') {
            editor.textContent = placeholder;
        }
    });
    // Toggle menu visibility when menu button is clicked
document.getElementById('menuButton').addEventListener('click', function() {
    const menu = document.getElementById('menu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) {
      menu.style.animationName = 'slideIn';
    } else {
      menu.style.animationName = 'slideOut';
    }
  });
  
  // Function to close the menu if window width is smaller than laptop width
  function closeMenuIfSmallScreen() {
    const menu = document.getElementById('menu');
    const laptopWidth = 1024; // Adjust the laptop width as needed
    if (window.innerWidth < laptopWidth && !menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
      menu.style.animationName = 'slideOut';
    }
  }
  
  // Call the function initially and on window resize
  closeMenuIfSmallScreen();
  window.addEventListener('resize', closeMenuIfSmallScreen);
  
const chatLinkContainer = document.getElementById('chat-link-container');
const loadingIndicator = document.getElementById('loading-indicator');
chatbtn.addEventListener('click', async ()=> {
  try {
    const response = await fetch('/create-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // You can add data to the chat object if needed
    });
    const data = await response.json();
    if (data.chatLink) {
      const text = 'new chat'

      const new_div = document.createElement('div')
      new_div.innerHTML = `<div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2">
       <a href ='${data.chatLink}'>${text}</a>
       </div>`
   recent.appendChild(new_div)
          } else {
            alert('Error creating chat. Please try again.');
          }
        } catch (error) {
          console.error(error);
          alert('Error creating chat. Please try again.');
        }

      });
      const fetchCreateChat = async () => {
        try {
            const response = await fetch('/create-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // You can add data to the chat object if needed
            });
            const data = await response.json();
            if (data.chatLink) {
                const text = 'new chat';
                const new_div = document.createElement('div');
                new_div.innerHTML = `<div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2">
                    <a href ='${data.chatLink}'>${text}</a>
                </div>`;
                recent.appendChild(new_div);
            } else {
                alert('Error creating chat. Please try again.');
            }
        } catch (error) {
            console.error(error);
            alert('Error creating chat. Please try again.');
        }
    };

      const fetchChatIds = async () => {
        const response = await fetch('/chatIds', {
            method: 'POST'
        });
        if (response.ok) {
            const data = await response.json();
            const text = 'new chat';
            console.log('Chat IDs:', data.chatIds);
            data.chatIds.forEach(item => {
              
                const di = document.createElement("div");
                di.innerHTML = `<div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2">
                    <a href ='${item}'>${text}</a>
                </div>`;
                recent.append(di);
            });
        } else {
            console.error('Error fetching chat IDs:', response.statusText);
            // Handle errors
        }
    };
window.addEventListener('load',fetchChatIds)