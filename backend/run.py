#!/usr/bin/env python3
"""
Backend 실행 스크립트
FastAPI 서버를 uvicorn으로 실행합니다.
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # 스크립트가 있는 디렉토리로 이동
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("=" * 60)
    print("Bithumb Trading API Backend Server")
    print("=" * 60)
    
    # 가상환경 확인
    venv_path = script_dir / "venv"
    if venv_path.exists():
        print("✓ 가상환경 발견")
        # 가상환경의 Python 사용
        if sys.platform == "win32":
            python_exe = venv_path / "Scripts" / "python.exe"
            pip_exe = venv_path / "Scripts" / "pip.exe"
        else:
            python_exe = venv_path / "bin" / "python"
            pip_exe = venv_path / "bin" / "pip"
    else:
        print("⚠ 가상환경이 없습니다. 전역 Python 환경을 사용합니다.")
        python_exe = sys.executable
        pip_exe = "pip"
    
    # 의존성 설치 확인
    print("\n의존성 확인 중...")
    requirements_file = script_dir / "requirements.txt"
    if requirements_file.exists():
        try:
            subprocess.run(
                [str(pip_exe), "install", "-q", "-r", str(requirements_file)],
                check=True
            )
            print("✓ 의존성 설치 완료")
        except subprocess.CalledProcessError as e:
            print(f"⚠ 의존성 설치 중 오류 발생: {e}")
    
    # FastAPI 서버 실행
    print("\n" + "=" * 60)
    print("FastAPI 서버 시작 중...")
    print(f"서버 주소: http://localhost:8000")
    print(f"API 문서: http://localhost:8000/docs")
    print(f"ReDoc: http://localhost:8000/redoc")
    print("=" * 60)
    print("\n종료하려면 Ctrl+C를 누르세요.\n")
    
    try:
        # uvicorn 실행
        subprocess.run([
            str(python_exe), "-m", "uvicorn",
            "main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n\n서버를 종료합니다.")
    except Exception as e:
        print(f"\n오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
