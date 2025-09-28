// User management functions
class UserManager {
    static async loadUsers() {
        try {
            const response = await fetch('/api/users');
            app.allUsers = await response.json();
            this.updateUserSelect();
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    static updateUserSelect() {
        const select = document.getElementById('userSelect');
        if (!select) return;
        
        select.innerHTML = '';
        app.allUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            if (user === app.currentUser) option.selected = true;
            select.appendChild(option);
        });
        
        select.onchange = () => {
            app.currentUser = select.value;
            if (app.currentEditingHero) {
                ItemManager.loadHeroItems(app.currentEditingHero);
            }
        };
    }

    static showAddUserDialog() {
        const userName = prompt('Enter new user name:');
        if (userName && userName.trim()) {
            this.addUser(userName.trim());
        }
    }

    static async addUser(userName) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: userName })
            });
            
            const result = await response.json();
            if (result.success) {
                app.allUsers.push(userName);
                this.updateUserSelect();
                NotificationManager.show(`User "${userName}" added successfully!`);
            } else {
                NotificationManager.show(result.error || 'Failed to add user', 'error');
            }
        } catch (error) {
            console.error('Error adding user:', error);
            NotificationManager.show('Failed to add user', 'error');
        }
    }

    static async deleteCurrentUser() {
        if (app.currentUser === 'default') {
            NotificationManager.show('Cannot delete default user', 'error');
            return;
        }
        
        if (confirm(`Are you sure you want to delete user "${app.currentUser}"?`)) {
            try {
                const response = await fetch(`/api/users/${app.currentUser}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                if (result.success) {
                    app.allUsers = app.allUsers.filter(u => u !== app.currentUser);
                    app.currentUser = 'default';
                    this.updateUserSelect();
                    ItemManager.loadHeroItems(app.currentEditingHero);
                    NotificationManager.show('User deleted successfully!');
                } else {
                    NotificationManager.show(result.error || 'Failed to delete user', 'error');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                NotificationManager.show('Failed to delete user', 'error');
            }
        }
    }
}

// Make functions available globally for HTML onclick handlers
window.showAddUserDialog = () => UserManager.showAddUserDialog();
window.deleteCurrentUser = () => UserManager.deleteCurrentUser();