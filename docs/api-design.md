# QuickNotes REST API Design

## Purpose and conventions

This document describes the production QuickNotes API, not the JSONPlaceholder practice service. The production API uses JSON request and response bodies, HTTPS, and `/api/v1` versioning. Authenticated endpoints require a bearer access token unless stated otherwise.

## Endpoint catalogue

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register a user account | `201 Created` |
| POST | `/api/v1/auth/login` | Authenticate and issue an access token | `200 OK` |
| GET | `/api/v1/notes` | List the signed-in user's notes; supports pagination and search | `200 OK` |
| POST | `/api/v1/notes` | Create a note owned by the signed-in user | `201 Created` |
| GET | `/api/v1/notes/{noteId}` | Retrieve one note owned by the signed-in user | `200 OK` |
| PATCH | `/api/v1/notes/{noteId}` | Update a note's title or body | `200 OK` |
| DELETE | `/api/v1/notes/{noteId}` | Delete a note owned by the signed-in user | `204 No Content` |
| GET | `/api/v1/tags` | List the signed-in user's tags | `200 OK` |
| PUT | `/api/v1/notes/{noteId}/tags/{tagId}` | Attach an existing tag to a note | `204 No Content` |

## Create a note

### Request

`POST /api/v1/notes`

```json
{
  "title": "Ideas for today",
  "body": "Finish the QuickNotes system design project.",
  "tagIds": [2, 4]
}
```

### Successful response

Status: `201 Created`

```json
{
  "id": 123,
  "userId": 42,
  "title": "Ideas for today",
  "body": "Finish the QuickNotes system design project.",
  "tags": [
    {"id": 2, "name": "Study"},
    {"id": 4, "name": "Projects"}
  ],
  "createdAt": "2026-10-22T10:30:00Z",
  "updatedAt": "2026-10-22T10:30:00Z"
}
```

The server assigns the note ID and owner ID from the authenticated session. Clients cannot create notes for another user by submitting a different `userId`.

## List notes

### Request

`GET /api/v1/notes?limit=20&offset=0`

### Successful response

Status: `200 OK`

```json
{
  "items": [
    {
      "id": 123,
      "userId": 42,
      "title": "Ideas for today",
      "body": "Finish the QuickNotes system design project.",
      "tags": [{"id": 2, "name": "Study"}],
      "createdAt": "2026-10-22T10:30:00Z",
      "updatedAt": "2026-10-22T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

An account with no notes receives `200 OK` with an empty `items` array and `total: 0`.

## Error responses

| Status | Meaning | Example situation |
|---|---|---|
| `400 Bad Request` | Invalid input | Missing title or title longer than 100 characters |
| `401 Unauthorized` | Authentication missing or invalid | Token is absent or expired |
| `403 Forbidden` | Authenticated user lacks permission | Attempt to access an operation not allowed by policy |
| `404 Not Found` | Resource does not exist or is not visible to the user | Note ID does not exist |
| `409 Conflict` | Request conflicts with current state | Duplicate tag name for the same user |
| `422 Unprocessable Content` | Well-formed request fails a business rule | Invalid tag assignment |
| `429 Too Many Requests` | Rate limit exceeded | Too many requests in a short period |
| `500 Internal Server Error` | Unexpected server failure | Unhandled backend error |

### Example error body

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title is required and must be 100 characters or fewer.",
    "details": [
      {
        "field": "title",
        "issue": "required"
      }
    ],
    "requestId": "req_8f31c2"
  }
}
```

The API must not expose stack traces, database credentials, or internal exception details in error responses. A request ID can be logged server-side to help support investigate a failure.

## Security and validation notes

- Require HTTPS and validate access tokens on protected routes.
- Derive the owner from the authenticated identity rather than trusting a client-supplied owner ID.
- Validate title length and request field types on the server.
- Use parameterized database queries.
- Apply rate limits to authentication and write endpoints.
- Return consistent JSON errors and appropriate HTTP status codes.
