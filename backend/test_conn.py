import psycopg2
import sys

print("Python version:", sys.version)

options = [
    # 1. Direct IPv6 connection
    {
        "host": "2406:da12:1f1:f800:7cb5:d05b:77d:2521",
        "port": 5432,
        "user": "postgres",
        "password": "Saksham@2006",
        "database": "postgres"
    },
    # 2. Pooler IPv4 connection (using one of the resolved IPs)
    {
        "host": "13.124.111.232",
        "port": 6543,
        "user": "postgres.ofbqrxahegghlkpsmzvv",
        "password": "Saksham@2006",
        "database": "postgres"
    },
    {
        "host": "15.165.245.138",
        "port": 6543,
        "user": "postgres.ofbqrxahegghlkpsmzvv",
        "password": "Saksham@2006",
        "database": "postgres"
    }
]

for i, opt in enumerate(options, 1):
    print(f"\nTrying connection option {i} with config: host={opt['host']}, port={opt['port']}...")
    try:
        conn = psycopg2.connect(**opt)
        print(f"Connection option {i} succeeded!")
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        print("PG Version:", cursor.fetchone()[0])
        cursor.close()
        conn.close()
        sys.exit(0)
    except Exception as e:
        print(f"Connection option {i} failed: {e}")

sys.exit(1)
