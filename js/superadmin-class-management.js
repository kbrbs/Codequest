// Class Management JavaScript
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.2.0/firebase-app.js"
import {
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,  // Add this import
} from "https://www.gstatic.com/firebasejs/9.2.0/firebase-auth.js"
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  orderBy,
  serverTimestamp,
  query,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/9.2.0/firebase-firestore.js"

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
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// DOM Elements
const loadingElement = document.getElementById('loading');
const classesTable = document.getElementById('classes-table');
const classesTbody = document.getElementById('classes-tbody');
const searchInput = document.getElementById('search-input');

// Stats Elements
const totalClassesElement = document.getElementById('total-classes');
const totalStudentsElement = document.getElementById('total-students');
const activeClassesElement = document.getElementById('active-classes');

// Modal Elements
const addClassModal = document.getElementById('add-class-modal');
// const editClassModal = document.getElementById('edit-class-modal');
const viewStudentsModal = document.getElementById('view-students-modal');
const deleteModal = document.getElementById('delete-modal');
const alertElement = document.getElementById('alert');

// Current class being edited or deleted
let currentClassId = null;
let classes = [];
let currentUser = null;
let adminProfile = null;

// Check if user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUser = user;
            // Load admin profile first
            await loadAdminProfile();
            // User is signed in, load classes
            loadClasses();
            loadStats();
        } else {
            // User is not signed in, redirect to login page
            window.location.href = '../index.html';
        }
    });

    // Add search functionality
    searchInput.addEventListener('input', filterClasses);
});

// Load admin profile from Firestore
async function loadAdminProfile() {
    try {
        if (!currentUser) return;
        
        // Try to get admin profile from 'admins' collection
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        
        if (adminDoc.exists()) {
            adminProfile = adminDoc.data();
        } else {
            // If no admin profile, try 'users' collection
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                adminProfile = userDoc.data();
            } else {
                // Create a basic profile with email
                adminProfile = {
                    name: currentUser.displayName || currentUser.email.split('@')[0],
                    email: currentUser.email
                };
            }
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
        // Fallback profile
        adminProfile = {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email
        };
    }
}

// Load classes from Firestore (only for current admin)
async function loadClasses() {
    try {
        loadingElement.style.display = 'block';
        classesTable.style.display = 'none';
        
        // Query classes created by current admin only
        // Note: We'll sort in memory to avoid needing a composite index
        const classesQuery = query(
            collection(db, 'classes')
        );
        
        const classesSnapshot = await getDocs(classesQuery);
        
        // Clear existing rows
        classesTbody.innerHTML = '';
        classes = [];
        
        if (classesSnapshot.empty) {
            // No classes found
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="5" style="text-align: center;">No classes found</td>';
            classesTbody.appendChild(noDataRow);
        } else {
            // Add each class to the table
            classesSnapshot.forEach(docSnapshot => {
                const classData = docSnapshot.data();
                classData.id = docSnapshot.id;
                classes.push(classData);
                
                const classRow = createClassRow(classData);
                classesTbody.appendChild(classRow);
            });
        }
        
        // Hide loading and show table
        loadingElement.style.display = 'none';
        classesTable.style.display = 'table';
        
    } catch (error) {
        console.error('Error loading classes:', error);
        showAlert('Error loading classes. Please try again.', 'error');
        loadingElement.style.display = 'none';
    }
}

