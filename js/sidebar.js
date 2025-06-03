// Sidebar functionality with role-based navigation
class SidebarManager {
    constructor() {
        this.userRole = this.getUserRole();
        this.init();
    }

    init() {
        this.loadSidebar();
    }

    async loadSidebar() {
        try {
            const response = await fetch('../sidebar/sidebar.html');
            const sidebarHTML = await response.text();
            
            // Find the sidebar container or create one
            let sidebarContainer = document.getElementById('sidebar-container');
            if (!sidebarContainer) {
                sidebarContainer = document.createElement('div');
                sidebarContainer.id = 'sidebar-container';
                document.body.insertBefore(sidebarContainer, document.body.firstChild);
            }
            
            sidebarContainer.innerHTML = sidebarHTML;
            
            // Setup role-based navigation
            this.setupRoleBasedNavigation();
            
            // Set active nav item
            this.setActiveNavItem();
            
            // Setup role toggle button
            this.setupRoleToggle();
        } catch (error) {
            console.error('Error loading sidebar:', error);
        }
    }

    setupRoleBasedNavigation() {
        const adminNav = document.querySelector('.admin-nav');
        const superAdminNav = document.querySelector('.super-admin-nav');
        const userRoleDisplay = document.getElementById('user-role-display');
        
        if (this.userRole === 'admin') {
            adminNav.classList.add('active');
            superAdminNav.classList.remove('active');
            userRoleDisplay.textContent = 'ADMIN';
        } else {
            adminNav.classList.remove('active');
            superAdminNav.classList.add('active');
            userRoleDisplay.textContent = 'SUPER ADMIN';
        }
    }

    setActiveNavItem() {
        // Get current page name from URL
        const currentPage = this.getCurrentPageName();
        
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current page nav item in the active menu
        const activeMenu = this.userRole === 'admin' ? '.admin-nav' : '.super-admin-nav';
        const currentNavItem = document.querySelector(`${activeMenu} [data-page="${currentPage}"]`);
        if (currentNavItem) {
            currentNavItem.classList.add('active');
        }
    }

    setupRoleToggle() {
        const roleSwitch = document.getElementById('role-switch');
        if (roleSwitch) {
            roleSwitch.addEventListener('click', () => {
                this.toggleUserRole();
            });
        }
    }

    toggleUserRole() {
        this.userRole = this.userRole === 'admin' ? 'super_admin' : 'admin';
        localStorage.setItem('userRole', this.userRole);
        this.setupRoleBasedNavigation();
        this.setActiveNavItem();
    }

    getUserRole() {
        // Get role from localStorage or default to 'admin'
        return localStorage.getItem('userRole') || 'admin';
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        
        // Handle index page
        if (page === '' || page === 'index') {
            return 'index';
        }
        
        return page;
    }
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarManager = new SidebarManager();
});