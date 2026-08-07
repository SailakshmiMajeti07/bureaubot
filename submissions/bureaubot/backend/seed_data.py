from app.seed_data import SERVICES_SEED_DATA, seed_database, seed_services

__all__ = ["SERVICES_SEED_DATA", "seed_services", "seed_database"]

if __name__ == "__main__":
    from app.database import Base, SessionLocal, engine

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        count = seed_services(session)
        print(f"BureauBot database initialized. Seeded {count} new services.")
