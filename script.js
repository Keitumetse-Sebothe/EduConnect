/* ==========================================================================
   EDUCONNECT - COMPLETE STABLE SCRIPT (Wednesday Final)
   ========================================================================== */

// --- 1. INITIALIZATION & THEME MEMORY ---
const savedTheme = localStorage.getItem('theme');
const bodyElement = document.body;

if (savedTheme === 'dark') {
    bodyElement.classList.add('dark-theme');
}

// --- 2. FIREBASE CONFIGURATION ---
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

// --- 3. ELEMENT SELECTORS ---
const authScreen = document.getElementById('auth-screen');
const teacherTools = document.getElementById('teacher-tools');
const roleBtn = document.getElementById('roleBtn');
const msgInput = document.getElementById('msgInput');
const imgUrlInput = document.getElementById('imgUrlInput');
const sendBtn = document.getElementById('sendBtn');
const sendText = document.getElementById('sendText');
const charCounter = document.getElementById('charCounter');
const forgotPassLink = document.getElementById('forgotPassLink');
const settingsToggle = document.getElementById('settingsToggle');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('closeSettings');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const teacherToggle = document.getElementById('toggleTeacherTools');

// Set toggle state on load
if (darkModeToggle && savedTheme === 'dark') darkModeToggle.checked = true;

// --- 4. DROP-DOWN AUTOMATION ---
function populateGrades(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = ""; 
    
    let optR = document.createElement('option');
    optR.value = "R";
    optR.innerHTML = "Grade R";
    select.appendChild(optR);

    for (let i = 1; i <= 12; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = "Grade " + i;
        select.appendChild(opt);
    }
}
populateGrades('gradeSelect');
populateGrades('regGrade');

// --- 5. AUTHENTICATION WATCHER ---
auth.onAuthStateChanged(user => {
    const searchContainer = document.getElementById('search-container');
    if (user) {
        authScreen.style.display = 'none';
        if (searchContainer) searchContainer.classList.remove('hidden');
        setupRealtimeFeed();
    } else {
        authScreen.style.display = 'flex';
        if (searchContainer) searchContainer.classList.add('hidden');
        const feed = document.getElementById('announcements-container');
        if (feed) feed.innerHTML = "";
    }
});

// --- 6. LOGIN & REGISTRATION ---
window.handleAuth = (type) => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    const userRole = document.getElementById('roleSelect').value;
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

// --- 7. LOGOUT & PASSWORD RESET ---
roleBtn.onclick = () => {
    localStorage.clear();
    auth.signOut();
};

forgotPassLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    if (!email) return alert("Enter email first!");
    auth.sendPasswordResetEmail(email).then(() => alert("Email sent!"));
});

// --- 8. REAL-TIME DATA FEED ---
function setupRealtimeFeed() {
    const container = document.getElementById('announcements-container');
    const userRole = localStorage.getItem('userRole');
    const userClass = localStorage.getItem('userClass');

    if (!container) return;

    let query = db.collection("announcements");

    if (userRole === 'parent' && userClass) {
        query = query.where("category", "==", userClass);
    }

    query.orderBy("timestamp", "desc").onSnapshot(snapshot => {
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
    });
}

// --- 9. TEACHER BROADCAST ---
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
                text: text, image: imageUrl, category: fullCategory,
                likes: 0, timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            sendText.innerHTML = "✓ Sent!";
            msgInput.value = ""; imgUrlInput.value = "";
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

// --- 10. LIKE & DELETE ---
window.likeMsg = (id, currentLikes) => {
    db.collection("announcements").doc(id).update({ likes: currentLikes + 1 });
};
window.deleteMsg = (id) => {
    if (confirm("Are you sure?")) db.collection("announcements").doc(id).delete();
};

// --- 11. SETTINGS & UI UTILITY ---

// Open Modal
if (settingsToggle) {
    settingsToggle.onclick = () => {
        const role = localStorage.getItem('userRole') || 'User';
        const uClass = localStorage.getItem('userClass') || 'N/A';

        document.getElementById('displayRole').innerText = role;
        document.getElementById('displayClass').innerText = uClass;

        const teacherRow = document.getElementById('teacher-only-setting');
        if (teacherRow) {
            teacherRow.style.display = (role.toLowerCase() === 'teacher') ? 'flex' : 'none';
        }
        settingsModal.classList.remove('hidden');
    };
}

// Close Modal logic
const hideSettings = () => settingsModal.classList.add('hidden');
if (closeSettings) closeSettings.onclick = hideSettings;
if (saveSettingsBtn) saveSettingsBtn.onclick = hideSettings;
window.onclick = (e) => { if (e.target == settingsModal) hideSettings(); };

// Dark Mode Toggle Logic
if (darkModeToggle) {
    darkModeToggle.onchange = (e) => {
        if (e.target.checked) {
            bodyElement.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            bodyElement.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    };
}

// Teacher Tools Toggle Logic
if (teacherToggle) {
    teacherToggle.onchange = (e) => {
        if (teacherTools) {
            if (e.target.checked) teacherTools.classList.remove('hidden');
            else teacherTools.classList.add('hidden');
        }
    };
}

// --- 12. SEARCH LOGIC ---
const searchInp = document.getElementById('searchInput');
if (searchInp) {
    searchInp.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            const text = card.querySelector('p').innerText.toLowerCase();
            card.style.display = text.includes(term) ? "block" : "none";
        });
    });
}
