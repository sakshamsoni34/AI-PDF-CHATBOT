import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Use pooler URL since it supports IPv4 properly
DB_URL = os.getenv("SUPABASE_DB_URL", "postgresql://postgres.ofbqrxahegghlkpsmzvv:Saksham%402006@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres")

def setup_database():
    print("Connecting to Supabase PostgreSQL database...")
    try:
        # Connect using the connection string
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Enabling the pgvector extension...")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        
        print("Creating table chat_history...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_email TEXT NOT NULL,
                session_id TEXT NOT NULL,
                document_names TEXT NOT NULL,
                question TEXT NOT NULL,
                response TEXT NOT NULL,
                question_embedding vector(384),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
            );
        """)
        
        print("Creating table document_chunks...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                page INTEGER NOT NULL,
                text TEXT NOT NULL,
                embedding vector(384) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
            );
        """)
        
        # Create indexes for fast semantic search
        print("Creating index on document_chunks embedding...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
            ON document_chunks USING hnsw (embedding vector_cosine_ops);
        """)
        
        print("Database setup completed successfully!")
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error setting up database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    setup_database()
