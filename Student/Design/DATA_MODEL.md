# 데이터 모델 및 저장 기준

## 1. 설계 원칙

- 학생 데이터를 중심으로 모든 기록을 연결한다.
- 변경 가능성이 높은 항목은 고정 컬럼보다 확장 가능한 구조를 우선 고려한다.
- 앱은 로컬에서 실행되지만, 기준 데이터는 Firebase에 저장한다.
- 로컬 PC에는 인증 세션과 최소한의 임시 데이터만 남기고, 학생 원본 데이터를 영구 저장하지 않는 방향을 기본 원칙으로 한다.
- 반복 기록은 문서가 과도하게 커지지 않도록 하위 컬렉션 또는 별도 컬렉션으로 분리한다.

## 2. 기술 구조 가정

### 앱 구조

- `Electron` 기반 데스크톱 앱
- 앱 내부 프런트엔드는 Firebase SDK와 통신
- 별도 전용 백엔드 서버 없이 Firebase 중심으로 운영

### Firebase 사용 방향

- `Authentication`: 사용자 로그인 및 사용자 식별
- `Cloud Firestore`: 구조화된 학생/운영 데이터 저장
- `Storage`: 제출 서류, 첨부 파일 저장

## 3. 저장 전략

- 학생 기본 정보는 `students` 중심 컬렉션에 저장한다.
- 모집단계, 출석, 과제, 면담 등 반복 기록은 학생 하위 컬렉션으로 분리한다.
- 공통 코드와 설정 정보는 별도 컬렉션으로 분리한다.
- 접근 제어를 위해 사용자 정보와 권한 정보는 별도 컬렉션에서 관리한다.
- 분석에 자주 쓰는 값은 집계 필드 또는 파생 필드로 일부 저장할 수 있다.

## 4. 컬렉션 구조 예시

### 4.1 users

앱 접근 가능 사용자와 역할 정보를 저장한다.

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| uid | string | Firebase 사용자 UID |
| email | string | 로그인 이메일 |
| name | string | 사용자 이름 |
| role | string | admin, operator, interviewer, mentor 등 |
| active | boolean | 접근 허용 여부 |
| createdAt | timestamp | 생성일 |
| updatedAt | timestamp | 수정일 |

### 4.2 students

학생의 기본 프로필과 요약 상태를 저장한다.

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| studentId | string | 학생 고유 ID |
| name | string | 이름 |
| birthDate | string | 생년월일 |
| region | string | 지역 |
| education | string | 학력 |
| phone | string | 연락처 |
| email | string | 이메일 |
| appliedCourse | string | 신청 과정 |
| cohort | string | 기수 |
| currentStatus | string | 현재 상태 |
| admissionStageStatus | string | 모집단계 상태 |
| attendanceRiskLevel | string | 출석 위험도 |
| assignmentSubmitRate | number | 과제 제출률 요약 |
| latestCounselingDate | string | 최근 면담일 |
| riskFlags | array | 경고 조건 요약 |
| createdAt | timestamp | 생성일 |
| updatedAt | timestamp | 수정일 |

### 4.3 students/{studentId}/admissionDocuments

제출 서류와 자기소개/목표 관련 정보 저장

- documentType
- submitted
- submittedAt
- fileUrl
- summaryText

### 4.4 students/{studentId}/interviews

면접 기록 저장

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| interviewerId | string | 면접 진행자 UID |
| interviewerName | string | 면접 진행자 이름 |
| interviewDate | string | 면접일 |
| evaluationScores | map | 항목별 점수 |
| totalScore | number | 총점 |
| comment | string | 텍스트 평가 |
| result | string | 합격/보류/불합격 등 |

### 4.5 students/{studentId}/attendanceRecords

출석 이슈 저장

- date
- issueType
- reason
- note
- recordedBy

`issueType` 예시

- 지각
- 조퇴
- 결석
- 휴가

### 4.6 students/{studentId}/assignments

과제 단위 또는 기간 단위의 제출 현황 저장

- assignmentName
- category
- dueDate
- submitted
- submittedAt
- score
- feedback

### 4.7 students/{studentId}/projectLogs

프로젝트 기록 저장

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| projectName | string | 프로젝트명 |
| date | string | 작성일 |
| role | string | 팀장, PM, 팀원 등 |
| dailyLog | string | 학생 일일 기록 |
| submitted | boolean | 제출 여부 |
| submittedOnTime | boolean | 시간 내 제출 여부 |
| reviewerComment | string | 운영진 메모 |

### 4.8 students/{studentId}/counselings

면담 기록 저장

