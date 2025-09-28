// Event management functions
class EventManager {
    // Setup event listeners
    static setupEventListeners() {
        const searchBox = document.getElementById('heroSearch');
        searchBox.addEventListener('input', HeroPoolRenderer.filterHeroes);
        DragDropManager.setupHeroPoolDropZones(); 

        document.addEventListener('keyup', (e) => {
            if (e.target.id === 'itemSearch') {
                ItemRenderer.renderAvailableItems();
            }
        });
    }
}