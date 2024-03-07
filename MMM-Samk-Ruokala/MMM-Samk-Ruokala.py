#!/usr/bin/python3
# Muutokset tehty tammik. 24, 2024, 10:21:35
import os
import requests
import json
from datetime import datetime
import time

def is_internet_available():
    try:
        response = os.system("ping -c 1 www.google.com")
        return response == 0
    except Exception as e:
        print(f"Error checking internet connection: {e}")
        return False

# Odota internet-yhteyttä ennen koodin suorittamista
while not is_internet_available():
    print("Waiting for internet connection...")
    time.sleep(5)  # Odota 5 sekuntia ennen seuraavaa yritystä

# Jatka alkuperäistä koodia

# Aseta aikavyöhyke
os.environ['TZ'] = 'Europe/Helsinki'

class MMM_Samk_Ruokala:
    def __init__(self, name, url):
        self.name = name
        self.url = url
        self.data = None  # Uusi attribuutti datan tallentamiseen
        self.fetch_data()

    def fetch_data(self):
        response = requests.get(self.url)

        if response.status_code == 200:
            data = response.json()

            # Päivitä datan kanssa vain tämän päiväset tiedot
            today = datetime.now().strftime('%Y-%m-%d')
            self.data = [item for item in data.get('MenusForDays', []) if item.get('Date', '').startswith(today)]

            # Lähetä ilmoitus Magic Mirrorille
            print(f"Python-skripti suoritettu onnistuneesti for {self.name}")
        else:
            print(f"Virhe for {self.name}:", response.status_code)

if __name__ == "__main__":
    # Debuggaustuloste nykyisestä työhakemistosta
    print(f"Current working directory: {os.getcwd()}")

    # Tallenna kaikki tiedot yhteen tiedostoon
    all_data = {}

    restaurants = [
        {"name": "Silvia", "url": "https://www.compass-group.fi/menuapi/feed/json?costNumber=0351&language=fi"},
        {"name": "Sofia", "url": "https://www.compass-group.fi/menuapi/feed/json?costNumber=3659&language=fi"},
        {"name": "Agora", "url": "https://www.compass-group.fi/menuapi/feed/json?costNumber=035101&language=fi"}
    ]

    for restaurant in restaurants:
        ruokala_instance = MMM_Samk_Ruokala(restaurant["name"], restaurant["url"])

        # Lisää "ravintola" -avain
        restaurant_key = f"{restaurant['name']}"
        all_data[restaurant_key] = ruokala_instance.data

    # Kirjoita tiedot yhteen tiedostoon
    file_name = "/home/computestick/MagicMirror/modules/MMM-Samk-Ruokala/all_menus.json"
    try:
        with open(file_name, 'w') as file:
            json.dump(all_data, file, indent=2)
            print(f"Tiedosto {file_name} luotu onnistuneesti.")
    except Exception as e:
        print(f"Error writing to {file_name}: {e}")
