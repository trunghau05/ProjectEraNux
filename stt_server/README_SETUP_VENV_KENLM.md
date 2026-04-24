# STT Server Setup Guide (venv + KenLM)

Guide nay chia lam 2 phan:
1. May cua ban (tao `.venv`, cai du thu vien, dam bao `kenlm` chay duoc)
2. May nguoi nhan (dung lai moi truong de chay server on dinh)

Khuyen nghi: dung Python **3.9 x64** de khop voi model + binary hien tai.

---

## 1) May Cua Ban (Nguon)

### 1.1. Tao venv

```powershell
cd D:\HK8\stt_vi\stt_server

& "C:\Users\trand\AppData\Local\Programs\Python\Python39\python.exe" -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
```

### 1.2. Cai thu vien chinh

```powershell
python -m pip install --extra-index-url https://download.pytorch.org/whl/cu118 `
  torch==2.7.1+cu118 torchaudio==2.7.1+cu118 `
  fastapi==0.121.3 uvicorn==0.38.0 pydantic==2.12.4 python-multipart==0.0.20 `
  requests==2.32.5 numpy==1.25.2 noisereduce==3.0.3 `
  speechbrain==1.0.3 huggingface-hub==0.20.3 pyannote.audio==3.4.0 `
  google-generativeai==0.8.6
```

### 1.3. Pin de tranh loi tren Python 3.9.0

```powershell
python -m pip install --force-reinstall --no-cache-dir cryptography==41.0.7 "aiohttp<3.10"
```

### 1.4. Cai KenLM (uu tien build trong venv)

```powershell
python -m pip install "cmake<4" ninja
python -m pip install --no-build-isolation -v kenlm==0.2.0
python -c "import kenlm; print('KENLM OK:', kenlm.__file__)"
```

Neu build `kenlm` fail, dung fallback copy binary tu Python global (neu global da chay duoc):

```powershell
$globalSite = "C:\Users\trand\AppData\Local\Programs\Python\Python39\Lib\site-packages"
$venvSite   = "D:\HK8\stt_vi\stt_server\.venv\Lib\site-packages"

Copy-Item "$globalSite\kenlm.cp39-win_amd64.pyd" $venvSite -Force
Copy-Item "$globalSite\kenlm.dll" $venvSite -Force
Copy-Item "$globalSite\kenlm.lib" $venvSite -Force
Copy-Item "$globalSite\kenlm.exp" $venvSite -Force
Copy-Item "$globalSite\kenlm-0.2.0.dist-info" $venvSite -Recurse -Force

python -c "import kenlm; print('KENLM OK:', kenlm.__file__)"
```

### 1.5. Chay server de test

```powershell
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

---

## 2) Dong Goi De Gui Nguoi Nhan

Tu may cua ban, tao lock + wheel offline:

```powershell
cd D:\HK8\stt_vi\stt_server
.\.venv\Scripts\python.exe -m pip freeze > requirements-lock-raw.txt

# Tao requirements-lock cuoi:
# - chen extra index cho torch CUDA 11.8
# - bo kenlm khoi lock (kenlm gui rieng qua kenlm_bin)
@('--extra-index-url https://download.pytorch.org/whl/cu118') + `
(Get-Content requirements-lock-raw.txt | Where-Object { $_ -notmatch '^kenlm==' }) | `
Set-Content requirements-lock.txt

.\.venv\Scripts\python.exe -m pip download -r requirements-lock.txt -d wheels --prefer-binary
```

Sao luu rieng bo `kenlm` de fallback:

```powershell
$src = "D:\HK8\stt_vi\stt_server\.venv\Lib\site-packages"
$dst = "D:\HK8\stt_vi\stt_server\kenlm_bin"
New-Item -ItemType Directory -Force $dst | Out-Null

Copy-Item "$src\kenlm.cp39-win_amd64.pyd" $dst -Force
Copy-Item "$src\kenlm.dll" $dst -Force
Copy-Item "$src\kenlm.lib" $dst -Force
Copy-Item "$src\kenlm.exp" $dst -Force
Copy-Item "$src\kenlm-0.2.0.dist-info" $dst -Recurse -Force
```

Gui cho nguoi nhan:
- Toan bo source `stt_server`
- `requirements-lock.txt`
- thu muc `wheels`
- thu muc `kenlm_bin`
- model files: `modelAI/last.pt`, `modelAI/lm.binary`, `vocab/vocab.txt`

---

## 3) May Nguoi Nhan (Dich)

### 3.1. Tao venv moi

```powershell
cd D:\HK8\stt_vi\stt_server
py -3.9 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
```

### 3.2. Cai thu vien

Neu co internet:

```powershell
python -m pip install -r requirements-lock.txt
```

Neu muon cai offline:

```powershell
python -m pip install --no-index --find-links wheels -r requirements-lock.txt
```

Neu gap lai loi `cryptography`/`aiohttp`, chay them:

```powershell
python -m pip install --force-reinstall --no-cache-dir cryptography==41.0.7 "aiohttp<3.10"
```

### 3.3. Dam bao KenLM

Test truoc:

```powershell
python -c "import kenlm; print('KENLM OK:', kenlm.__file__)"
```

Neu fail, copy fallback:

```powershell
Copy-Item .\kenlm_bin\* .\.venv\Lib\site-packages -Recurse -Force
python -c "import kenlm; print('KENLM OK:', kenlm.__file__)"
```

### 3.4. Chay server

```powershell
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

---

## 4) Luu Y Quan Trong

- `deactivate` chi thoat khoi venv trong terminal hien tai, khong xoa package.
- Khong nen gui ca thu muc `.venv` roi ky vong may khac chay 100%; nen gui source + lock + wheels + `kenlm_bin`.
- Cac dong `FutureWarning` ve Python 3.9 la canh bao, khong nhat thiet lam crash server.
- Neu loi `Not enough space Failed to allocate ...` khi load `lm.binary`, dong app nang/bo nho ao thap roi chay lai.

---

## 5) Frontend Integration (Production Style)

### 5.1. CORS + env setup

```powershell
cd D:\HK8\stt_vi\stt_server
Copy-Item .env.example .env
```

Set cac bien sau trong `.env`:
- `CORS_ALLOWED_ORIGINS`: domain frontend, cach nhau boi dau phay.
- `HF_TOKEN`: token Hugging Face (neu can diarization).
- `DIARIZATION_MODEL`: mac dinh `pyannote/speaker-diarization-3.1` (giam warning model cu).
- `DIARIZATION_FALLBACK_MODEL`: fallback `pyannote/speaker-diarization` neu model moi khong load duoc.
- `GEMINI_API_KEY`: neu dung endpoint summary.
- Bien trong `.env` duoc uu tien truoc `core/local_tokens.py`.

### 5.2. Health endpoints

- `GET /api/health/live`: check process con song.
- `GET /api/health/ready`: check model STT da load xong chua (tra `503` neu chua san sang).

### 5.3. STT endpoints

- `POST /api/stt/transcribe` (multipart form):
  - `file` (UploadFile) **hoac** `audio_url` (form field), chi duoc gui 1 trong 2.
- `POST /api/stt/transcribe-url` (JSON):
  - body: `{ "audio_url": "https://..." }`
- `POST /api/stt/transcribe-summary` (multipart form)
- `POST /api/stt/transcribe-summary-url` (JSON)
  - Neu summary provider bi loi/quyen truy cap bi tu choi, API van tra transcription va kem truong `summary_error`.

### 5.4. Quick test

```powershell
curl -X GET "http://127.0.0.1:8000/api/health/ready"
```
