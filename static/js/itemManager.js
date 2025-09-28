// Item management functions
class ItemManager {
    static async loadAvailableItems() {
        try {
            const response = await fetch('/static/items.json');
            app.availableItems = await response.json();
            console.log('Available items loaded:', Object.keys(app.availableItems).length, 'items');
        } catch (error) {
            console.error('Failed to load available items:', error);
        }
    }

    static async loadHeroItems(heroId) {
        try {
            const response = await fetch(`/api/hero-items/${heroId}?user=${app.currentUser}`);
            const result = await response.json();
            
            if (result.success) {
                app.currentHeroItems = result.items.map(item => item.name);
            } else {
                app.currentHeroItems = [];
            }
            
            ItemRenderer.renderCurrentItems();
            ItemRenderer.renderAvailableItems();
            
        } catch (error) {
            console.error('Failed to load hero items:', error);
            app.currentHeroItems = [];
            ItemRenderer.renderCurrentItems();
            ItemRenderer.renderAvailableItems();
        }
    }

    static addItem(itemName) {
        if (!app.currentHeroItems.includes(itemName)) {
            app.currentHeroItems.push(itemName);
            ItemRenderer.renderCurrentItems();
            ItemRenderer.renderAvailableItems();
        }
    }

    static removeItem(index) {
        app.currentHeroItems.splice(index, 1);
        ItemRenderer.renderCurrentItems();
        ItemRenderer.renderAvailableItems();
    }

    static async saveHeroItems() {
        if (!app.currentEditingHero) return;
        
        try {
            const response = await fetch(`/api/hero-items/${app.currentEditingHero}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: app.currentHeroItems,
                    user: app.currentUser
                })
            });
            
            const result = await response.json();
            if (result.success) {
                NotificationManager.show(`Items saved for ${app.heroes[app.currentEditingHero].display_name} (${app.currentUser})!`);
                ItemModal.close();
            } else {
                NotificationManager.show(result.error || 'Failed to save items', 'error');
            }
        } catch (error) {
            console.error('Error saving items:', error);
            NotificationManager.show('Failed to save items', 'error');
        }
    }
}

// Make functions available globally for HTML onclick handlers
window.addItem = (itemName) => ItemManager.addItem(itemName);
window.removeItem = (index) => ItemManager.removeItem(index);
window.saveHeroItems = () => ItemManager.saveHeroItems();