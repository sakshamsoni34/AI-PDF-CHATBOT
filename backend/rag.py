import os
import fitz  # PyMuPDF
import numpy as np
import time
import json
import re
from dotenv import load_dotenv

# Fix invalid Windows CURL_CA_BUNDLE if the path does not exist
if os.getenv("CURL_CA_BUNDLE") and not os.path.exists(os.getenv("CURL_CA_BUNDLE")):
    del os.environ["CURL_CA_BUNDLE"]
if os.getenv("SSL_CERT_FILE") and not os.path.exists(os.getenv("SSL_CERT_FILE")):
    del os.environ["SSL_CERT_FILE"]

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

gemini_client = None
gemini_types = None
if GEMINI_API_KEY:
    try:
        from google import genai
        from google.genai import types as gtypes
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        gemini_types = gtypes
        print("Initialized Google Gemini client.")
    except Exception as e:
        print(f"Warning: Failed to initialize Google Gemini client: {e}")

hf_client = None
if HF_API_KEY:
    try:
        from huggingface_hub import InferenceClient
        hf_client = InferenceClient(token=HF_API_KEY)
        print("Initialized Hugging Face client.")
    except Exception as e:
        print(f"Warning: Failed to initialize Hugging Face client: {e}")

if not gemini_client and not hf_client:
    raise ValueError("Neither GEMINI_API_KEY nor HUGGINGFACE_API_KEY found in .env")

# Models configuration
GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"
GEMINI_LLM_MODEL = "gemini-2.5-flash-lite"
EMBEDDING_DIM = 384  # Matches existing database chunks dimension

HF_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
HF_LLM_MODEL = "Qwen/Qwen2.5-7B-Instruct"

import database
from tracer import TraceContext, log_llm_trace


