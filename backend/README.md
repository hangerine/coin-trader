# Backend 실행 가이드

Bithumb Trading API 백엔드 서버 실행 방법입니다.

## 필수 요구사항

- Python 3.8 이상
- pip

## 실행 방법

### 방법 1: Shell 스크립트 (Mac/Linux)

```bash
./run.sh
```

### 방법 2: Python 스크립트 (모든 플랫폼)

```bash
python run.py
# 또는
python3 run.py
```

### 방법 3: Windows Batch 파일

```cmd
run.bat
```

### 방법 4: 직접 실행

```bash
# 가상환경 활성화 (선택사항)
source venv/bin/activate  # Mac/Linux
# 또는
venv\Scripts\activate  # Windows

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 서버 접속

서버가 시작되면 다음 주소로 접속할 수 있습니다:

- **API 서버**: http://localhost:8000
- **API 문서 (Swagger)**: http://localhost:8000/docs
- **API 문서 (ReDoc)**: http://localhost:8000/redoc

## 주요 API 엔드포인트

### 시장 정보
- `GET /api/market/current` - 현재 시장 정보
- `GET /api/market/history` - 시장 가격 히스토리

### 거래
- `POST /api/trade` - 거래 실행
- `GET /api/trades` - 거래 내역 조회

### API 키 관리
- `GET /api/keys` - API 키 목록 조회
- `POST /api/keys` - API 키 추가
- `DELETE /api/keys/{key_id}` - API 키 삭제

## 환경 설정

### 포트 변경
기본 포트는 8000입니다. 변경하려면 스크립트 파일에서 `--port` 옵션을 수정하세요.

### CORS 설정
프론트엔드 주소가 다른 경우 `main.py`의 `origins` 리스트를 수정하세요.

## 문제 해결

### 포트가 이미 사용 중인 경우
```bash
# Mac/Linux
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### 의존성 설치 오류
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## 개발 모드

`--reload` 옵션이 활성화되어 있어 코드 변경 시 자동으로 서버가 재시작됩니다.

## 프로덕션 배포

프로덕션 환경에서는 `--reload` 옵션을 제거하고 워커 수를 조정하세요:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
