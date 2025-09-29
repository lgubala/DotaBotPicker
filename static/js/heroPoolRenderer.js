// Hero pool rendering functions with attribute grouping
class HeroPoolRenderer {
    static renderHeroPools() {
        // Add a check to ensure heroes are loaded
        if (!app.heroes || Object.keys(app.heroes).length === 0) {
            console.log('Heroes not loaded yet, skipping hero pool render');
            return;
        }
        
        this.renderGroupedHeroPool('implementedHeroesPool', 'available');
        this.renderHeroPool('unimplementedHeroesPool', 'unimplemented');
    }

    static renderGroupedHeroPool(containerId, status) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        // Create attribute groups
        const attributeGroups = {
            strength: { title: 'Strength', color: '#ff6b6b' },
            agility: { title: 'Agility', color: '#4ecdc4' }, 
            intelligence: { title: 'Intelligence', color: '#45b7d1' },
            universal: { title: 'Universal', color: '#f39c12' }
        };
        
        Object.entries(attributeGroups).forEach(([attribute, config]) => {
            const groupSection = document.createElement('div');
            groupSection.className = 'attribute-group';
            groupSection.style.cssText = `
                margin-bottom: 20px;
                border: 1px solid ${config.color};
                border-radius: 8px;
                background: rgba(${this.hexToRgb(config.color).r}, ${this.hexToRgb(config.color).g}, ${this.hexToRgb(config.color).b}, 0.1);
            `;
            
            const groupHeader = document.createElement('div');
            groupHeader.className = 'attribute-header';
            groupHeader.style.cssText = `
                background: ${config.color};
                color: #000;
                font-weight: bold;
                padding: 8px 12px;
                font-size: 14px;
                border-radius: 7px 7px 0 0;
            `;
            groupHeader.textContent = config.title;
            
            const groupContent = document.createElement('div');
            groupContent.className = 'attribute-content drop-zone';
            groupContent.dataset.status = status;
            groupContent.dataset.attribute = attribute;
            groupContent.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                gap: 8px;
                padding: 10px;
                min-height: 80px;
                border: 2px dashed transparent;
                border-radius: 0 0 6px 6px;
                transition: all 0.3s ease;
                width: 100%;
            `;
            
            // Add drag and drop event listeners
            groupContent.addEventListener('dragover', this.handleAttributeGroupDragOver.bind(this));
            groupContent.addEventListener('drop', this.handleAttributeGroupDrop.bind(this));
            groupContent.addEventListener('dragleave', this.handleDragLeave.bind(this));
            
            // Filter heroes by attribute and status
            const attributeHeroes = this.getHeroesByAttributeAndStatus(attribute, status);
            
            attributeHeroes.forEach(hero => {
                const portrait = this.createHeroPortrait(hero);
                groupContent.appendChild(portrait);
            });
            
            groupSection.appendChild(groupHeader);
            groupSection.appendChild(groupContent);
            container.appendChild(groupSection);
        });
    }

    static renderHeroPool(containerId, status) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        // FIX: Use app.heroes instead of just heroes
        const filteredHeroes = Object.values(app.heroes).filter(hero => hero.status === status);
        
        // Create a simple grid for unimplemented heroes
        const heroGrid = document.createElement('div');
        heroGrid.className = 'hero-pool drop-zone';
        heroGrid.dataset.status = status;
        heroGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
            gap: 6px;
            padding: 10px;
            min-height: 200px;
            border: 2px dashed transparent;
            border-radius: 6px;
            transition: all 0.3s ease;
        `;
        
        // Add drag and drop event listeners
        heroGrid.addEventListener('dragover', DragDropManager.handleHeroPoolDragOver);
        heroGrid.addEventListener('drop', DragDropManager.handleHeroPoolDrop);
        heroGrid.addEventListener('dragleave', DragDropManager.handleDragLeave);
        
        filteredHeroes.forEach(hero => {
            const portrait = this.createHeroPortrait(hero, true); // smaller for unimplemented
            heroGrid.appendChild(portrait);
        });
        
        container.appendChild(heroGrid);
    }

    static createHeroPortrait(hero, small = false) {
        const portrait = document.createElement('div');
        portrait.className = 'hero-portrait';
        portrait.draggable = true;
        portrait.dataset.hero = hero.internal_name;
        portrait.dataset.name = hero.display_name;
        portrait.style.backgroundImage = `url(${hero.portrait_url})`;
        portrait.title = hero.display_name;
        
        if (small) {
            portrait.style.width = '50px';
            portrait.style.height = '50px';
        }
        
        // Add role badges if hero has roles
        if (hero.roles && hero.roles.length > 0) {
            const rolesContainer = document.createElement('div');
            rolesContainer.className = 'hero-roles';
            
            hero.roles.forEach(role => {
                const roleBadge = document.createElement('span');
                roleBadge.className = `role-badge ${role}`;
                roleBadge.textContent = role.toUpperCase();
                rolesContainer.appendChild(roleBadge);
            });
            
            portrait.appendChild(rolesContainer);
        }
        
        portrait.addEventListener('dragstart', DragDropManager.handleDragStart);
        return portrait;
    }

    static getHeroesByAttributeAndStatus(attribute, status) {
        // FIX: Check if getHeroesByAttribute function exists
        if (typeof window.getHeroesByAttribute !== 'function') {
            console.error('getHeroesByAttribute function not found');
            return [];
        }
        
        const attributeHeroIds = window.getHeroesByAttribute(attribute);
        // FIX: Use app.heroes instead of heroes
        return Object.values(app.heroes).filter(hero => 
            hero.status === status && attributeHeroIds.includes(hero.internal_name)
        );
    }

    static handleAttributeGroupDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = '#daa520';
        e.currentTarget.style.backgroundColor = 'rgba(218, 165, 32, 0.1)';
    }

