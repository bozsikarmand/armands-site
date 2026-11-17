---
title: "Eszközeim"
description: "A hardverek, szoftverek és szolgáltatások, amiket naponta használok."
type: prose
url: /hu/uses/
---
A projektek mögötti eszközök – a [uses.tech](https://uses.tech)
mintájára. Utoljára frissítve: 2026. november.

## Hardver

- **Egyedi asztali gép** – Gigabyte X570 AORUS ELITE alaplap, AMD Ryzen 7
  3700X (8 mag / 16 szál), 60 GB RAM, Radeon RX 5500
- **Tárhely** – WD Black SN750 1 TB NVMe (rendszer) + WD Blue 1 TB SATA +
  WD Blue 500 GB SATA + Samsung 830 120 GB
- **Kijelzők** – három 2560×1080 ultrawide monitor
- **Kensington Expert Mouse** trackball
- **Logitech MX Brio** webkamera

## Szoftver

- **Ubuntu 26.04 LTS** – mindennapi rendszer
- **VS Code** + nano – szerkesztés (nincs szerkesztő-vallás, ami épp kéznél van)
- **Firefox** + Chromium – fő böngésző + tesztelés
- **Git** GitLabbal (kanonikus) + GitHubbal (tükör)
- **Node.js 26** (nvm) + Python 3.14 + OpenJDK 21
- **Docker + DDEV** – helyi fejlesztés (WordPress, saját stack-ek)
- **Oracle APEX / ORDS** – enterprise RAD, a professzionális eszköztár
  (lokális 26ai példányok Dockerben)
- **Hugo + Astro** – statikus oldalak (mint ez is)
- **Thunderbird, Bitwarden, Steam, VLC, Zoom** – napi appok

## Homelab

- **Proxmox VE 8+** – VM-platform, API-tokennel kezelve
- **OpenTofu / Terraform** – minden infrastruktúra kód mint
  `cloud-init-*` + `provisioner-*` modulok (Argo CD, Keycloak, OpenBao,
  PostgreSQL HA, PowerDNS, Redis, step-ca, WireGuard, Prometheus,
  GitLab CE + runner, Ceph RGW…)
- **Homelab Orchestrator** – saját web UI VM-/szolgáltatás- és
  secret-kezeléshez, Cloudflare DNS/tunnel integrációval
- **Cloudflare Tunnels + Access** – publikus kifutás nulla nyitott
  porttal

## Szolgáltatások

- **Cloudflare** – DNS, Workers, D1, KV, R2, Pages; az egész portfólió
  a free tieren fut
- **GitLab CE** – self-hosted a homelabban (Terraform-modul kész, a
  migráció folyamatban) + gitlab.com a kanonikus tárhely
- **GitHub** – minden repó tükre
- **Zoho Mail** – a kapcsolati űrlapok mögött (Cloudflare Workeren keresztül)
- **Netlify** – legacy build-ek (blogtükör)
- **GitLab CI** – pipeline-ok (a GitHub Actions-os rendszerek
  átállítása folyamatban)