- counselingType
- counselingDate
- counselorName
- content
- warningLevel
- followUpNeeded

`counselingType` 예시

- 정기면담
- 상시면담
- 경고

### 4.9 students/{studentId}/employmentDocuments

취업 문서 관련 정보 저장

- documentType
- content
- submitted
- submittedAt
- feedback

### 4.10 settings

공통 설정 및 코드값 저장

- courses
- interviewCriteria
- attendanceIssueTypes
- counselingTypes
- employmentDocumentTypes
- sessionPolicy

### 4.11 auditLogs

중요 작업 이력을 저장한다.

- actorUid
- actorEmail
- actionType
- targetType
- targetId
- timestamp
- summary

### 4.12 curriculumSessions

과정 전체 시간표를 정규화한 컬렉션이다.

- sessionId
- date
- weekIndex
- moduleName
- lessonTitle
- category
- projectPhase

### 4.13 students/{studentId}/timelineEvents

학생 상세 타임테이블 뷰에 사용하는 파생 이벤트 컬렉션이다.

- eventId
- date
- endDate
- eventType
- sourceType
- severity
- title
- summary
- relatedProject
- relatedCounselingId
- relatedDocumentId
- tags

`eventType` 예시

- admission
- attendance
- project
- counseling
- employment
- status

### 4.14 students/{studentId}/evaluationSnapshots

학생 성향 평가의 시점별 스냅샷을 저장한다.

- snapshotId
- snapshotDate
- snapshotType
- selfRegulation
- engagement
- collaboration
- resilience
- reflection
- careerAgency
- confidence
- note

### 4.15 students/{studentId}/statusPeriods

학생 상태를 기간 단위로 저장한다.

- statusPeriodId
- startDate
- endDate
- statusType
- reasonSummary
- severity

## 5. 파일 저장 경로 예시

Firebase Storage 경로 예시는 아래와 같이 구성할 수 있다.

- `students/{studentId}/admission/{fileName}`
- `students/{studentId}/employment/{fileName}`
- `uploads/{uploadJobId}/{fileName}`

원본 파일 접근은 인증 여부와 역할에 따라 제한해야 한다.

## 6. 파일 업로드 데이터 처리 기준

### 업로드 대상 예시

- 학생 기본 정보 신규 등록
- 학생 기본 정보 수정
- 출석 데이터 일괄 반영
- 과제 제출 현황 일괄 반영

### 처리 방식

1. 템플릿 파일 형식 제공
2. 업로드 후 컬럼 자동 감지
3. 필수값 검증
4. 형식 검증
5. 중복 학생 매칭
6. 신규/수정 분기
7. 반영 전 미리보기
8. 저장 후 결과 로그 제공

### 유효성 검사 예시

- 이름 누락 여부
- 생년월일 형식 일치 여부
- 과정명 유효 여부
- 동일 학생 중복 여부
- 날짜 형식 오류 여부

## 7. 로컬 저장 정책

- 학생 원본 데이터를 별도 로컬 DB에 저장하지 않는다.
- 임시 업로드 파일은 처리 완료 후 제거하는 방향을 우선 검토한다.
- 자동 로그인 정보는 Firebase 세션 범위 내에서만 유지하고, 영구 저장 범위를 최소화한다.
- 다운로드 기능은 기본 비활성 또는 권한 기반 허용을 검토한다.

## 8. 분석용 파생 데이터 예시

분석 성능과 단순 조회 편의성을 위해 일부 값은 학생 문서에 요약 저장할 수 있다.

- 누적 출석 이슈 수
- 최근 30일 과제 제출률
- 최근 경고 여부
- 최근 프로젝트 기록 제출률
- 취업 문서 제출 상태
- 최신 성향 스냅샷 요약
- 최근 위험 상태 구간 여부

## 9. 권한 및 보안 고려

- 학생 민감 정보는 로그인한 승인 사용자만 접근 가능해야 한다.
- 역할별 읽기/쓰기 권한을 분리한다.
- 파일 업로드는 승인된 사용자만 가능해야 한다.
- Firebase 보안 규칙에서 컬렉션별 접근 범위를 정의한다.
- 중요한 수정/삭제/업로드 작업은 감사 로그를 남기는 방향을 고려한다.

## 10. 확장 포인트

- 평가 항목이 늘어나더라도 `evaluationScores` 맵 구조로 대응 가능
- 카테고리별 추가 문서는 하위 컬렉션으로 확장 가능
- 학생 상태 예측 또는 위험도 계산용 필드를 추후 추가 가능
- 역할 체계가 늘어나도 `users.role` 및 보안 규칙 구조로 확장 가능
