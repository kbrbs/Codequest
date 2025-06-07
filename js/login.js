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

        // Use handleLogin function to handle both first login and regular login
        const result = await handleLogin(email, password);

        if (result.success) {
            console.log('User logged in:', result.user.uid);
            // Check user role from Firestore
            checkUserRole(result.user.uid);
        }

    } catch (error) {
        console.error('Login error:', error);

        // Handle specific error codes
        switch (error.code) {
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
            case 'auth/email-already-in-use':
                errorMessage.textContent = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                errorMessage.textContent = 'Password is too weak.';
                break;
            case 'invalid-credentials':
                errorMessage.textContent = 'Invalid email or password.';
                break;
            case 'admin-not-found':
                errorMessage.textContent = 'No admin account found with this email.';
                break;
            case 'admin-blocked':
                errorMessage.textContent = 'Your admin account has been blocked. Contact the Super Admin.';
                break;
            default:
                errorMessage.textContent = error.message || 'Login failed. Please try again.';
        }

        // Reset button
        document.querySelector('.login-btn').textContent = 'LOGIN';
        document.querySelector('.login-btn').disabled = false;
    }
});

// Handle login - supports both first login and regular login
async function handleLogin(email, password) {
    try {
        console.log('Starting login process for:', email);

        // Step 1: Check if there's a pending admin record with this email (first login)
        // Try multiple document ID formats
        // let emailDocId = email; // First try with original email
        
        let emailDocId = email.replace(/[.#$[\]]/g, '_');
        console.log('Checking for pending admin with document ID:', emailDocId);

        // Add error handling for the Firestore get() operation
        let pendingAdminDoc = null;
        let pendingAdminRef = null;

        try {
            // First attempt: original email
            pendingAdminRef = db.collection('admins').doc(emailDocId);
            console.log('Attempting to get document with original email...');
            pendingAdminDoc = await pendingAdminRef.get();

            console.log('Document retrieved, checking if it exists...');
            console.log('Document object:', pendingAdminDoc);
            console.log('Document exists method:', typeof pendingAdminDoc._delegate.exists);

            // Verify that pendingAdminDoc is a valid DocumentSnapshot
            if (!pendingAdminDoc || typeof pendingAdminDoc._delegate.exists !== 'function') {
                console.error('Invalid document snapshot received:', pendingAdminDoc);
                throw new Error('Invalid document snapshot');
            }

            console.log('Document exists:', pendingAdminDoc._delegate.exists);

            // If document doesn't exist with original email, try with dot replaced by underscore
            if (!pendingAdminDoc._delegate.exists) {
                console.log('Document not found with original email, trying with dot as underscore');
                emailDocId = email.replace('.com', '_com');
                console.log('Trying with document ID:', emailDocId);
                pendingAdminRef = db.collection('admins').doc(emailDocId);
                pendingAdminDoc = await pendingAdminRef.get();

                if (!pendingAdminDoc || typeof pendingAdminDoc._delegate.exists !== 'function') {
                    console.error('Invalid document snapshot received on second attempt:', pendingAdminDoc);
                    throw new Error('Invalid document snapshot');
                }

                console.log('Second attempt - Document exists:', pendingAdminDoc._delegate.exists);
            }

            // If still not found, try full sanitization
            if (!pendingAdminDoc._delegate.exists) {
                console.log('Document not found with dot as underscore, trying full sanitization');
                // emailDocId = email.replace(/[.#$[\]]/g, '_');
                console.log('Trying with fully sanitized document ID:', emailDocId);
                pendingAdminRef = db.collection('admins').doc(emailDocId);
                pendingAdminDoc = await pendingAdminRef.get();

                if (!pendingAdminDoc || typeof pendingAdminDoc._delegate.exists !== 'function') {
                    console.error('Invalid document snapshot received on third attempt:', pendingAdminDoc);
                    throw new Error('Invalid document snapshot');
                }

                console.log('Third attempt - Document exists:', pendingAdminDoc._delegate.exists);
            }

        } catch (firestoreError) {
            console.error('Error getting Firestore document:', firestoreError);
            console.error('Error details:', {
                message: firestoreError.message,
                code: firestoreError.code,
                stack: firestoreError.stack
            });

            // Try to proceed with regular login if Firestore check fails
            console.log('Firestore check failed, attempting regular login');
            try {
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                console.log('Regular login successful after Firestore error');
                return { success: true, user: userCredential.user };
            } catch (authError) {
                console.error('Regular login also failed:', authError);
                throw authError;
            }
        }

        console.log('Document exists check completed');

        if (pendingAdminDoc && pendingAdminDoc._delegate.exists) {
            const adminData = pendingAdminDoc.data();
            console.log('Pending admin data found:', adminData);
            console.log('Admin data found:', { firstLogin: adminData?.firstLogin, email: adminData?.email });
            if (!adminData?.firstLogin) {
                console.warn('Missing or false firstLogin flag');
            }
            if (!adminData?.email) {
                console.warn('Missing email field in admin document');
            }
            if (!adminData?.tempPassword) {
                console.warn('Missing tempPassword field in admin document');
            }

            if (adminData && adminData.firstLogin) {
                // This is a first login attempt
                console.log('First login attempt detected');
                return await handleFirstLogin(email, password, pendingAdminDoc);
            } else {
                console.log('Admin document exists but not first login, proceeding with regular login');
            }
        }

        // Regular login flow for existing users
        console.log('Attempting regular login');
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            console.log('Regular login successful');
            return { success: true, user: userCredential.user };
        } catch (authError) {
            console.error('Firebase Auth error:', authError);
            throw authError;
        }

    } catch (error) {
        console.error('Error during login:', error);
        throw error;
    }
}

// Handle first login - create Firebase Auth account and migrate document
async function handleFirstLogin(email, password, pendingAdminDoc) {
    try {
        console.log('Starting first login process');

        const adminData = pendingAdminDoc.data();

        // Step 1: Check if admin account is active
        if (!adminData.isActive) {
            const error = new Error('Your admin account has been blocked. Contact the Super Admin.');
            error.code = 'admin-blocked';
            throw error;
        }

        // Step 2: Verify the temporary password
        if (password !== adminData.tempPassword) {
            const error = new Error('Invalid credentials');
            error.code = 'invalid-credentials';
            throw error;
        }

        console.log('Temporary password verified, creating Firebase Auth account...');

        // Step 3: Create Firebase Auth account
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;

        console.log('Firebase Auth account created:', newUser.uid);

        // Step 4: Create new document with UID as ID
        await db.collection('admins').doc(newUser.uid).set({
            ...adminData,
            firstLogin: false,
            authAccountCreated: true,
            authAccountCreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            uid: newUser.uid // Add UID to the document
        });

        console.log('Admin document migrated to UID-based ID');

        // Step 5: Delete the old email-based document
        await pendingAdminDoc.ref.delete();

        console.log('Old email-based document deleted');

        // Step 6: Log the successful account creation
        await db.collection('admin_logs').add({
            action: 'first_login_complete',
            adminId: newUser.uid,
            adminEmail: email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            note: 'Firebase Auth account created and document migrated to UID-based ID'
        });

        console.log('First login completed successfully');

        return { success: true, user: newUser };

    } catch (error) {
        console.error('Error during first login:', error);

        // If Firebase Auth account was created but document migration failed,
        // we should clean up the auth account
        if (error.code !== 'invalid-credentials' && error.code !== 'admin-blocked') {
            try {
                const currentUser = firebase.auth().currentUser;
                if (currentUser && currentUser.email === email) {
                    await currentUser.delete();
                    console.log('Cleaned up partially created auth account');
                }
            } catch (cleanupError) {
                console.error('Error cleaning up auth account:', cleanupError);
            }
        }

        throw error;
    }
}

// Forgot password functionality
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        errorMessage.textContent = 'Please enter your email address first.';
        return;
    }

    try {
        // First check if this is a pending admin (first login not completed)
        // Try multiple document ID formats
        let emailDocId = email;
        let pendingAdminRef = db.collection('admins').doc(emailDocId);
        let pendingAdminDoc = await pendingAdminRef.get();

        // If document doesn't exist with original email, try with dot replaced by underscore
        if (!pendingAdminDoc._delegate.exists) {
            emailDocId = email.replace('.com', '_com');
            pendingAdminRef = db.collection('admins').doc(emailDocId);
            pendingAdminDoc = await pendingAdminRef.get();
        }

        // If still not found, try full sanitization
        if (!pendingAdminDoc._delegate.exists) {
            emailDocId = email.replace(/[.#$[\]]/g, '_');
            pendingAdminRef = db.collection('admins').doc(emailDocId);
            pendingAdminDoc = await pendingAdminRef.get();
        }

        if (pendingAdminDoc._delegate.exists() && pendingAdminDoc.data().firstLogin) {
            errorMessage.textContent = 'Please complete your first login using the temporary password sent to your email.';
            return;
        }

        // Proceed with regular password reset for existing users
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
        // Check if the user is in the admins collection
        const adminDoc = await db.collection('admins').doc(userId).get();

        if (adminDoc._delegate.exists) {
            const adminData = adminDoc.data();
            console.log('Admin data:', adminData);

            // Check if admin account is active
            if (!adminData.isActive) {
                errorMessage.textContent = 'Your admin account has been blocked. Contact the Super Admin.';

                // Sign out the user
                await firebase.auth().signOut();

                // Reset button
                document.querySelector('.login-btn').textContent = 'LOGIN';
                document.querySelector('.login-btn').disabled = false;
                return;
            }

            // Log the login attempt
            logLoginActivity(userId, adminData.email, adminData.role);

            // Check role and redirect
            if (adminData.role === 'Super Admin') {
                console.log('Redirecting to super admin dashboard');
                localStorage.setItem('userRole', 'super_admin');
                window.location.href = 'superAdmin/dashboard.html';
            } else if (adminData.role === 'Admin') {
                console.log('Redirecting to admin dashboard');
                localStorage.setItem('userRole', 'admin');
                window.location.href = 'admin/dashboard.html';
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