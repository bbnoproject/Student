# 학생 데이터 재가공 기준

## 1. 문서 목적

이 문서는 `Data` 폴더의 원본 학생 데이터를 교육학 연구 근거에 맞추어 다시 구조화하기 위한 기준 문서이다.

이번 재가공의 목표는 아래와 같다.

- 원본 데이터를 학생 상태 해석에 적합한 `교육적 증거` 단위로 재구성한다.
- 시간표를 기준으로 학생의 기록을 `시간축 기반`으로 다시 읽을 수 있게 만든다.
- 성향 분석, 타임라인 분석, 운영 개입에 모두 재사용 가능한 형태로 정리한다.
- 원본 데이터와 해석 데이터, 파생 평가 데이터를 분리해 보존한다.

---

## 2. 연구 자료 수집 결과

재가공 기준은 아래의 교육학/교육심리학 연구 및 공신력 있는 프레임을 바탕으로 설계한다.

| 연구/자료 | 핵심 개념 | 재가공에 반영한 의미 |
| --- | --- | --- |
| Barry J. Zimmerman, *Becoming a Self-Regulated Learner: An Overview* | 학습자는 목표 설정, 자기점검, 자기조정을 수행하는 존재 | 제출, 지연, 계획, 실행 흔적을 `자기조절 증거`로 분리 |
| Fredricks, Blumenfeld, Paris, *School Engagement: Potential of the Concept, State of the Evidence* | 참여는 행동적, 정서적, 인지적 차원으로 나뉨 | 출결, 참여 지속성, 체크인, 회고를 `참여 증거`로 재구성 |
| CASEL Framework | 자기인식, 자기관리, 관계 기술, 책임 있는 의사결정 | 면담, 협업, 갈등 대응 기록을 `관계/협업 증거`로 분리 |
| Yeager & Dweck, *Mindsets That Promote Resilience* | 도전과 실패 상황에서의 해석과 재도전이 중요 | 실패 대응, 회복, 개선 시도를 `회복탄력성 증거`로 분리 |
| Deci et al., *Motivation and Education: The Self-Determination Perspective* | 자율성, 유능감, 관계성은 학습 동기의 핵심 | 진로 목표, 학습 목적, 주도적 선택을 `목적성 증거`로 분리 |
| Boyd & Fales, *Reflective Learning: Key to Learning from Experience* | 성찰은 경험을 의미화하고 관점을 변화시키는 과정 | 회고, 면담 후 변화, 다음 행동 계획을 `성찰 증거`로 분리 |
| Mislevy et al., *A Brief Introduction to Evidence-Centered Design* | 평가 설계는 `무엇을 주장할 것인가`와 `어떤 증거가 이를 뒷받침하는가`를 명확히 해야 함 | 데이터 재가공 시 `주장-증거-출처` 구조를 강제 |
| Nicol & Macfarlane-Dick, *Formative Assessment and Self-Regulated Learning* | 좋은 피드백 구조는 자기조절 학습을 강화함 | 체크인과 회고를 단순 제출 로그가 아니라 `형성평가 증거`로 해석 |
| Hattie & Timperley, *The Power of Feedback* | 피드백의 종류와 맥락에 따라 학습 효과가 달라짐 | 면담과 회고의 피드백 기록을 `학습개선 사건`으로 구조화 |

---

## 3. 연구 근거에서 도출한 재가공 원칙

### 3.1 평가 대상이 아니라 증거 단위를 만든다

원본 데이터는 바로 점수로 바꾸지 않는다.  
먼저 학생 상태를 설명하는 `증거 레코드`로 재구성한다.

예시

- 출결 셀 값 → `attendance evidence`
- 데일리 체크인 텍스트 → `project evidence`
- 면담 문단 → `counseling evidence`

### 3.2 모든 증거는 시간축에 고정한다

학생 데이터는 반드시 `언제 발생했는가`를 기준으로 읽혀야 한다.

필수 시간 단위

- 날짜
- 주차
- 프로젝트 회차
- 과정 단계

### 3.3 모든 증거는 교육학적 준거에 연결한다

모든 재가공 레코드는 아래 중 하나 이상의 준거와 연결된다.

- `self_regulation`
- `engagement`
- `collaboration`
- `resilience`
- `reflection`
- `career_agency`

### 3.4 원본과 해석을 분리한다

하나의 기록 안에 아래 세 층위를 분리 저장한다.

1. 원본 값
2. 요약 값
3. 해석 태그

예시

- 원본: 회고 전체 문장
- 요약: 핵심 문장 1~2개
- 해석 태그: `reflection`, `collaboration`

### 3.5 직접 관찰 증거와 추론 증거를 분리한다

다음 구분을 적용한다.

