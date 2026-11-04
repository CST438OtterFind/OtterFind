# Error model

Every error response from the API uses **RFC 9457 Problem Details** with the content type
`application/problem+json`, so web and Android handle errors with one code path.

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "No static resource api/items/99.",
  "instance": "/api/items/99"
}
```

| Field | Meaning |
|---|---|
| `type` | A URI naming the problem. `about:blank` means the status code says it all |
| `title` | Short summary that doesn't change between occurrences |
| `status` | The HTTP status code |
| `detail` | What went wrong this time. Safe to show a user, and never holds a stack trace or SQL |
| `instance` | The path that failed |

## Field errors

PRD-4 requires telling the user which field is wrong, so a 400 for invalid input adds an `errors`
list. The client shows each `message` beside its `field`.

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Some fields are invalid.",
  "instance": "/api/items",
  "errors": [
    { "field": "title", "message": "Title must be at least 4 characters" },
    { "field": "buildingId", "message": "Choose a building" }
  ]
}
```

## Status codes

| Status | When | Example |
|---|---|---|
| 400 | Invalid input, or sign-in with an unverified email | A title under 4 characters |
| 401 | Missing, invalid or expired token | No `Authorization` header |
| 403 | Signed in but not allowed | Editing another user's report |
| 404 | The resource doesn't exist | An unknown item ID |
| 409 | The request conflicts with current state | Email already registered with the other provider |
| 500 | Unexpected server error | A bug |
| 503 | A dependency is down | The database is unreachable |

## Current state

Spring's Problem Details support is on (`spring.mvc.problemdetails.enabled`), and
`ErrorModelTest` covers it. **Not done yet:** 401 and 403 come from Spring Security's filters
with an empty body, and the `errors` list has no handler. Add both with the first endpoint that
needs them.
