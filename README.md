# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This project has two parts: a small web client that talks to the JSONPlaceholder practice API using fetch (GET, POST and DELETE), and three design documents describing the real QuickNotes backend: its API, its data model and its architecture.

## Features of the API client

- Load 10 notes with GET and show loading, success, error and empty states
- Create a note with POST, with validation (title required, maximum 100 characters)
- Delete a note with DELETE
- Buttons are disabled while a request is running
- User text is inserted with `textContent` only

## How to run the API client

1. Clone the repository: `git clone https://github.com/YOUR-USERNAME/quicknotes-system-design.git`
2. Open the folder in VS Code.
3. Right-click `index.html` and choose **Open with Live Server** (or open `index.html` in a browser).
4. You need an internet connection, because the client calls `https://jsonplaceholder.typicode.com/posts`.

Note: JSONPlaceholder does not really save changes, so created notes only exist in the page until you refresh.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- How to use `fetch` with `async` / `await`, check `response.ok`, and handle errors with `try` / `catch` / `finally`.
- How to design a REST API with the right methods, paths and status codes (201, 204, 400, 401, 403, 404, 500).
- How a many-to-many relationship needs a join table, and how an index speeds up the most common query.
- How caching, read replicas, queues and load balancers help a read-heavy system scale and avoid single points of failure.