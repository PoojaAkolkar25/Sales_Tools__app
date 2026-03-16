import requests

def test():
    with open('test_api_clean.txt', 'w', encoding='utf-8') as f:
        f.write("--- Testing Frankfurter API ---\n")
        
        # 1. USD to INR
        try:
            resp = requests.get('https://api.frankfurter.app/latest?from=USD&to=INR')
            data = resp.json()
            f.write(f"Frankfurter USD -> INR: {data['rates']['INR']}\n")
        except Exception as e:
            f.write(f"Frankfurter USD error: {e}\n")
            
        # 2. EUR to INR
        try:
            resp = requests.get('https://api.frankfurter.app/latest?from=EUR&to=INR')
            data = resp.json()
            f.write(f"Frankfurter EUR -> INR: {data['rates']['INR']}\n")
        except Exception as e:
            f.write(f"Frankfurter EUR error: {e}\n")

        # 3. Check what ExchangeRate-API is actually returning
        f.write("\n--- Testing ExchangeRate-API ---\n")
        f.write("USD base.\n")
        try:
            resp = requests.get('https://api.exchangerate-api.com/v4/latest/USD')
            data = resp.json()
            usd_to_inr = data['rates']['INR']
            usd_to_eur = data['rates']['EUR']
            f.write(f"USD -> INR: {usd_to_inr}\n")
            f.write(f"USD -> EUR: {usd_to_eur}\n")
            
            # Calculate EUR to INR
            eur_to_inr = usd_to_inr / usd_to_eur
            f.write(f"Calculated EUR -> INR: {usd_to_inr} / {usd_to_eur} = {eur_to_inr}\n")
        except Exception as e:
            f.write(f"ExchangeRate-API error: {e}\n")

if __name__ == '__main__':
    test()
