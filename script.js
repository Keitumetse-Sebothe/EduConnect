// --- SECTION 1: FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBigSfU_U7_PVbdOw0SCHO2b14T5hDxwK4",
    authDomain: "educonnect-a6c88.firebaseapp.com",
    projectId: "educonnect-a6c88",
    storageBucket: "educonnect-a6c88.firebasestorage.app",
    messagingSenderId: "700869703231",
    appId: "1:700869703231:web:650dd0cd48399027566a8a",
    measurementId: "G-LCVFHV2LRM"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- SECTION 2: ELEMENT SELECTORS ---
const authScreen = document.getElementById('auth-screen');
const teacherTools = document.getElementById('teacher-tools');
const roleBtn = document.getElementById('roleBtn');
const msgInput = document.getElementById('msgInput');
const imgUrlInput = document.getElementById('imgUrlInput');
const sendBtn = document.getElementById('sendBtn');
const sendText = document.getElementById('sendText');
const charCounter = document.getElementById('charCounter');
const forgotPassLink = document.getElementById('forgotPassLink');

// --- SECTION 3: DROP-DOWN AUTOMATION ---
function populateGrades(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = ""; 
    for (let i = 1; i <= 12; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = "Grade " + i;
        select.appendChild(opt);
    }
}
// Run immediately
populateGrades('gradeSelect'); // Teacher section
populateGrades('regGrade');    // Registration section

// --- SECTION 4: AUTHENTICATION WATCHER ---
auth.onAuthStateChanged(user => {
    const searchContainer = document.getElementById('search-container');
    
    if (user) {
        // USER LOGGED IN
        authScreen.style.display = 'none';
        
        // Show the search bar now that we are inside the app
        if (searchContainer) searchContainer.classList.remove('hidden');
        
        applyRoleUI();
        setupRealtimeFeed();
    } else {
        // USER LOGGED OUT
        authScreen.style.display = 'flex';
        
        // Hide the search bar again when logged out
        if (searchContainer) searchContainer.classList.add('hidden');
        
        const feed = document.getElementById('announcements-container');
        if (feed) feed.innerHTML = "";
    }
});

// --- SECTION 5: LOGIN & REGISTRATION ---
window.handleAuth = (type) => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    const userRole = document.getElementById('roleSelect').value;
    
    // Capture Grade/Class for Parents
    const g = document.getElementById('regGrade').value;
    const c = document.getElementById('regClass').value;
    const userClass = `Grade ${g}${c}`;

    if (!email || !pass) return alert("Fields cannot be empty.");

    localStorage.setItem('userRole', userRole);
    localStorage.setItem('userClass', userClass);

    const authAction = type === 'register' 
        ? auth.createUserWithEmailAndPassword(email, pass) 
        : auth.signInWithEmailAndPassword(email, pass);

    authAction.catch(e => alert(e.message));
};

document.getElementById('registerBtn').onclick = () => window.handleAuth('register');
document.getElementById('loginBtn').onclick = () => window.handleAuth('login');

// --- SECTION 6: LOGOUT LOGIC ---
roleBtn.onclick = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userClass');
    auth.signOut();
};

// --- SECTION 7: PASSWORD RESET ---
forgotPassLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    if (!email) return alert("Enter email first!");
    auth.sendPasswordResetEmail(email).then(() => alert("Email sent!"));
});

// --- SECTION 8: REAL-TIME DATA FEED (Privacy Filtered) ---
function setupRealtimeFeed() {
    const container = document.getElementById('announcements-container');
    const userRole = localStorage.getItem('userRole');
    const userClass = localStorage.getItem('userClass');

    if (!container) return;

    let query = db.collection("announcements");

    // Parent Privacy Filter: Only show posts matching their child's class
    if (userRole === 'parent' && userClass) {
        query = query.where("category", "==", userClass);
    }

    query.orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {
            container.innerHTML = "";
            snapshot.forEach(doc => {
                const data = doc.data();
                const id = doc.id;
                const time = data.timestamp ? data.timestamp.toDate().toLocaleString() : "Just now";
                const imageTag = data.image ? `<img src="${data.image}" class="feed-img">` : '';
                const likes = data.likes || 0;
                
                const deleteBtn = (userRole === 'teacher') 
                    ? `<button onclick="deleteMsg('${id}')" class="delete-btn">Delete</button>` : '';

                container.insertAdjacentHTML('beforeend', `
                    <div class="card">
                        <div class="card-header">
                            <span class="badge">${data.category}</span>
                            <small>${time}</small>
                        </div>
                        <p>${data.text}</p>
                        ${imageTag}
                        <div class="card-footer">
                            <button onclick="likeMsg('${id}', ${likes})" class="like-btn">❤️ <span>${likes}</span></button>
                            ${deleteBtn}
                        </div>
                    </div>
                `);
            });
        }, error => { console.error("Index required! Check console log for link."); });
}

// --- SECTION 9: BROADCAST MESSAGE (Teacher Only) ---
sendBtn.addEventListener('click', async () => {
    const text = msgInput.value.trim();
    const imageUrl = imgUrlInput.value.trim();
    const grade = document.getElementById('gradeSelect').value;
    const letter = document.getElementById('classSelect').value;
    const fullCategory = `Grade ${grade}${letter}`;
    
    if (text || imageUrl) {
        sendBtn.disabled = true;
        sendText.innerText = "Posting...";

        try {
            await db.collection("announcements").add({
                text: text,
                image: imageUrl,
                category: fullCategory,
                likes: 0,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            sendBtn.style.backgroundColor = "#28a745"; 
            sendText.innerHTML = "✓ Sent!";
            msgInput.value = "";
            imgUrlInput.value = "";
            
            setTimeout(() => {
                sendBtn.disabled = false;
                sendBtn.style.backgroundColor = ""; 
                sendText.innerHTML = "Broadcast to Parents";
            }, 2000);
        } catch (error) {
            alert("Error sending!");
            sendBtn.disabled = false;
        }
    }
});

// --- SECTION 10: LIKE FUNCTIONALITY ---
window.likeMsg = async (id, currentLikes) => {
    await db.collection("announcements").doc(id).update({ likes: currentLikes + 1 });
};

// --- SECTION 11: DELETE FUNCTIONALITY ---
window.deleteMsg = (id) => {
    if(confirm("Delete this post?")) {
        db.collection("announcements").doc(id).delete();
    }
};

// --- SECTION 12: UI UTILITY (Character Counter & Role View) ---
function applyRoleUI() {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'teacher') {
        teacherTools.classList.remove('hidden');
        roleBtn.innerText = "Logout (Teacher)";
    } else {
        teacherTools.classList.add('hidden');
        roleBtn.innerText = `Logout (${localStorage.getItem('userClass')})`;
    }
}

msgInput.addEventListener('input', () => {
    charCounter.innerText = `${msgInput.value.length} / 280`;
});

/* --- SECTION 13: SEARCH FUNCTIONALITY --- */
const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        const text = card.querySelector('p').innerText.toLowerCase();
        // If the text includes the search term, show it; otherwise, hide it
        if (text.includes(term)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
});
