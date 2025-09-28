// Drag and drop management
class DragDropManager {
    // Drag and drop handlers for hero selection
    static handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.hero);
        e.target.style.opacity = '0.5';
    }

    static handleDragOver(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    static handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    static handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');

        const heroId = e.dataTransfer.getData('text/plain');
        const teamName = e.target.dataset.team;
        const slotIndex = parseInt(e.target.dataset.slot);

        if (heroId && teamName !== undefined && slotIndex !== undefined) {
            TeamManager.addHeroToSlot(teamName, slotIndex, heroId);
        }

        // Reset opacity of dragged element
        document.querySelectorAll('.hero-portrait').forEach(p => p.style.opacity = '1');
    }

    // Hero pool drag and drop handlers
    static handleHeroPoolDragOver(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    static async handleHeroPoolDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');

        const heroId = e.dataTransfer.getData('text/plain');
        const newStatus = e.target.dataset.status;

        if (heroId && newStatus) {
            await HeroPoolRenderer.moveHeroToStatus(heroId, newStatus);
        }

        // Reset opacity of dragged element
        document.querySelectorAll('.hero-portrait').forEach(p => p.style.opacity = '1');
    }

    // Setup drag and drop for hero pools
    static setupHeroPoolDropZones() {
        const dropZones = document.querySelectorAll('.drop-zone');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', this.handleHeroPoolDragOver);
            zone.addEventListener('drop', this.handleHeroPoolDrop);
            zone.addEventListener('dragleave', this.handleDragLeave);
        });
    }
}

// Item drag and drop handlers
class ItemDragDropManager {
    static draggedItemIndex = null;

    static handleItemDragStart(e) {
        ItemDragDropManager.draggedItemIndex = parseInt(e.target.dataset.index);
        e.target.style.opacity = '0.5';
    }

    static handleItemDragOver(e) {
        e.preventDefault();
        e.target.closest('.item-entry').style.background = 'rgba(218, 165, 32, 0.2)';
    }

    static handleItemDrop(e) {
        e.preventDefault();
        const dropTarget = e.target.closest('.item-entry');
        if (!dropTarget) return;
        
        const dropIndex = parseInt(dropTarget.dataset.index);
        
        if (ItemDragDropManager.draggedItemIndex !== null && ItemDragDropManager.draggedItemIndex !== dropIndex) {
            // Access the current hero items from the global app object
            const currentItems = app.currentHeroItems;
            
            // Validate that we have valid indices and items
            if (ItemDragDropManager.draggedItemIndex >= 0 && ItemDragDropManager.draggedItemIndex < currentItems.length &&
                dropIndex >= 0 && dropIndex < currentItems.length) {
                
                // Get the dragged item
                const draggedItem = currentItems[ItemDragDropManager.draggedItemIndex];
                
                // Only proceed if we have a valid item
                if (draggedItem !== undefined) {
                    // Remove the item from its original position
                    currentItems.splice(ItemDragDropManager.draggedItemIndex, 1);
                    
                    // Calculate the correct drop index after removal
                    const adjustedDropIndex = ItemDragDropManager.draggedItemIndex < dropIndex ? dropIndex - 1 : dropIndex;
                    
                    // Insert the item at the new position
                    currentItems.splice(adjustedDropIndex, 0, draggedItem);
                    
                    // Re-render the items
                    ItemRenderer.renderCurrentItems();
                }
            }
        }
    }

    static handleItemDragEnd(e) {
        e.target.style.opacity = '1';
        // Reset all backgrounds
        document.querySelectorAll('.item-entry').forEach(item => {
            item.style.background = 'rgba(201, 170, 113, 0.1)';
        });
        ItemDragDropManager.draggedItemIndex = null;
    }
}