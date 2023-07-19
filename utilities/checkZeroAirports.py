import json

def check_airports():
    with open('country-codes.json', 'r') as country_file:
        country_data = json.load(country_file)
    
    with open('airports.json', 'r') as airports_file:
        airports_data = json.load(airports_file)

    countries_with_no_airports = []

    for country_name, country_code in country_data.items():
        airports_count = sum(1 for airport in airports_data if airport['iso_country'] == country_code)
        if airports_count == 0:
            countries_with_no_airports.append(country_name)
    
    if countries_with_no_airports:
        print("Countries with zero airports:")
        for country in countries_with_no_airports:
            print(country)
    else:
        print("All countries have at least one airport.")

check_airports()
