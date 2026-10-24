# QuickNotes System Design

QuickNotes is a learning project that demonstrates how a browser-based notes app can communicate with an API and how a backend service could be designed for one million registered users.

## Features

- Load up to 10 practice posts using GET.
- Create a practice post using POST with title validation.
- Delete a post using DELETE and update the page.
- Show loading, success, error, and empty states.
- Document the production API, SQL data model, and scalable architecture.

**Important:** The browser client uses JSONPlaceholder as a practice API. POST and DELETE responses are simulated; changes are not permanently saved by JSONPlaceholder. The three design documents describe a proposed real QuickNotes backend.

## How to run the API client

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Start a local static server, for example the **Live Server** extension in VS Code.
4. Open `index.html` through Live Server.
5. Click **Load notes** to request 10 posts.
6. Use the form to create a practice note, then use a note's **Delete** button to remove it from the current page.
7. If requests fail, check your internet connection and the browser developer console.

The project uses plain HTML, CSS, and JavaScript; no build step or package installation is required.

## System design documents

- [API design](docs/api-design.md) — production REST endpoints, JSON examples, status codes, and error responses.
- [Data model](docs/data-model.md) — entities, relationships, SQL definitions, indexes, and example queries.
- [Architecture](docs/architecture.md) — requirements, capacity estimates, diagram, request flows, trade-offs, and reliability.

## What I learned

1. How to use `fetch()` with asynchronous JavaScript, check `response.ok`, and handle network and HTTP errors.
2. Why user input should be validated and inserted into the page using `textContent` rather than `innerHTML`.
3. How REST methods and HTTP status codes describe operations such as listing, creating, and deleting resources.
4. How primary keys, foreign keys, indexes, and a junction table represent relational data and many-to-many relationships.
5. How caching, read replicas, stateless app servers, queues, and background workers can help a service scale.
6. Why estimates should state their assumptions and be revisited using actual traffic measurements.

## Suggested commit history

Make each commit after completing and testing the corresponding milestone:

1. `Add HTML and CSS API client structure`
2. `Add API client with GET`
3. `Add create note with POST`
4. `Add delete with DELETE`
5. `Add API design doc`
6. `Add data model doc`
7. `Add architecture doc`
8. `Add README`

The commits should reflect real, separate changes in Git rather than being created all at once after the entire project is finished.
