import os
import json
import numpy as np
import time
import urllib.parse
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

# Fix invalid Windows CURL_CA_BUNDLE if the path does not exist
if os.getenv("CURL_CA_BUNDLE") and not os.path.exists(os.getenv("CURL_CA_BUNDLE")):
    del os.environ["CURL_CA_BUNDLE"]
if os.getenv("SSL_CERT_FILE") and not os.path.exists(os.getenv("SSL_CERT_FILE")):
    del os.environ["SSL_CERT_FILE"]

load_dotenv()

# Database configuration loaded from environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Saksham@2006")
DB_NAME = os.getenv("DB_NAME", "chatbot")
DB_SSL_CA = os.getenv("DB_SSL_CA", None)

# Support cloud connection URLs (e.g. Railway, Render, Aiven)
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL")
if DATABASE_URL and ("mysql://" in DATABASE_URL or "mysql+mysqlconnector://" in DATABASE_URL):
    parsed = urllib.parse.urlparse(DATABASE_URL)
    DB_USER = parsed.username or DB_USER
    DB_PASSWORD = parsed.password or DB_PASSWORD
    DB_HOST = parsed.hostname or DB_HOST
    if parsed.port:
        DB_PORT = parsed.port
    if parsed.path and len(parsed.path) > 1:
        DB_NAME = parsed.path.lstrip('/')

def get_db_config():
    cfg = {
        "host": DB_HOST,
        "port": DB_PORT,
        "database": DB_NAME,
        "user": DB_USER,
        "password": DB_PASSWORD,
        "autocommit": True,
    }
    if DB_SSL_CA and os.path.exists(DB_SSL_CA):
        cfg["ssl_ca"] = DB_SSL_CA
    return cfg

_db_pool = None
try:
    _db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="chatbot_pool",
        pool_size=10,
        pool_reset_session=True,
        **get_db_config()
    )
    print(f"Connected to MySQL database '{DB_NAME}' at {DB_HOST}:{DB_PORT}.")
except Exception as e:
    print(f"Warning: Failed to initialize MySQL connection pool for {DB_HOST}:{DB_PORT}: {e}")

def get_connection():
    if _db_pool:
        return _db_pool.get_connection()
    return mysql.connector.connect(**get_db_config())

def release_connection(conn):
    if conn:
        try:
            conn.close()
        except Exception:
            pass

def ensure_tables():
    """Ensure tables exist in MySQL based on the new schema."""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        with open(os.path.join(os.path.dirname(__file__), 'schema.sql'), 'r') as f:
            sql = f.read()
            # Split by ';' and execute
            statements = sql.split(';')
            for stmt in statements:
                if stmt.strip():
                    cursor.execute(stmt)
        cursor.close()
    except Exception as e:
        print(f"Error creating tables: {e}")
    finally:
        if conn:
            release_connection(conn)

# Run ensure tables on startup
ensure_tables()

# ==========================================
# USERS
# ==========================================
def get_or_create_user(email: str, name: str = None) -> int:
    """Gets user_id for an email, or creates a new user."""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT user_id FROM users WHERE email = %s;", (email,))
        row = cursor.fetchone()
        
        if row:
            return row[0]
            
        # Create new
        cursor.execute("INSERT INTO users (email, name) VALUES (%s, %s);", (email, name))
        user_id = cursor.lastrowid
        cursor.close()
        return user_id
    except Exception as e:
        print(f"Error in get_or_create_user: {e}")
        return 1 # Fallback to user_id 1
    finally:
        if conn:
            release_connection(conn)

# ==========================================
# CHAT / CONVERSATIONS
# ==========================================
def save_chat_message(user_email: str, session_id: str, document_names: str, question: str, response: str, question_embedding: list = None) -> bool:
    """
    Saves a message. 
    In the new schema, session_id maps to conversation_id.
    """
    conn = None
    try:
        user_id = get_or_create_user(user_email)
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Check if conversation exists
        conversation_id = None
        cursor.execute("SELECT conversation_id FROM conversations WHERE conversation_id = %s;", (session_id,))
        if cursor.fetchone():
            conversation_id = session_id
                
        # If no conversation_id, create a new conversation
        if not conversation_id:
            cursor.execute("INSERT INTO conversations (conversation_id, user_id, title) VALUES (%s, %s, %s);", (session_id, user_id, question[:50]))
            conversation_id = session_id
            
        # 2. Insert messages
        # User message
        cursor.execute("INSERT INTO messages (conversation_id, sender, message) VALUES (%s, %s, %s);", 
                       (conversation_id, 'user', question))
        # Bot message
        cursor.execute("INSERT INTO messages (conversation_id, sender, message) VALUES (%s, %s, %s);", 
                       (conversation_id, 'bot', response))
                       
        cursor.close()
        return str(conversation_id)
    except Exception as e:
        print(f"Error saving chat message to DB: {e}.")
        return False
    finally:
        if conn:
            release_connection(conn)

