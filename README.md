# celebra.events — Plataforma de Invitaciones Digitales Interactivas

Self-serve digital event invitations platform (**celebra.events**), ready to run locally or deploy to your Kubernetes home cluster (`mllse1` & `mllse02`) using **MetalLB**.

---

## 1. Included MVP Features (Self-Serve SaaS)

* **Marketing Landing Page (`/`)**: Live catalog of interactive templates, feature comparison, and pricing packages (*Invitación Clásica* vs. *Evento Completo*).
* **Interactive Digital Invitation Engine (`/e/[slug]?g=[guest-token]`)**:
  * **Animated Wax Seal & Envelope Opening**: Unlocks background music audio on tap.
  * **Personalized Guest Pass Banner**: Reads `?g=familia-ramirez` from the URL to display the family's name, exact number of reserved passes, and assigned table number.
  * **Live Countdown Timer**: Days, hours, minutes, and seconds to the ceremony.
  * **Venue Cards & GPS Links**: Ceremony and reception cards with 1-click Google Maps links.
  * **Event Timeline / Itinerary**: Vertical timeline of ceremony, cocktail, dinner, and party.
  * **Dress Code & Gift Registry**: Includes 1-click copy for bank `CLABE` and store registry links (Liverpool, Amazon, etc.).
  * **Smart RSVP & QR Code Pass**: Guests confirm how many of their allocated passes they will use, add dietary notes, leave wishes, and immediately receive a digital **QR Code Check-in Pass**.
* **Self-Serve Visual Editor & Guest Dashboard (`/dashboard`)**:
  * **Visual Editor + Live Mobile Preview**: Edit themes (`Editorial Gold`, `Romantic Blush`, `Emerald Garden`, `Midnight Gala`), titles, dates, cover photos, locations, and bank CLABE with a real-time phone preview.
  * **Guest List & 1-Click WhatsApp Sender**: Add families with their allocated passes and table numbers, copy their unique invitation link, or click **WhatsApp** to send a pre-filled personalized invitation message.

---

## 2. Stage vs. Prod in Your Kubernetes Cluster

Your cluster has two nodes (`192.168.100.54` control plane and `192.168.100.38` worker) and **11 free MetalLB IPs** (`192.168.100.240–250`).

| Environment | Kubernetes Namespace | Dedicated MetalLB IP | Persistent Volume | Manifest | Visual Indicator |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage** | `celebra-stage` | `http://192.168.100.240` | `celebra-data-pvc` (2Gi in `celebra-stage`) | `k8s/stage.yaml` | Top amber banner: *"Ambiente de Pruebas (STAGE)"* |
| **Prod** | `celebra-prod` | `http://192.168.100.241` | `celebra-data-pvc` (5Gi in `celebra-prod`) | `k8s/prod.yaml` | Clean production header |

---

## 3. Running Locally vs. Deploying to the Cluster

### Run Locally on Your Mac
```bash
cd /Users/gabriel/Documents/Proyectos/celebra-events
npm install
npm run dev
```

### Deploy to Stage (`192.168.100.240`) or Prod (`192.168.100.241`)
```bash
cd /Users/gabriel/Documents/Proyectos/celebra-events

# Deploy to Stage (http://192.168.100.240)
./deploy-cluster.sh stage

# Promote to Production (http://192.168.100.241)
./deploy-cluster.sh prod
```
