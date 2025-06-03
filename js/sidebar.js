// Add these imports at the top of the file
import { signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Sidebar functionality with role-based navigation
class SidebarManager {
  constructor() {
    this.userRole = this.getUserRole()
    this.init()
  }

  init() {
    this.loadSidebar()
  }

  async loadSidebar() {
    try {
      const response = await fetch("../sidebar/sidebar.html")
      const sidebarHTML = await response.text()

      // Find the sidebar container or create one
      let sidebarContainer = document.getElementById("sidebar-container")
      if (!sidebarContainer) {
        sidebarContainer = document.createElement("div")
        sidebarContainer.id = "sidebar-container"
        document.body.insertBefore(sidebarContainer, document.body.firstChild)
      }

      sidebarContainer.innerHTML = sidebarHTML

      // Setup role-based navigation
      this.setupRoleBasedNavigation()

      // Set active nav item
      this.setActiveNavItem()

      // Setup logout button
      this.setupLogoutButton()

      // Setup mobile sidebar toggle
      this.setupMobileSidebar()
    } catch (error) {
      console.error("Error loading sidebar:", error)
    }
  }

  setupRoleBasedNavigation() {
    const adminNav = document.querySelector(".admin-nav")
    const superAdminNav = document.querySelector(".super-admin-nav")
    const userRoleDisplay = document.getElementById("user-role-display")

    if (this.userRole === "admin") {
      adminNav.classList.add("active")
      superAdminNav.classList.remove("active")
      userRoleDisplay.textContent = "ADMIN"
    } else {
      adminNav.classList.remove("active")
      superAdminNav.classList.add("active")
      userRoleDisplay.textContent = "SUPER ADMIN"
    }
  }

  setActiveNavItem() {
    // Get current page name from URL
    const currentPage = this.getCurrentPageName()

    // Remove active class from all nav items
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active")
    })

    // Add active class to current page nav item in the active menu
    const activeMenu = this.userRole === "admin" ? ".admin-nav" : ".super-admin-nav"
    const currentNavItem = document.querySelector(`${activeMenu} [data-page="${currentPage}"]`)
    if (currentNavItem) {
      currentNavItem.classList.add("active")
    }
  }

  setupLogoutButton() {
    const logoutBtn = document.getElementById("logout-btn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        this.logout()
      })
    }
  }

  setupMobileSidebar() {
    const sidebarToggle = document.getElementById("sidebar-toggle")
    const sidebar = document.getElementById("sidebar")
    const overlay = document.getElementById("sidebar-overlay")

    if (sidebarToggle && sidebar && overlay) {
      // Toggle sidebar on hamburger icon click
      sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("active")
        overlay.classList.toggle("active")
        document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : ""
      })

      // Close sidebar when clicking on overlay
      overlay.addEventListener("click", () => {
        sidebar.classList.remove("active")
        overlay.classList.remove("active")
        document.body.style.overflow = ""
      })

      // Close sidebar when clicking on a menu item (mobile only)
      const navLinks = document.querySelectorAll(".nav-link")
      if (window.innerWidth <= 768) {
        navLinks.forEach((link) => {
          link.addEventListener("click", () => {
            sidebar.classList.remove("active")
            overlay.classList.remove("active")
            document.body.style.overflow = ""
          })
        })
      }

      // Handle resize events
      window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
          sidebar.classList.remove("active")
          overlay.classList.remove("active")
          document.body.style.overflow = ""
        }
      })
    }
  }

  async logout() {
    // Check if Firebase is available
    if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
            // Log the logout activity
            await this.logLogoutActivity();
            
            // Sign out using the auth instance
            await signOut(firebase.auth);
            console.log('User signed out');
            
            // Clear local storage
            localStorage.removeItem('userRole');
            
            // Redirect to login page
            window.location.href = '../auth/index.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    } else {
        // Fallback if Firebase is not available
        localStorage.removeItem('userRole');
        window.location.href = '../auth/index.html';
    }
}

  async logLogoutActivity() {
    if (typeof firebase !== 'undefined' && firebase.db) {
        const user = firebase.auth.currentUser;
        if (user) {
            try {
                const logsRef = collection(firebase.db, 'login_logs');
                await addDoc(logsRef, {
                    userId: user.uid,
                    email: user.email,
                    role: this.userRole === 'admin' ? 'Admin' : 'Super Admin',
                    timestamp: serverTimestamp(),
                    action: 'logout',
                    userAgent: navigator.userAgent
                });
                console.log('Logout activity logged');
            } catch (error) {
                console.error('Error logging logout activity:', error);
            }
        }
    }
}

  getUserRole() {
    // Get role from localStorage or default to 'admin'
    return localStorage.getItem("userRole") || "admin"
  }

  getCurrentPageName() {
    const path = window.location.pathname
    const page = path.split("/").pop().replace(".html", "")

    // Handle index page
    if (page === "" || page === "index") {
      return "index"
    }

    return page
  }
}

// Initialize sidebar when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.sidebarManager = new SidebarManager()
})