def get_chat_history(user_email: str, session_id: str) -> list:
    """Retrieve chat history (messages) for a specific user and conversation."""
    conn = None
    messages = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT message_id, sender, message, created_at
            FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC;
        """, (session_id,))
        
        rows = cursor.fetchall()
        for row in rows:
            msg_id, sender, text, created_at = row
            messages.append({
                "id": str(msg_id),
                "role": "bot" if sender == "bot" else "user",
                "text": text,
                "attachedFile": None # We dropped document_names from message level
            })
            
        cursor.close()
    except Exception as e:
        print(f"Error retrieving chat history: {e}.")
    finally:
        if conn:
            release_connection(conn)
    return messages

def delete_chat_history(user_email: str, session_id: str) -> bool:
    conn = None
    try:
        user_id = get_or_create_user(user_email)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM conversations WHERE conversation_id = %s AND user_id = %s;", (session_id, user_id))
        cursor.close()
        return True
    except Exception as e:
        print(f"Error deleting chat history: {e}")
        return False
    finally:
        if conn:
            release_connection(conn)

def get_user_sessions(user_email: str) -> list[dict]:
    """Retrieve all unique chat sessions (conversations) for a specific user."""
    conn = None
    sessions = []
    try:
        user_id = get_or_create_user(user_email)
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT conversation_id, title, updated_at
            FROM conversations
            WHERE user_id = %s
            ORDER BY updated_at DESC;
        """, (user_id,))
        
        rows = cursor.fetchall()
        for row in rows:
            c_id, title, updated_at = row
            sessions.append({
                "id": str(c_id),
                "title": title or "New Chat",
                "createdAt": int(updated_at.timestamp() * 1000) if hasattr(updated_at, 'timestamp') else int(time.time() * 1000)
            })
            
        cursor.close()
    except Exception as e:
        print(f"Error retrieving user sessions: {e}.")
    finally:
        if conn:
            release_connection(conn)
    return sessions

# ==========================================
# DOCUMENTS & RAG
# ==========================================
def save_document_chunks(document_id: str, filename: str, chunks: list, user_email: str = None) -> bool:
    """Save document and its vectorized text chunks to the database."""
    conn = None
    try:
        user_id = get_or_create_user(user_email) if user_email else 1
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Insert Document record
        # In the new schema, document_id is AUTO_INCREMENT INT. The UUID `document_id` passed by the frontend
        # might need to be ignored, and we return the real integer ID. But for now we just insert.
        cursor.execute("""
            INSERT INTO documents (user_id, title, file_name, file_url, status)
            VALUES (%s, %s, %s, %s, %s);
        """, (user_id, filename, filename, document_id, "active"))
        doc_int_id = cursor.lastrowid
        
        # 2. Insert chunks
        data = []
        for i, chunk in enumerate(chunks):
            data.append((doc_int_id, chunk["page"], i, chunk["text"], json.dumps(chunk["vector"])))
        
        cursor.executemany("""
            INSERT INTO document_chunks (document_id, page_number, chunk_order, chunk_text, embedding)
            VALUES (%s, %s, %s, %s, %s);
        """, data)
        
        cursor.close()
        return str(doc_int_id)
    except Exception as e:
        print(f"Error saving document chunks to DB: {e}.")
        return False
    finally:
        if conn:
            release_connection(conn)

def search_document_chunks(query_embedding: list, active_doc_ids: list = None, user_email: str = None, top_k: int = 4) -> list:
    """Find similar document chunks using numpy cosine similarity."""
    conn = None
    results = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        query_sql = """
            SELECT dc.chunk_text, d.file_name, dc.page_number, dc.embedding
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.document_id
        """
        
        if active_doc_ids:
            # Match by file_url (UUID), document_id (integer), or file_name
            format_strings = ','.join(['%s'] * len(active_doc_ids))
            cursor.execute(query_sql + f" WHERE d.file_url IN ({format_strings}) OR d.document_id IN ({format_strings}) OR d.file_name IN ({format_strings})", tuple(active_doc_ids) * 3)
        elif user_email:
            user_id = get_or_create_user(user_email)
            cursor.execute(query_sql + " WHERE d.user_id = %s", (user_id,))
        else:
            cursor.execute(query_sql)
            
        rows = cursor.fetchall()
        
        q_vec = np.array(query_embedding)
        for row in rows:
            text, filename, page, emb_str = row
            if isinstance(emb_str, str):
                c_vec = np.array(json.loads(emb_str))
            else:
                c_vec = np.array(emb_str)
            
            # Guard against mismatched embedding dimensionality
            if q_vec.shape != c_vec.shape:
                continue

            q_norm = np.linalg.norm(q_vec)
            c_norm = np.linalg.norm(c_vec)
            if q_norm == 0 or c_norm == 0:
                continue

            score = np.dot(q_vec, c_vec) / (q_norm * c_norm)
            
            if score > 0.2:
                results.append({
                    "text": text,
                    "source": filename,
                    "page": page,
                    "score": float(score)
                })
                
        cursor.close()
        results.sort(key=lambda x: x["score"], reverse=True)

        # Fallback for broad overview questions (e.g. "What is this PDF saying?")
        if not results and rows:
            for row in rows[:top_k]:
                text, filename, page, _ = row
                results.append({
                    "text": text,
                    "source": filename,
                    "page": page,
                    "score": 0.5
                })

        return results[:top_k]
        
    except Exception as e:
        print(f"Error searching DB document chunks: {e}.")
        return []
    finally:
        if conn:
            release_connection(conn)

