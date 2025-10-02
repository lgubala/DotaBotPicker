import os
import json
import re
import shutil
from datetime import datetime
from pathlib import Path
from flask import Flask, render_template, jsonify, request, send_from_directory
import requests
from threading import Thread

app = Flask(__name__)

class BotManager:
    def __init__(self):
        self.bot_folder = self.detect_bot_folder()
        self.hero_data = {}
        self.hero_roles = {}  # FIX: Use self instead of bot_manager
        self.config = self.load_config()
        self.users_data = self.load_users()
        # Load hero data in background to avoid blocking startup
        Thread(target=self.load_all_data, daemon=True).start() 

    def load_all_data(self):
        """Load both hero data and roles in sequence"""
        self.load_hero_data()
        self.load_role_data()        
    
    def load_role_data(self):
        """Load role data in background"""
        self.hero_roles = self.load_hero_roles()  # FIX: Add self.
        # Update hero_data with roles
        for hero_id, roles in self.hero_roles.items():
            if hero_id in self.hero_data:
                self.hero_data[hero_id]['roles'] = roles

    def load_users(self):
        """Load or create users configuration"""
        users_path = 'users.json'
        default_users = {
            'users': ['default'],
            'user_builds': {}
        }
        
        if os.path.exists(users_path):
            with open(users_path, 'r') as f:
                return json.load(f)
        else:
            with open(users_path, 'w') as f:
                json.dump(default_users, f, indent=2)
            return default_users

    def save_users(self):
        """Save users configuration"""
        with open('users.json', 'w') as f:
            json.dump(self.users_data, f, indent=2)

    def import_default_builds(self):
        """Import all current item builds as default builds"""
        if not self.bot_folder:
            return False
        
        builds_folder = os.path.join(self.bot_folder, 'builds')
        if not os.path.exists(builds_folder):
            return False
        
        default_builds = {}
        imported_count = 0
        
        # Go through all available heroes and try to import their builds
        for hero_id in self.hero_data:
            # Use the existing method but without user parameter to force lua reading
            items = self.get_hero_items_from_lua(hero_id)  # We need this new method
            if items:
                item_names = [item['name'] for item in items]
                default_builds[hero_id] = item_names
                imported_count += 1
        
        # Initialize default user builds
        if 'default' not in self.users_data['user_builds']:
            self.users_data['user_builds']['default'] = {}
        
        self.users_data['user_builds']['default'].update(default_builds)
        self.save_users()
        
        return True



    def get_hero_items_from_lua(self, hero_id):
        """Get items directly from lua file (for importing)"""
        if not self.bot_folder:
            return []
        
        # Convert internal name to filename (remove npc_dota_hero_ prefix)
        hero_name = hero_id.replace('npc_dota_hero_', '')
        item_file_path = os.path.join(self.bot_folder, 'builds', f'item_build_{hero_name}.lua')
        
        if not os.path.exists(item_file_path):
            return []
        
        try:
            with open(item_file_path, 'r') as f:
                content = f.read()
            
            # Extract items array using regex
            pattern = r'X\["items"\]\s*=\s*\{(.*?)\};'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                items_text = match.group(1)
                items = []
                for line in items_text.split('\n'):
                    line = line.strip()
                    if line and line.startswith('"'):
                        item_match = re.search(r'"([^"]+)"', line)
                        if item_match:
                            item_name = item_match.group(1)
                            items.append({'name': item_name})
                return items
            return []
        except Exception as e:
            print(f"Failed to parse items for {hero_id}: {e}")
            return []

    def load_config(self):
        """Load or create configuration"""
        config_path = 'config.json'
        default_config = {
            'backup_count': 5,
            'last_teams': {
                'radiant': [],
                'dire': []
            }
        }
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        else:
            with open(config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            return default_config
    
    def save_config(self):
        """Save current configuration"""
        with open('config.json', 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def detect_bot_folder(self):
        """Try to detect bot folder automatically"""
        possible_paths = []
        
        # Windows paths
        if os.name == 'nt':
            steam_paths = [
                r'C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\scripts\vscripts\bots',
                r'C:\Program Files\Steam\steamapps\common\dota 2 beta\game\dota\scripts\vscripts\bots',
                r'D:\Steam\steamapps\common\dota 2 beta\game\dota\scripts\vscripts\bots',
            ]
            possible_paths.extend(steam_paths)
        
        # Linux paths
        else:
            home = os.path.expanduser('~')
            linux_paths = [
                f'{home}/.local/share/Steam/steamapps/common/dota 2 beta/game/dota/scripts/vscripts/bots',
                f'{home}/.steam/steam/steamapps/common/dota 2 beta/game/dota/scripts/vscripts/bots',
                 '/home/pejko/Desktop/bots', 
            ]
            possible_paths.extend(linux_paths)
        
        # Check each path
        for path in possible_paths:
            hero_selection_path = os.path.join(path, 'hero_selection.lua')
            if os.path.exists(hero_selection_path):
                return path
        
        return None
    
    def load_hero_data(self):
        """Load hero information - runs in background"""
        
        # First, get hero lists from lua file
        self.load_hero_lists_from_lua()
        
        try:
            # Try OpenDota API first
            response = requests.get('https://api.opendota.com/api/heroes', timeout=5)
            if response.status_code == 200:
                heroes_json = response.json()
                      
                for hero in heroes_json:
                    internal_name = hero['name']  # Already has npc_dota_hero_ prefix
                    portrait_url = f"/static/images/heroes/{internal_name}.png"
                    
                    # Determine hero status
                    status = 'unavailable'  # Default
                    if internal_name in self.all_bot_heroes:
                        status = 'available'
                    elif internal_name in self.unimplemented_heroes:
                        status = 'unimplemented'
                    
                    self.hero_data[internal_name] = {
                        'display_name': hero['localized_name'],
                        'internal_name': internal_name,
                        'portrait_url': portrait_url,
                        'status': status
                    }
                    
            else:
                raise Exception(f"API returned {response.status_code}")
                
        except Exception as e:
            print(f"API failed: {e}, using fallback data")
            self.create_fallback_hero_data()
        

    def load_hero_lists_from_lua(self):
        """Load allBotHeroes and UnImplementedHeroes from lua file"""
        self.all_bot_heroes = set()
        self.unimplemented_heroes = set()
        
        if not self.bot_folder:
            return
        
        hero_selection_path = os.path.join(self.bot_folder, 'hero_selection.lua')
        if not os.path.exists(hero_selection_path):
            return
        
        try:
            with open(hero_selection_path, 'r') as f:
                content = f.read()
            
            # Extract allBotHeroes
            pattern = r"local allBotHeroes = \{(.*?)\};"
            match = re.search(pattern, content, re.DOTALL)
            if match:
                heroes_text = match.group(1)
                self.all_bot_heroes = set(re.findall(r"'(npc_dota_hero_\w+)'", heroes_text))
            
            # Extract UnImplementedHeroes
            pattern = r"local UnImplementedHeroes = \{(.*?)\};"
            match = re.search(pattern, content, re.DOTALL)
            if match:
                heroes_text = match.group(1)
                self.unimplemented_heroes = set(re.findall(r"'(npc_dota_hero_\w+)'", heroes_text))
                
        except Exception as e:
            print(f"Failed to load hero lists from lua: {e}")
    
    def create_fallback_hero_data(self):
        """Create hero data from Lua file or hardcoded list"""
        heroes_from_lua = []
        
        # Try to extract from lua file
        if self.bot_folder:
            hero_selection_path = os.path.join(self.bot_folder, 'hero_selection.lua')
            if os.path.exists(hero_selection_path):
                try:
                    with open(hero_selection_path, 'r') as f:
                        content = f.read()
                    
                    pattern = r"local allBotHeroes = \{(.*?)\};"
                    match = re.search(pattern, content, re.DOTALL)
                    if match:
                        heroes_text = match.group(1)
                        heroes_from_lua = re.findall(r"'(npc_dota_hero_\w+)'", heroes_text)
                except Exception as e:
                    print(f"Failed to read lua file: {e}")
        
        # Fallback to common heroes if lua extraction failed
        if not heroes_from_lua:
            heroes_from_lua = [
                'npc_dota_hero_antimage', 'npc_dota_hero_axe', 'npc_dota_hero_crystal_maiden',
                'npc_dota_hero_drow_ranger', 'npc_dota_hero_juggernaut', 'npc_dota_hero_mirana',
                'npc_dota_hero_nevermore', 'npc_dota_hero_pudge', 'npc_dota_hero_sven',
                'npc_dota_hero_lina', 'npc_dota_hero_lion', 'npc_dota_hero_invoker'
            ]
        
        # Create hero data with local image references AND status
        for hero_internal in heroes_from_lua:
            display_name = self.internal_to_display_name(hero_internal)
            
            # Use local image files
            portrait_url = f"/static/images/heroes/{hero_internal}.png"
            
            # FIX: Determine status based on hero lists
            status = 'unavailable'  # Default
            if hero_internal in self.all_bot_heroes:
                status = 'available'
            elif hero_internal in self.unimplemented_heroes:
                status = 'unimplemented'
            
            self.hero_data[hero_internal] = {
                'display_name': display_name,
                'internal_name': hero_internal,
                'portrait_url': portrait_url,
                'status': status  # FIX: Add the missing status field
            }

            
            """Create hero data from Lua file or hardcoded list"""
            heroes_from_lua = []
            
            # Try to extract from lua file
            if self.bot_folder:
                hero_selection_path = os.path.join(self.bot_folder, 'hero_selection.lua')
                if os.path.exists(hero_selection_path):
                    try:
                        with open(hero_selection_path, 'r') as f:
                            content = f.read()
                        
                        pattern = r"local allBotHeroes = \{(.*?)\};"
                        match = re.search(pattern, content, re.DOTALL)
                        if match:
                            heroes_text = match.group(1)
                            heroes_from_lua = re.findall(r"'(npc_dota_hero_\w+)'", heroes_text)
                    except Exception as e:
                        print(f"Failed to read lua file: {e}")
            
            # Fallback to common heroes if lua extraction failed
            if not heroes_from_lua:
                heroes_from_lua = [
                    'npc_dota_hero_antimage', 'npc_dota_hero_axe', 'npc_dota_hero_crystal_maiden',
                    'npc_dota_hero_drow_ranger', 'npc_dota_hero_juggernaut', 'npc_dota_hero_mirana',
                    'npc_dota_hero_nevermore', 'npc_dota_hero_pudge', 'npc_dota_hero_sven',
                    'npc_dota_hero_lina', 'npc_dota_hero_lion', 'npc_dota_hero_invoker'
                ]
            
            # Create hero data with local image references
            for hero_internal in heroes_from_lua:
                display_name = self.internal_to_display_name(hero_internal)
                
                # Use local image files
                portrait_url = f"/static/images/heroes/{hero_internal}.png"
                
                self.hero_data[hero_internal] = {
                    'display_name': display_name,
                    'internal_name': hero_internal,
                    'portrait_url': portrait_url
                }
    
    def internal_to_display_name(self, internal_name):
        """Convert internal hero name to display name"""
        name_map = {
            'npc_dota_hero_antimage': 'Anti-Mage',
            'npc_dota_hero_queenofpain': 'Queen of Pain',
            'npc_dota_hero_nevermore': 'Shadow Fiend',
            'npc_dota_hero_windrunner': 'Windranger',
            'npc_dota_hero_zuus': 'Zeus',
            'npc_dota_hero_furion': 'Nature\'s Prophet',
            'npc_dota_hero_necrolyte': 'Necrophos',
            'npc_dota_hero_skeleton_king': 'Wraith King',
            'npc_dota_hero_lifestealer': 'Lifestealer',
            'npc_dota_hero_doom_bringer': 'Doom',
            'npc_dota_hero_rattletrap': 'Clockwerk',
            'npc_dota_hero_shredder': 'Timbersaw',
            'npc_dota_hero_magnataur': 'Magnus',
            'npc_dota_hero_obsidian_destroyer': 'Outworld Destroyer',
            'npc_dota_hero_wisp': 'Io'
        }
        
        if internal_name in name_map:
            return name_map[internal_name]
        
        # Default conversion
        return internal_name.replace('npc_dota_hero_', '').replace('_', ' ').title()
    
    def parse_hero_selection(self):
        """Parse current hero selection from Lua file"""
        if not self.bot_folder:
            return {'radiant': [], 'dire': []}
        
        hero_selection_path = os.path.join(self.bot_folder, 'hero_selection.lua')
        if not os.path.exists(hero_selection_path):
            return {'radiant': [], 'dire': []}
        
        try:
            with open(hero_selection_path, 'r') as f:
                content = f.read()
            
            teams = {'radiant': [], 'dire': []}
            
            # Parse radiant team
            radiant_pattern = r"local radiantHeroList = \{(.*?)\}"
            radiant_match = re.search(radiant_pattern, content, re.DOTALL)
            if radiant_match:
                radiant_heroes = re.findall(r"'(npc_dota_hero_\w+)'", radiant_match.group(1))
                teams['radiant'] = radiant_heroes
            
            # Parse dire team
            dire_pattern = r"local direHeroList = \{(.*?)\}"
            dire_match = re.search(dire_pattern, content, re.DOTALL)
            if dire_match:
                dire_heroes = re.findall(r"'(npc_dota_hero_\w+)'", dire_match.group(1))
                teams['dire'] = dire_heroes
            
            return teams
        except Exception as e:
            print(f"Failed to parse hero selection: {e}")
            return {'radiant': [], 'dire': []}

    def load_hero_roles(self):
            """Load hero roles from RoleUtility.lua"""
            roles_data = {}
            
            if not self.bot_folder:  # FIX: Use self
                return roles_data
            
            role_utility_path = os.path.join(self.bot_folder, 'RoleUtility.lua')
            if not os.path.exists(role_utility_path):
                return roles_data
            
            try:
                with open(role_utility_path, 'r') as f:
                    content = f.read()
                
                # Parse each role list (off, mid, safe, supp)
                role_patterns = {
                    'off': r"X\['off'\]\s*=\s*\{(.*?)\}",
                    'mid': r"X\['mid'\]\s*=\s*\{(.*?)\}",
                    'safe': r"X\['safe'\]\s*=\s*\{(.*?)\}",
                    'supp': r"X\['supp'\]\s*=\s*\{(.*?)\}"
                }
                
                for role, pattern in role_patterns.items():
                    match = re.search(pattern, content, re.DOTALL)
                    if match:
                        heroes_text = match.group(1)
                        heroes = re.findall(r"'(npc_dota_hero_\w+)'", heroes_text)
                        for hero in heroes:
                            if hero not in roles_data:
                                roles_data[hero] = []
                            roles_data[hero].append(role)
                
                return roles_data
                
            except Exception as e:
                print(f"Failed to load hero roles: {e}")
                return roles_data
    
    def save_hero_selection(self, teams):
        """Save hero selection to Lua file with backup"""
        if not self.bot_folder:
            raise Exception("Bot folder not found")
        
        hero_selection_path = os.path.join(self.bot_folder, 'hero_selection.lua')
        if not os.path.exists(hero_selection_path):
            raise Exception("hero_selection.lua not found")
        
        # Create backup
        self.create_backup(hero_selection_path)
        
        # Read current file
        with open(hero_selection_path, 'r') as f:
            content = f.read()
        
        # Update radiant team
        radiant_heroes = ',\n    '.join([f"'{hero}'" for hero in teams['radiant']])
        radiant_replacement = f"local radiantHeroList = {{\n    {radiant_heroes}\n}}"
        content = re.sub(
            r"local radiantHeroList = \{.*?\}",
            radiant_replacement,
            content,
            flags=re.DOTALL
        )
        
        # Update dire team
        dire_heroes = ',\n    '.join([f"'{hero}'" for hero in teams['dire']])
        dire_replacement = f"local direHeroList = {{\n    {dire_heroes}\n}}"
        content = re.sub(
            r"local direHeroList = \{.*?\}",
            dire_replacement,
            content,
            flags=re.DOTALL
        )
        
        # Save file
        with open(hero_selection_path, 'w') as f:
            f.write(content)
        
        # Update config
        self.config['last_teams'] = teams
        self.save_config()
    
    def create_backup(self, file_path):
        """Create backup of file"""
        backup_dir = os.path.join(os.path.dirname(file_path), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        filename = os.path.basename(file_path)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = os.path.join(backup_dir, f"{filename}.{timestamp}.backup")
        
        shutil.copy2(file_path, backup_path)
        self.clean_old_backups(backup_dir, filename)
    
    def clean_old_backups(self, backup_dir, filename):
        """Keep only the most recent N backups"""
        if not os.path.exists(backup_dir):
            return
        
        backup_files = []
        for f in os.listdir(backup_dir):
            if f.startswith(filename):
                backup_files.append(os.path.join(backup_dir, f))
        
        backup_files.sort(key=os.path.getmtime, reverse=True)
        
        # Remove old backups
        for old_backup in backup_files[self.config['backup_count']:]:
            os.remove(old_backup)
    
    def update_hero_lists(self, hero_id, new_status):
        """Move hero between allBotHeroes and UnImplementedHeroes lists"""
        if not self.bot_folder:
            return False
        
        hero_selection_path = os.path.join(self.bot_folder, 'hero_selection.lua')
        if not os.path.exists(hero_selection_path):
            return False
        
        try:
            # Create backup
            self.create_backup(hero_selection_path)
            
            # Read current file
            with open(hero_selection_path, 'r') as f:
                content = f.read()
            
            # Remove hero from both lists first
            self.all_bot_heroes.discard(hero_id)
            self.unimplemented_heroes.discard(hero_id)
            
            # Add to appropriate list
            if new_status == 'available':
                self.all_bot_heroes.add(hero_id)
            elif new_status == 'unimplemented':
                self.unimplemented_heroes.add(hero_id)
            
            # Update allBotHeroes in content
            all_heroes_str = ',\n\t'.join([f"'{hero}'" for hero in sorted(self.all_bot_heroes)])
            all_heroes_replacement = f"local allBotHeroes = {{\n\t{all_heroes_str}\n}};"
            content = re.sub(
                r"local allBotHeroes = \{.*?\};",
                all_heroes_replacement,
                content,
                flags=re.DOTALL
            )
            
            # Update UnImplementedHeroes in content
            unimpl_heroes_str = ',\n\t'.join([f"'{hero}'" for hero in sorted(self.unimplemented_heroes)])
            unimpl_replacement = f"local UnImplementedHeroes = {{\n\t{unimpl_heroes_str}\n}};"
            content = re.sub(
                r"local UnImplementedHeroes = \{.*?\};",
                unimpl_replacement,
                content,
                flags=re.DOTALL
            )
            
            # Write updated file
            with open(hero_selection_path, 'w') as f:
                f.write(content)
            
            if hero_id in self.hero_data:
                self.hero_data[hero_id]['status'] = new_status
            return True
            
        except Exception as e:
            print(f"Failed to update hero lists: {e}")
            return False

    def get_hero_items(self, hero_id, user=None):
        """Get items list for a specific hero, optionally for a specific user"""

        # Always try to get from user builds first
        if user and user in self.users_data.get('user_builds', {}):
            user_builds = self.users_data['user_builds'][user]
            if hero_id in user_builds:
                return [{'name': item} for item in user_builds[hero_id]]

        # If no user builds exist, fall back to lua file (for backwards compatibility)
        if not self.bot_folder:
            return []
        
        # Convert internal name to filename (remove npc_dota_hero_ prefix)
        hero_name = hero_id.replace('npc_dota_hero_', '')
        item_file_path = os.path.join(self.bot_folder, 'builds', f'item_build_{hero_name}.lua')

        if not os.path.exists(item_file_path):
            return []
        
        try:
            with open(item_file_path, 'r') as f:
                content = f.read()
            
            # Extract items array using regex
            pattern = r'X\["items"\]\s*=\s*\{(.*?)\};'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                items_text = match.group(1)
                # Extract item names - only active items
                items = []
                for line in items_text.split('\n'):
                    line = line.strip()
                    if line and line.startswith('"'):
                        # Extract item name
                        item_match = re.search(r'"([^"]+)"', line)
                        if item_match:
                            item_name = item_match.group(1)
                            items.append({
                                'name': item_name
                            })
                return items
            return []
        except Exception as e:
            print(f"Failed to parse items for {hero_id}: {e}")
            return []

    def save_hero_items(self, hero_id, items, user='default'):
        """Save items list for a specific hero and user"""
        # Save to user builds in JSON
        if user not in self.users_data['user_builds']:
            self.users_data['user_builds'][user] = {}
        
        self.users_data['user_builds'][user][hero_id] = items
        self.save_users()

        # Always write the selected user's build to lua file (so game uses it)
        if not self.bot_folder:
            return False
        
        # Convert internal name to filename (remove npc_dota_hero_ prefix)
        hero_name = hero_id.replace('npc_dota_hero_', '')
        item_file_path = os.path.join(self.bot_folder, 'builds', f'item_build_{hero_name}.lua')
        
        if not os.path.exists(item_file_path):
            return False
        
        try:
            # Create backup
            self.create_backup(item_file_path)
            
            # Read current file
            with open(item_file_path, 'r') as f:
                content = f.read()
            
            # Create new items array string
            items_lines = [f'\t"{item}",' for item in items]
            new_items_section = 'X["items"] = {\n' + '\n'.join(items_lines) + '\n};'
            
            # Replace the items section
            pattern = r'X\["items"\]\s*=\s*\{.*?\};'
            content = re.sub(pattern, new_items_section, content, flags=re.DOTALL)
            
            # Write updated file
            with open(item_file_path, 'w') as f:
                f.write(content)
            
            print(f"Saved {len(items)} items for {hero_id} (user: {user})")
            return True
            
        except Exception as e:
            print(f"Failed to save items for {hero_id}: {e}")
            return False

# Initialize bot manager
bot_manager = BotManager()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/heroes')
def get_heroes():
    """Get all available heroes"""
    return jsonify(bot_manager.hero_data)

@app.route('/api/teams')
def get_teams():
    """Get current team configuration"""
    if bot_manager.config['last_teams']['radiant'] or bot_manager.config['last_teams']['dire']:
        return jsonify(bot_manager.config['last_teams'])
    else:
        return jsonify(bot_manager.parse_hero_selection())

@app.route('/api/teams', methods=['POST'])
def save_teams():
    """Save team configuration"""
    try:
        teams = request.json
        bot_manager.save_hero_selection(teams)
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error saving teams: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/bot-folder')
def get_bot_folder():
    """Get current bot folder path"""
    return jsonify({
        'path': bot_manager.bot_folder,
        'detected': bot_manager.bot_folder is not None
    })

@app.route('/api/bot-folder', methods=['POST'])
def set_bot_folder():
    """Set bot folder path manually"""
    try:
        data = request.get_json()
        if not data or 'path' not in data:
            return jsonify({'success': False, 'error': 'Path not provided'})
        
        folder_path = data['path']
        if os.path.exists(os.path.join(folder_path, 'hero_selection.lua')):
            bot_manager.bot_folder = folder_path
            bot_manager.load_hero_lists_from_lua()
            # Update hero statuses based on the newly loaded lists
            for hero_id in bot_manager.hero_data:
                if hero_id in bot_manager.all_bot_heroes:
                    bot_manager.hero_data[hero_id]['status'] = 'available'
                elif hero_id in bot_manager.unimplemented_heroes:
                    bot_manager.hero_data[hero_id]['status'] = 'unimplemented'
                else:
                    bot_manager.hero_data[hero_id]['status'] = 'unavailable'
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'hero_selection.lua not found in specified folder'})
    except Exception as e:
        print(f"Error setting bot folder: {e}")
        return jsonify({'success': False, 'error': str(e)})

# Add route to serve hero images with proper headers
@app.route('/static/images/heroes/<filename>')
def serve_hero_image(filename):
    """Serve hero images with proper headers"""
    from flask import send_from_directory
    return send_from_directory('static/images/heroes', filename)

@app.route('/api/hero-status', methods=['POST'])
def update_hero_status():
    """Move hero between available and unimplemented lists"""
    try:
        data = request.get_json()
        if not data or 'hero' not in data or 'status' not in data:
            return jsonify({'success': False, 'error': 'Hero and status required'})
        
        hero_id = data['hero']
        new_status = data['status']
        
        if new_status not in ['available', 'unimplemented']:
            return jsonify({'success': False, 'error': 'Invalid status'})
        
        # Update the hero lists in the lua file
        result = bot_manager.update_hero_lists(hero_id, new_status)
        if result:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to update hero lists'})
        
    except Exception as e:
        print(f"Error updating hero status: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/hero-items/<hero_id>')
def get_hero_items(hero_id):
    """Get items for a specific hero"""
    try:
        user = request.args.get('user', 'default')
        items = bot_manager.get_hero_items(hero_id, user)
        return jsonify({'success': True, 'items': items})
    except Exception as e:
        print(f"Error getting items for {hero_id}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/hero-items/<hero_id>', methods=['POST'])
def save_hero_items(hero_id):
    """Save items for a specific hero"""
    try:
        data = request.get_json()
        if not data or 'items' not in data:
            return jsonify({'success': False, 'error': 'Items list required'})
        
        items = data['items']
        user = data.get('user', 'default')
        result = bot_manager.save_hero_items(hero_id, items, user)
        
        if result:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to save items'})
            
    except Exception as e:
        print(f"Error saving items for {hero_id}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/users')
def get_users():
    """Get all users"""
    return jsonify(bot_manager.users_data['users'])

@app.route('/api/users', methods=['POST'])
def add_user():
    """Add a new user"""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'success': False, 'error': 'User name required'})
        
        user_name = data['name'].strip()
        if not user_name:
            return jsonify({'success': False, 'error': 'User name cannot be empty'})
        
        if user_name in bot_manager.users_data['users']:
            return jsonify({'success': False, 'error': 'User already exists'})
        
        # Add user and copy default builds
        bot_manager.users_data['users'].append(user_name)
        default_builds = bot_manager.users_data['user_builds'].get('default', {})
        bot_manager.users_data['user_builds'][user_name] = default_builds.copy()
        bot_manager.save_users()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/users/<user_name>', methods=['DELETE'])
def delete_user(user_name):
    """Delete a user"""
    try:
        if user_name == 'default':
            return jsonify({'success': False, 'error': 'Cannot delete default user'})
        
        if user_name in bot_manager.users_data['users']:
            bot_manager.users_data['users'].remove(user_name)
            bot_manager.users_data['user_builds'].pop(user_name, None)
            bot_manager.save_users()
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'User not found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/import-default-builds', methods=['POST'])
def import_default_builds():
    """Import current item builds as default"""
    try:
        result = bot_manager.import_default_builds()
        if result:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to import builds'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/hero-roles')
def get_hero_roles():
    """Get all hero roles"""
    return jsonify(bot_manager.hero_roles)

if __name__ == '__main__':
    print("Starting Dota Bot Manager...")
    app.run(debug=True, host='0.0.0.0', port=5000)

