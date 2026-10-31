import database
import json

conn = database.get_connection()
cursor = conn.cursor(dictionary=True)

try:
    print("--- Database State Check ---")
    
    cursor.execute("SELECT COUNT(*) as count FROM conversations")
    conv_count = cursor.fetchone()['count']
    print(f"Total Conversations: {conv_count}")
    
    cursor.execute("SELECT COUNT(*) as count FROM messages")
    msg_count = cursor.fetchone()['count']
    print(f"Total Messages: {msg_count}")
    
    if conv_count > 0:
        print("\nConversations Sample (up to 5):")
        cursor.execute("SELECT conversation_id, title FROM conversations LIMIT 5")
        for row in cursor.fetchall():
            print(f"  ID: {row['conversation_id']} | Title: {row['title']}")
            
            # Check messages for this conversation
            cursor.execute("SELECT COUNT(*) as count FROM messages WHERE conversation_id = %s", (row['conversation_id'],))
            m_count = cursor.fetchone()['count']
            print(f"    -> Contains {m_count} messages")
    
    # Check for orphaned messages (messages where conversation_id doesn't exist in conversations table)
    cursor.execute("""
        SELECT COUNT(*) as orphaned 
        FROM messages 
        WHERE conversation_id NOT IN (SELECT conversation_id FROM conversations)
    """)
    orphaned = cursor.fetchone()['orphaned']
    print(f"\nOrphaned Messages (should be 0 if CASCADE is working): {orphaned}")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    cursor.close()
    database.release_connection(conn)