def extract_text_with_metadata(pdf_bytes: bytes, filename: str) -> list[dict]:
    """Extracts text per page with metadata."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages_data = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text()
        if text.strip():
            pages_data.append({
                "text": text,
                "page": page_num,
                "filename": filename
            })
    return pages_data


def chunk_text(pages_data: list[dict], max_chars: int = 800, overlap: int = 150) -> list[dict]:
    """Splits text into chunks by sentence boundaries while preserving page metadata."""
    chunks = []
    
    for page_data in pages_data:
        clean_text = " ".join(page_data["text"].split())
        sentences = re.split(r'(?<=[.!?]) +', clean_text)
        
        current_chunk_sentences = []
        current_length = 0
        
        for sentence in sentences:
            if current_length + len(sentence) > max_chars and current_chunk_sentences:
                c_text = " ".join(current_chunk_sentences)
                chunks.append({
                    "text": c_text,
                    "page": page_data["page"],
                    "filename": page_data["filename"]
                })
                
                overlap_sentences = []
                overlap_length = 0
                for s in reversed(current_chunk_sentences):
                    if overlap_length + len(s) + 1 <= overlap:
                        overlap_sentences.insert(0, s)
                        overlap_length += len(s) + 1
                    else:
                        break
                current_chunk_sentences = overlap_sentences
                current_length = overlap_length
                
            current_chunk_sentences.append(sentence)
            current_length += len(sentence) + 1
            
        if current_chunk_sentences:
            chunks.append({
                "text": " ".join(current_chunk_sentences),
                "page": page_data["page"],
                "filename": page_data["filename"]
            })
            
    return chunks


def process_and_store_pdf(pdf_bytes: bytes, filename: str, document_id: str, user_email: str = None):
    """Parses PDF, chunks it, generates embeddings, and stores them in MySQL."""
    # 1. Extract text with metadata
    pages_data = extract_text_with_metadata(pdf_bytes, filename)
    
    # 2. Chunk text keeping metadata
    chunks = chunk_text(pages_data)
    if not chunks:
        # Fallback if no selectable text was extracted (e.g. image-only PDF)
        chunks = [{
            "text": f"Document {filename} was processed, but no selectable text was found.",
            "page": 1,
            "filename": filename
        }]
    print(f"Split PDF into {len(chunks)} chunks.")
    
    # 3. Generate Embeddings (batch processing)
    new_chunks = []
    batch_size = 50
    
    def process_batch(batch_chunks):
        batch_texts = [c["text"] for c in batch_chunks]
        embeddings = None
        for attempt in range(3):
            try:
                if gemini_client and gemini_types:
                    with TraceContext("feature_extraction_batch", GEMINI_EMBEDDING_MODEL, f"{len(batch_texts)} texts"):
                        resp = gemini_client.models.embed_content(
                            model=GEMINI_EMBEDDING_MODEL,
                            contents=batch_texts,
                            config=gemini_types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM)
                        )
                        embeddings = [e.values for e in resp.embeddings]
                elif hf_client:
                    with TraceContext("feature_extraction_batch", HF_EMBEDDING_MODEL, f"{len(batch_texts)} texts"):
                        embeddings = hf_client.feature_extraction(
                            model=HF_EMBEDDING_MODEL,
                            text=batch_texts
                        )
                break
            except Exception as e:
                print(f"Embedding network error (attempt {attempt + 1}): {e}")
                if attempt == 2:
                    raise e
                time.sleep(2)
            
        if isinstance(embeddings, np.ndarray):
            embeddings = embeddings.tolist()
            
        processed = []
        for idx, embedding in enumerate(embeddings):
            vec = np.array(embedding)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            processed.append({
                "text": batch_chunks[idx]["text"],
                "vector": vec.tolist(),
                "page": batch_chunks[idx]["page"]
            })
        return processed

    for i in range(0, len(chunks), batch_size):
        batch_result = process_batch(chunks[i:i + batch_size])
        new_chunks.extend(batch_result)
            
    # Store in database
    success = database.save_document_chunks(document_id, filename, new_chunks, user_email=user_email)
    if success:
        print(f"Successfully stored {len(new_chunks)} vectorized chunks in database for {document_id}.")
        return document_id
    else:
        print(f"Failed to store vectorized chunks in database for {document_id}.")
        raise ValueError(f"Failed to store document chunks in database for {filename}")


def get_query_embedding(query: str) -> list:
    """Helper to generate a normalized embedding for a query string."""
    query_embedding = None
    for attempt in range(3):
        try:
            if gemini_client and gemini_types:
                with TraceContext("feature_extraction_query", GEMINI_EMBEDDING_MODEL, query):
                    resp = gemini_client.models.embed_content(
                        model=GEMINI_EMBEDDING_MODEL,
                        contents=query,
                        config=gemini_types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM)
                    )
                    query_embedding = resp.embeddings[0].values
            elif hf_client:
                with TraceContext("feature_extraction_query", HF_EMBEDDING_MODEL, query):
                    query_embedding = hf_client.feature_extraction(
                        model=HF_EMBEDDING_MODEL,
                        text=query
                    )
            break
        except Exception as e:
            if attempt == 2:
                raise e
            time.sleep(2)
            
    if isinstance(query_embedding, np.ndarray):
        query_embedding = query_embedding.tolist()
        
    if isinstance(query_embedding[0], list):
        query_embedding = query_embedding[0]
        
    q_vec = np.array(query_embedding)
    q_norm = np.linalg.norm(q_vec)
    if q_norm > 0:
        q_vec = q_vec / q_norm
        
    return q_vec.tolist()


def search_similar_chunks(query: str, active_doc_ids: list[str] = None, user_email: str = None, top_k: int = 4):
    """Finds the most relevant chunks using semantic search."""
    try:
        q_vec_list = get_query_embedding(query)
    except Exception as e:
        print(f"Error generating query embedding: {e}")
        return []
        
    results = database.search_document_chunks(q_vec_list, active_doc_ids, user_email=user_email, top_k=top_k)
    return results


def generate_rag_response_stream(user_query: str, history: list = None, active_doc_ids: list = None, session_id: str = None, email: str = None, q_emb: list = None):
    """Generates an LLM response using context retrieved from the PDF and streams it."""
    
    folder_directive = """
