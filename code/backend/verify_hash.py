from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed_password = "$2b$12$R5fNFj3OMMWkTcozWDKKneXaPgtJVslfb00.CtqCoS9LnqU5CD91W"

candidates = ["Shayani_99", "shayani_99"]

for cand in candidates:
    match = pwd_context.verify(cand, hashed_password)
    print(f"Password '{cand}' matches: {match}")
