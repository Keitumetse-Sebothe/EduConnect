// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBigSfU_U7_PVbdOw0SCHO2b14T5hDxwK4",
  authDomain: "educonnect-a6c88.firebaseapp.com",
  projectId: "educonnect-a6c88",
  storageBucket: "educonnect-a6c88.firebasestorage.app",
  messagingSenderId: "700869703231",
  appId: "1:700869703231:web:650dd0cd48399027566a8a",
  measurementId: "G-LCVFHV2LRM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. ELEMENT SELECTORS
const authScreen = document.getElementById('auth-screen');
const teacherTools = document.getElementById('teacher-tools'); // Corrected to match your HTML
const roleBtn = document.getElementById('roleBtn');
const msgInput = document.getElementById('msgInput');
const imgUrlInput = document.getElementById('imgUrlInput');
const sendBtn = document.getElementById('sendBtn');
const sendText = document.getElementById('sendText');
const charCounter = document.getElementById('charCounter');
const forgotPassLink = document.getElementById('forgotPassLink');

// State Management
let userRole = localStorage.getItem('userRole') || 'parent';

// 3. AUTHENTICATION WATCHER
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("Welcome:", user.email);
        authScreen.style.display = 'none';
        applyRoleUI();
        setupRealtimeFeed();
    } else {
        authScreen.style.display = 'flex';
        const feed = document.getElementById('announcements-container');
        if (feed) feed.innerHTML = "";
    }
});

// 4. AUTHENTICATION HANDLERS
window.handleAuth = (type) => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    
    const btn = type === 'register' ? document.getElementById('registerBtn') : document.getElementById('loginBtn');
    const spinner = type === 'register' ? document.getElementById('regSpinner') : document.getElementById('loginSpinner');
    const btnText = type === 'register' ? document.getElementById('regText') : document.getElementById('loginText');

    if (!email || !pass) return alert("Please fill in all fields.");

    btn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (btnText) btnText.innerText = type === 'register' ? "Creating..." : "Signing in...";

    userRole = document.getElementById('roleSelect').value;
    localStorage.setItem('userRole', userRole);

    const authAction = type === 'register' 
        ? auth.createUserWithEmailAndPassword(email, pass) 
        : auth.signInWithEmailAndPassword(email, pass);

    authAction.catch(e => {
        btn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (btnText) btnText.innerText = type === 'register' ? "Create Account" : "Sign In";
        alert(e.message);
    });
};

document.getElementById('registerBtn').onclick = () => window.handleAuth('register');
document.getElementById('loginBtn').onclick = () => window.handleAuth('login');

// 5. FORGOT PASSWORD
forgotPassLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    if (!email) return alert("Enter your email first!");
    auth.sendPasswordResetEmail(email)
        .then(() => alert("Reset link sent to " + email))
        .catch(err => alert(err.message));
});

// 6. LOGOUT
roleBtn.onclick = () => {
    localStorage.removeItem('userRole');
    auth.signOut();
};

// 7. DATA FEED (The Real-Time Engine)
function setupRealtimeFeed() {
    const container = document.getElementById('announcements-container');
    if (!container) return;

    db.collection("announcements").orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {
            container.innerHTML = "";
            
            if (snapshot.empty) {
                container.innerHTML = `<p style="text-align:center;color:#888;">No updates yet.</p>`;
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const id = doc.id;
                const time = data.timestamp ? data.timestamp.toDate().toLocaleString() : "Just now";
                
                const imageTag = data.image ? `<img src="${data.image}" class="feed-img">` : '';
                const likes = data.likes || 0; 
                const likeBtn = `<button onclick="likeMsg('${id}', ${likes})" class="like-btn">❤️ <span>${likes}</span></button>`;
                
                const deleteBtn = (userRole === 'teacher') 
                    ? `<button onclick="deleteMsg('${id}')" class="delete-btn">Delete</button>` 
                    : '';

                container.insertAdjacentHTML('beforeend', `
                    <div class="card">
                        <small>Update • ${time}</small>
                        <p>${data.text}</p>
                        ${imageTag}
                        <div class="card-footer">
                            ${likeBtn} 
                            ${deleteBtn}
                        </div>
                    </div>
                `);
            });
        });
}

// 8. SEND MESSAGE
sendBtn.addEventListener('click', async () => {
    const text = msgInput.value.trim();
    const imageUrl = imgUrlInput.value.trim();
    
    if (text || imageUrl) {
        sendBtn.disabled = true;
        sendText.innerText = "Posting...";

        try {
            await db.collection("announcements").add({
                text: text,
                image: imageUrl,
                likes: 0,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Success Visuals
            sendBtn.style.backgroundColor = "#28a745"; 
            sendText.innerHTML = "✓ Sent!";
            
            msgInput.value = "";
            imgUrlInput.value = "";
            charCounter.innerText = "0 / 280";
            
            setTimeout(() => {
                sendBtn.disabled = false;
                sendBtn.style.backgroundColor = ""; 
                sendText.innerHTML = "Broadcast to Parents";
            }, 2000);

        } catch (error) {
            console.error("Error:", error);
            alert("Oops! Message didn't send.");
            sendBtn.disabled = false;
            sendText.innerText = "Broadcast to Parents";
        }
    }
});

// 9. DELETE FUNCTION
window.deleteMsg = (id) => {
    if(confirm("Permanently delete this?")) {
        db.collection("announcements").doc(id).delete();
    }
};

// 10. LIKE FUNCTION
window.likeMsg = async (id, currentLikes) => {
    try {
        await db.collection("announcements").doc(id).update({
            likes: currentLikes + 1
        });
    } catch (error) {
        console.error("Error liking:", error);
    }
};

// 11. UI UTILITY
function applyRoleUI() {
    if (userRole === 'teacher') {
        teacherTools.classList.remove('hidden');
        roleBtn.innerText = "Logout (Teacher)";
    } else {
        teacherTools.classList.add('hidden');
        roleBtn.innerText = "Logout (Parent)";
    }
}

// 12. CHARACTER COUNTER
msgInput.addEventListener('input', () => {
    const length = msgInput.value.length;
    charCounter.innerText = length + " / 280";
    if (length > 280) {
        charCounter.style.color = "red";
        sendBtn.disabled = true;
    } else {
        charCounter.style.color = "#888";
        sendBtn.disabled = false;
    }
});





