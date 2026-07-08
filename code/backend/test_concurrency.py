import time
import httpx
import threading

BASE_URL = "http://localhost:8000"

def run_test():
    with httpx.Client() as client:
        # Register & Login
        email = "test_concurrent2@example.com"
        client.post(f"{BASE_URL}/register", json={
            "email": email,
            "password": "pass",
            "full_name": "Test"
        })
        resp = client.post(f"{BASE_URL}/login", data={
            "username": email,
            "password": "pass"
        })
        token = resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        patient = client.post(f"{BASE_URL}/api/analysis/patients", json={"name": "John Doe", "treatment_status": "Pre"}, headers=headers).json()
        visit = client.post(f"{BASE_URL}/api/analysis/visits", json={"patient_id": patient["id"], "status": "Pre"}, headers=headers).json()

        # Upload the real test STL
        try:
            with open("../../test_files/test_upper.stl", "rb") as f:
                file_data = f.read()
        except Exception:
            file_data = b'solid dummy\nendsolid dummy'
            
        # Upload a single dummy file
        files = {'file': ('test_upper.stl', file_data, 'application/sla')}
        scan_res = client.post(
            f"{BASE_URL}/api/analysis/scans?visit_id={visit['id']}&file_type=Upper Arch Segment",
            files=files, headers=headers
        )
        scan = scan_res.json()
        scan_id = scan.get("id")

        print(f"Setup complete. Scan ID: {scan_id}")
        
        # Check a sequential request first to ensure it works and loads the cache
        print("Warming up cache...")
        res = client.post(f"{BASE_URL}/api/analysis/landmarks/extract/{scan_id}", headers=headers)
        print(f"Warmup status: {res.status_code}")
        if res.status_code != 200:
            print("Error details:", res.text)
            return

        results = []
        def fire_request(req_id):
            start = time.time()
            res = client.post(f"{BASE_URL}/api/analysis/landmarks/extract/{scan_id}", headers=headers)
            elapsed = time.time() - start
            print(f"Request {req_id} finished in {elapsed:.3f}s with status {res.status_code}")
            if res.status_code != 200:
                print(f"Error {req_id}: {res.text}")
            results.append(elapsed)

        threads = [threading.Thread(target=fire_request, args=(i,)) for i in range(2)]
        
        t0 = time.time()
        for t in threads: t.start()
        for t in threads: t.join()
        total_time = time.time() - t0

        print(f"Total time for 2 concurrent requests: {total_time:.3f}s")
        print(f"Average time per request: {sum(results)/len(results):.3f}s")
        if total_time < sum(results) * 0.9:
            print("=> EMPIRICAL RESULT: Throughput is CONCURRENT.")
        else:
            print("=> EMPIRICAL RESULT: Throughput is SERIALIZED.")

if __name__ == "__main__":
    run_test()
