#Coded by Team Nai Miris

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

#sqlalchemy acts as the interface between us and postgres
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

#engine is the core interface to the DB
engine = create_engine(DATABASE_URL)

#SessionLocal is the current instance of interfacing with the DB; a temporary convo 
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

#Template
Base = declarative_base()


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Tables created succesfully")

if __name__ == '__main__':
    init_db()
