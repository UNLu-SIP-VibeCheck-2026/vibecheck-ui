---
name: backend-integration
description: >
  Best practices and configuration rules for Angular services integrating with the backend API.
  Use this skill when creating, modifying, or reviewing any Angular service that uses HttpClient
  to perform API requests in the VibeCheck project.
risk: safe
---

# VibeCheck — Backend Integration Guidelines

This guide establishes the mandatory practices for configuring API request URLs in Angular services. Following these patterns ensures that services work consistently across all environments: local development, GCloud development deployments, staging, and production.

---

## 1. The Core Rule: Always Use `environment.apiBaseUrl`

**Never hardcode relative paths (such as `/api/...`) in your service endpoints.**

All services making HTTP requests must import `environment` and prepend `environment.apiBaseUrl` to the path.

### ❌ Incorrect Pattern
```typescript
// src/app/services/organizer-rating.service.ts
@Injectable({ providedIn: 'root' })
export class OrganizerRatingService {
  // ERROR: Hardcoded relative path
  private apiUrl = '/api/ratings/organizers'; 

  constructor(private http: HttpClient) {}
  ...
}
```

### ✅ Correct Pattern
```typescript
// src/app/services/organizer-rating.service.ts
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrganizerRatingService {
  // CORRECT: Prepends the environment-configured API base URL
  private apiUrl = `${environment.apiBaseUrl}/ratings/organizers`; 

  constructor(private http: HttpClient) {}
  ...
}
```

---

## 2. Why this matters: Environment Differences

### Local Development (`localhost:4200`)
- We use a local proxy config (`proxy.conf.json`) that maps `/api` requests to `http://localhost:8080`.
- Because of this proxy, relative paths like `/api/` appear to work locally. However, relying on this behavior creates a false sense of security.

### GCloud Deployments (Production / Dev Clusters)
- The frontend is served on `https://vibecheck.team` by Nginx.
- The backend runs on a different subdomain: `https://api.vibecheck.team`.
- There is no `/api` proxy configured on the frontend's Nginx.
- If a service makes a request to `/api/ratings/organizers`, the browser calls the frontend host (`https://vibecheck.team/api/ratings/organizers`).
- Nginx intercepts this, fails to find a matching file, and returns `index.html` (the Angular app) with a `200 OK` status, causing JSON parsing errors in the client and breaking the feature.
- Prepending `environment.apiBaseUrl` correctly targets `https://api.vibecheck.team/api/ratings/organizers`, resolving CORS negotiation correctly.

---

## 3. Checklist for Backend Integration

Before delivering or committing a service change, verify the following:

- [ ] **No relative `/api` paths:** Verify that all HTTP calls use `environment.apiBaseUrl`.
- [ ] **Correct imports:** Ensure `environment` is imported from `src/environments/environment` (which resolves to `environment.prod.ts` in production builds).
- [ ] **Method-specific requirements:**
  - For `GET` requests, query parameters are properly serialized.
  - For `POST`/`PUT`/`DELETE` operations, ensure any required authorization headers are handled (the `jwtInterceptor` will automatically attach `Authorization: Bearer <token>` unless configured otherwise).
- [ ] **Error handling:** Ensure components consuming the service handle potential HTTP failures gracefully.
