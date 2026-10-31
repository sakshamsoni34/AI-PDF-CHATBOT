import database

conn = database.get_connection()
cursor = conn.cursor()

try:
    # We need to find the exact foreign key name. Usually it's messages_ibfk_1
    cursor.execute("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'messages' AND COLUMN_NAME = 'conversation_id' AND REFERENCED_TABLE_NAME = 'conversations';")
    fk_row = cursor.fetchone()
    if fk_row:
        fk_name = fk_row[0]
        cursor.execute(f"ALTER TABLE messages DROP FOREIGN KEY {fk_name};")
    
    # We also need to drop the FK in feedback if we alter messages? No, feedback references message_id, which is INT.
    # Now alter the columns to VARCHAR(255)
    # But wait, conversations has AUTO_INCREMENT on conversation_id. We must remove AUTO_INCREMENT first.
    cursor.execute("ALTER TABLE conversations MODIFY conversation_id VARCHAR(255);")
    cursor.execute("ALTER TABLE messages MODIFY conversation_id VARCHAR(255);")
    
    cursor.execute("ALTER TABLE messages ADD FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE;")
    
    conn.commit()
    print("Successfully altered tables.")
except Exception as e:
    print(f"Error altering tables: {e}")
finally:
    cursor.close()
    database.release_connection(conn)
