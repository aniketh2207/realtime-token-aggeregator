# realtime-token-aggeregator

# Real-time Token Data Aggregation Service

This is a high-performance backend service built for a company assignment. It aggregates real-time "meme coin" data from multiple DEX APIs, caches the results, serves them via a scalable REST API, and pushes live price/volume changes to clients via WebSockets.

---

### 🚀 Live Demo Links

* **YouTube Demo:** `https://youtu.be/2hYkDtT57C8`
* **Postman Collection:** `https://code-blasters.postman.co/workspace/My-Workspace~8d682d6f-7f65-4cda-802b-9b2a40605895/collection/40622057-37f73e51-4f40-4449-814d-625fef4fb72d?action=share&source=copy-link&creator=40622057`
* **Postman Link for Websocket** `https://code-blasters.postman.co/workspace/My-Workspace~8d682d6f-7f65-4cda-802b-9b2a40605895/ws-socketio-request/6919b0c3c656927e6266545c`

---

### ✨ Core Features

* **Real-time Data Aggregation:** Fetches and intelligently merges token data from both **DexScreener** and **Jupiter** APIs.
* **Robust Caching:** Uses a **Redis** cache to store the aggregated data, with a 90-second TTL to ensure data is fresh while protecting against API rate limits.
* **High-Performance API:** A primary `GET /api/tokens` endpoint serves the cached data instantly.
* **Live WebSocket Updates:** Pushes real-time `liveUpdate` events to all connected clients when significant price or volume changes are detected.
* **Scalable Architecture:**
    * **Cursor-Based Pagination:** Implements `limit` and `cursor` pagination for efficient, scalable data fetching.
    * **Robust Sorting:** Supports sorting by `volume_sol`, `market_cap_sol`, `price_1hr_change`, and more.
* **Resilient & Reliable:**
    * Uses `axios-retry` for exponential backoff to handle API rate limits.
    * `node-cron` job includes overlap prevention to ensure stability.
    * Caching logic is designed to prevent "race conditions," ensuring the API never serves empty data.

---

### 🏛️ Architecture & Design Decisions

This service is built as a series of decoupled modules to ensure scalability and maintainability, fulfilling the "Architecture design" and "Distributed system challenges" criteria.

#### 1. Data Pipeline (`dataFetcher.ts`)
***Data Sources:** I used two APIs as required: DexScreener and Jupiter.
* **Data Normalization:** This was the biggest challenge.All API data (which is often in USD) must be "translated" into the required `_sol` denominations.
    1.  A `getSolPriceInUsd` function first gets the SOL/USD conversion rate by fetching the main `WSOL/USDC` pair.
    2.  All subsequent data (e.g., `volume.h24`, `fdv`) is then divided by this rate to get `volume_sol`, `market_cap_sol`, etc.
* **Intelligent Merging:** A `Map<string, AppToken>` is used to merge the lists. The `token_address` serves as the unique key. This is highly efficient and automatically handles all de-duplication.

#### 2. Caching & Scheduling (`cache.ts`, `taskScheduler.ts`)
* **Task Scheduling (`node-cron`):** A cron job runs every 45 seconds to invoke the `fetchAndMergeData` service.
* **Caching Strategy (`ioredis`):** The fetched data is saved to Redis with a **90-second TTL**.
* **Design Decision (90s TTL vs. 45s Job):** This "buffer" is intentional. It solves a critical **race condition**. If the 45-second API fetch takes longer than expected (e.g., 35 seconds), the old 30-second cache would have expired, causing the API to fail. With a 90s TTL, the old data is *guaranteed* to still be available while the new data is being fetched, ensuring 100% API availability.

#### 3. API (`routes.ts`)
* **Initial Load:** The `GET /api/tokens` endpoint reads *only* from the Redis cache. It **never** calls the data fetcher directly. This makes the API extremely fast (typically < 15ms).
***Cursor-Based Pagination:** As required, the API uses cursor pagination. It sorts the full list, finds the `cursor` (a `token_address`), and returns the `limit` items after it. This is far more scalable than `page`-based offset pagination.

#### 4. Real-time Updates (`dataComparer.ts`, `index.ts`)
* **WebSocket (`Socket.io`):** Socket.io is bound to the Express server to handle live connections.
* **Delta (Change) Detection:** After the cron job fetches new data, the `dataComparer.ts` module compares it to the *old* data in the cache.
* **Emitting Updates:** If a token's price or volume changes by more than the `PRICE_THRESHOLD` or `VOLUME_THRESHOLD`, a minimal `liveUpdate` event is emitted *only* with the changed data, saving bandwidth.

---

### 🚀 How to Run Locally (in WSL)

1.  **Clone the Repository:**
    Command - 
            git clone <your-repo-url>
            cd realtime-token-aggregator


2.  **Install Dependencies:**
    Command -
            npm install
   

3.  **Start Redis Server (in a separate WSL terminal):**
    Command - 
        sudo service redis-server start
    To stop the redis server:
    Command - 
        sudo systemctl stop redis
    


4.  **Run the Application:**
    Command - 
        npm run dev


5.  **Test the Endpoints:**
    * **REST API:** `GET http://localhost:3000/api/tokens`
    * **WebSocket:** Connect a Socket.io client to `http://localhost:3000` and listen for the `liveUpdate` event.