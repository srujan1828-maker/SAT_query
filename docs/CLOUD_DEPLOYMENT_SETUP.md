# SatQuery Cloud Deployment Setup

This guide deploys the current application with **Vercel for the React frontend** and **Render for the FastAPI backend**. The root `vercel.json` sends `/api/*` and `/media/*` requests to the Render service, so the browser can use same-origin requests.

## 1. Prepare the required accounts and credentials

Create accounts for [GitHub](https://github.com/), [Vercel](https://vercel.com/), and [Render](https://render.com/). For the AI and live imagery features, also prepare:

| Credential | Needed for | Where to configure |
|---|---|---|
| Google Gemini API key | Gemini-powered intent extraction, image answers, and report narratives. Required for Telegram voice-note transcription and robust claim-detail extraction; without it, text claims have limited keyword parsing. | Render environment variable `GEMINI_API_KEY` |
| Sentinel Hub OAuth client ID and secret | Live Sentinel imagery in flood and crop workflows. Without credentials, those workflows may use synthetic/demo imagery instead of live scenes. | Render environment variables `SENTINEL_HUB_CLIENT_ID` and `SENTINEL_HUB_CLIENT_SECRET` |

Create a Gemini key in [Google AI Studio](https://aistudio.google.com/apikey). Create Sentinel Hub OAuth credentials in your Sentinel Hub account and check the account's data access, quotas, and pricing before using it.

**Keep provider credentials on Render.** Never add them to frontend `VITE_*` variables, commit them to GitHub, or paste them into browser code.

## 2. Deploy the backend to Render

1. In Render, choose **New → Web Service** and connect the GitHub repository `srujan1828-maker/SAT_query`.
2. Select the `main` branch and **Docker** as the runtime.
3. Set **Root Directory** to `backend`. The Dockerfile is `backend/Dockerfile`, so with this root directory Render should discover it automatically.
4. Choose an instance size suitable for Rasterio/GDAL image processing. Keep the service to **one instance / one Uvicorn worker**; the job store is local SQLite and is not shared across replicas.
5. Add a persistent disk if jobs and generated image artifacts must survive restarts. Mount it at `/var/data`, then set `SATQUERY_DATA_DIR` to `/var/data`. Without a persistent disk, stored jobs and artifacts can be lost when the service restarts.
6. Add the environment variables below in **Environment**. Enter secret values directly in Render's dashboard.
7. Set the health check path to `/health`, deploy, and wait for the service to become live.
8. Test `https://<your-render-service>.onrender.com/health`. A healthy response confirms the API process is reachable; it does not confirm that all upstream providers or credentials are working.

### Render environment variables

**Required for Gemini-backed AI:**

```text
GEMINI_API_KEY=<your Google AI Studio key>
```

**Required for live Sentinel Hub imagery:**

```text
SENTINEL_HUB_CLIENT_ID=<your Sentinel Hub OAuth client ID>
SENTINEL_HUB_CLIENT_SECRET=<your Sentinel Hub OAuth client secret>
```

**Recommended deployment settings:**

```text
SATQUERY_DATA_DIR=/var/data
MAX_ACTIVE_JOBS=2
ANALYSIS_TIMEOUT_SECONDS=240
```

Use `/var/data` only when a Render disk is mounted at that exact path. Otherwise choose a writable directory; it will not be persistent across restarts.

Optional settings:

| Variable | Purpose |
|---|---|
| `GEMINI_MODEL` | Gemini model name; defaults to `gemini-flash-latest`. |
| `GEOCHAT_ENDPOINT_URL` | Kaggle GeoChat's public HTTPS tunnel URL ending in `/infer`. Used for single-image map/image intelligence; paired-image analysis still uses Gemini. |
| `GEOCHAT_API_KEY` | Optional shared secret. If set, Render sends `Authorization: Bearer <key>`; configure the same secret in the Kaggle service. |
| `GEOCHAT_TIMEOUT_SECONDS` | GeoChat request timeout; default is 90 seconds. |
| `GEOCHAT_ATTEMPTS` | GeoChat retry count; default is 2. |
| `OGD_API_KEY`, `OGD_CROP_RESOURCE_ID`, `OGD_CROP_UNITS`, `OGD_CROP_FIELDS` | Optional district-crop data connector. A key alone is insufficient: use a verified resource ID, correct units (`hectares_tonnes` only after verification), and field mapping if needed. |
| `PC_SDK_SUBSCRIPTION_KEY` | Optional Planetary Computer access key if the data endpoint/account requires one. |

NASA POWER, OpenStreetMap/Nominatim, and Microsoft Planetary Computer are accessed as public upstream data services by the current application; they do not have corresponding required API-key variables in this deployment.

## 3. Deploy the frontend to Vercel

1. In Vercel, choose **Add New → Project** and import `srujan1828-maker/SAT_query`.
2. Leave **Root Directory** at the repository root. The root `vercel.json` contains the Vite build command, output directory, and API/media rewrites.
3. Leave the framework detection at Vite or let the checked-in Vercel configuration control the build.
4. Do not set `VITE_API_BASE_URL` for this setup. The Vercel rewrites keep API and artifact requests on the frontend origin and forward them to `https://satquery.onrender.com`.
5. Deploy and open the generated Vercel URL.
6. If the Render service has a different hostname, update both `/api/:path*` and `/media/:path*` destinations in the root [`vercel.json`](../vercel.json), commit and push that change, then redeploy Vercel.

In Vercel, set `VITE_TELEGRAM_BOT_USERNAME` to the bot's public username **without** the `@` (for example `SatQueryClaimsBot`). This only adds the frontend link to the bot. Leave `VITE_API_BASE_URL` empty. The optional `VITE_CESIUM_ION_TOKEN` enables Cesium terrain only. The globe can run without it. It is a browser-visible token, so restrict its allowed origins and assets in Cesium Ion; do not put server secrets in any `VITE_*` variable.

## 4. Verify the deployment

1. Confirm the Render health endpoint responds: `https://<your-render-service>.onrender.com/health`.
2. Open the Vercel site and confirm the page loads over HTTPS.
3. Try geocoding a place and confirm the request returns through the Vercel `/api/` rewrite.
4. Run one analysis with a known location and date range. Check Render logs for upstream/API errors if it fails.
5. Confirm generated evidence images load through `/media/`.
6. Verify that live Sentinel imagery is being returned before treating results as real-world evidence. Without valid Sentinel Hub credentials, some workflows intentionally fall back to demo imagery; report outputs must not be presented as verified measurements unless the actual data sources and outputs have been checked.

## 5. Connect Kaggle GeoChat

The Render backend already calls GeoChat using this request contract:

- `POST <GEOCHAT_ENDPOINT_URL>/infer` as `multipart/form-data`.
- Fields: `prompt` (text), `task` (currently `vqa` for single-image map intelligence), and `image` (the verified PNG scene).
- JSON response: `{"answer":"...", "boxes":[...]}`. `boxes` is optional; each box should contain normalized image coordinates `x_min`, `y_min`, `x_max`, `y_max` in the range 0–1, plus `label` and optional `confidence` in the range 0–1. Valid boxes are shown as image overlays in the frontend.
- If `GEOCHAT_API_KEY` is set on Render, requests include `Authorization: Bearer <key>`. Validate the same secret in the Kaggle HTTP endpoint and keep it in Kaggle Secrets; never embed it in notebook output or source.

A Kaggle notebook is not automatically a stable public web service. The notebook must start an HTTP server that implements this contract and expose it with a publicly reachable HTTPS tunnel (for example, a properly secured tunnel). Keep the notebook session and tunnel running; when either stops or its URL changes, GeoChat requests from Render will fail. Do not put Telegram or other backend credentials in the notebook or tunnel URL.

After confirming that the endpoint is reachable from outside Kaggle, set on Render:

```text
GEOCHAT_ENDPOINT_URL=https://<public-kaggle-tunnel-host>
GEOCHAT_TIMEOUT_SECONDS=120
GEOCHAT_ATTEMPTS=2
```

The backend appends `/infer` when the URL does not already end in that path. Test the endpoint independently with the multipart fields above before running a SatQuery query. If the Kaggle notebook doesn't yet expose an HTTP endpoint, leave `GEOCHAT_ENDPOINT_URL` blank; a notebook URL by itself is not an inference API.

## 6. Telegram crop-claim bot

The backend accepts Telegram updates at `https://<your-render-service>.onrender.com/api/telegram/webhook`. The bot runs through Telegram's HTTPS webhook; no polling worker is needed.

1. In Telegram, message [@BotFather](https://t.me/BotFather), run `/newbot`, and save the returned token privately.
2. In Render, add these environment variables:

   ```text
   TELEGRAM_BOT_TOKEN=<BotFather token>
   TELEGRAM_WEBHOOK_SECRET=<random 1-256 character secret using letters, numbers, _ or ->
   GEMINI_API_KEY=<Google AI Studio key>
   ```

   `GEMINI_API_KEY` is also used to transcribe voice notes and extract claim fields. The bot accepts private chats, shared GPS locations, text, and Telegram voice notes. It asks for missing crop/damage/date details, analyzes the claim, then replies with a screening summary and PDF report. The generated report is informational—not an official insurance decision.
3. Generate a webhook secret locally. For PowerShell:

   ```powershell
   $bytes = New-Object byte[] 32
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $rng.GetBytes($bytes)
   $rng.Dispose()
   $secret = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
   $secret
   ```

   Store that value as `TELEGRAM_WEBHOOK_SECRET` in Render. Keep it private.
4. After the Render deployment is live, register the webhook from a local PowerShell window. Enter the token and secret when prompted; don't save the token in a script, Git, or browser:

   ```powershell
   $token = Read-Host "BotFather token"
   $secret = Read-Host "Webhook secret"
   $body = @{
     url = "https://<your-render-service>.onrender.com/api/telegram/webhook"
     secret_token = $secret
     allowed_updates = @("message")
   } | ConvertTo-Json
   Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -ContentType "application/json" -Body $body
   Remove-Variable token, secret, body
   ```

   Replace the placeholder with your actual Render hostname. Telegram should respond with `ok: true`. If you change the webhook secret in Render, register the webhook again with the matching value.
5. In Vercel, set `VITE_TELEGRAM_BOT_USERNAME` to the public bot username without `@`, then redeploy the frontend. The crop page's **Open Telegram bot** button will link to it.
6. Test from a private Telegram chat: `/start`, share a GPS pin, then send a message or voice note naming the crop, damage type, and event date. `/cancel` clears an unfinished claim.

Telegram voice notes require `GEMINI_API_KEY`. Text messages may use limited keyword parsing if Gemini is unavailable, but the AI key is recommended for extracting natural-language claim details. The webhook stores unfinished claim context temporarily in the backend's SQLite database and clears it after a completed or cancelled claim; mount persistent storage if state must survive service restarts.

## 7. Local development

For frontend work, copy/use `frontend/.env.example` and run `npm ci` followed by `npm run dev` inside `frontend`.

For backend work, create a Python 3.12 environment, install the package from `backend/pyproject.toml` (for example `pip install -e .` from `backend`), set provider credentials in your local environment or an untracked `backend/.env`, and run:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The local Vite frontend defaults to the API at `http://127.0.0.1:8000`. Keep `.env` files out of commits.

For API contracts, retention, and operational caveats, see the [deployment notes](./DEPLOYMENT.md).
