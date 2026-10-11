# QuickNotes API Design

This is the design of the real QuickNotes API the backend team will build (not JSONPlaceholder). It is a REST API that sends and receives JSON.

- **Base URL:** `https://api.quicknotes.example/v1`
- **Authentication:** every endpoint except `POST /auth/login` needs the header `Authorization: Bearer <token>`.
- Each user can only see and change their own notes.

## Endpoints

| Method | Path | Description | Success status |
|--------|------|-------------|----------------|
| POST | `/auth/login` | Log in with email and password and receive a token | 200 OK |
| GET | `/notes` | List the logged-in user's notes (supports `?tag=`, `?page=` and `?limit=`) | 200 OK |
| GET | `/notes/{id}` | Get one note | 200 OK |
| POST | `/notes` | Create a note | 201 Created |
| PUT | `/notes/{id}` | Replace a note's title, body and tags | 200 OK |
| DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| GET | `/tags` | List the user's tags | 200 OK |
| POST | `/notes/{id}/tags` | Attach a tag to a note | 201 Created |

## Examples

### Create a note: `POST /notes`

Request body:

```json
{
  "title": "Revise REST APIs",
  "body": "Practise status codes and JSON examples.",
  "tags": ["study", "exams"]
}
```

Response (201 Created):

```json
{
  "id": 42,
  "title": "Revise REST APIs",
  "body": "Practise status codes and JSON examples.",
  "tags": ["study", "exams"],
  "user_id": 7,
  "created_at": "2026-10-11T08:30:00Z",
  "updated_at": "2026-10-11T08:30:00Z"
}
```

### List notes: `GET /notes?limit=2&page=1`

Response (200 OK):

```json
{
  "page": 1,
  "limit": 2,
  "total": 25,
  "notes": [
    {
      "id": 42,
      "title": "Revise REST APIs",
      "body": "Practise status codes and JSON examples.",
      "tags": ["study", "exams"],
      "created_at": "2026-10-11T08:30:00Z"
    },
    {
      "id": 41,
      "title": "Buy milk",
      "body": "",
      "tags": [],
      "created_at": "2026-10-10T17:05:00Z"
    }
  ]
}
```

## Error status codes

All errors use the same JSON body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be 100 characters or fewer."
  }
}
```

| Status | Meaning | Example |
|--------|---------|---------|
| 400 Bad Request | The request is invalid or incomplete | `POST /notes` with no `title`, or a title longer than 100 characters |
| 401 Unauthorized | The user is not logged in or the token is missing or expired | `GET /notes` with no `Authorization` header |
| 403 Forbidden | The user is logged in but not allowed to do this | `DELETE /notes/42` where note 42 belongs to another user |
| 404 Not Found | The note or tag does not exist | `GET /notes/9999` when no note has that id |
| 500 Internal Server Error | Something failed on the server | The database is unreachable while saving a note |