- `direct`: 출결, 제출 여부, 타임스탬프 같은 직접 기록
- `reported`: 자기소개, 회고, 체크인, 면담처럼 본인/운영자 서술
- `derived`: 점수, 상태 구간, 성향 스냅샷처럼 후처리 결과

### 3.6 민감 배경 정보는 평가 증거로 직접 사용하지 않는다

성별, 나이, 주소, 건강 상태, 경제 사정은 맥락 정보로만 보관하고, 성향 판단 점수의 직접 근거로 사용하지 않는다.

### 3.7 사람이 읽기 쉬운 구조를 우선한다

재가공 결과는 단일 거대 파일이 아니라 다음 단위로 분리한다.

- 학생별
- 데이터 영역별
- 시간축 보기용
- 평가 근거 보기용

---

## 4. 재가공 대상 데이터와 기준

| 원본 데이터 | 재가공 단위 | 주요 준거 연결 |
| --- | --- | --- |
| `학생 데이터.xlsx` | 학생 마스터 프로필 | 맥락 정보만 저장 |
| `모집 결과.xlsx` | 입과 전 배경/목표/면접 결과 | `career_agency`, `collaboration`, `resilience` |
| `출결 기입 시트.xlsx` | 날짜별 출결 이벤트 | `engagement`, `self_regulation` |
| `1~3차 프로젝트 데일리 체크인.xlsx` | 날짜별 프로젝트 증거 | `self_regulation`, `engagement`, `reflection` |
| `1~2차 프로젝트 회고.xlsx` | 프로젝트 종료 성찰 증거 | `reflection`, `collaboration`, `resilience`, `career_agency` |
| `프로젝트 팀 구성.md` | 프로젝트별 팀 배치/역할/반복 협업 맥락 | `collaboration`, `self_regulation` |
| `이력서 및 자기소개/**/*` | 취업 문서 초안/수정본/피드백 증거 | `career_agency`, `reflection`, `self_regulation` |
| `면담 기록/*.md` | 면담 이벤트/개입 증거 | 6개 준거 전반 |
| `수업 시간표.xlsx` | 커리큘럼 시간축 | 시간축 정규화 기준 |

---

## 5. 표준 스키마

### 5.1 학생 마스터

학생 식별과 배경 정보만 포함한다.

필드 예시

- `studentId`
- `name`
- `phone`
- `birthDate`
- `education`
- `address`
- `specialNote`

### 5.2 교육적 증거 레코드

모든 핵심 데이터는 아래 구조를 기본으로 한다.

| 필드 | 의미 |
| --- | --- |
| `evidenceId` | 증거 고유 ID |
| `studentId` | 학생 ID |
| `date` | 발생일 |
| `weekIndex` | 과정 주차 |
| `phase` | 프로젝트/과정 단계 |
| `sourceDomain` | admission, attendance, project, retro, team_context, career_document, career_feedback, counseling |
| `evidenceType` | direct, reported, derived |
| `constructs` | 연결된 교육학 준거 목록 |
| `title` | 짧은 제목 |
| `summary` | 짧은 요약 |
| `detail` | 원문 또는 상세 내용 |
| `severity` | stable, caution, warning 등 |
| `provenance` | 원본 파일/문서 출처 |

### 5.3 시점 스냅샷

성향 및 상태의 시점별 결과를 저장한다.

필드 예시

- `snapshotId`
- `snapshotDate`
- `snapshotType`
- `scores`
- `confidence`
- `note`

### 5.4 상태 구간

하루가 아니라 기간으로 해석해야 하는 관리 상태를 저장한다.

필드 예시

- `statusPeriodId`
- `startDate`
- `endDate`
- `statusType`
- `severity`
- `reasonSummary`

---

## 6. 재가공 판단 규칙

### 6.1 시간축 규칙

- 모든 증거는 가능한 한 `일 단위`로 저장한다.
- 화면에서는 `주차 단위`로 집계 가능해야 한다.
- 프로젝트 데이터는 `회차`와 `작성일`을 모두 저장한다.

### 6.2 준거 태깅 규칙

- 출결은 기본적으로 `engagement`, `self_regulation`
- 프로젝트 체크인은 기본적으로 `self_regulation`, `engagement`
- 프로젝트 회고는 기본적으로 `reflection`을 포함
- 프로젝트 팀 구성은 기본적으로 `collaboration`을 포함하고, 리더 역할은 `self_regulation` 보조 근거로 활용 가능
- 취업 문서 초안은 기본적으로 `career_agency`, `reflection`
- 취업 문서 피드백은 기본적으로 `career_agency`, `reflection`, `self_regulation`
- 면담은 제목과 본문에 따라 다중 태그 허용
- 모집단계 목표/자기소개는 `career_agency` 근거로 사용 가능

### 6.3 위험도 규칙

