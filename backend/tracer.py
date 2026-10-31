import json
import time
import os
from datetime import datetime

LOG_DIR = os.getenv("LOG_DIR", os.path.join(os.path.dirname(__file__), "logs"))
try:
    os.makedirs(LOG_DIR, exist_ok=True)
except Exception:
    pass
LOG_FILE_PATH = os.path.join(LOG_DIR, "llm_traces.log")

def log_llm_trace(operation: str, model: str, prompt: str, response: str, latency_sec: float, extra_meta: dict = None):
    """
    Logs an LLM interaction to a local JSONL file for tracing and observability.
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "operation": operation,
        "model": model,
        "latency_sec": round(latency_sec, 3),
        "prompt_length": len(prompt) if prompt else 0,
        "response_length": len(response) if response else 0,
        "prompt": prompt,
        "response": response,
        "meta": extra_meta or {}
    }
    
    try:
        with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        print(f"Failed to write trace log: {e}")

class TraceContext:
    """Context manager for tracing arbitrary blocks (e.g. embedding requests)."""
    def __init__(self, operation: str, model: str, prompt: str, extra_meta: dict = None):
        self.operation = operation
        self.model = model
        self.prompt = prompt
        self.extra_meta = extra_meta
        self.start_time = None
        self.response = None
        
    def __enter__(self):
        self.start_time = time.time()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        latency = time.time() - self.start_time
        if exc_type is not None:
            self.response = f"ERROR: {str(exc_val)}"
            
        log_llm_trace(
            operation=self.operation,
            model=self.model,
            prompt=self.prompt,
            response=self.response or "",
            latency_sec=latency,
            extra_meta=self.extra_meta
        )
