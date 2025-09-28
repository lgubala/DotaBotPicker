// Item modal functions
class ItemModal {
    static async show(heroId) {
        const hero = app.heroes[heroId];
        if (!hero) return;
        
        app.currentEditingHero = heroId;
        document.getElementById('itemModalTitle').textContent = `${hero.display_name} Items`;
        document.getElementById('itemModal').style.display = 'flex';
        
        // Load available items if not loaded yet
        if (Object.keys(app.availableItems).length === 0) {
            await ItemManager.loadAvailableItems();
        }
        
        UserManager.updateUserSelect();
        await ItemManager.loadHeroItems(heroId);
    }

    static close() {
        document.getElementById('itemModal').style.display = 'none';
    }
}

// Make functions available globally for HTML onclick handlers
window.showItemModal = (heroId) => ItemModal.show(heroId);
window.closeItemModal = () => ItemModal.close();