// Load statistics (only for current admin's classes)
async function loadStats() {
    try {
        // Get total classes for current admin
        const classesQuery = query(
            collection(db, 'classes')
        );
        const classesSnapshot = await getDocs(classesQuery);
        totalClassesElement.textContent = classesSnapshot.size;
        
        // Get active classes and total students
        let activeClasses = 0;
        let totalStudents = 0;
        
        // For each class, check if it has students
        for (const docSnapshot of classesSnapshot.docs) {
            const studentsQuery = query(collection(db, 'classes', docSnapshot.id, 'students'));
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentCount = studentsSnapshot.size;
            
            totalStudents += studentCount;
            if (studentCount > 0) {
                activeClasses++;
            }
        }
        
        activeClassesElement.textContent = activeClasses;
        totalStudentsElement.textContent = totalStudents;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Create a table row for a class
function createClassRow(classData) {
    const row = document.createElement('tr');
    
    // Format date
    const createdAt = classData.createdAt ? new Date(classData.createdAt.toDate()).toLocaleDateString() : 'N/A';
    
    // Student count
    const studentCount = classData.studentCount || 0;
    
    row.innerHTML = `
        <td>${classData.className}</td>
        <td>${classData.instructorName}</td>
        <td><span class="class-code">${classData.classCode}</span></td>
        <td>${studentCount} <span class="badge badge-primary">Students</span></td>
        <td>${createdAt}</td>
        <td class="action-buttons">
            <button class="btn-icon view" title="View Students" onclick="openViewStudentsModal('${classData.id}')">
                <i class="fas fa-users"></i>
            </button>
            <button class="btn-icon delete" title="Delete Class" onclick="openDeleteModal('${classData.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return row;
}

// Filter classes based on search input
function filterClasses() {
    const searchTerm = searchInput.value.toLowerCase();
    
    // Clear existing rows
    classesTbody.innerHTML = '';
    
    // Filter classes
    const filteredClasses = classes.filter(classData => 
        classData.className.toLowerCase().includes(searchTerm) || 
        classData.instructorName.toLowerCase().includes(searchTerm) || 
        classData.classCode.toLowerCase().includes(searchTerm)
    );
    
    if (filteredClasses.length === 0) {
        // No matching classes
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = '<td colspan="6" style="text-align: center;">No matching classes found</td>';
        classesTbody.appendChild(noDataRow);
    } else {
        // Add filtered classes to the table
        filteredClasses.forEach(classData => {
            const classRow = createClassRow(classData);
            classesTbody.appendChild(classRow);
        });
    }
}

// Open View Students Modal
async function openViewStudentsModal(classId) {
    try {
        currentClassId = classId;
        
        // Show loading
        document.getElementById('students-loading').style.display = 'block';
        document.getElementById('students-container').style.display = 'none';
        
        // Get class data
        const classDoc = await getDoc(doc(db, 'classes', classId));
        
        if (classDoc.exists) {
            const classData = classDoc.data();
            
            // Set class details
            document.getElementById('view-class-name').textContent = classData.className;
            document.getElementById('view-class-code').textContent = classData.classCode;
            
            // Get students
            const studentsQuery = query(collection(db, 'classes', classId, 'students'));
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentList = document.getElementById('student-list');
            
            // Clear existing students
            studentList.innerHTML = '';
            
            // Set student count
            document.getElementById('student-count').textContent = studentsSnapshot.size;
            
            if (studentsSnapshot.empty) {
                // No students
                studentList.innerHTML = '<li class="no-students">No students enrolled in this class yet.</li>';
            } else {
                // Add each student to the list
                studentsSnapshot.forEach(docSnapshot => {
                    const student = docSnapshot.data();
                    const studentItem = createStudentItem(student);
                    studentList.appendChild(studentItem);
                });
            }
            
            // Hide loading and show students
            document.getElementById('students-loading').style.display = 'none';
            document.getElementById('students-container').style.display = 'block';
            
            // Show modal
            viewStudentsModal.style.display = 'block';
        } else {
            showAlert('Class not found.', 'error');
        }
    } catch (error) {
        console.error('Error opening view students modal:', error);
        showAlert('Error loading students.', 'error');
    }
}

// Close View Students Modal
function closeViewStudentsModal() {
    viewStudentsModal.style.display = 'none';
    currentClassId = null;
}

// Copy class code to clipboard
function copyClassCode() {
    const codeElement = document.getElementById('view-class-code');
    const code = codeElement.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        showAlert('Class code copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// Open Delete Modal
async function openDeleteModal(classId) {
    try {
        currentClassId = classId;
        
        // Get class data
        const classDoc = await getDoc(doc(db, 'classes', classId));
        
        if (classDoc.exists) {
            const classData = classDoc.data();
            
            // Set class name
            document.getElementById('delete-class-name').textContent = classData.className;
            document.getElementById('delete-admin-password').value = '';
            
            // Show modal
            deleteModal.style.display = 'block';
        } else {
            showAlert('Class not found.', 'error');
        }
    } catch (error) {
        console.error('Error opening delete modal:', error);
        showAlert('Error loading class details.', 'error');
    }
}

// Close Delete Modal
function closeDeleteModal() {
    deleteModal.style.display = 'none';
    currentClassId = null;
}

// Delete class
async function deleteClass() {
    if (!currentClassId) return;
    
    const adminPassword = document.getElementById('delete-admin-password').value;
    
    if (!adminPassword) {
        showAlert('Please enter your password for verification.', 'error');
        return;
    }
    
    // Disable button to prevent multiple submissions
    const deleteButton = document.getElementById('delete-class-btn');
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    
    try {
        // Re-authenticate current user to verify password
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            adminPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        
        // Get class data for logging
        const classDoc = await getDoc(doc(db, 'classes', currentClassId));
        const classData = classDoc.data();
        
        // Delete all students in the class
        const studentsQuery = query(collection(db, 'classes', currentClassId, 'students'));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        // Batch delete students
        const batchDelete = writeBatch(db);
        studentsSnapshot.forEach(docSnapshot => {
            batchDelete.delete(docSnapshot.ref);
        });
        
        // Delete the class
        batchDelete.delete(doc(db, 'classes', currentClassId));
        
        // Commit the batch
        await batchDelete.commit();
        
        // Log the action
        await addDoc(collection(db, 'activity_logs'), {
            action: 'delete_class',
            className: classData.className,
            classCode: classData.classCode,
            performedBy: currentUser.uid,
            performedByEmail: currentUser.email,
            timestamp: serverTimestamp()
        });
        
        // Close modal and reload classes
        closeDeleteModal();
        showAlert('Class deleted successfully.', 'success');
        loadClasses();
        loadStats();
        
    } catch (error) {
        console.error('Error deleting class:', error);
        
        let errorMessage = 'Error deleting class.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        // Re-enable button
        deleteButton.disabled = false;
        deleteButton.innerHTML = 'Delete Class';
    }
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

// Make functions globally available (must be at the end of the file)
window.openViewStudentsModal = openViewStudentsModal;
window.closeViewStudentsModal = closeViewStudentsModal;
window.copyClassCode = copyClassCode;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.deleteClass = deleteClass;
window.closeAlert = closeAlert;

// Also expose these functions immediately for HTML onclick handlers
if (typeof window !== 'undefined') {
    // Ensure DOM is loaded before attaching functions
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachGlobalFunctions);
    } else {
        attachGlobalFunctions();
    }
}

function attachGlobalFunctions() {
    window.openViewStudentsModal = openViewStudentsModal;
    window.closeViewStudentsModal = closeViewStudentsModal;
    window.copyClassCode = copyClassCode;
    window.openDeleteModal = openDeleteModal;
    window.closeDeleteModal = closeDeleteModal;
    window.deleteClass = deleteClass;
    window.closeAlert = closeAlert;
}