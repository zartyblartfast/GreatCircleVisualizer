import json

def delete_countries():
    countries_to_delete = [
        "Åland Islands"  # Ensure correct character encoding
    ]

    with open('country-codes.json', 'r', encoding='utf-8') as country_file:
        country_data = json.load(country_file, strict=False)

    updated_country_data = {country: code for country, code in country_data.items() if country not in countries_to_delete}

    with open('country-codes.json', 'w', encoding='utf-8') as country_file:
        json.dump(updated_country_data, country_file, indent=4, ensure_ascii=False)

    print("Countries deleted successfully.")

delete_countries()
