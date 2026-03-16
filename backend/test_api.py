import requests

def test():
    print("--- Testing Frankfurter API ---")
    
    # 1. USD to INR
    resp = requests.get('https://api.frankfurter.app/latest?from=USD&to=INR')
    if resp.status_code == 200:
        data = resp.json()
        print(f"Frankfurter USD -> INR: {data['rates']['INR']}")
        
    # 2. EUR to INR (Frankfurter base is usually EUR)
    resp = requests.get('https://api.frankfurter.app/latest?from=EUR&to=INR')
    if resp.status_code == 200:
        data = resp.json()
        print(f"Frankfurter EUR -> INR: {data['rates']['INR']}")

    # 3. Check what ExchangeRate-API is actually returning
    resp = requests.get('https://api.exchangerate-api.com/v4/latest/USD')
    if resp.status_code == 200:
        data = resp.json()
        print("\n--- Testing ExchangeRate-API ---")
        print(f"USD base.")
        usd_to_inr = data['rates']['INR']
        usd_to_eur = data['rates']['EUR']
        print(f"USD -> INR: {usd_to_inr}")
        print(f"USD -> EUR: {usd_to_eur}")
        
        # Calculate EUR to INR
        eur_to_inr = usd_to_inr / usd_to_eur
        print(f"Calculated EUR -> INR: {usd_to_inr} / {usd_to_eur} = {eur_to_inr}")

if __name__ == '__main__':
    test()
