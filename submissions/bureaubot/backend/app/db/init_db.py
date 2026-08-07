from app.database import Base, SessionLocal, engine
from app.seed_data import seed_services
import app.models  # noqa: F401


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_services(db)


if __name__ == "__main__":
    initialize_database()
    print("BureauBot database initialized and India services seeded.")
