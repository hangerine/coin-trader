#!/bin/bash

# Backend 실행 스크립트
# FastAPI 서버를 uvicorn으로 실행합니다.

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")"

# 가상환경 활성화 (존재하는 경우)
if [ -d "venv" ]; then
    echo "가상환경 활성화 중..."
    source venv/bin/activate
else
    echo "경고: 가상환경이 없습니다. 전역 Python 환경을 사용합니다."
fi

# 의존성 설치 확인
echo "의존성 확인 중..."
pip install -q -r requirements.txt

# FastAPI 서버 실행
echo "FastAPI 서버 시작 중..."
echo "서버 주소: http://localhost:8000"
echo "API 문서: http://localhost:8000/docs"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
