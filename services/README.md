# @clips/services
Backend for clips.robobot.dev. The `encoder` and `api` are packaged into one file.

## 🗂️ Prerequisites
Quickly setup the backend these docker commands:
- `docker build -t clips-services -f .dockerfile .`
- `docker compose -f ../docker-compose.dev.yml up -d`
- `npm run db-deploy`
  
| Name                                                        | Description         |
| :---------------------------------------------------------- | :------------------ |
| [PostgreSQL (>=16.0)](https://hub.docker.com/_/postgres)    | Relational Database |
| [Redis (>=7.2.0)](https://hub.docker.com/_/redis)           | Key-Value Database  |
| [NodeJS (>=20.5.1)](https://nodejs.org/en/download/current) | Runtime             |
| [NGINX (>=1.25.2)](https://www.nginx.com/)                  | Proxy               |

## ⚙️ Environment Variables
Descriptions are now available in [index.ts](./src/index.ts). 