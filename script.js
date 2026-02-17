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

// --- SECTION 3: DROP-DOWN AUTOMATION (Includes Grade R) ---
function populateGrades(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = ""; 
    
    // Explicitly add Grade R first
    let optR = document.createElement('option');
    optR.value = "R";
    optR.innerHTML = "Grade R";
    select.appendChild(optR);

    // Loop through Grades 1 to 12
    for (let i = 1; i <= 12; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = "Grade " + i;
        select.appendChild(opt);
    }
}
populateGrades('gradeSelect');
populateGrades('regGrade');

// --- SECTION 4: AUTHENTICATION WATCHER ---
auth.onAuthStateChanged(user => {
    const searchContainer = document.getElementById('search-container');
    
    if (user) {
        authScreen.style.display = 'none';
        if (searchContainer) searchContainer.classList.remove('hidden');
        applyRoleUI();
        setupRealtimeFeed();
    } else {
        authScreen.style.display = 'flex';
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
    const g = document.getElementById('regGrade').value;
    const c = document.getElementById('regClass').value;
    const userClass = `Grade ${g}${c}`; // Consistent naming (e.g., Grade RA)

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
    localStorage.clear();
    auth.signOut();
};

// --- SECTION 7: PASSWORD RESET ---
forgotPassLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    if (!email) return alert("Enter email first!");
    auth.sendPasswordResetEmail(email).then(() => alert("Email sent!"));
});

// --- SECTION 8: REAL-TIME DATA FEED ---
function setupRealtimeFeed() {
    const container = document.getElementById('announcements-container');
    const userRole = localStorage.getItem('userRole');
    const userClass = localStorage.getItem('userClass');

    if (!container) return;

    let query = db.collection("announcements");

    // Filter by class if the user is a parent
    if (userRole === 'parent' && userClass) {
        query = query.where("category", "==", userClass);
    }

    query.orderBy("timestamp", "desc").onSnapshot(snapshot => {
        container.innerHTML = ""; // Clear feed for refresh

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Secondary security check for data integrity
            if (userRole === 'parent' && data.category !== userClass) return;

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
    });
}

// --- SECTION 9: BROADCAST MESSAGE (Teacher Only) ---
sendBtn.addEventListener('click', async () => {
    const text = msgInput.value.trim();
    const imageUrl = imgUrlInput.value.trim();
    const grade = document.getElementById('gradeSelect').value;
    const letter = document.getElementById('classSelect').value;
    const fullCategory = `Grade ${grade}${letter}`; // Matches userClass format
    
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
            sendText.innerHTML = "✓ Sent!";
            msgInput.value = "";
            imgUrlInput.value = "";
            charCounter.innerText = "0 / 280";
            setTimeout(() => {
                sendBtn.disabled = false;
                sendText.innerHTML = "Broadcast to Parents";
            }, 2000);
        } catch (error) {
            alert("Error sending announcement.");
            sendBtn.disabled = false;
        }
    }
});

// --- SECTION 10: LIKE & DELETE ---
window.likeMsg = (id, currentLikes) => {
    db.collection("announcements").doc(id).update({ likes: currentLikes + 1 });
};

window.deleteMsg = (id) => {
    if (confirm("Are you sure you want to delete this post?")) {
        db.collection("announcements").doc(id).delete();
    }
};

// --- SECTION 11: UI UTILITY ---
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

// --- SECTION 12: SEARCH ---
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const text = card.querySelector('p').innerText.toLowerCase();
        card.style.display = text.includes(term) ? "block" : "none";
    });
});
