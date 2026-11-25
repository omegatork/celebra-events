# celebra.events

Self-serve digital invitations (bodas, XV años, bautizos) with personalized guest passes, RSVP and WhatsApp links.

- Prod: https://celebra.omegatork.com (LAN: http://192.168.100.241)
- Stage: http://192.168.100.240
- Architecture & roadmap: `/Users/gabriel/Documents/Proyectos/Documentation`

## Stack

Next.js 14 (App Router, standalone) · PostgreSQL 18 (CloudNativePG) · MicroK8s · MetalLB · Cloudflare Tunnel

```
src/
  app/                 routes only (pages, API handlers)
  modules/
    identity/          users, accounts, server-side sessions, passwords (scrypt),
                       throttling, authorization rules
    events/            event repository (invitation content as JSONB)
    guests/            guests, random tokens, RSVP rules
  shared/
    db/pool.ts         Postgres pool
    http.ts            request parsing helpers
  middleware.ts        rejects cookie-less requests to protected paths (real checks are in route handlers)
migrations/            SQL migrations (applied by scripts/migrate.mjs)
scripts/
  migrate.mjs          apply pending migrations
  import-json.mjs      one-time import of legacy db.json (or seed-demo.json)
  smoke-test.sh        security + functional checks against an environment
k8s/
  stage.yaml, prod.yaml       app per environment
  db/stage-db.yaml, db/prod-db.yaml   CloudNativePG clusters
  cloudflare-tunnel.yaml      shared tunnel (cloudflare-system)
```

## Access model

| Surface | Who | How |
| :--- | :--- | :--- |
| `/`, `/e/<slug>` | Everyone | Public. Landing lists only demo events |
| `/e/<slug>?g=<token>` | One guest group | 128-bit random token (22 chars) |
| `POST /api/rsvp` | Guests | Needs a valid token; tokenless only if the event enables "Confirmación abierta" |
| `/login`, `/registro` | Organizers | Email + password accounts; each sign-up gets its own account (tenant) |
| `/login`, `/registro` → "Continuar con Google" | Organizers | Google sign-in (OIDC + PKCE). Links to an existing user by verified email, otherwise creates user + account. Hidden unless the `celebra-google` Secret exists |
| `/login?modo=invitacion` | Customers without an account | Event address + invitation password → manage that one event |
| `/admin/login`, `/admin/usuarios` | Platform staff | Shared admin password (Secret `celebra-auth`); sees all events, generates invitation passwords, resets user passwords |

Sessions are server-side (Postgres `sessions` table); permissions are in `src/modules/identity/authorization.ts`.

Get the platform admin password for an environment:

```bash
kubectl get secret celebra-auth -n celebra-prod -o jsonpath='{.data.admin-password}' | base64 -d; echo
```

Typical flow for a sale without an account: admin creates the event in `/dashboard` → "Generar contraseña de invitación" → "Copiar mensaje para el cliente" → customer enters at `/login?modo=invitacion`. If they later create an account, they use "Agregar invitación a mi cuenta".

## Deploy

```bash
./deploy-cluster.sh stage                      # build + migrate + switch release on stage
scripts/smoke-test.sh http://192.168.100.240 celebra-stage
./deploy-cluster.sh prod
scripts/smoke-test.sh https://celebra.omegatork.com celebra-prod
```

The deploy builds inside the running pod into `/app/runtime/releases/<timestamp>`, runs migrations, flips the `current` symlink and restarts the pod. It's a stopgap until CI-built images + Argo CD (see Documentation ADR-0003).

## First-time setup of a new environment

```bash
kubectl apply --server-side -f https://github.com/cloudnative-pg/cloudnative-pg/releases/download/v1.30.2/cnpg-1.30.2.yaml   # once per cluster
kubectl apply -f k8s/db/stage-db.yaml                                  # creates Secret celebra-db-app
kubectl create secret generic celebra-auth -n celebra-stage \
  --from-literal=admin-password="$(openssl rand -base64 18 | tr -d '/+=')"
./deploy-cluster.sh stage
```

## Database access

```bash
kubectl exec -it -n celebra-stage celebra-db-1 -c postgres -- psql -U postgres -d celebra
```
