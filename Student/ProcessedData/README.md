# ProcessedData

이 폴더는 `Data` 원본을 교육학 기반 기준으로 다시 구조화한 산출물입니다.

구성 원칙

- `meta`: 연구 근거, 기준, 검토 결과
- `curriculum`: 전체 시간표와 주차 기준 정보
- `indexes`: 검색과 집계에 바로 쓰기 쉬운 요약 인덱스
- `students/{studentId}`: 학생별 분리 데이터

핵심 파일

- `learning_evidence.json`: 원본에서 추출한 증거 레코드
- `evaluation_snapshots.json`: 해석 레이어의 시점별 스냅샷
- `status_periods.json`: 주차 흐름을 기반으로 만든 경고/주의 구간
- `project_team_history.json`: 프로젝트별 팀 배치와 역할 이력
- `peer_relationships.json`: 반복 협업 팀원 요약
- `career_documents.json`: 1차/2차 취업 문서와 피드백 이력
- `overview.md`: 사람이 빠르게 읽을 수 있는 학생 요약

주의사항

- 이 폴더는 운영 보조용 재가공 결과입니다.
- 성향 스냅샷과 상태 구간은 자동 해석을 포함하므로 단독 판정 자료로 사용하면 안 됩니다.
