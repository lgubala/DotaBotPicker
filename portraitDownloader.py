import requests
import os

# Base URL for the OpenDota API to get hero data
HERO_STATS_API_URL = "https://api.opendota.com/api/heroStats"

# Base URL for the hero portrait images from Valve's CDN
IMAGE_BASE_URL = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/"

# The directory where you want to save the images
OUTPUT_DIR = "dota_hero_portraits"

def download_hero_portraits():
    try:
        # Step 1: Fetch hero data from the OpenDota API
        print("Fetching hero list from OpenDota API...")
        response = requests.get(HERO_STATS_API_URL)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        hero_data = response.json()
        print("Hero list fetched successfully.")

        # Create the output directory if it doesn't exist
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR)
            print(f"Created directory: {OUTPUT_DIR}")

        # Step 2: Iterate through each hero and download the image
        for hero in hero_data:
            # Get the hero's name from the API data.
            # The 'name' field is usually in the format 'npc_dota_hero_antimage'
            api_name = hero['name']

            # Extract the hero's base name (e.g., 'antimage' from 'npc_dota_hero_antimage')
            hero_short_name = api_name.replace('npc_dota_hero_', '')
            
            # Special case for some hero names that don't match the URL format exactly
            if hero_short_name == 'antimage':
                url_name = 'antimage'
            else:
                url_name = hero_short_name
                
            # Construct the full URL for the hero's portrait image
            image_url = f"{IMAGE_BASE_URL}{url_name}_full.png"
            
            # Construct the desired filename for the saved image
            filename = f"{api_name}.png"
            filepath = os.path.join(OUTPUT_DIR, filename)

            print(f"Downloading {image_url}...")
            
            try:
                # Step 3: Download the image
                image_response = requests.get(image_url)
                image_response.raise_for_status()
                
                # Step 4: Save the image with the appropriate name
                with open(filepath, 'wb') as f:
                    f.write(image_response.content)
                print(f"Saved {filepath}")

            except requests.exceptions.RequestException as e:
                print(f"Could not download image for {hero['localized_name']} ({url_name}): {e}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching hero data: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    download_hero_portraits()