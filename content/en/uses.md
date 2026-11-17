---
title: "Uses"
description: "The hardware, software and services I use daily."
type: prose
url: /en/uses/
---
The tools behind the projects — inspired by
[uses.tech](https://uses.tech). Last updated: November 2026.

## Hardware

- **Custom desktop** — Gigabyte X570 AORUS ELITE, AMD Ryzen 7 3700X
  (8 cores / 16 threads), 60 GB RAM, Radeon RX 5500
- **Storage** — WD Black SN750 1 TB NVMe (system) + WD Blue 1 TB SATA +
  WD Blue 500 GB SATA + Samsung 830 120 GB
- **Displays** — three 2560×1080 ultrawide monitors
- **Kensington Expert Mouse** trackball
- **Logitech MX Brio** webcam

## Software

- **Ubuntu 26.04 LTS** — daily driver
- **VS Code** + nano — editing (no editor religion, whatever fits)
- **Firefox** + Chromium — main browser + testing
- **Git** with GitLab (canonical) + GitHub (mirror)
- **Node.js 26** (nvm) + Python 3.14 + OpenJDK 21
- **Docker + DDEV** — local development (WordPress, custom stacks)
- **Oracle APEX / ORDS** — enterprise RAD, the professional toolkit
  (local 26ai instances in Docker)
- **Hugo + Astro** — static sites (like this one)
- **Thunderbird, Bitwarden, Steam, VLC, Zoom** — daily apps

## Homelab

- **Proxmox VE 8+** — VM platform, API-tokennel kezelve
- **OpenTofu / Terraform** — minden infrastruktúra kód mint
  `cloud-init-*` + `provisioner-*` modulok (Argo CD, Keycloak, OpenBao,
  PostgreSQL HA, PowerDNS, Redis, step-ca, WireGuard, Prometheus,
  GitLab CE + runner, Ceph RGW…)
- **Homelab Orchestrator** — saját web UI VM-/szolgáltatás- és
  secret-kezeléshez, Cloudflare DNS/tunnel integrációval
- **Cloudflare Tunnels + Access** — publikus kifutás nulla nyitott
  porttal

## Services

- **Cloudflare** — DNS, Workers, D1, KV, R2, Pages; the whole portfolio
  runs on the free tier
- **GitLab CE** — self-hosted a homelabban (Terraform-modul kész,
  migráció folyamatban) + gitlab.com a kanonikus tárhely
- **GitHub** — mirror of every repo
- **Zoho Mail** — behind the contact forms (via Cloudflare Worker)
- **Netlify** — legacy builds (blog mirror)
- **GitLab CI** — pipelines (upcoming GitHub Actions migrations)
