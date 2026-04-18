"""One-time script to fix seed user passwords."""
import bcrypt
from pymongo import MongoClient

hashed = bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

client = MongoClient("mongodb://localhost:27017")
db = client["ats_db"]

db.users.update_many({"id": {"$in": [1, 2]}}, {"$set": {"password_hash": hashed}})

for user in db.users.find({"id": {"$in": [1, 2]}}, {"_id": 0, "id": 1, "email": 1, "password_hash": 1}):
    print(f"User {user['id']} ({user['email']}): {user['password_hash'][:20]}...")

client.close()
print("Done!")