### **Folder Creation Directive**
If the user explicitly asks you to create a folder and store information in it (especially for saving the chat or details), you MUST wrap the information to be stored inside special XML tags. Use the format: <folder name="FolderName">content to store</folder>. 
CRITICAL: The content you generate inside this folder MUST be formatted as a "well-mannered" Study Guide tailored for students. It should synthesize the entire chat history/topic into a highly readable, educational document. Use clear headings, bullet points, summaries, and easy-to-understand language. Do not just dump raw chat history; structure it beautifully. Do not wrap your entire response in this tag, only the content meant to be saved.
"""

    has_active_docs = bool(active_doc_ids and len(active_doc_ids) > 0)
    user_docs = database.get_unique_documents(user_email=email)
    has_documents = has_active_docs or len(user_docs) > 0 or len(database.get_unique_documents()) > 0

    sources = []
    context = ""

    if has_documents:
        relevant_chunks = search_similar_chunks(user_query, active_doc_ids, user_email=email, top_k=6)
        if not relevant_chunks and has_active_docs:
            # Fall back to document's main chunks so the AI can always answer broad questions
            for doc_id in active_doc_ids:
                doc_chunks = database.get_document_chunks(doc_id, user_email=email)
                for chunk in doc_chunks[:6]:
                    relevant_chunks.append({
                        "text": chunk["text"],
                        "source": "Document",
                        "page": chunk.get("page", 1),
                        "score": 0.5
                    })

        if relevant_chunks:
            for chunk in relevant_chunks:
                context += f"[Document: {chunk['source']} - Page {chunk.get('page', '?')}]\n{chunk['text']}\n\n"
            sources = [{"text": c["text"], "source": c["source"], "page": c.get("page", "?"), "score": c["score"]} for c in relevant_chunks]

    if context:
        system = f"""You are an intelligent, helpful, and friendly AI Research Assistant.
The user has provided the following document context for reference:

---
{context}
---

