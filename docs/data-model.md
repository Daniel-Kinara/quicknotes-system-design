# QuickNotes Data Model

## Entities

### users
| Column | Type | Key / rules |
|--------|------|-------------|
| id | BIGINT | Primary key |
| email | VARCHAR(255) | Unique, required |
| password_hash | VARCHAR(255) | Required |
| created_at | TIMESTAMP | Required |

### notes
| Column | Type | Key / rules |
|--------|------|-------------|
| id | BIGINT | Primary key |
| user_id | BIGINT | Foreign key to `users(id)`, required |
| title | VARCHAR(100) | Required |
| body | TEXT | Optional |
| created_at | TIMESTAMP | Required |
| updated_at | TIMESTAMP | Required |

### tags
| Column | Type | Key / rules |
|--------|------|-------------|
| id | BIGINT | Primary key |
| user_id | BIGINT | Foreign key to `users(id)`, required |
| name | VARCHAR(50) | Required, unique per user |

### note_tags
| Column | Type | Key / rules |
|--------|------|-------------|
| note_id | BIGINT | Foreign key to `notes(id)`, part of the primary key |
| tag_id | BIGINT | Foreign key to `tags(id)`, part of the primary key |

## Relationships

- **users to notes: one-to-many.** One user can write many notes, and each note belongs to exactly one user.
- **users to tags: one-to-many.** One user can create many tags, and each tag belongs to one user.
- **notes to tags: many-to-many.** A note can have many tags (for example "study" and "exams"), and a tag can be used on many notes. A relational table cannot store a list in one cell, so the join table `note_tags` holds one row for each note-and-tag pair.

## CREATE TABLE statements

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      VARCHAR(100) NOT NULL,
  body       TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id      BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name    VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

## Example queries

```sql
-- 1. The 20 newest notes for one user
SELECT id, title, created_at
FROM notes
WHERE user_id = 7
ORDER BY created_at DESC
LIMIT 20;

-- 2. All notes that have the tag "study" (uses JOINs)
SELECT n.id, n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 7 AND t.name = 'study';

-- 3. How many notes each tag has
SELECT t.name, COUNT(nt.note_id) AS note_count
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 7
GROUP BY t.id, t.name;
```

## Index

```sql
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
```

**Reason:** the most common request is "show this user's newest notes" (`GET /notes`). Without the index the database would scan every note of every user; with it, the database jumps straight to the user's notes already sorted by date. I would also index `note_tags (tag_id)` so that finding all notes for a tag is fast, because the primary key only helps lookups that start from `note_id`.

## SQL or NoSQL?

I would choose SQL (for example PostgreSQL). The data is structured and strongly related: users own notes, and notes and tags form a many-to-many relationship that SQL handles naturally with joins. SQL also enforces rules in the database itself, such as unique emails, required titles and foreign keys that stop a note pointing at a user that does not exist. A NoSQL document store would be easier if notes had very different shapes, but ours all look the same, and queries such as "notes by tag" and "notes per tag" fit relational tables well. SQL also scales comfortably to 1 million users with read replicas.