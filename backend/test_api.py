import urllib.request
import urllib.parse
import json

URL_BASE = "http://127.0.0.1:8000/api"

def main():
    try:
        # 2. Login
        data = json.dumps({'username': 'admin', 'password': '1q2w3e4R'}).encode('utf-8')
        req = urllib.request.Request(f"{URL_BASE}/auth/login", data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            token = res['access_token']

        # 3. Update Invoice
        # 3. Update Invoice
        # Assuming the first run created invoice ID 1, let's update it
        payload = {
            "bill_to_name": "Updated Client",
            "invoice_date": "2026-03-06",
            "due_date": "2026-03-06",
            "item_type": "standard",
            "gst_enabled": True,
            "gst_rate": "5.00",
            "hst_enabled": False,
            "hst_rate": "0",
            "payment_method": "",
            "payment_company_name": "",
            "payment_company_address": "",
            "payee": "",
            "signature_name": "",
            "contact_phone": "",
            "contact_email": "",
            "website": "",
            "bank_name": "",
            "bank_address": "",
            "transit_number": "",
            "institution_number": "",
            "account_number": "",
            "terms_conditions": "",
            "items": [
                {
                    "sort_order": 0,
                    "quantity": "1",
                    "description": "Test item",
                    "unit_price": "100.00"
                }
            ]
        }
        req = urllib.request.Request(f"{URL_BASE}/invoices", data=json.dumps(payload).encode('utf-8'), headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        })
        with urllib.request.urlopen(req) as response:
            print(response.read())
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        with open('api_error.json', 'w') as f:
            f.write(error_body)
        print(f"HTTP Error {e.code}: Error saved to api_error.json")

if __name__ == "__main__":
    main()
