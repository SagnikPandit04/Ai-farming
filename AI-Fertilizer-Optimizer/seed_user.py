# seed_user.py
from pymongo import MongoClient
import bcrypt
from datetime import datetime

client = MongoClient("mongodb+srv://agrismart_user:##assassin1234@agrismart.e64zrm5.mongodb.net/?appName=AgriSmart")
db = client['dbconnect']

username = "farmer"
password = "password"

# Remove old plain-text user if exists
db['users'].delete_one({'username': username})

hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

db['users'].insert_one({
    'username': username,
    'password': hashed,
    'email': 'farmer@agrismart.com',
    'role': 'farmer',
    'created_at': datetime.now()
})

print("✅ User 'farmer' created with hashed password.")