def get_unique_documents(user_email: str = None) -> list:
    """Get list of all unique documents uploaded."""
    conn = None
    documents = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if user_email:
            user_id = get_or_create_user(user_email)
            cursor.execute("SELECT file_url, file_name FROM documents WHERE user_id = %s ORDER BY file_name;", (user_id,))
        else:
            cursor.execute("SELECT file_url, file_name FROM documents ORDER BY file_name;")
        rows = cursor.fetchall()
        for row in rows:
            doc_id, name = row
            documents.append({"id": doc_id, "name": name})
        cursor.close()
    except Exception as e:
        print(f"Error getting unique documents: {e}")
    finally:
        if conn:
            release_connection(conn)
    return documents

def delete_document(document_id: str) -> bool:
    """Delete document and cascade chunks."""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Delete by file_url (UUID) or int ID
        cursor.execute("DELETE FROM documents WHERE file_url = %s OR document_id = %s;", (document_id, document_id))
        cursor.close()
        return True
    except Exception as e:
        print(f"Error deleting document: {e}")
        return False
    finally:
        if conn:
            release_connection(conn)

def clear_all_documents(user_email: str = None) -> bool:
    """Safely clear active context without wiping database tables."""
    return True

def get_document_chunks(document_id: str, user_email: str = None) -> list:
    conn = None
    chunks = []
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT dc.chunk_text, dc.page_number 
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.document_id
            WHERE d.file_url = %s OR d.document_id = %s 
            ORDER BY dc.page_number, dc.chunk_order;
        """, (document_id, document_id))
        rows = cursor.fetchall()
        for row in rows:
            chunks.append({"text": row[0], "page": row[1]})
        cursor.close()
    except Exception as e:
        print(f"Error getting document chunks: {e}.")
    finally:
        if conn:
            release_connection(conn)
    return chunks

# ==========================================
# ADMIN ENDPOINTS
# ==========================================
def get_all_rows(table_name: str) -> list:
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 1000;") 
        rows = cursor.fetchall()
        
        for row in rows:
            for key, val in row.items():
                if hasattr(val, 'isoformat'):
                    row[key] = val.isoformat()
                elif isinstance(val, (dict, list)):
                    row[key] = json.dumps(val)
                    
        cursor.close()
        return rows
    except Exception as e:
        print(f"Error fetching rows for {table_name}: {e}")
        return []
    finally:
        if conn:
            release_connection(conn)

def insert_row(table_name: str, data: dict) -> bool:
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['%s'] * len(data))
        values = tuple(data.values())
        
        cursor.execute(f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders});", values)
        cursor.close()
        return True
    except Exception as e:
        print(f"Error inserting row into {table_name}: {e}")
        return False
    finally:
        if conn:
            release_connection(conn)

# ==========================================
# OTP AUTHENTICATION
# ==========================================
def store_otp(identifier: str, otp_code: str, expires_at_ms: int) -> bool:
    """Stores an OTP code with expiry timestamp in MySQL."""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Invalidate any old unused OTP for this identifier
        cursor.execute("UPDATE otps SET used = TRUE WHERE identifier = %s AND used = FALSE;", (identifier,))
        cursor.execute("""
            INSERT INTO otps (identifier, otp_code, expires_at, used)
            VALUES (%s, %s, %s, FALSE);
        """, (identifier, otp_code, expires_at_ms))
        cursor.close()
        return True
    except Exception as e:
        print(f"Error storing OTP in DB: {e}")
        return False
    finally:
        if conn:
            release_connection(conn)

def verify_otp(identifier: str, otp_code: str) -> bool:
    """Verifies that an OTP code is valid, unused, and not expired."""
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_ms = int(time.time() * 1000)
        cursor.execute("""
            SELECT otp_id, expires_at FROM otps
            WHERE identifier = %s AND otp_code = %s AND used = FALSE
            ORDER BY created_at DESC LIMIT 1;
        """, (identifier, otp_code))
        row = cursor.fetchone()
        if not row:
            cursor.close()
            return False
            
        otp_id, expires_at = row
        if now_ms > expires_at:
            cursor.execute("UPDATE otps SET used = TRUE WHERE otp_id = %s;", (otp_id,))
            cursor.close()
            return False
            
        # Mark as used so it cannot be replayed
        cursor.execute("UPDATE otps SET used = TRUE WHERE otp_id = %s;", (otp_id,))
        cursor.close()
        return True
    except Exception as e:
        print(f"Error verifying OTP in DB: {e}")
        return False
    finally:
        if conn:
            release_connection(conn)

