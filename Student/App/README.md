# 학생 타임라인 프로토타입

`index.html`은 메인 로비 페이지이고, `student.html`은 학생 상세 페이지입니다.
현재 프로토타입에는 `프로젝트 팀 배치/역할 이력`, `반복 협업 팀원`, `취업 문서 진행 이력`도 함께 반영됩니다.

실행 순서

1. 데이터 재생성
2. `App/index.html` 열기
3. 학생 카드를 누르면 `App/student.html?id=학생ID`로 이동

별도 웹 서버 없이 로컬 파일로 바로 확인할 수 있습니다.

데이터를 다시 생성하려면 아래 스크립트를 실행합니다.

```powershell
& "C:\Users\안중재\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" .\scripts\build_app_data.py
```

생성 결과물

- `App/data.js`: 실제 `Data` 폴더를 정규화한 프런트엔드 데이터 파일
- `App/index.html`: 메인 로비 페이지
- `App/student.html`: 학생 상세 페이지
- `App/scripts/common.js`: 공통 유틸, 차트, 태그, 검색 렌더링
- `App/scripts/lobby.js`: 메인 로비 전용 로직
- `App/scripts/student.js`: 학생 상세 전용 로직
- `App/styles.css`: 공통 스타일
- `App/styles/lobby.css`: 메인 로비 전용 스타일
- `App/styles/student.css`: 학생 상세 전용 스타일

현재 출결 표시는 아래처럼 분리됩니다.

- `출결 기록`: 전체 출결 이벤트 수
- `판단 반영 위험`: 성향 판단에 직접 반영되는 `행동/관리형` 출결 수