    static handleDragLeave(e) {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.backgroundColor = '';
    }

    static async handleAttributeGroupDrop(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.backgroundColor = '';

        const heroId = e.dataTransfer.getData('text/plain');
        const newStatus = e.currentTarget.dataset.status;
        const targetAttribute = e.currentTarget.dataset.attribute;

        if (heroId && newStatus) {
            // Check if hero belongs to this attribute group
            if (typeof window.getHeroAttribute === 'function') {
                const heroAttribute = window.getHeroAttribute(heroId);
                
                if (heroAttribute !== targetAttribute) {
                    NotificationManager.show(`${app.heroes[heroId].display_name} belongs to ${heroAttribute.charAt(0).toUpperCase() + heroAttribute.slice(1)} attribute, not ${targetAttribute.charAt(0).toUpperCase() + targetAttribute.slice(1)}!`, 'error');
                    return;
                }
            }
            
            await this.moveHeroToStatus(heroId, newStatus);
        }

        // Reset opacity of dragged element
        document.querySelectorAll('.hero-portrait').forEach(p => p.style.opacity = '1');
    }

    static filterHeroes() {
        const searchTerm = document.getElementById('heroSearch').value.toLowerCase();
        const portraits = document.querySelectorAll('.hero-pool .hero-portrait, .attribute-content .hero-portrait');

        portraits.forEach(portrait => {
            const heroName = portrait.dataset.name.toLowerCase();
            if (heroName.includes(searchTerm)) {
                portrait.style.display = 'block';
            } else {
                portrait.style.display = 'none';
            }
        });
    }

    static async moveHeroToStatus(heroId, newStatus) {
        try {
            const response = await fetch('/api/hero-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    hero: heroId,
                    status: newStatus
                })
            });
            
            const result = await response.json();
            console.log('Server response:', result);
            if (result.success) {
                app.heroes[heroId].status = newStatus;
                this.renderHeroPools();
                NotificationManager.show(`${app.heroes[heroId].display_name} moved to ${newStatus}`);
            } else {
                NotificationManager.show(result.error || 'Failed to update hero status', 'error');
            }
        } catch (error) {
            console.error('Error in moveHeroToStatus:', error);
            NotificationManager.show('Failed to update hero status', 'error');
        }
    }

    // Helper function to convert hex to RGB
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}