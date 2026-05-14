# Student Dashboard Handoff

이 저장소는 학생 데이터 원본을 재가공해 로컬 웹 대시보드로 확인하는 작업 공간입니다.

처음 이어받는 사람은 먼저 [HANDOFF.md](./HANDOFF.md)를 읽어주세요. 해당 문서에 프로젝트 의도, 데이터 흐름, 학생 상태 분류 규칙, 재가공 명령, UI 판단 기준, 주의사항을 정리했습니다.

## 빠른 실행

1. `App/index.html`을 브라우저에서 열어 메인 로비를 확인합니다.
2. 데이터 원본을 바꾼 경우 아래 순서로 재가공합니다.

```powershell
$env:PYTHONIOENCODING='utf-8'
& "C:\Users\KGA_JJ\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" .\scripts\build_app_data.py
& "C:\Users\KGA_JJ\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" .\scripts\reprocess_student_data.py
```

다른 PC에서 위 Python 경로가 없으면 로컬에 설치된 Python으로 실행합니다.

```powershell
$env:PYTHONIOENCODING='utf-8'
python .\scripts\build_app_data.py
python .\scripts\reprocess_student_data.py
```

## 주요 경로

- `Data/`: 원본 데이터
- `scripts/`: 원본 데이터를 앱/분석 데이터로 재가공하는 스크립트
- `App/`: 정적 웹 대시보드
- `App/data.js`: 앱이 읽는 통합 데이터
- `ProcessedData/`: 학생별 재가공 산출물
- `HANDOFF.md`: 이어받기용 작업 의도 컨텍스트
