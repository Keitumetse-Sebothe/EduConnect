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
const teacherTools = document.getElementById('teacher-tools');
const container = document.getElementById('message-container');
const roleBtn = document.getElementById('roleBtn');
const sendBtn = document.getElementById('sendBtn');
const msgInput = document.getElementById('msgInput');
const forgotPassLink = document.getElementById('forgotPassLink');

// State Management
let userRole = localStorage.getItem('userRole') || 'parent';

// 3. AUTHENTICATION WATCHER (Handles Refreshing)
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("Welcome:", user.email);
        authScreen.style.display = 'none';
        applyRoleUI();
        setupRealtimeFeed();
    } else {
        authScreen.style.display = 'flex';
        container.innerHTML = "";
    }
});

// 4. AUTHENTICATION HANDLERS (Login/Register)
window.handleAuth = (type) => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    
    // Select UI feedback elements
    const btn = type === 'register' ? document.getElementById('registerBtn') : document.getElementById('loginBtn');
    const spinner = type === 'register' ? document.getElementById('regSpinner') : document.getElementById('loginSpinner');
    const btnText = type === 'register' ? document.getElementById('regText') : document.getElementById('loginText');

    if (!email || !pass) return alert("Please fill in all fields.");

    // Start Loading State
    btn.disabled = true;
    spinner.classList.remove('hidden');
    btnText.innerText = type === 'register' ? "Creating..." : "Signing in...";

    userRole = document.getElementById('roleSelect').value;
    localStorage.setItem('userRole', userRole);

    const authAction = type === 'register' 
        ? auth.createUserWithEmailAndPassword(email, pass) 
        : auth.signInWithEmailAndPassword(email, pass);

    authAction.catch(e => {
        // Reset UI on Error
        btn.disabled = false;
        spinner.classList.add('hidden');
        btnText.innerText = type === 'register' ? "Create Account" : "Sign In";
        alert(e.message);
    });
};

// Manual Button Triggers
document.getElementById('registerBtn').onclick = () => window.handleAuth('register');
document.getElementById('loginBtn').onclick = () => window.handleAuth('login');

// 5. FORGOT PASSWORD LISTENER
forgotPassLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    if (!email) return alert("Enter your email first!");

    auth.sendPasswordResetEmail(email)
        .then(() => alert("Reset link sent to " + email))
        .catch(err => alert(err.message));
});

// 6. LOGOUT LOGIC
roleBtn.onclick = () => {
    localStorage.removeItem('userRole');
    auth.signOut();
};

// 7. DATA FEED (The Real-Time Engine)
function setupRealtimeFeed() {
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
                
                const deleteBtn = (userRole === 'teacher') 
                    ? `<button onclick="deleteMsg('${id}')" class="delete-btn">Delete</button>` 
                    : '';

                container.insertAdjacentHTML('beforeend', `
                    <div class="card">
                        <small>Update • ${time}</small>
                        <p>${data.text}</p>
                        ${deleteBtn}
                    </div>
                `);
            });
        });
}

// 8. SEND MESSAGE LISTENER (With Photo Upload Support)
const imgInput = document.getElementById('imgInput');

sendBtn.addEventListener('click', async () => {
    const text = msgInput.value.trim();
    const file = imgInput.files[0];
    
    if (text || file) {
        sendBtn.disabled = true;
        sendBtn.innerText = "Uploading...";

        let imageUrl = null;

        try {
            // 1. If there's a photo, upload it to Firebase Storage
            if (file) {
                const storageRef = firebase.storage().ref('images/' + Date.now() + "_" + file.name);
                const snapshot = await storageRef.put(file);
                imageUrl = await snapshot.ref.getDownloadURL();
            }

            // 2. Save everything to Firestore
            await db.collection("announcements").add({
                text: text,
                image: imageUrl, // Stores the link to the photo
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. UI Success Feedback
            sendBtn.innerHTML = "✓ Sent!";
            msgInput.value = "";
            imgInput.value = ""; // Clear the file picker
            
            setTimeout(() => {
                sendBtn.disabled = false;
                sendBtn.innerHTML = "Broadcast to Parents";
            }, 2000);

        } catch (error) {
            console.error(error);
            alert("Upload failed: " + error.message);
            sendBtn.disabled = false;
            sendBtn.innerText = "Broadcast to Parents";
        }
    }
});

// 9. GLOBAL DELETE FUNCTION
window.deleteMsg = (id) => {
    if(confirm("Permanently delete this?")) {
        db.collection("announcements").doc(id).delete();
    }
};

// 10. UI UTILITY
function applyRoleUI() {
    if (userRole === 'teacher') {
        teacherTools.classList.remove('hidden');
        roleBtn.innerText = "Logout (Teacher)";
    } else {
        teacherTools.classList.add('hidden');
        roleBtn.innerText = "Logout (Parent)";
    }

}

// 11. CHARACTER COUNTER LOGIC
msgInput.addEventListener('input', () => {
const length = msgInput.value.length;
const counter = document.getElementById('charCounter');
counter.innerText = length + " / 280";
if (length > 280) {
counter.style.color = "red";
sendBtn.disabled = true;
} else {
counter.style.color = "#888";
sendBtn.disabled = false;
}
});

