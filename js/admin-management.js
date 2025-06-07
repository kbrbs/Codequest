import { 
    EmailAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    reauthenticateWithCredential,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    collection, 
    doc,
    getDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    setDoc,
    updateDoc,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth, db } from './firebase-config.js';
import { deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize EmailJS - make sure this matches your EmailJS account
const EMAILJS_SERVICE_ID = "service_fxw9h0p";
const EMAILJS_TEMPLATE_ID = "template_dqnybw8";
const EMAILJS_PUBLIC_KEY = "prrfmOdZMuRUcna22";

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
            window.location.href = '../index.html';
        }
    });
});

// Check if the user is a Super Admin
async function checkUserRole(userId) {
    try {
        const userDocRef = doc(db, 'admins', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().role === 'Super Admin') {
            // User is a Super Admin, load admins
            loadAdmins();
        } else {
            // User is not a Super Admin, redirect to dashboard
            window.location.href = '../admin/dashboard.html';
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
        
        const adminsRef = collection(db, 'admins');
        const adminsQuery = query(adminsRef, where('role', '==', 'Admin'));
        const adminsSnapshot = await getDocs(adminsQuery);
        
        adminsTbody.innerHTML = '';
        
        if (adminsSnapshot.empty) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="7" style="text-align: center;">No admins found</td>';
            adminsTbody.appendChild(noDataRow);
        } else {
            adminsSnapshot.forEach(doc => {
                const admin = doc.data();
                const adminRow = createAdminRow(doc.id, admin);
                adminsTbody.appendChild(adminRow);
            });
        }
        
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
    
    // Status badge class - show different status for first login
    let statusClass, statusText;
    if (!admin.authAccountCreated) {
        statusClass = 'badge-intermediate';
        statusText = 'Pending First Login';
    } else if (admin.isActive) {
        statusClass = 'badge-beginner';
        statusText = 'Active';
    } else {
        statusClass = 'badge-advanced';
        statusText = 'Blocked';
    }
    
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
            ${admin.authAccountCreated ? 
                (admin.isActive ? 
                    `<button class="btn-icon delete-btn" title="Block Admin" onclick="confirmBlockAdmin('${id}')">
                        <i class="fas fa-ban"></i>
                    </button>` : 
                    `<button class="btn-icon restore-btn" title="Unblock Admin" onclick="confirmUnblockAdmin('${id}')">
                        <i class="fas fa-undo"></i>
                    </button>`
                ) :
                `<button class="btn-icon delete-btn" title="Delete Pending Admin" onclick="confirmDeletePendingAdmin('${id}')">
                    <i class="fas fa-trash"></i>
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
        
        // Get admin data using v9 syntax
        const adminDocRef = doc(db, 'admins', adminId);
        const adminDoc = await getDoc(adminDocRef);
        
        if (adminDoc.exists()) {
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

// Add admin function - FIXED VERSION
async function addAdmin() {
    const adminId = document.getElementById('admin-id').value;
    const name = document.getElementById('admin-name').value.trim();
    const email = document.getElementById('admin-email').value.trim();
    const superAdminPassword = document.getElementById('super-admin-password').value;
    
    if (!name || !email || !superAdminPassword) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address.', 'error');
        return;
    }
    
    const addButton = document.getElementById('add-admin-btn');
    addButton.disabled = true;
    addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    
    const currentUser = auth.currentUser;
    
    try {
        // Step 1: Re-authenticate super admin
        const credential = EmailAuthProvider.credential(currentUser.email, superAdminPassword);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Step 2: Check if email already exists in Firestore
        const existingAdminQuery = query(
            collection(db, 'admins'), 
            where('email', '==', email)
        );
        const existingAdminSnapshot = await getDocs(existingAdminQuery);
        
        if (!existingAdminSnapshot.empty) {
            showAlert('An admin with this email already exists.', 'error');
            return;
        }
        
        // Step 3: Generate temporary password
        const tempPassword = generateTempPassword();
        
        // Step 4: Create admin document in Firestore using email as document ID
        const emailDocId = email.replace(/[.#$[\]]/g, '_'); // Replace invalid Firestore ID characters
        
        await setDoc(doc(db, 'admins', emailDocId), {
            adminId: adminId,
            name: name,
            email: email,
            role: 'Admin',
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid,
            tempPassword: tempPassword,
            firstLogin: true,
            authAccountCreated: false // Flag to track if Firebase Auth account exists
        });
        
        // Step 5: Log the action
        await addDoc(collection(db, 'admin_logs'), {
            action: 'create_admin_record',
            adminEmail: email,
            performedBy: currentUser.uid,
            performedByEmail: currentUser.email,
            timestamp: serverTimestamp(),
            note: 'Admin record created, Firebase Auth account will be created on first login'
        });
        
        // Step 6: Send email with credentials
        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(
                    EMAILJS_SERVICE_ID,
                    EMAILJS_TEMPLATE_ID,
                    {
                        email: email,
                        name: name,
                        passcode: tempPassword
                    },
                    EMAILJS_PUBLIC_KEY
                );
                console.log('Email sent successfully');
            } else {
                console.warn('EmailJS not loaded, skipping email');
                showAlert(`Admin ${name} added successfully. Temporary password: ${tempPassword}`, 'success');
            }
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            showAlert(`Admin ${name} added successfully, but email failed to send. Temporary password: ${tempPassword}`, 'warning');
        }
        
        // Step 7: Close modal and reload
        closeAddModal();
        if (!showAlert.toString().includes('Temporary password')) {
            showAlert(`Admin ${name} added successfully. Login credentials sent via email.`, 'success');
        }
        loadAdmins();
        
    } catch (error) {
        console.error('Error adding admin:', error);
        
        let errorMessage = 'Error adding admin: ';
        
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage += 'Incorrect Super Admin password.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAlert(errorMessage, 'error');
        
    } finally {
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
        const currentUser = auth.currentUser;
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            superAdminPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        
        const adminDocRef = doc(db, 'admins', currentAdminId);
        await updateDoc(adminDocRef, {
            name: name,
            updatedAt: serverTimestamp(),
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
        const currentUser = auth.currentUser;
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            superAdminPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        
        // Get admin data to log
        const adminDocRef = doc(db, 'admins', currentAdminId);
        const adminDoc = await getDoc(adminDocRef);
        const adminData = adminDoc.data();
        
        // Update admin status in Firestore
        await updateDoc(adminDocRef, {
            isActive: false,
            blockedAt: serverTimestamp(),
            blockedBy: currentUser.uid
        });
        
        // Log the action
        await addDoc(collection(db, 'admin_logs'), {
            action: 'block_admin',
            adminId: currentAdminId,
            adminEmail: adminData.email,
            performedBy: currentUser.uid,
            performedByEmail: currentUser.email,
            timestamp: serverTimestamp()
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
        const currentUser = auth.currentUser;
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            superAdminPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        
        // Get admin data to log
        const adminDocRef = doc(db, 'admins', currentAdminId);
        const adminDoc = await getDoc(adminDocRef);
        const adminData = adminDoc.data();
        
        // Update admin status in Firestore
        await updateDoc(adminDocRef, {
            isActive: true,
            unblockedAt: serverTimestamp(),
            unblockedBy: currentUser.uid
        });
        
        // Log the action
        await addDoc(collection(db, 'admin_logs'), {
            action: 'unblock_admin',
            adminId: currentAdminId,
            adminEmail: adminData.email,
            performedBy: currentUser.uid,
            performedByEmail: currentUser.email,
            timestamp: serverTimestamp()
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

// Generate secure temporary password
function generateTempPassword() {
    // Ensure password contains:
    // - At least 6 characters
    // - At least one uppercase letter
    // - At least one lowercase letter
    // - At least one number
    // - At least one special character
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    
    // Ensure one character from each required set
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    // Fill the rest with random characters (8 more chars for total length of 12)
    for (let i = 0; i < 8; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password string
    return password.split('').sort(() => Math.random() - 0.5).join('');
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

// Function to delete pending admin (before first login)
async function confirmDeletePendingAdmin(adminId) {
    currentAdminId = adminId;
    currentAction = 'delete_pending';
    
    document.getElementById('confirmation-title').textContent = 'Delete Pending Admin';
    document.getElementById('confirmation-message').textContent = 
        'Are you sure you want to delete this pending admin? This action cannot be undone.';
    document.getElementById('confirmation-password').value = '';
    
    const confirmButton = document.getElementById('confirm-action-btn');
    confirmButton.className = 'btn btn-danger';
    confirmButton.textContent = 'Delete Admin';
    confirmButton.onclick = deletePendingAdmin;
    
    confirmationModal.style.display = 'block';
}

// Delete pending admin function
async function deletePendingAdmin() {
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
        const currentUser = auth.currentUser;
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            superAdminPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        
        // Get admin data to log
        const adminDocRef = doc(db, 'admins', currentAdminId);
        const adminDoc = await getDoc(adminDocRef);
        const adminData = adminDoc.data();
        
        // Delete the pending admin document
        await deleteDoc(adminDocRef);
        
        // Log the action
        await addDoc(collection(db, 'admin_logs'), {
            action: 'delete_pending_admin',
            adminEmail: adminData.email,
            performedBy: currentUser.uid,
            performedByEmail: currentUser.email,
            timestamp: serverTimestamp()
        });
        
        // Close modal and reload admins
        closeConfirmationModal();
        showAlert('Pending admin deleted successfully.', 'success');
        loadAdmins();
        
    } catch (error) {
        console.error('Error deleting pending admin:', error);
        
        let errorMessage = 'Error deleting pending admin.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect Super Admin password.';
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        // Re-enable button
        confirmButton.disabled = false;
        confirmButton.textContent = 'Delete Admin';
    }
}

// Add the new function to global scope
window.confirmDeletePendingAdmin = confirmDeletePendingAdmin;

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