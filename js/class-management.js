// Class Management JavaScript

// Firebase configuration
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
const classesTable = document.getElementById('classes-table');
const classesTbody = document.getElementById('classes-tbody');
const searchInput = document.getElementById('search-input');

// Stats Elements
const totalClassesElement = document.getElementById('total-classes');
const totalStudentsElement = document.getElementById('total-students');
const activeClassesElement = document.getElementById('active-classes');

// Modal Elements
const addClassModal = document.getElementById('add-class-modal');
const editClassModal = document.getElementById('edit-class-modal');
const viewStudentsModal = document.getElementById('view-students-modal');
const deleteModal = document.getElementById('delete-modal');
const alertElement = document.getElementById('alert');

// Current class being edited or deleted
let currentClassId = null;
let classes = [];

// Check if user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in, load classes
            loadClasses();
            loadStats();
        } else {
            // User is not signed in, redirect to login page
            window.location.href = 'login.html';
        }
    });

    // Add search functionality
    searchInput.addEventListener('input', filterClasses);
});

// Load classes from Firestore
async function loadClasses() {
    try {
        loadingElement.style.display = 'block';
        classesTable.style.display = 'none';
        
        const classesSnapshot = await db.collection('classes').orderBy('createdAt', 'desc').get();
        
        // Clear existing rows
        classesTbody.innerHTML = '';
        classes = [];
        
        if (classesSnapshot.empty) {
            // No classes found
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="6" style="text-align: center;">No classes found</td>';
            classesTbody.appendChild(noDataRow);
        } else {
            // Add each class to the table
            classesSnapshot.forEach(doc => {
                const classData = doc.data();
                classData.id = doc.id;
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

// Load statistics
async function loadStats() {
    try {
        // Get total classes
        const classesSnapshot = await db.collection('classes').get();
        totalClassesElement.textContent = classesSnapshot.size;
        
        // Get active classes (classes with at least one student)
        let activeClasses = 0;
        let totalStudents = 0;
        
        // For each class, check if it has students
        for (const doc of classesSnapshot.docs) {
            const studentsSnapshot = await db.collection('classes').doc(doc.id).collection('students').get();
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
            <button class="btn-icon edit" title="Edit Class" onclick="openEditClassModal('${classData.id}')">
                <i class="fas fa-edit"></i>
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

// Generate Class Code
function generateClassCode() {
    // Format: CQ + 6 alphanumeric characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'CQ';
    
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
}

// Open Add Class Modal
function openAddClassModal() {
    // Generate and set Class Code
    document.getElementById('class-code').value = generateClassCode();
    
    // Clear form fields
    document.getElementById('class-name').value = '';
    document.getElementById('instructor-name').value = '';
    document.getElementById('admin-password').value = '';
    
    // Show modal
    addClassModal.style.display = 'block';
}

// Close Add Class Modal
function closeAddClassModal() {
    addClassModal.style.display = 'none';
}

// Add new class
async function addClass() {
    // Get form values
    const className = document.getElementById('class-name').value.trim();
    const instructorName = document.getElementById('instructor-name').value.trim();
    const classCode = document.getElementById('class-code').value;
    const adminPassword = document.getElementById('admin-password').value;
    
    // Validate form
    if (!className || !instructorName || !adminPassword) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }
    
    // Disable button to prevent multiple submissions
    const addButton = document.getElementById('add-class-btn');
    addButton.disabled = true;
    addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        // Re-authenticate current user to verify password
        const currentUser = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            adminPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Check if class code already exists
        const codeCheck = await db.collection('classes')
            .where('classCode', '==', classCode)
            .get();
        
        if (!codeCheck.empty) {
            // Generate a new code if this one already exists
            const newCode = generateClassCode();
            document.getElementById('class-code').value = newCode;
            showAlert('Generated a new class code due to conflict.', 'warning');
            
            // Re-enable button
            addButton.disabled = false;
            addButton.innerHTML = 'Create Class';
            return;
        }
        
        // Add class to Firestore
        await db.collection('classes').add({
            className: className,
            instructorName: instructorName,
            classCode: classCode,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            studentCount: 0,
            isActive: true
        });
        
        // Close modal and reload classes
        closeAddClassModal();
        showAlert(`Class "${className}" created successfully with code: ${classCode}`, 'success');
        loadClasses();
        loadStats();
        
    } catch (error) {
        console.error('Error adding class:', error);
        
        let errorMessage = 'Error creating class.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        // Re-enable button
        addButton.disabled = false;
        addButton.innerHTML = 'Create Class';
    }
}

// Open Edit Class Modal
async function openEditClassModal(classId) {
    try {
        currentClassId = classId;
        
        // Get class data
        const classDoc = await db.collection('classes').doc(classId).get();
        
        if (classDoc.exists) {
            const classData = classDoc.data();
            
            // Fill form fields
            document.getElementById('edit-class-id').value = classId;
            document.getElementById('edit-class-name').value = classData.className || '';
            document.getElementById('edit-instructor-name').value = classData.instructorName || '';
            document.getElementById('edit-class-code').value = classData.classCode || '';
            document.getElementById('edit-admin-password').value = '';
            
            // Show modal
            editClassModal.style.display = 'block';
        } else {
            showAlert('Class not found.', 'error');
        }
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showAlert('Error loading class details.', 'error');
    }
}

// Close Edit Class Modal
function closeEditClassModal() {
    editClassModal.style.display = 'none';
    currentClassId = null;
}

// Update class
async function updateClass() {
    if (!currentClassId) return;
    
    // Get form values
    const className = document.getElementById('edit-class-name').value.trim();
    const instructorName = document.getElementById('edit-instructor-name').value.trim();
    const adminPassword = document.getElementById('edit-admin-password').value;
    
    // Validate form
    if (!className || !instructorName || !adminPassword) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }
    
    // Disable button to prevent multiple submissions
    const editButton = document.getElementById('edit-class-btn');
    editButton.disabled = true;
    editButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        // Re-authenticate current user to verify password
        const currentUser = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            adminPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Update class in Firestore
        await db.collection('classes').doc(currentClassId).update({
            className: className,
            instructorName: instructorName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        // Close modal and reload classes
        closeEditClassModal();
        showAlert('Class updated successfully.', 'success');
        loadClasses();
        
    } catch (error) {
        console.error('Error updating class:', error);
        
        let errorMessage = 'Error updating class.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        // Re-enable button
        editButton.disabled = false;
        editButton.innerHTML = 'Update Class';
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
        const classDoc = await db.collection('classes').doc(classId).get();
        
        if (classDoc.exists) {
            const classData = classDoc.data();
            
            // Set class details
            document.getElementById('view-class-name').textContent = classData.className;
            document.getElementById('view-class-code').textContent = classData.classCode;
            
            // Get students
            const studentsSnapshot = await db.collection('classes').doc(classId).collection('students').get();
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
                studentsSnapshot.forEach(doc => {
                    const student = doc.data();
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

// Create a student list item
function createStudentItem(student) {
    const item = document.createElement('li');
    item.className = 'student-item';
    
    // Get initials for avatar
    const name = student.name || 'Unknown Student';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    item.innerHTML = `
        <div class="student-avatar">${initials}</div>
        <div class="student-info">
            <div class="student-name">${name}</div>
            <div class="student-email">${student.email || 'No email'}</div>
            <div class="student-progress">Progress: ${student.progress || '0'}%</div>
        </div>
    `;
    
    return item;
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
        const classDoc = await db.collection('classes').doc(classId).get();
        
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
        const currentUser = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            adminPassword
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Get class data for logging
        const classDoc = await db.collection('classes').doc(currentClassId).get();
        const classData = classDoc.data();
        
        // Delete all students in the class
        const studentsSnapshot = await db.collection('classes').doc(currentClassId).collection('students').get();
        
        // Batch delete students
        const batch = db.batch();
        studentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete the class
        batch.delete(db.collection('classes').doc(currentClassId));
        
        // Commit the batch
        await batch.commit();
        
        // Log the action
        await db.collection('activity_logs').add({
            action: 'delete_class',
            className: classData.className,
            classCode: classData.classCode,
            performedBy: currentUser.uid,
            performedByEmail: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
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

// Make functions globally available
window.openAddClassModal = openAddClassModal;
window.closeAddClassModal = closeAddClassModal;
window.addClass = addClass;
window.openEditClassModal = openEditClassModal;
window.closeEditClassModal = closeEditClassModal;
window.updateClass = updateClass;
window.openViewStudentsModal = openViewStudentsModal;
window.closeViewStudentsModal = closeViewStudentsModal;
window.copyClassCode = copyClassCode;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.deleteClass = deleteClass;
window.closeAlert = closeAlert;