### Guidelines:
1. **Answer Any User Query:** Answer the user's questions helpfully and thoroughly. You can write summaries, analyze sections, compare details, answer specific questions, or discuss related concepts freely.
2. **Document Grounding & Citations:** Whenever you use information from the provided document, cite the source metadata inline (e.g., `[{sources[0]['source'] if sources else 'Document'} - Page X]`).
3. **General Knowledge & Inquiries:** If the user asks something beyond the document or enters a conversational query, answer it intelligently, politely, and helpfully using your broad knowledge, while relating back to the document when appropriate. Never reject or refuse the user's question.
4. **Structured Formatting:** Format your answers beautifully using Markdown with clear headers (###), bullet points, and bold text for clarity and readability.
{folder_directive}"""
    else:
        system = f"""You are an intelligent, helpful, and friendly AI Assistant. Answer the user's query clearly, accurately, and thoroughly using Markdown formatting.
{folder_directive}"""

    # Yield sources first
    yield f"data: {json.dumps({'sources': sources})}\n\n"

    start_time = time.time()
    response_text = ""

    if gemini_client and gemini_types:
        # Gemini Streaming Implementation
        contents = []
        if history:
            for msg in history:
                text_content = msg.get("text", "")
                if not text_content:
                    continue
                role = "model" if msg.get("role") in ["bot", "model", "assistant"] else "user"
                # Gemini multi-turn conversation cannot begin with model role
                if not contents and role == "model":
                    continue
                contents.append(gemini_types.Content(
                    role=role,
                    parts=[gemini_types.Part.from_text(text=text_content)]
                ))

        contents.append(gemini_types.Content(
            role="user",
            parts=[gemini_types.Part.from_text(text=user_query)]
        ))

        config = gemini_types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.2,
            max_output_tokens=2048,
        )

        for attempt in range(3):
            try:
                for chunk in gemini_client.models.generate_content_stream(
                    model=GEMINI_LLM_MODEL,
                    contents=contents,
                    config=config,
                ):
                    if chunk.text:
                        response_text += chunk.text
                        yield f"data: {json.dumps({'text': chunk.text})}\n\n"
                break
            except Exception as e:
                print(f"Gemini streaming error (attempt {attempt + 1}): {e}")
                if attempt == 2:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    return
                time.sleep(2)

    elif hf_client:
        # Hugging Face Streaming Fallback
        messages = [{"role": "system", "content": system}]
        if history:
            for msg in history:
                role = "assistant" if msg.get("role") == "bot" else "user"
                messages.append({"role": role, "content": msg.get("text", "")})
        messages.append({"role": "user", "content": user_query})

        for attempt in range(3):
            try:
                stream = hf_client.chat_completion(
                    model=HF_LLM_MODEL,
                    messages=messages,
                    max_tokens=2048,
                    temperature=0.2,
                    stream=True
                )
                for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        response_text += content
                        yield f"data: {json.dumps({'text': content})}\n\n"
                break
            except Exception as e:
                print(f"Hugging Face stream error (attempt {attempt + 1}): {e}")
                if attempt == 2:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    return
                time.sleep(2)
            
    # Trace the streaming request
    log_llm_trace(
        operation="chat_completion_stream",
        model=GEMINI_LLM_MODEL if gemini_client else HF_LLM_MODEL,
        prompt=user_query,
        response=response_text,
        latency_sec=time.time() - start_time
    )
            
    # Save to database after stream finishes
    if session_id and email:
        try:
            active_docs = database.get_unique_documents(user_email=email)
            active_doc_names_list = []
            if active_doc_ids:
                active_doc_names_list = [d["name"] for d in active_docs if d["id"] in active_doc_ids]
            document_names_str = ", ".join(active_doc_names_list) if active_doc_names_list else "None"
            
            database.save_chat_message(
                email,
                session_id,
                document_names_str,
                user_query,
                response_text,
                q_emb
            )
        except Exception as e:
            print(f"Error saving chat message to DB: {e}")

    yield "data: [DONE]\n\n"


def generate_study_material(document_id: str, material_type: str, user_email: str = None) -> dict:
    """Generates study materials (summary, quiz, flashcards, etc.) from a document."""
    chunks = database.get_document_chunks(document_id, user_email=user_email)
    if not chunks:
        raise ValueError("Document not found in database or has no chunks.")
        
    if len(chunks) > 20:
        step = len(chunks) // 20
        sampled_chunks = chunks[::step][:20]
    else:
        sampled_chunks = chunks
        
    context = "\n".join([c["text"] for c in sampled_chunks])

    prompts = {
        "summary": "Create a comprehensive and well-structured summary of the following document context. Use bullet points for key takeaways.",
        "quiz": "Generate a 5-question multiple choice quiz based on the following document context. Provide the answers at the end.",
        "flashcards": "Generate 10 flashcards (Question on one side, Answer on the other) covering the most important concepts in the following document context.",
        "interview": "Generate 5 potential interview questions and suggested answers based on the following document context.",
        "action_items": "Extract any action items, next steps, or practical recommendations from the following document context.",
        "study_guide": "Create a detailed study guide with sections, key concepts, definitions, and review questions based on the following document context.",
        "glossary": "Extract all key terms, jargon, and technical vocabulary from the following document context and provide clear, concise definitions for each.",
    }
    
    task_prompt = prompts.get(material_type, prompts["summary"])
    system = f"You are an expert AI study assistant. {task_prompt}"
    user_query = f"CONTEXT:\n{context}"
    
    if gemini_client and gemini_types:
        config = gemini_types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.3,
            max_output_tokens=2048,
        )
        for attempt in range(3):
            try:
                resp = gemini_client.models.generate_content(
                    model=GEMINI_LLM_MODEL,
                    contents=user_query,
                    config=config,
                )
                final_text = resp.text if resp and resp.text else "Error generating study material."
                return {"text": final_text}
            except Exception as e:
                print(f"Gemini study material error (attempt {attempt + 1}): {e}")
                if attempt == 2:
                    raise e
                time.sleep(2)
    elif hf_client:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_query}
        ]
        response = None
        for attempt in range(3):
            try:
                response = hf_client.chat_completion(
                    model=HF_LLM_MODEL,
                    messages=messages,
                    max_tokens=1500,
                    temperature=0.3,
                )
                break
            except Exception as e:
                if attempt == 2:
                    raise e
                time.sleep(2)
        final_text = response.choices[0].message.content if response else "Error generating study material."
        return {"text": final_text}

    return {"text": "No AI provider configured."}
