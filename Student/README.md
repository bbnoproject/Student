# Student Dashboard Handoff

이 저장소는 학생 데이터 원본을 재가공해 로컬 웹 대시보드로 확인하는 작업 공간입니다.

처음 이어받는 사람은 먼저 [HANDOFF.md](./HANDOFF.md)를 읽어주세요. 해당 문서에 프로젝트 의도, 데이터 흐름, 학생 상태 분류 규칙, 재가공 명령, UI 판단 기준, 주의사항을 정리했습니다.

가장 최신 작업 맥락은 [HANDOFF.md](./HANDOFF.md)의 `15. 2026-05-15 최신 작업 컨텍스트` 섹션에 정리되어 있습니다. 다른 PC에서 이어서 작업할 때는 이 섹션을 먼저 확인하면 됩니다.

## 빠른 실행

1. `App/index.html`을 브라우저에서 열어 과정 개요를 확인합니다.
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
- `Design/`: 목적, 정보 구조, 데이터 기준, 화면 기획 문서
- `Design/PURPOSE_DRIVEN_PLAN.md`: 학생 분류/파악, 과정 파악/보고서, 멘토링 목적 기준 기획
- `Design/HTML_PAGE_PLAN.md`: 현재 HTML 페이지와 해시 라우트 기준 화면 기획
- `scripts/`: 원본 데이터를 앱/분석 데이터로 재가공하는 스크립트
- `App/`: 정적 웹 대시보드
- `App/data.js`: 앱이 읽는 통합 데이터
- `ProcessedData/`: 학생별 재가공 산출물
- `HANDOFF.md`: 이어받기용 작업 의도 컨텍스트

## 현재 주요 화면

- `App/index.html#overview`: 과정 개요
- `App/index.html#process`: 학습과정
- `App/index.html#process/m5`: 특정 마일스톤 직접 진입 예시
- `App/index.html#students`: 학생관리
- `App/index.html#feedback`: 피드백
- `App/student.html?id=강유민`: 학생 상세 예시

## 2026-05-20 작업 기록

이번 작업에서는 데이터 재가공 결과를 다시 확인하고, Chrome 실제 브라우저로 주요 화면을 검증한 뒤 UI/UX 밀도 개선을 적용했습니다.

### 데이터/파이프라인 상태

- 번들 Python 경로:
  `C:\Users\안중재\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`
- `scripts/build_app_data.py` 재실행 결과:
  - `App/data.js` 재생성 성공
  - 학생 `80명`
  - 주차 `35개`
- `scripts/reprocess_student_data.py` 재실행 결과:
  - `ProcessedData/` 재생성 성공
  - 학생 `80명`
  - 산출 파일 약 `1370개`
- 검증 기준:
  - 전체 학생 수: `80명`
  - 과정이탈 학생: `김수환`, `김지훈`, `이길준`, `한가영`
  - `이탈자`라는 가짜 학생 없음
  - `staffProfile`, `cadetCard`, `dropoutInfo` 포함
  - 앱 데이터 내 `expressionProfile` 80명 생성
  - 학생별 `ProcessedData/students/*/expression_profile.json` 80개 생성
  - `ProcessedData/meta/validation_report.json` 기준 중복 evidence id `0`, admission 누락 `0`, 4개 스냅샷 누락 `0`

### 주요 기능/데이터 변경 맥락

- 학생 직접 작성 자료 기반 `자기표현과 발화 특징` 패널을 학생 상세에 추가했습니다.
- `expression_profile.json`을 학생별 재가공 산출물로 생성합니다.
- 건강/컨디션 리듬, 늦잠 지각 반복, 협업 갈등 신호를 학습 흐름 케이스와 운영 분류에 더 명확히 반영했습니다.
- 이탈자는 일반 관리 대상에서는 제외하되 전체 통계와 별도 과정이탈 필터에는 남깁니다.
- 로컬 수동 수정값이 있어도 원천 이탈 기록이 우선되도록 유지해야 합니다.

### UI/UX 개선 내용

- `App/styles.css`, `App/styles/lobby.css` 중심으로 운영 도구형 밀도 개선을 적용했습니다.
- 상단 sticky 바가 본문을 덮는 느낌을 줄였습니다.
- 개요 화면의 진행률, 통계 카드, 운영 포커스 카드 높이와 여백을 줄였습니다.
- 학생관리 표의 행 높이와 글자 크기를 조정하고 줄무늬 배경을 추가해 스캔성을 높였습니다.
- 운영 분류/상태 카드의 세로 공간을 줄였습니다.
- 학생 상세 개인정보 카드를 4열 기준으로 조정해 낭비되는 여백을 줄였습니다.
- 학생 상세 탭을 sticky 처리해 대시보드/상세정보 전환 접근성을 높였습니다.
- 자기표현 패널의 카드 간격, padding, border radius를 더 조밀하게 정리했습니다.

### 검증 기록

실행한 기본 검증:

```powershell
node --check App\scripts\common.js
node --check App\scripts\lobby.js
node --check App\scripts\student.js
git diff --check
```

모두 통과했습니다.

Chrome 실제 브라우저 검증:

- `http://127.0.0.1:8765/index.html#overview`
- `http://127.0.0.1:8765/index.html#students`
- `http://127.0.0.1:8765/index.html#process/m5`
- `http://127.0.0.1:8765/index.html#feedback`
- `http://127.0.0.1:8765/student.html?id=김수환`

확인 결과:

- 콘솔 오류 `0건`
- 개요, 학생관리, 학습과정 M5, 피드백 화면 정상 로드
- 김수환 상세에서 이탈 표시, 자기표현 패널, 정보 수정 버튼 정상 표시
- `정보 수정` 클릭 후 수정 화면 정상 진입
- `!` 판단기준 버튼 클릭 후 평가 기준 모달 정상 표시

### 브라우저 검증용 서버 실행

정적 파일 직접 열기보다 로컬 서버로 확인하는 것을 권장합니다.

```powershell
cd C:\Users\안중재\Desktop\PROJECT\StudentProject\Student\App
C:\Users\안중재\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m http.server 8765 --bind 127.0.0.1
```

브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:8765/index.html#overview
```

서버를 끄려면 PowerShell 창에서 `Ctrl + C`를 누릅니다.

### 남은 주의사항

- `ProcessedData/`와 `App/data.js`는 파생 산출물입니다. 원본 수정은 `Data/` 또는 스크립트에서 해야 합니다.
- `Student/scripts/__pycache__/build_app_data.cpython-312.pyc`가 git 추적 중인 변경 파일로 남을 수 있습니다. 커밋 전 포함 여부를 결정하세요. 일반적으로는 캐시 파일이므로 커밋 대상에서 제외하는 편이 안전합니다.
- 큰 변경은 앱 코드, 스크립트, 문서, 재생성 산출물이 섞여 있으므로 커밋 전 변경 범위를 한 번 더 분류하세요.
