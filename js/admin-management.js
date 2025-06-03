// Admin Management JavaScript

// Initialize Firebase from the config
const firebaseConfig = {
    apiKey: "AIzaSyA-rXYqdJ5ujIxWNt4PjSJh4FtDyc3hieI",
    authDomain: "codequest-2025.firebaseapp.com",
    projectId: "codequest-2025",
    storageBucket: "codequest-2025.firebasestorage.app",
    messagingSenderId: "5857953993",
    appId: "1:5857953993:web:79cc6a52b3baf9b7b52518"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// References to Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loadingElement = document.getElementById('loading');
const adminsTable = document.getElementById('admins-table');
const adminsTbody = document.getElementById('admins-tbody');

// Modal Elements
const addAdminModal = document.getElementById('addAdminModal');
const editAdminModal = document.getElementById('editAdminModal');
const confirmationModal = document.getElementById('confirmationModal');
const alertElement = document.getElementById('alert');

// Current admin being edited or deleted
let currentAdminId = null;
let currentAction = null;

// Check if user is authenticated and is a Super Admin
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            checkUserRole(user.uid);
        } else {
            // Redirect to login page if not authenticated
            window.location.href = 'login.html';
        }
    });
});

// Check if the user is a Super Admin
async function checkUserRole(userId) {
    try {
        const userDoc = await db.collection('admins').doc(userId).get();
        
        if (userDoc.exists && userDoc.data().role === 'Super Admin') {
            // User is a Super Admin, load admins
            loadAdmins();
        } else {
            // User is not a Super Admin, redirect to dashboard
            showAlert('Access denied. You do not have Super Admin privileges.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        showAlert('Error verifying your access level.', 'error');
    }
}

// Load all admins from Firestore
async function loadAdmins() {
    try {
        loadingElement.style.display = 'block';
        adminsTable.style.display = 'none';
        
        const adminsSnapshot = await db.collection('admins').get();
        
        // Clear existing rows
        adminsTbody.innerHTML = '';
        
        if (adminsSnapshot.empty) {
            // No admins found
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="7" style="text-align: center;">No admins found</td>';
            adminsTbody.appendChild(noDataRow);
        } else {
            // Add each admin to the table
            adminsSnapshot.forEach(doc => {
                const admin = doc.data();
                const adminRow = createAdminRow(doc.id, admin);
                adminsTbody.appendChild(adminRow);
            });
        }
        
        // Hide loading and show table
        loadingElement.style.display = 'none';
        adminsTable.style.display = 'table';
        
    } catch (error) {
        console.error('Error loading admins:', error);
        showAlert('Error loading admins. Please try again.', 'error');
        loadingElement.style.display = 'none';
    }
}

// Create a table row for an admin
function createAdminRow(id, admin) {
    const row = document.createElement('tr');
    
    // Format date
    const createdAt = admin.createdAt ? new Date(admin.createdAt.toDate()).toLocaleDateString() : 'N/A';
    
    // Status badge class
    const statusClass = admin.isActive ? 'badge-beginner' : 'badge-advanced';
    const statusText = admin.isActive ? 'Active' : 'Blocked';
    
    row.innerHTML = `
        <td>${admin.adminId || 'N/A'}</td>
        <td>${admin.name}</td>
        <td>${admin.email}</td>
        <td>${admin.role}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${createdAt}</td>
        <td class="action-buttons" style="text-align: right;">
            <button class="btn-icon edit-btn" title="Edit Admin" onclick="openEditModal('${id}')">
                <i class="fas fa-edit"></i>
            </button>
            ${admin.isActive ? 
                `<button class="btn-icon delete-btn" title="Block Admin" onclick="confirmBlockAdmin('${id}')">
                    <i class="fas fa-ban"></i>
                </button>` : 
                `<button class="btn-icon restore-btn" title="Unblock Admin" onclick="confirmUnblockAdmin('${id}')">
                    <i class="fas fa-undo"></i>
                </button>`
            }
        </td>
    `;
    
    return row;
}

// Generate Admin ID
function generateAdminId() {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 900) + 100; // 3-digit random number
    return `ADM${year}${randomNum}`;
}

// Open Add Admin Modal
function openAddModal() {
    // Generate and set Admin ID
    document.getElementById('admin-id').value = generateAdminId();
    
    // Clear form fields
    document.getElementById('admin-name').value = '';
    document.getElementById('admin-email').value = '';
    document.getElementById('super-admin-password').value = '';
    
    // Show modal
    addAdminModal.style.display = 'block';
}

// Close Add Admin Modal
function closeAddModal() {
    addAdminModal.style.display = 'none';
}

// Open Edit Admin Modal
async function openEditModal(adminId) {
    try {
        currentAdminId = adminId;
        
        // Get admin data
        const adminDoc = await db.collection('admins').doc(adminId).get();
        
        if (adminDoc.exists) {
            const admin = adminDoc.data();
            
            // Fill form fields
            document.getElementById('edit-admin-uid').value = adminId;
            document.getElementById('edit-admin-id').value = admin.adminId || 'N/A';
            document.getElementById('edit-admin-name').value = admin.name || '';
            document.getElementById('edit-admin-email').value = admin.email || '';
            document.getElementById('edit-super-admin-password').value = '';
            
            // Show modal
            editAdminModal.style.display = 'block';
        } else {
            showAlert('Admin not found.', 'error');
        }
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showAlert('Error loading admin details.', 'error');
    }
}

// Close Edit Admin Modal
function closeEditModal() {
    editAdminModal.style.display = 'none';
    currentAdminId = null;
}

// Add new admin
async function addAdmin() {
    // Get form values
    const adminId = document.getElementById('admin-id').value;
    const name = document.getElementById('admin-name').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const superAdminPassword = document.getElementById('super-admin-password').value;
    
    // Validate form
    if (!name || !email || !superAdminPassword) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }
    
    // Disable button to prevent multiple submissions
    const addButton = document.getElementById('add-admin-btn');
    addButton.disabled = true;
    addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    
    try {
        // Re-authenticate current user to verify password
        const currentUser = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            superAdminPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Create new user in Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, generateTempPassword());
        const newUserId = userCredential.user.uid;
        
        // Send password reset email
        await auth.sendPasswordResetEmail(email);
        
        // Add admin to Firestore
        await db.collection('admins').doc(newUserId).set({
            adminId: adminId,
            name: name,
            email: email,
            role: 'Admin',
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        
        // Close modal and reload admins
        closeAddModal();
        showAlert(`Admin ${name} added successfully. Password reset email sent.`, 'success');
        loadAdmins();
        
    } catch (error) {
        console.error('Error adding admin:', error);
        
        let errorMessage = 'Error adding admin.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect Super Admin password.';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email is already in use.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak.';
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        // Re-enable button
        addButton.disabled = false;
        addButton.innerHTML = 'Add Admin';
    }
}

// Update admin
async function updateAdmin() {
    if (!currentAdminId) return;
    
    // Get form values
    const name = document.getElementById('edit-admin-name').value.trim();
    const superAdminPassword = document.getElementById('edit-super-admin-password').value;
    
    // Validate form
    if (!name || !superAdminPassword) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }
    
    // Disable button to prevent multiple submissions
    const editButton = document.getElementById('edit-admin-btn');
    editButton.disabled = true;
    editButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        // Re-authenticate current user to verify password
        const currentUser = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            superAdminPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Update admin in Firestore
        await db.collection('admins').doc(currentAdminId).update({
            name: name,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        // Close modal and reload admins
        closeEditModal();
        showAlert('Admin updated successfully.', 'success');
        loadAdmins();
        
    } catch (error) {
        console.error('Error updating admin:', error);
        
        let errorMessage = 'Error updating admin.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect Super Admin password.';
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        // Re-enable button
        editButton.disabled = false;
        editButton.innerHTML = 'Update Admin';
    }
}

// Confirm block admin
function confirmBlockAdmin(adminId) {
    currentAdminId = adminId;
    currentAction = 'block';
    
    document.getElementById('confirmation-title').textContent = 'Block Admin';
    document.getElementById('confirmation-message').textContent = 
        'Are you sure you want to block this admin? They will no longer be able to access the system.';
    document.getElementById('confirmation-password').value = '';
    
    const confirmButton = document.getElementById('confirm-action-btn');
    confirmButton.className = 'btn btn-danger';
    confirmButton.textContent = 'Block Admin';
    confirmButton.onclick = blockAdmin;
    
    confirmationModal.style.display = 'block';
}

// Confirm unblock admin
function confirmUnblockAdmin(adminId) {
    currentAdminId = adminId;
    currentAction = 'unblock';
    
    document.getElementById('confirmation-title').textContent = 'Unblock Admin';
    document.getElementById('confirmation-message').textContent = 
        'Are you sure you want to unblock this admin? They will regain access to the system.';
    document.getElementById('confirmation-password').value = '';
    
    const confirmButton = document.getElementById('confirm-action-btn');
    confirmButton.className = 'btn btn-primary';
    confirmButton.textContent = 'Unblock Admin';
    confirmButton.onclick = unblockAdmin;
    
    confirmationModal.style.display = 'block';
}

// Block admin
async function blockAdmin() {
    if (!currentAdminId) return;
    
    const superAdminPassword = document.getElementById('confirmation-password').value;
    
    if (!superAdminPassword) {
        showAlert('Please enter your password for verification.', 'error');
        return;
    }
    
    const confirmButton = document.getElementById('confirm-action-btn');
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        // Re-authenticate current user to verify password
        const currentUser = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            superAdminPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Get admin data to log
        const adminDoc = await db.collection('admins').doc(currentAdminId).get();
        const adminData = adminDoc.data();
        
        // Update admin status in Firestore
        await db.collection('admins').doc(currentAdminId).update({
            isActive: false,
            blockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            blockedBy: currentUser.uid
        });
        
        // Log the action
        await db.collection('admin_logs').add({
            action: 'block_admin',
            adminId: currentAdminId,
            adminEmail: adminData.email,
            performedBy: currentUser.uid,
            performedByEmail: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Close modal and reload admins
        closeConfirmationModal();
        showAlert('Admin blocked successfully.', 'success');
        loadAdmins();
        
    } catch (error) {
        console.error('Error blocking admin:', error);
        
        let errorMessage = 'Error blocking admin.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect Super Admin password.';
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        // Re-enable button
        confirmButton.disabled = false;
        confirmButton.textContent = 'Block Admin';
    }
}

// Unblock admin
async function unblockAdmin() {
    if (!currentAdminId) return;
    
    const superAdminPassword = document.getElementById('confirmation-password').value;
    
    if (!superAdminPassword) {
        showAlert('Please enter your password for verification.', 'error');
        return;
    }
    
    const confirmButton = document.getElementById('confirm-action-btn');
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        // Re-authenticate current user to verify password
        const currentUser = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            superAdminPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Get admin data to log
        const adminDoc = await db.collection('admins').doc(currentAdminId).get();
        const adminData = adminDoc.data();
        
        // Update admin status in Firestore
        await db.collection('admins').doc(currentAdminId).update({
            isActive: true,
            unblockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            unblockedBy: currentUser.uid
        });
        
        // Log the action
        await db.collection('admin_logs').add({
            action: 'unblock_admin',
            adminId: currentAdminId,
            adminEmail: adminData.email,
            performedBy: currentUser.uid,
            performedByEmail: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Close modal and reload admins
        closeConfirmationModal();
        showAlert('Admin unblocked successfully.', 'success');
        loadAdmins();
        
    } catch (error) {
        console.error('Error unblocking admin:', error);
        
        let errorMessage = 'Error unblocking admin.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect Super Admin password.';
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        // Re-enable button
        confirmButton.disabled = false;
        confirmButton.textContent = 'Unblock Admin';
    }
}

// Close confirmation modal
function closeConfirmationModal() {
    confirmationModal.style.display = 'none';
    currentAdminId = null;
    currentAction = null;
}

// Generate a temporary password
function generateTempPassword() {
    // Generate a random 12-character password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
}

// Show alert message
function showAlert(message, type) {
    const alertElement = document.getElementById('alert');
    const alertMessage = document.getElementById('alert-message');
    
    alertElement.className = 'alert ' + type;
    alertMessage.textContent = message;
    alertElement.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        closeAlert();
    }, 5000);
}

// Close alert
function closeAlert() {
    const alertElement = document.getElementById('alert');
    alertElement.classList.add('hiding');
    
    setTimeout(() => {
        alertElement.style.display = 'none';
        alertElement.classList.remove('hiding');
    }, 300);
}

// Make functions globally available
window.openAddModal = openAddModal;
window.closeAddModal = closeAddModal;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.addAdmin = addAdmin;
window.updateAdmin = updateAdmin;
window.confirmBlockAdmin = confirmBlockAdmin;
window.confirmUnblockAdmin = confirmUnblockAdmin;
window.closeConfirmationModal = closeConfirmationModal;
window.closeAlert = closeAlert;