import time
import threading
from app.ml_inference import MLService
from database import SessionLocal

def run_test():
    # Create a dummy STL in the container
    file_path = "/app/dummy.stl"
    with open(file_path, "wb") as f:
        f.write(b'solid dummy\nendsolid dummy')

    
    # Init MLService (needs a db session, though it doesn't use it for predict_landmarks directly)
    db = SessionLocal()
    ml_service = MLService(db)
    
    print("Warming up cache...")
    try:
        ml_service.predict_landmarks(file_path, "Upper Arch Segment")
        print("Warmup success!")
    except Exception as e:
        print(f"Warmup error: {e}")
        return

    results = []
    
    def fire_request(req_id):
        start = time.time()
        try:
            ml_service.predict_landmarks(file_path, "Upper Arch Segment")
            status = "SUCCESS"
        except Exception as e:
            status = f"ERROR: {e}"
        elapsed = time.time() - start
        print(f"Thread {req_id} finished in {elapsed:.3f}s with status {status}")
        results.append(elapsed)

    threads = [threading.Thread(target=fire_request, args=(i,)) for i in range(2)]
    
    t0 = time.time()
    for t in threads: t.start()
    for t in threads: t.join()
    total_time = time.time() - t0

    print(f"Total time for 2 concurrent predictions: {total_time:.3f}s")
    print(f"Average time per prediction: {sum(results)/len(results):.3f}s")
    
    if total_time < sum(results) * 0.9:
        print("=> EMPIRICAL RESULT: Keras lock allows CONCURRENT inference.")
    else:
        print("=> EMPIRICAL RESULT: Throughput is SERIALIZED.")

if __name__ == "__main__":
    run_test()
