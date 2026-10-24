# QuickNotes System Architecture

## 1. Functional requirements

- Users can register, sign in, and access only their own notes.
- Users can create, list, read, edit, and delete notes.
- Users can create tags and attach tags to notes.
- The client displays loading, success, error, and empty states.
- The API validates input and returns consistent HTTP status codes.
- Users can search or paginate through their notes.

## 2. Non-functional requirements

- **Scalability:** support approximately one million registered users and scale application instances horizontally.
- **Performance:** keep common note-list requests responsive through caching and indexed queries.
- **Availability:** tolerate an application-server failure and recover from worker failures.
- **Security:** use HTTPS, authenticated access, ownership checks, input validation, and hashed passwords.
- **Durability:** persist notes in a database with backups and tested recovery procedures.
- **Observability:** collect logs, metrics, request IDs, and alerts for elevated errors or latency.

## 3. Capacity estimate for one million users

These estimates are planning assumptions, not measured traffic. Assume 1,000,000 registered users, 10% daily active users, 50 note-list/read requests per active user per day, one note write per active user per day, and an average stored note record of 2 KB including basic metadata. Use 86,400 seconds per day.

### Daily active users

1,000,000 × 10% = **100,000 daily active users**.

### Reads per second

100,000 users × 50 reads per day = 5,000,000 reads per day.

5,000,000 ÷ 86,400 ≈ **58 average reads per second**.

At a planning peak of five times average, design for approximately **290 reads per second** initially, then validate with load testing.

### Writes per second

100,000 users × 1 write per day = 100,000 writes per day.

100,000 ÷ 86,400 ≈ **1.2 average writes per second**.

At five times average, plan for approximately **6 writes per second**. Real workloads may be burstier, so monitor and revise these assumptions.

### Storage per year

Assume one new 2 KB note record per active user per day.

100,000 × 2 KB = 200,000 KB, approximately 200 MB of new note data per day.

200 MB × 365 = approximately **73 GB per year** before indexes, replicas, backups, logs, and database overhead. If note bodies are longer or users create multiple notes, storage will be higher.

## 4. Architecture diagram

```text
                    +-----------------------+
                    | Client: Web / Mobile  |
                    +-----------+-----------+
                                |
                                v
                         +-------------+
                         | DNS         |
                         +------+------+
                                |
                                v
                         +-------------+
                         | CDN         |
                         | Static files|
                         +------+------+
                                |
                                v
                         +-------------+
                         | Load        |
                         | Balancer    |
                         +------+------+
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
             +-------------+         +-------------+
             | App Server 1|         | App Server 2|
             +------+------+         +------+------+
                    |                       |
                    +-----------+-----------+
                                |
              +-----------------+------------------+
              |                 |                  |
              v                 v                  v
       +-------------+   +-------------+    +-------------+
       | Cache       |   | Primary DB  |    | Job Queue   |
       | Redis       |   | SQL writes  |    | Async jobs  |
       +-------------+   +------+------+    +------+------+
                                |                   |
                                v                   v
                         +-------------+     +-------------+
                         | Read Replica|     | Worker      |
                         | SQL reads   |     | Background  |
                         +-------------+     | tasks       |
                                             +-------------+
```

The CDN in this design serves static front-end assets; note content remains behind authenticated API endpoints and is not publicly cached. The queue and worker are used for tasks such as sending notifications, processing exports, or other slow work that should not block a request.

## 5. Component responsibilities

- **Client:** provides the interface through which users create, view, and manage notes.
- **DNS:** resolves the service domain to the appropriate edge or load-balancing endpoint.
- **CDN:** delivers static JavaScript, CSS, and image assets close to users, reducing latency and origin traffic.
- **Load balancer:** distributes incoming API requests across healthy app servers and stops sending traffic to unhealthy instances.
- **App servers:** authenticate users, validate requests, enforce ownership rules, and implement the API; stateless instances can be added horizontally.
- **Redis cache:** keeps frequently requested or recently computed data in memory to reduce repeated database work.
- **Primary database:** durably stores authoritative user, note, tag, and relationship data and accepts writes.
- **Read replica:** serves eligible read queries to reduce load on the primary, while acknowledging that replica data may briefly lag.
- **Job queue:** stores background tasks so slow work can be retried and processed outside the user's request.
- **Worker:** consumes queued tasks and performs background operations without holding up API responses.

## 6. GET `/api/v1/notes` request flow

1. The client resolves the QuickNotes domain through DNS and sends an HTTPS request.
2. The load balancer forwards the request to a healthy application server.
3. The application server validates the access token and derives the user's identity.
4. The server checks Redis for a cached result keyed by user and query parameters.
5. On a cache hit, the server returns the authorized cached result. On a miss, it queries the read replica using the user's ID, pagination, and appropriate indexes.
6. The server formats the result as JSON, stores eligible results in the cache for a short time, and returns `200 OK`.
7. The client displays the notes or an empty state if the returned `items` array is empty.

Cache keys must include the user identity and relevant filters so one user's notes can never be served to another user.

## 7. POST `/api/v1/notes` request flow

1. The client sends an HTTPS POST request with a title and optional body.
2. The load balancer routes the request to a healthy application server.
3. The application server validates the access token, checks the title and body, and derives the owner from the authenticated identity.
4. The server inserts the note into the primary database and commits the transaction.
5. The server invalidates or updates relevant cached note-list results for that user.
6. If follow-up work is needed, such as a notification, the server adds a job to the queue after the write has been committed (ideally using a transactional outbox to avoid losing the event).
7. The server returns `201 Created` with the new note's ID and fields. The worker processes the queued follow-up task independently.

## 8. Trade-offs and failure handling

### Trade-off 1: Cache speed versus data freshness

Caching lowers database load and improves response times, but cached results can briefly be stale after a write. Use short time-to-live values and invalidate the affected user's cache after note changes. For operations that require the latest committed value, read from the primary database.

### Trade-off 2: Read replicas versus immediate consistency

Read replicas help distribute reads, but replication lag means a new note may not appear immediately in a replica-backed listing. Route read-after-write requests to the primary for a short period or use a consistency-aware strategy.

### Trade-off 3: Fast responses versus asynchronous work

Queues keep slow follow-up tasks outside the request path, but a queued task may be delayed or fail. Use retries with backoff, idempotent workers, dead-letter handling, and monitoring. The API should not claim a task has completed when only its job has been queued.

### Avoiding single points of failure

- Run at least two application-server instances across separate failure domains behind a health-checking load balancer.
- Deploy redundant load-balancing and DNS services through the hosting provider, and use health checks and failover.
- Configure the database with automated backups, a standby or managed failover, and tested restore procedures; use the read replica for eligible reads, not as the only backup.
- Run multiple queue consumers and make jobs safe to retry. Use durable queue storage and alert on queue age or failed jobs.
- Configure Redis with an appropriate highly available deployment where required, and ensure the app can degrade gracefully to the database if the cache is unavailable.
- Monitor service health, database replication lag, error rates, and resource usage, and test failure recovery rather than assuming it works.

## Conclusion

QuickNotes can scale by keeping app servers stateless, caching repeated reads, separating read traffic from primary writes, and moving slow tasks into a durable queue. Capacity estimates should be revisited using real usage metrics and load tests as adoption grows.
