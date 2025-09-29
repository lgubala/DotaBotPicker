// Main application controller
class DotaBotManager {
    constructor() {
        this.heroes = {};
        this.currentTeams = { radiant: [], dire: [] };
        this.availableItems = {};
        this.currentHeroItems = [];
        this.currentEditingHero = null;
        this.allUsers = ['default'];
        this.currentUser = 'default';
    }

    // Initialize the application
// In app.js, update the init method:
    async init() {
        console.log('Initializing Dota Bot Manager...');
        await this.loadHeroes();
        await this.loadCurrentTeams();
        await this.checkBotFolder();
        await UserManager.loadUsers();
        TeamRenderer.renderTeams();
        
        if (Object.keys(this.heroes).length > 0) {
            HeroPoolRenderer.renderHeroPools();
        }
        EventManager.setupEventListeners();
        
        // Wait a bit then reload heroes to get role data
        setTimeout(async () => {
            await this.loadHeroes();
            HeroPoolRenderer.renderHeroPools();
            TeamRenderer.renderTeams();
            console.log('Reloaded heroes with role data');
        }, 2000);
        
        console.log('Initialization complete');
    }

    // Load heroes from API
    async loadHeroes() {
        try {
            console.log('Loading heroes from API...');
            const response = await fetch('/api/heroes');
            this.heroes = await response.json();
            console.log('Heroes loaded:', Object.keys(this.heroes).length, 'heroes');
            
            if (Object.keys(this.heroes).length === 0) {
                console.warn('No heroes received from API');
                NotificationManager.show('No heroes available. Heroes are loading in background...', 'error');
                // Retry after a delay and re-render hero pools when successful
                setTimeout(async () => {
                    await this.loadHeroes();
                    if (Object.keys(this.heroes).length > 0) {
                        HeroPoolRenderer.renderHeroPools();
                    }
                }, 3000);
            } else {
                // FIX: Render hero pools immediately after heroes are loaded
                setTimeout(() => {
                    HeroPoolRenderer.renderHeroPools();
                }, 100);
            }
        } catch (error) {
            console.error('Failed to load heroes:', error);
            NotificationManager.show('Failed to load heroes', 'error');
        }
    }

    // Load current team configuration
    async loadCurrentTeams() {
        try {
            console.log('Loading current teams...');
            const response = await fetch('/api/teams');
            this.currentTeams = await response.json();
            console.log('Teams loaded:', this.currentTeams);
        } catch (error) {
            console.error('Failed to load current teams:', error);
            NotificationManager.show('Failed to load current teams', 'error');
        }
    }

    // Check bot folder status
    async checkBotFolder() {
        try {
            const response = await fetch('/api/bot-folder');
            const data = await response.json();
            
            const statusIcon = document.getElementById('botFolderStatus');
            const pathElement = document.getElementById('botFolderPath');
            
            if (data.detected) {
                statusIcon.className = 'status-icon connected';
                pathElement.textContent = data.path;
            } else {
                statusIcon.className = 'status-icon disconnected';
                pathElement.textContent = 'Bot folder not found - please select manually';
            }
        } catch (error) {
            console.error('Failed to check bot folder:', error);
            NotificationManager.show('Failed to check bot folder', 'error');
        }
    }

    // Save configuration
    async saveConfiguration() {
        try {
            // Clean up teams before saving (remove null values)
            const cleanTeams = {
                radiant: this.currentTeams.radiant.filter(hero => hero !== null),
                dire: this.currentTeams.dire.filter(hero => hero !== null)
            };

            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cleanTeams)
            });

            const result = await response.json();
            if (result.success) {
                NotificationManager.show('Configuration saved successfully!');
            } else {
                NotificationManager.show(result.error || 'Failed to save configuration', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            NotificationManager.show('Failed to save configuration', 'error');
        }
    }

    // Bot folder selection
    async selectBotFolder() {
        const folderPath = prompt('Enter the path to your bot folder:');
        if (folderPath) {
            try {
                const response = await fetch('/api/bot-folder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ path: folderPath })
                });

                const result = await response.json();
                if (result.success) {
                    NotificationManager.show('Bot folder updated successfully!');
                    await this.checkBotFolder();
                    // FIX: Reload heroes and re-render hero pools after bot folder update
                    await this.loadHeroes();
                } else {
                    NotificationManager.show(result.error || 'Invalid bot folder', 'error');
                }
            } catch (error) {
                console.error('Bot folder error:', error);
                NotificationManager.show('Failed to update bot folder', 'error');
            }
        }
    }

    async importDefaultBuilds() {
        if (confirm('This will import all current item builds as default builds. Continue?')) {
            try {
                const response = await fetch('/api/import-default-builds', {
                    method: 'POST'
                });
                
                const result = await response.json();
                if (result.success) {
                    NotificationManager.show('Default builds imported successfully!');
                } else {
                    NotificationManager.show(result.error || 'Failed to import builds', 'error');
                }
            } catch (error) {
                console.error('Error importing builds:', error);
                NotificationManager.show('Failed to import builds', 'error');
            }
        }
    }
}

// Create global instance
const app = new DotaBotManager();

// Global functions for HTML onclick handlers
window.saveConfiguration = () => app.saveConfiguration();
window.selectBotFolder = () => app.selectBotFolder();
window.importDefaultBuilds = () => app.importDefaultBuilds();

window.startCaptainsMode = () => {
    if (typeof captainsMode !== 'undefined') {
        captainsMode.showSetupModal();
    } else {
        console.error('captainsMode is not defined');
    }
};

window.clearCurrentDraft = async () => {
    if (confirm('Are you sure you want to clear all heroes from both teams?')) {
        // Clear the teams in memory
        app.currentTeams = {
            radiant: [],
            dire: []
        };
        
        // Save the empty configuration
        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(app.currentTeams)
            });

            const result = await response.json();
            if (result.success) {
                // Re-render the teams to show empty slots
                TeamRenderer.renderTeams();
                NotificationManager.show('Draft cleared successfully!');
            } else {
                NotificationManager.show(result.error || 'Failed to clear draft', 'error');
            }
        } catch (error) {
            console.error('Clear draft error:', error);
            NotificationManager.show('Failed to clear draft', 'error');
        }
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => app.init());