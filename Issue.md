## Description
Create a Postman collection for each service documenting all endpoints with example request bodies and expected responses. This will be used for testing and demonstration during the project presentation.

## Tasks
- [ ] Create a Postman collection named `FreightMatch`
- [ ] Add a folder per service: `User Service`, `Load Service`, `Bidding Service`, `Matching Service`
- [ ] For each endpoint add:
  - Correct HTTP method and URL using `{{baseUrl}}` variable
  - Example request body (where applicable)
  - Description of what the endpoint does
  - Example expected response in the Tests tab or as a saved example

## Endpoints to cover

### User Service
- `POST /api/users/register`
- `POST /api/users/login`
- `POST /api/users/refresh`
- `GET /api/users/:id`
- `PATCH /api/users/carrier-profile`
- `GET /api/carriers`

### Load Service
- `POST /api/loads`
- `GET /api/loads/:id`
- `PATCH /api/loads/:id`
- `DELETE /api/loads/:id`
- `GET /api/loads/available`
- `PATCH /api/loads/:id/status`

### Bidding Service
- `POST /api/bids`
- `GET /api/bids/:loadId`
- `PATCH /api/bids/:bidId/accept`
- `GET /api/bids/my`

### Matching Service
- `GET /api/match/:loadId`
- `POST /api/match/recommend`

## Collection Variables
Set up the following variables in the collection:
```
baseUrl       = http://localhost:80
authToken     = (fill after login)
refreshToken  = (fill after login)
```

## Acceptance Criteria
- All endpoints are present in the collection
- Every request has a realistic example body
- Collection can be imported and run without modification (except filling tokens)
- Exported as `FreightMatch.postman_collection.json` and placed in `docs/`

## Notes
You don't need to write automated tests — just example requests with realistic data is enough.