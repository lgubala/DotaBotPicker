// Item rendering functions
class ItemRenderer {
    static renderCurrentItems() {
        const container = document.getElementById('currentItemsList');
        container.innerHTML = '';
        
        app.currentHeroItems.forEach((itemName, index) => {
            const displayName = app.availableItems[itemName] || itemName;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-entry';
            itemDiv.style.cssText = 'padding: 10px; margin: 4px 0; background: rgba(201, 170, 113, 0.1); border: 1px solid #c9aa71; border-radius: 5px; cursor: grab; display: flex; justify-content: space-between; align-items: center; min-height: 40px; font-size: 14px;';
            itemDiv.draggable = true;
            itemDiv.dataset.itemName = itemName;
            itemDiv.dataset.index = index;
            
            // Add drag event listeners
            itemDiv.addEventListener('dragstart', ItemDragDropManager.handleItemDragStart);
            itemDiv.addEventListener('dragover', ItemDragDropManager.handleItemDragOver);
            itemDiv.addEventListener('drop', ItemDragDropManager.handleItemDrop);
            itemDiv.addEventListener('dragend', ItemDragDropManager.handleItemDragEnd);
            itemDiv.addEventListener('dragleave', (e) => {
                e.target.closest('.item-entry').style.background = 'rgba(201, 170, 113, 0.1)';
            });
            
            itemDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: #c9aa71; color: #000; padding: 2px 6px; border-radius: 3px; font-weight: bold; min-width: 20px; text-align: center;">${index + 1}</span>
                    <span>${displayName}</span>
                </div>
                <button onclick="removeItem(${index})" style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer; min-width: 24px;">×</button>
            `;
            
            container.appendChild(itemDiv);
        });
    }

    static renderAvailableItems() {
        const container = document.getElementById('availableItemsList');
        const searchTerm = document.getElementById('itemSearch').value.toLowerCase();
        container.innerHTML = '';
        
        Object.keys(app.availableItems).forEach(itemName => {
            const displayName = app.availableItems[itemName];
            
            // Filter by search term and exclude already added items
            if (displayName.toLowerCase().includes(searchTerm) && !app.currentHeroItems.includes(itemName)) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'available-item';
                itemDiv.style.cssText = 'padding: 10px; margin: 4px 0; background: rgba(76, 175, 80, 0.1); border: 1px solid #4caf50; border-radius: 5px; cursor: pointer; min-height: 40px; display: flex; align-items: center; font-size: 14px; transition: background-color 0.2s;';
                itemDiv.dataset.itemName = itemName;
                itemDiv.textContent = displayName;
                
                itemDiv.onclick = () => ItemManager.addItem(itemName);
                itemDiv.onmouseover = () => itemDiv.style.background = 'rgba(76, 175, 80, 0.2)';
                itemDiv.onmouseout = () => itemDiv.style.background = 'rgba(76, 175, 80, 0.1)';
                
                container.appendChild(itemDiv);
            }
        });
    }
}