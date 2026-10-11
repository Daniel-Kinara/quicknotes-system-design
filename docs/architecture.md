# QuickNotes Architecture

## 1. Requirements

### Functional requirements
- Users can register and log in.
- Users can create, view, edit and delete their own notes.
- Users can organise notes with tags and filter by tag.
- Users can only access their own notes.

### Non-functional requirements
- **Scale:** support 1 million registered users.
- **Availability:** the service should stay up even if one server fails.
- **Performance:** listing notes should respond in under 300 ms.
- **Durability:** a saved note must never be lost.
- **Security:** passwords are hashed, all traffic uses HTTPS, and every request is authenticated.

## 2. Load estimate (1 million users)

Assumptions:
- 1,000,000 registered users, 20% active per day = **200,000 daily active users**
- Each active user reads their notes 20 times per day and creates 2 notes per day
- An average note (title, body and metadata) is about 1 KB
- 1 day = 86,400 seconds, and peak traffic = 5 times the average

| Measure | Calculation | Result |
|---------|-------------|--------|
| Reads per day | 200,000 x 20 | 4,000,000 |
| Reads per second (average) | 4,000,000 / 86,400 | about 46 |
| Reads per second (peak) | 46 x 5 | about 230 |
| Writes per day | 200,000 x 2 | 400,000 |
| Writes per second (average) | 400,000 / 86,400 | about 5 |
| Writes per second (peak) | 5 x 5 | about 23 |
| New notes per year | 400,000 x 365 | 146,000,000 |
| Storage per year | 146,000,000 x 1 KB | about 146 GB (about 220 GB with indexes) |

The system is **read-heavy** (about 10 reads for every write), so the design focuses on caching and read replicas.

## 3. Architecture diagram

```text
   +--------+      +-------+      +-------+
   | Client | ---> |  DNS  | ---> |  CDN  |   (static files: HTML, CSS, JS)
   +---+----+      +-------+      +-------+
       |
       | API requests (HTTPS)
       v
+---------------+
| Load Balancer |   (two instances, so it is not a single point of failure)
+-------+-------+
        |
   +----+--------------+
   |                   |
   v                   v
+------------+   +------------+
| App Server |   | App Server |   (two or more, stateless)
|     1      |   |     2      |
+-----+------+   +------+-----+
      |                 |
      +--------+--------+-----------------+
               |                          |
       +-------+--------+                 |
       |                |                 |
       v                v                 v
  +---------+   +---------------+   +-----------+
  |  Cache  |   | Primary DB    |   |   Queue   |
  | (Redis) |   | (writes)      |   |           |
  +---------+   +-------+-------+   +-----+-----+
                        |                 |
                        | replication     v
                        v           +-----------+
                +---------------+   |  Worker   |
                | Read Replica  |   | (emails,  |
                | (reads)       |   |  indexing)|
                +---------------+   +-----------+
```

## 4. What each component does

- **Client:** the browser or app where users read and write notes, and it calls the API with fetch.
- **DNS:** turns the name `api.quicknotes.example` into the address of our load balancer, so users never need to know server addresses.
- **CDN:** solves slow loading of static files by serving the HTML, CSS and JavaScript from locations close to the user.
- **Load balancer:** solves the problem of one server being overloaded or failing by spreading requests across several app servers and skipping unhealthy ones.
- **App servers:** run the API logic (authentication, validation, reading and writing notes), and because they keep no state, we can add more when traffic grows.
- **Cache (Redis):** solves repeated database load by keeping recently requested note lists in fast memory.
- **Primary database:** stores all users, notes and tags reliably and handles every write.
- **Read replica:** solves read overload by keeping a copy of the primary database that answers read queries.
- **Queue:** solves slow requests by holding background jobs so the API can respond immediately.
- **Worker:** takes jobs from the queue and does slow work (such as sending emails and updating a search index) without blocking users.

## 5. Request flows

### GET /notes
1. The client sends `GET /notes` with its token. DNS resolves the API address.
2. The load balancer sends the request to a healthy app server.
3. The app server checks the token. If it is missing or invalid, it returns **401**.
4. The app server looks for this user's notes in the **cache**.
5. **Cache hit:** the cached notes are returned straight away with **200 OK**.
6. **Cache miss:** the app server queries the **read replica**, stores the result in the cache for a short time (for example 60 seconds), and returns **200 OK**.

### POST /notes
1. The client sends `POST /notes` with a JSON body and its token.
2. The load balancer sends the request to an app server.
3. The app server checks the token and validates the body (title required, at most 100 characters). If invalid, it returns **400**.
4. The app server writes the new note to the **primary database**.
5. The app server clears the user's cached note list so the new note shows up.
6. The app server adds a background job to the **queue** (for example, update the search index).
7. The app server returns **201 Created** with the new note.
8. A **worker** takes the job from the queue and completes it. The replica copies the new note from the primary a moment later.

## 6. Trade-offs

1. **Caching: speed vs fresh data.** The cache makes lists load fast and protects the database, but data can be slightly out of date. We reduce this by clearing the user's cache entry whenever they create, edit or delete a note.
2. **Read replica: scale vs consistency.** Replicas let us serve many reads, but they copy data from the primary with a small delay, so a user might briefly not see a note they just created. We can read a user's own recent notes from the primary to avoid this.
3. **Queue and worker: fast responses vs complexity.** Background jobs keep the API quick, but they add more parts to run, monitor and retry when they fail.
4. **SQL: strong consistency vs harder horizontal scaling.** A relational database protects data integrity, but scaling writes beyond one primary is harder. At 23 writes per second at peak, one primary is more than enough.

## 7. Avoiding single points of failure

- **DNS:** use a provider with several name servers.
- **CDN:** it is distributed across many locations by design.
- **Load balancer:** run at least two, in different zones, with a shared address.
- **App servers:** run two or more in different zones. They are stateless, so any one can fail without losing data.
- **Cache:** run Redis with a replica that takes over automatically.
- **Database:** the read replica can be promoted to primary if the primary fails, and regular backups protect against data loss.
- **Queue:** use a replicated queue service, so waiting jobs survive a server failure.
- **Workers:** run more than one, so jobs continue if a worker crashes.