운영용 `severity`는 아래 3단계로 단순화한다.

- `stable`
- `caution`
- `warning`

예시

- 결석, 이탈면담, 경고면담 → `warning`
- 지각, 반복 미제출, 프로젝트 지연 제출 → `caution`
- 일반 제출, 일반 회고, 일반 면담 → `stable`

### 6.4 추론 분리 규칙

아래 내용은 반드시 원본과 구분한다.

- 성향 점수
- 상태 구간
- 자동 요약
- 자동 태깅
- 반복 협업 요약
- 취업 문서 회차 요약

---

## 7. 재검토 체크리스트

아래 항목을 기준으로 기준 자체를 다시 검토한다.

| 검토 항목 | 질문 | 결과 |
| --- | --- | --- |
| 교육학 근거성 | 각 재가공 축이 연구 기반 개념과 연결되는가 | 적합 |
| 데이터 가용성 | 현재 `Data` 폴더만으로 실제 생성 가능한가 | 적합 |
| 과잉 추론 방지 | 민감 배경 정보를 점수 근거로 사용하지 않는가 | 적합 |
| 해석 가능성 | 운영자가 파일을 열어 근거를 다시 읽을 수 있는가 | 적합 |
| 시간 맥락성 | 모든 핵심 기록을 시간표/주차와 연결할 수 있는가 | 적합 |
| 원본 보존성 | 원문/원본과 파생 결과가 분리되는가 | 적합 |

### 재검토 결론

- 현재 기준은 `교육학 근거`, `실제 데이터 적용 가능성`, `운영 해석 가능성` 측면에서 사용 가능하다.
- 단, 자동 태깅과 자동 성향 점수는 어디까지나 `운영 보조 자료`로 해석해야 하며, 단독 판정 근거로 쓰지 않는다는 조건이 필요하다.

---

## 8. 산출 파일 구조 기준

재가공 결과는 `ProcessedData` 폴더 아래에 아래 구조로 만든다.

- `meta`: 연구 근거, 기준, 검증 결과
- `curriculum`: 과정 시간축
- `indexes`: 학생 목록, 위험 지표 목록, 검색용 요약
- `students/{studentId}`: 학생별 세분화 파일

학생 폴더 안에는 아래를 기본으로 둔다.

- `profile.json`
- `admission.json`
- `attendance_events.json`
- `project_checkins.json`
- `project_retrospectives.json`
- `counselings.json`
- `project_team_history.json`
- `peer_relationships.json`
- `career_documents.json`
- `learning_evidence.json`
- `evaluation_snapshots.json`
- `status_periods.json`
- `timeline_events.json`
- `weekly_timeline.json`
- `overview.md`

---

## 9. 참고 자료

- Zimmerman, B. J. (2002). *Becoming a Self-Regulated Learner: An Overview*.  
  [https://doi.org/10.1207/s15430421tip4102_2](https://doi.org/10.1207/s15430421tip4102_2)

- Fredricks, J. A., Blumenfeld, P. C., & Paris, A. H. (2004). *School Engagement: Potential of the Concept, State of the Evidence*.  
  [https://doi.org/10.3102/00346543074001059](https://doi.org/10.3102/00346543074001059)

- CASEL. *What Is the CASEL Framework?*  
  [https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/](https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/)

- Yeager, D. S., & Dweck, C. S. (2012). *Mindsets That Promote Resilience*.  
  [https://doi.org/10.1080/00461520.2012.722805](https://doi.org/10.1080/00461520.2012.722805)

- Deci, E. L., Vallerand, R. J., Pelletier, L. G., & Ryan, R. M. (1991). *Motivation and Education: The Self-Determination Perspective*.  
  [https://doi.org/10.1080/00461520.1991.9653137](https://doi.org/10.1080/00461520.1991.9653137)

- Boyd, E. M., & Fales, A. W. (1983). *Reflective Learning: Key to Learning from Experience*.  
  [https://doi.org/10.1177/0022167883232011](https://doi.org/10.1177/0022167883232011)

- Mislevy, R. J., Almond, R. G., & Lukas, J. F. (2003). *A Brief Introduction to Evidence-Centered Design*.  
  [https://doi.org/10.1002/j.2333-8504.2003.tb01908.x](https://doi.org/10.1002/j.2333-8504.2003.tb01908.x)

- Nicol, D. J., & Macfarlane-Dick, D. (2006). *Formative assessment and self-regulated learning: a model and seven principles of good feedback practice*.  
  [https://doi.org/10.1080/03075070600572090](https://doi.org/10.1080/03075070600572090)

- Hattie, J., & Timperley, H. (2007). *The Power of Feedback*.  
  [https://doi.org/10.3102/003465430298487](https://doi.org/10.3102/003465430298487)
