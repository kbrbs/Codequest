// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA-rXYqdJ5ujIxWNt4PjSJh4FtDyc3hieI",
    authDomain: "codequest-2025.firebaseapp.com",
    projectId: "codequest-2025",
    storageBucket: "codequest-2025.firebasestorage.app",
    messagingSenderId: "5857953993",
    appId: "1:5857953993:web:79cc6a52b3baf9b7b52518"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// DOM elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgot-password');
const errorMessage = document.getElementById('error-message');

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    errorMessage.textContent = '';
    
    try {
        // Show loading state
        document.querySelector('.login-btn').textContent = 'LOGGING IN...';
        document.querySelector('.login-btn').disabled = true;
        
        // Sign in with Firebase
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('User logged in:', user.uid);
        
        // Check user role from Firestore
        checkUserRole(user.uid);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific error codes
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage.textContent = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage.textContent = 'Incorrect password.';
                break;
            case 'auth/invalid-email':
                errorMessage.textContent = 'Invalid email format.';
                break;
            case 'auth/too-many-requests':
                errorMessage.textContent = 'Too many failed login attempts. Try again later.';
                break;
            default:
                errorMessage.textContent = 'Login failed. Please try again.';
        }
        
        // Reset button
        document.querySelector('.login-btn').textContent = 'LOGIN';
        document.querySelector('.login-btn').disabled = false;
    }
});

// Forgot password functionality
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    if (!email) {
        errorMessage.textContent = 'Please enter your email address first.';
        return;
    }
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        errorMessage.textContent = '';
        alert(`Password reset email sent to ${email}`);
    } catch (error) {
        console.error('Password reset error:', error);
        errorMessage.textContent = 'Failed to send password reset email. Please try again.';
    }
});

// Check user role and redirect accordingly
async function checkUserRole(userId) {
    try {
        // First, check if the user is in the admins collection
        const adminDoc = await db.collection('admins').doc(userId).get();
        
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            console.log('Admin data:', adminData);
            
            // Log the login attempt
            logLoginActivity(userId, adminData.email, adminData.role);
            
            // Check role and redirect
            if (adminData.role === 'Super Admin') {
                console.log('Redirecting to super admin dashboard');
                localStorage.setItem('userRole', 'super_admin');
                window.location.href = '../superAdmin/dashboard.html';
            } else if (adminData.role === 'Admin') {
                console.log('Redirecting to admin dashboard');
                localStorage.setItem('userRole', 'admin');
                window.location.href = '../admin/dashboard.html';
            } else {
                // Default redirect for other roles
                console.log('Redirecting to default dashboard');
                localStorage.setItem('userRole', 'user');
                window.location.href = 'index.html';
            }
        } else {
            // User not found in admins collection
            console.log('User not found in admins collection');
            errorMessage.textContent = 'Access denied. You do not have admin privileges.';
            
            // Sign out the user
            await firebase.auth().signOut();
            
            // Reset button
            document.querySelector('.login-btn').textContent = 'LOGIN';
            document.querySelector('.login-btn').disabled = false;
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        errorMessage.textContent = 'Error verifying account type. Please try again.';
        
        // Reset button
        document.querySelector('.login-btn').textContent = 'LOGIN';
        document.querySelector('.login-btn').disabled = false;
    }
}

// Log login activity to Firestore
function logLoginActivity(userId, email, role) {
    try {
        db.collection('login_logs').add({
            userId: userId,
            email: email,
            role: role,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            action: 'login',
            userAgent: navigator.userAgent
        });
        console.log('Login activity logged');
    } catch (error) {
        console.error('Error logging login activity:', error);
    }
}

// Check if user is already logged in
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // User is already signed in, check role and redirect
        checkUserRole(user.uid);
    }
});