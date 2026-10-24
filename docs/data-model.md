# QuickNotes Data Model

## Design overview

QuickNotes uses a relational database because notes, users, tags, and note-tag assignments have clear relationships and benefit from transactions and referential integrity.

## Entities and columns

### `users`

| Column | Type | Key / purpose |
|---|---|---|
| `id` | BIGINT | Primary key |
| `email` | VARCHAR(255) | Unique, required login email |
| `password_hash` | VARCHAR(255) | Required hashed password; never store a plain password |
| `created_at` | TIMESTAMP | Account creation time |

### `notes`

| Column | Type | Key / purpose |
|---|---|---|
| `id` | BIGINT | Primary key |
| `user_id` | BIGINT | Foreign key to `users.id` |
| `title` | VARCHAR(100) | Required note title |
| `body` | TEXT | Optional note body |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

### `tags`

| Column | Type | Key / purpose |
|---|---|---|
| `id` | BIGINT | Primary key |
| `user_id` | BIGINT | Foreign key to `users.id` |
| `name` | VARCHAR(50) | Required tag name |
| `created_at` | TIMESTAMP | Creation time |

### `note_tags`

| Column | Type | Key / purpose |
|---|---|---|
| `note_id` | BIGINT | Foreign key to `notes.id`; part of composite primary key |
| `tag_id` | BIGINT | Foreign key to `tags.id`; part of composite primary key |
| `assigned_at` | TIMESTAMP | Time the tag was attached |

## Relationships

- **Users to notes: one-to-many.** One user can own many notes, but each note belongs to one user.
- **Users to tags: one-to-many.** One user can create many tags, and each tag belongs to one user.
- **Notes to tags: many-to-many.** A note can have multiple tags, and a tag can be assigned to multiple notes. The `note_tags` junction table implements this relationship.
- Deleting a user cascades to their notes and tags. Deleting a note or tag removes its related junction-table rows.

## SQL table definitions

The following uses PostgreSQL-compatible SQL.

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tag_per_user UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, tag_id)
);
```

## Indexes

```sql
CREATE INDEX idx_notes_user_updated
ON notes (user_id, updated_at DESC);

CREATE INDEX idx_note_tags_tag
ON note_tags (tag_id);
```

`idx_notes_user_updated` helps list a user's notes in recently updated order without scanning every user's notes. The primary key on `note_tags(note_id, tag_id)` already helps lookups starting with `note_id`; the second index helps find notes associated with a particular tag.

## Example SQL queries

### 1. List a user's notes, newest updated first

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = 42
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;
```

### 2. Find notes and their tags (JOIN)

```sql
SELECT n.id, n.title, t.name AS tag_name
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = 42
ORDER BY n.updated_at DESC;
```

### 3. Count notes per user

```sql
SELECT u.id, u.email, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.email
ORDER BY note_count DESC;
```

### 4. Create a note

```sql
INSERT INTO notes (user_id, title, body)
VALUES (42, 'Ideas for today', 'Finish the system design project.')
RETURNING id, user_id, title, body, created_at, updated_at;
```

## SQL versus NoSQL

I would choose a relational SQL database such as PostgreSQL for the initial QuickNotes service. The schema has clear relationships, and foreign keys, unique constraints, and transactions help keep ownership and tag assignments consistent. Indexes and read replicas can support growing read traffic. A document database could be considered later if requirements become substantially more flexible, but it is not necessary for this data model.
