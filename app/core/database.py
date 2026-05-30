"""Database configuration - minimal stub."""
import os

class DBManager:
    def init_db(self, url=None):
        pass
    async def get_session(self):
        class _S:
            async def __aenter__(self): return self
            async def __aexit__(self, *a): pass
        return _S()

db_manager = DBManager()

def get_settings():
    class S:
        database_url = os.getenv("DATABASE_URL", ":memory:")
        llm_provider = "ollama"
        llm_model = "llama3.1:latest"
    return S()
