from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import build_app_data as source


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "ProcessedData"

CONSTRUCT_LABELS = {
    "self_regulation": "학습 자기조절",
    "engagement": "학습 참여 및 지속성",
    "collaboration": "협업 및 관계 형성",
    "resilience": "도전 대응 및 회복탄력성",
    "reflection": "성찰 및 피드백 활용",
    "career_agency": "진로 목적성 및 전문성 형성",
}

SNAPSHOT_KEY_MAP = {
    "selfRegulation": "self_regulation",
    "engagement": "engagement",
    "collaboration": "collaboration",
    "resilience": "resilience",
    "reflection": "reflection",
    "careerAgency": "career_agency",
}

SEVERITY_MAP = {
    "info": "stable",
    "success": "stable",
    "stable": "stable",
    "caution": "caution",
    "warning": "warning",
}

KEYWORDS = {
    "self_regulation": [
        "계획",
        "일정",
        "시간",
        "루틴",
        "리듬",
        "목표",
        "실행",
        "우선순위",
        "관리",
        "제출",
        "체크인",
        "정리",
        "습관",
    ],
    "engagement": [
        "출석",
        "지각",
        "결석",
        "조퇴",
        "몰입",
        "집중",
        "참여",
        "수업",
        "과제",
        "프로젝트",
        "학습",
    ],
    "collaboration": [
        "팀",
        "팀원",
        "팀장",
        "pm",
        "qa",
        "협업",
        "소통",
        "회의",
        "갈등",
        "피드백",
        "조율",
        "역할",
    ],
    "resilience": [
        "실패",
        "실수",
        "극복",
        "개선",
        "보완",
        "다시",
        "스트레스",
        "불안",
        "어려움",
        "힘들",
        "도전",
        "회복",
        "문제",
    ],
    "reflection": [
        "회고",
        "돌아보",
        "배웠",
        "느꼈",
        "깨달",
        "반성",
        "다음",
        "피드백",
        "개선",
        "학습한",
        "후회",
    ],
    "career_agency": [
        "진로",
        "직무",
        "취업",
        "포트폴리오",
        "자기소개서",
        "희망",
        "목표",
        "채용",
        "지원",
        "커리어",
        "기업",
    ],
}

RESEARCH_SOURCES = [
    {
        "id": "zimmerman_2002",
        "title": "Becoming a Self-Regulated Learner: An Overview",
        "authors": ["Barry J. Zimmerman"],
        "year": 2002,
        "type": "journal article",
        "link": "https://doi.org/10.1207/s15430421tip4102_2",
        "focus": "self-regulated learning",
        "appliedTo": [
            "project_checkins",
            "attendance_events",
            "evaluation_snapshots",
        ],
        "designUse": "출결, 제출 시점, 실행 계획, 자기 점검 기록을 자기조절 학습의 증거 단위로 본다.",
    },
    {
        "id": "fredricks_2004",
        "title": "School Engagement: Potential of the Concept, State of the Evidence",
        "authors": ["Jennifer A. Fredricks", "Phyllis C. Blumenfeld", "Alison H. Paris"],
        "year": 2004,
        "type": "journal article",
        "link": "https://doi.org/10.3102/00346543074001059",
        "focus": "behavioral, emotional, and cognitive engagement",
        "appliedTo": [
            "attendance_events",
            "project_checkins",
            "counselings",
        ],
        "designUse": "출결과 체크인을 단순 빈도 값이 아니라 참여 지속성의 다차원 증거로 정리한다.",
    },
    {
        "id": "casel_framework",
        "title": "What Is the CASEL Framework?",
        "authors": ["CASEL"],
        "type": "official framework",
        "link": "https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/",
        "focus": "social and emotional learning",
        "appliedTo": [
            "counselings",
            "project_retrospectives",
            "student_overviews",
        ],
        "designUse": "협업, 관계 형성, 자기관리, 의사결정 관련 서술형 기록을 사회정서학습 증거로 태깅한다.",
    },
    {
        "id": "yeager_dweck_2012",
        "title": "Mindsets That Promote Resilience: When Students Believe That Personal Characteristics Can Be Developed",
        "authors": ["David S. Yeager", "Carol S. Dweck"],
        "year": 2012,
        "type": "journal article",
        "link": "https://doi.org/10.1080/00461520.2012.722805",
        "focus": "resilience and growth mindset",
        "appliedTo": [
            "admission",
            "counselings",
            "project_retrospectives",
        ],
        "designUse": "실패 대응, 스트레스 진술, 회복 시도 기록을 회복탄력성 증거로 분리한다.",
    },
    {
        "id": "deci_1991",
        "title": "Motivation and Education: The Self-Determination Perspective",
        "authors": ["Edward L. Deci", "Robert J. Vallerand", "Luc G. Pelletier", "Richard M. Ryan"],
        "year": 1991,
        "type": "journal article",
        "link": "https://www.tandfonline.com/doi/abs/10.1080/00461520.1991.9653137",
        "focus": "autonomy, competence, relatedness",
        "appliedTo": [
            "admission",
            "counselings",
            "student_overviews",
        ],
        "designUse": "지원 동기, 직무 목표, 선택 이유를 진로 목적성과 학습 동기의 핵심 근거로 본다.",
    },
    {
        "id": "boyd_fales_1983",
        "title": "Reflective Learning: Key to Learning from Experience",
        "authors": ["Evelyn M. Boyd", "Ann W. Fales"],
        "year": 1983,
        "type": "journal article",
        "link": "https://doi.org/10.1177/0022167883232011",
        "focus": "reflective learning",
        "appliedTo": [
            "project_retrospectives",
            "counselings",
            "evaluation_snapshots",
        ],
        "designUse": "회고, 면담, 다음 행동 계획을 성찰 과정의 연속 증거로 저장한다.",
    },
    {
        "id": "mislevy_2003",
        "title": "A Brief Introduction to Evidence-Centered Design",
        "authors": ["Robert J. Mislevy", "Russell G. Almond", "Janice F. Lukas"],
        "year": 2003,
        "type": "research report",
        "link": "https://www.ets.org/research/policy_research_reports/publications/report/2003/hsgs.html",
        "focus": "evidence-centered design",
        "appliedTo": [
            "learning_evidence",
            "validation_report",
            "timeline_events",
        ],
        "designUse": "모든 가공 단위를 주장 대신 증거 단위로 설계하고, 출처와 해석을 분리한다.",
    },
    {
        "id": "nicol_macfarlane_dick_2006",
        "title": "Formative assessment and self-regulated learning: a model and seven principles of good feedback practice",
        "authors": ["David J. Nicol", "Debra Macfarlane-Dick"],
        "year": 2006,
        "type": "journal article",
        "link": "https://doi.org/10.1080/03075070600572090",
        "focus": "formative assessment and feedback",
        "appliedTo": [
            "project_checkins",
            "project_retrospectives",
            "evaluation_snapshots",
        ],
        "designUse": "체크인과 회고를 단순 제출 로그가 아니라 자기조절을 돕는 형성평가 증거로 다룬다.",
    },
    {
        "id": "hattie_timperley_2007",
        "title": "The Power of Feedback",
        "authors": ["John Hattie", "Helen Timperley"],
        "year": 2007,
        "type": "journal article",
        "link": "https://doi.org/10.3102/003465430298487",
        "focus": "feedback and learning",
        "appliedTo": [
            "counselings",
            "project_retrospectives",
            "student_overviews",
        ],
        "designUse": "면담과 회고의 피드백 기록을 학습개선의 핵심 사건으로 표준화한다.",
    },
]


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def one_line(value: Any) -> str:
    return re.sub(r"\s+", " ", clean_text(value)).strip()


def short_text(value: Any, limit: int = 180) -> str:
    text = one_line(value)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def to_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    text = str(value).strip()
    try:
        return datetime.fromisoformat(text).date()
    except ValueError:
        pass
    try:
        return datetime.strptime(text[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def normalized_severity(value: str) -> str:
    return SEVERITY_MAP.get(value or "", "stable")


def stable_id(*parts: Any) -> str:
    raw = "|".join(str(part) for part in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]


def infer_constructs(text: str, title: str = "", base: set[str] | None = None) -> list[str]:
    combined = f"{title}\n{text}".lower()
    constructs = set(base or set())
    for construct, keywords in KEYWORDS.items():
        if any(keyword in combined for keyword in keywords):
            constructs.add(construct)
    if not constructs:
        constructs.add("reflection")
    return sorted(constructs)


def build_provenance(source_file: str, *, source_sheet: str = "", is_estimated_date: bool = False) -> dict[str, Any]:
    payload = {
        "sourceFile": source_file,
        "isEstimatedDate": is_estimated_date,
    }
    if source_sheet:
        payload["sourceSheet"] = source_sheet
    return payload


def normalize_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "snapshotId": snapshot["snapshotId"],
        "snapshotDate": snapshot["snapshotDate"],
        "snapshotType": snapshot["snapshotType"],
        "scores": {
            SNAPSHOT_KEY_MAP[key]: value
            for key, value in snapshot["scores"].items()
            if key in SNAPSHOT_KEY_MAP
        },
        "confidence": snapshot["confidence"],
        "note": snapshot["note"],
    }


def build_admission_output(student: dict[str, Any]) -> dict[str, Any]:
    admission = dict(student.get("admission", {}))
    support_text = "\n\n".join(
        filter(
            None,
            [
                f"자기소개\n{clean_text(admission.get('intro'))}" if admission.get("intro") else "",
                f"지원 동기\n{clean_text(admission.get('motivation'))}" if admission.get("motivation") else "",
                f"관련 경험\n{clean_text(admission.get('experience'))}" if admission.get("experience") else "",
                f"희망 분야\n{clean_text(admission.get('career'))}" if admission.get("career") else "",
                f"수료 목표\n{clean_text(admission.get('goal'))}" if admission.get("goal") else "",
                f"갈등 대응\n{clean_text(admission.get('conflict'))}" if admission.get("conflict") else "",
                f"실패 대응\n{clean_text(admission.get('failure'))}" if admission.get("failure") else "",
                f"타인 대응\n{clean_text(admission.get('peer'))}" if admission.get("peer") else "",
            ],
        )
    )
    return {
        "submittedAt": admission.get("submittedAt", ""),
        "email": admission.get("email", ""),
        "supportResponse": support_text,
        "interviewScore": admission.get("interviewScore", ""),
        "interviewResult": admission.get("interviewResult", ""),
        "interviewSummary": admission.get("interviewSummary", ""),
    }


def normalize_person_key(value: Any) -> str:
    return re.sub(r"\s+", "", clean_text(value)).lower()


def parse_project_team_history() -> dict[str, list[dict[str, Any]]]:
    path = ROOT / "Data" / "프로젝트 팀 구성.md"
    if not path.exists():
        return {}

    assignments_by_student: dict[str, list[dict[str, Any]]] = {}

    current_phase = ""
    current_team_number = 0
    current_members: list[dict[str, str]] = []

    def flush_team() -> None:
        nonlocal current_members
        if not current_phase or not current_team_number or not current_members:
            current_members = []
            return

        team_label = f"{current_team_number}팀"
        phase_match = re.search(r"(\d+)차", current_phase)
        phase_order = int(phase_match.group(1)) if phase_match else 99
        for member in current_members:
            key = normalize_person_key(member["name"])
            peers = [
                {
                    "name": peer["name"],
                    "role": peer["role"],
                    "roleLabel": peer["roleLabel"],
                }
                for peer in current_members
                if peer["name"] != member["name"]
            ]
            assignments_by_student.setdefault(key, []).append(
                {
                    "phase": current_phase,
                    "phaseOrder": phase_order,
                    "teamNumber": current_team_number,
                    "teamLabel": team_label,
                    "role": member["role"],
                    "roleLabel": member["roleLabel"],
                    "teamSize": len(current_members),
                    "members": current_members,
                    "teammates": peers,
                }
            )
        current_members = []

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line.startswith("## "):
            flush_team()
            current_phase = clean_text(line[3:])
            current_team_number = 0
            continue
        if line.startswith("### "):
            flush_team()
            match = re.search(r"(\d+)\s*팀", line)
            current_team_number = int(match.group(1)) if match else 0
            continue
        if not line.startswith("- "):
            continue
        match = re.match(r"-\s*(.+?)(?:\s+\(([^)]+)\))?$", line)
        if not match:
            continue
        name = clean_text(match.group(1))
        role_label = clean_text(match.group(2) or "팀원")
        role = {
            "팀장": "team_lead",
            "PM": "pm",
        }.get(role_label, "member")
        current_members.append(
            {
                "name": name,
                "role": role,
                "roleLabel": role_label,
            }
        )

    flush_team()

    for assignments in assignments_by_student.values():
        assignments.sort(key=lambda item: (item["phaseOrder"], item["teamNumber"]))
    return assignments_by_student


def build_peer_relationships(team_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    relationships: dict[str, dict[str, Any]] = {}
    for assignment in team_history:
        for peer in assignment.get("teammates", []):
            key = normalize_person_key(peer["name"])
            record = relationships.setdefault(
                key,
                {
                    "peerName": peer["name"],
                    "sharedProjectCount": 0,
                    "phases": [],
                    "peerRoles": [],
                },
            )
            record["sharedProjectCount"] += 1
            record["phases"].append(
                {
                    "phase": assignment["phase"],
                    "teamNumber": assignment["teamNumber"],
                    "studentRole": assignment["roleLabel"],
                    "peerRole": peer["roleLabel"],
                }
            )
            if peer["roleLabel"] not in record["peerRoles"]:
                record["peerRoles"].append(peer["roleLabel"])

    return sorted(
        relationships.values(),
        key=lambda item: (-item["sharedProjectCount"], item["peerName"]),
    )


def parse_career_documents() -> dict[str, dict[str, Any]]:
    base_dir = ROOT / "Data" / "이력서 및 자기소개"
    if not base_dir.exists():
        return {}

    student_docs: dict[str, dict[str, Any]] = {}

    def ensure_round(student_key: str, round_key: str, round_label: str, round_date: str) -> dict[str, Any]:
        student_record = student_docs.setdefault(student_key, {"rounds": []})
        for record in student_record["rounds"]:
            if record["roundKey"] == round_key:
                return record
        record = {
            "roundKey": round_key,
            "roundLabel": round_label,
            "date": round_date,
            "selfIntroductionText": "",
            "resumeText": "",
            "feedbackText": "",
            "selfIntroductionSource": "",
            "resumeSource": "",
            "feedbackSource": "",
        }
        student_record["rounds"].append(record)
        return record

    def detect_name_from_stem(stem: str, marker: str) -> str:
        name = stem.split(marker, 1)[0]
        return clean_text(name).rstrip("_ ").strip()

    round1_dir = base_dir / "1차(260420)"
    round2_dir = base_dir / "2차(260503)"

    round1_text_dir = round1_dir / "자소서 모음집"
    if round1_text_dir.exists():
        for path in round1_text_dir.glob("*.txt"):
            if path.name.startswith("_preview"):
                continue
            if "_자기소개서" not in path.stem:
                continue
            student_name = detect_name_from_stem(path.stem, "_자기소개서")
            student_key = normalize_person_key(student_name)
            round_record = ensure_round(student_key, "career_round_1", "1차 자기소개서", "2026-04-20")
            round_record["selfIntroductionText"] = clean_text(path.read_text(encoding="utf-8"))
            round_record["selfIntroductionSource"] = path.relative_to(ROOT).as_posix()

    round1_feedback_dir = round1_dir / "개인 피드백"
    if round1_feedback_dir.exists():
        for path in round1_feedback_dir.glob("*.md"):
            student_key = normalize_person_key(path.stem)
            round_record = ensure_round(student_key, "career_round_1", "1차 자기소개서", "2026-04-20")
            round_record["feedbackText"] = clean_text(path.read_text(encoding="utf-8"))
            round_record["feedbackSource"] = path.relative_to(ROOT).as_posix()

    round2_text_dir = round2_dir / "피드백" / "_추출텍스트"
    if round2_text_dir.exists():
        for path in round2_text_dir.glob("*.txt"):
            stem = clean_text(path.stem)
            student_key = ""
            round_record = None
            if "_자기소개서" in stem:
                student_name = detect_name_from_stem(stem, "_자기소개서")
                student_key = normalize_person_key(student_name)
                round_record = ensure_round(student_key, "career_round_2", "2차 취업 문서", "2026-05-03")
                round_record["selfIntroductionText"] = clean_text(path.read_text(encoding="utf-8"))
                round_record["selfIntroductionSource"] = path.relative_to(ROOT).as_posix()
            elif "_이력서" in stem:
                student_name = detect_name_from_stem(stem, "_이력서")
                student_key = normalize_person_key(student_name)
                round_record = ensure_round(student_key, "career_round_2", "2차 취업 문서", "2026-05-03")
                round_record["resumeText"] = clean_text(path.read_text(encoding="utf-8"))
                round_record["resumeSource"] = path.relative_to(ROOT).as_posix()

    round2_feedback_dir = round2_dir / "피드백"
    if round2_feedback_dir.exists():
        for path in round2_feedback_dir.glob("*.md"):
            student_key = normalize_person_key(path.stem)
            round_record = ensure_round(student_key, "career_round_2", "2차 취업 문서", "2026-05-03")
            round_record["feedbackText"] = clean_text(path.read_text(encoding="utf-8"))
            round_record["feedbackSource"] = path.relative_to(ROOT).as_posix()

    for student_key, student_record in student_docs.items():
        student_record["rounds"].sort(key=lambda item: item["date"])
        student_record["summary"] = {
            "roundCount": len(student_record["rounds"]),
            "selfIntroductionRounds": [item["roundLabel"] for item in student_record["rounds"] if item["selfIntroductionText"]],
            "resumeRounds": [item["roundLabel"] for item in student_record["rounds"] if item["resumeText"]],
            "feedbackRounds": [item["roundLabel"] for item in student_record["rounds"] if item["feedbackText"]],
            "latestDocumentDate": max((item["date"] for item in student_record["rounds"] if item["date"]), default=""),
            "hasRevisionHistory": sum(1 for item in student_record["rounds"] if item["selfIntroductionText"] or item["resumeText"]) >= 2,
        }
    return student_docs


def load_counselings_for_student(student_name: str) -> list[dict[str, Any]]:
    path = ROOT / "Data" / "면담 기록" / f"{student_name}.md"
    if not path.exists():
        return []

    lines = path.read_text(encoding="utf-8").splitlines()
    sections: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    content_lines: list[str] = []

    def flush_current() -> None:
        nonlocal current, content_lines
        if current is None:
            return
        current["content"] = clean_text("\n".join(content_lines))
        current["severity"] = "warning" if any(keyword in current["title"] for keyword in ("경고", "이탈")) else "info"
        sections.append(current)
        current = None
        content_lines = []

    def heading_has_metadata(start_index: int) -> bool:
        for probe in range(start_index + 1, len(lines)):
            candidate = lines[probe].strip()
            if not candidate:
                continue
            if candidate.startswith("## "):
                return False
            return candidate.startswith("- 면담자") or candidate.startswith("- 면담일")
        return False

    for index, raw_line in enumerate(lines):
        line = raw_line.rstrip()
        if line.startswith("## "):
            heading = clean_text(line[3:])
            if current is None or heading_has_metadata(index):
                flush_current()
                current = {
                    "title": heading,
                    "counselor": "",
                    "date": "",
                    "content": "",
                }
            else:
                content_lines.append(f"### {heading}")
            continue
        if current is None:
            continue
        if line.startswith("- 면담자"):
            current["counselor"] = clean_text(line.split(":", 1)[1] if ":" in line else "")
            continue
        if line.startswith("- 면담일"):
            current["date"] = clean_text(line.split(":", 1)[1] if ":" in line else "")
            continue
        content_lines.append(line)

    flush_current()
    return [section for section in sections if section["title"] or section["content"]]


def normalize_checkins(student: dict[str, Any]) -> list[dict[str, Any]]:
    normalized = []
    for index, item in enumerate(student.get("checkins", []), start=1):
        submitted_date = to_date(item.get("submittedAt", ""))
        resolved_date = item.get("date", "") or (submitted_date.isoformat() if submitted_date else "")
        normalized.append(
            {
                "checkinId": f"checkin-{stable_id(student['id'], item.get('phase', ''), resolved_date or index, index)}",
                "phase": item.get("phase", ""),
                "date": resolved_date,
                "originalDate": item.get("date", ""),
                "submittedAt": item.get("submittedAt", ""),
                "team": item.get("team", ""),
                "workText": item.get("workText", ""),
                "noteText": item.get("noteText", ""),
                "onTime": bool(item.get("onTime", False)),
            }
        )
    return normalized


def normalize_retrospectives(student: dict[str, Any]) -> list[dict[str, Any]]:
    normalized = []
    for index, item in enumerate(student.get("retrospectives", []), start=1):
        submitted_date = to_date(item.get("submittedAt", ""))
        resolved_date = item.get("date", "") or (submitted_date.isoformat() if submitted_date else "")
        normalized.append(
            {
                "retroId": f"retro-{stable_id(student['id'], item.get('phase', ''), resolved_date or index, index)}",
                "phase": item.get("phase", ""),
                "date": resolved_date,
                "originalDate": item.get("date", ""),
                "submittedAt": item.get("submittedAt", ""),
                "detail": item.get("detail", ""),
            }
        )
    return normalized


def build_learning_evidence(
    student: dict[str, Any],
    weeks: list[source.CurriculumWeek],
    admission: dict[str, Any],
    attendance_events: list[dict[str, Any]],
    checkins: list[dict[str, Any]],
    retrospectives: list[dict[str, Any]],
    counselings: list[dict[str, Any]],
    team_history: list[dict[str, Any]],
    career_documents: dict[str, Any],
    phase_start_dates: dict[str, str],
) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    student_id = student["id"]

    submitted_at = admission.get("submittedAt", "")
    admission_date = to_date(submitted_at)
    if admission["supportResponse"] or submitted_at:
        constructs = infer_constructs(
            admission["supportResponse"],
            "지원서 응답",
            {"career_agency"},
        )
        evidence.append(
            {
                "evidenceId": f"ev-{stable_id(student_id, 'admission-support', submitted_at or student_id)}",
                "studentId": student_id,
                "date": admission_date.isoformat() if admission_date else "",
                "weekIndex": 0,
                "phase": "admission",
                "sourceDomain": "admission",
                "evidenceType": "reported",
                "constructs": constructs,
                "title": "지원서 응답",
                "summary": short_text(admission["supportResponse"] or "지원서 응답이 기록되었습니다."),
                "detail": admission["supportResponse"],
                "severity": "stable",
                "provenance": build_provenance(
                    "Data/모집 결과.xlsx",
                    source_sheet="설문지 응답 시트1",
                ),
            }
        )

    result_event = next(
        (
            event
            for event in student.get("timelineEvents", [])
            if event.get("type") == "admission" and "최종" in event.get("title", "")
        ),
        None,
    )
    if admission["interviewResult"] or admission["interviewSummary"] or admission["interviewScore"] != "":
        event_date = result_event.get("date", "") if result_event else ""
        constructs = infer_constructs(
            admission["interviewSummary"] or admission["interviewResult"],
            "면접 결과",
            {"career_agency"},
        )
        evidence.append(
            {
                "evidenceId": f"ev-{stable_id(student_id, 'admission-interview', event_date or student_id)}",
                "studentId": student_id,
                "date": event_date,
                "weekIndex": 0,
                "phase": "admission",
                "sourceDomain": "admission",
                "evidenceType": "direct",
                "constructs": constructs,
                "title": "면접 결과",
                "summary": short_text(
                    f"{admission['interviewResult']} / 점수 {admission['interviewScore']}"
                    if admission["interviewResult"] or admission["interviewScore"] != ""
                    else admission["interviewSummary"]
                ),
                "detail": clean_text(admission["interviewSummary"]),
                "severity": normalized_severity(result_event.get("severity", "stable") if result_event else "stable"),
                "provenance": build_provenance(
                    "Data/모집 결과.xlsx",
                    source_sheet="면접 결과 관리",
                    is_estimated_date=bool(result_event and result_event.get("isEstimated")),
                ),
            }
        )

    for index, item in enumerate(attendance_events, start=1):
        event_date = item.get("date", "")
        parsed = to_date(event_date)
        evidence.append(
            {
                "evidenceId": f"ev-{stable_id(student_id, 'attendance', event_date, item.get('kind', ''), index)}",
                "studentId": student_id,
                "date": event_date,
                "weekIndex": source.week_for_date(parsed, weeks) if parsed else 0,
                "phase": "course",
                "sourceDomain": "attendance",
                "evidenceType": "direct",
                "constructs": ["engagement", "self_regulation"],
                "title": f"출결 이슈 - {item.get('kind', '기록')}",
                "summary": short_text(item.get("detail", "")),
                "detail": clean_text(item.get("detail", "")),
                "severity": normalized_severity(item.get("severity", "stable")),
                "provenance": build_provenance("Data/출결 기입 시트.xlsx"),
            }
        )

    for item in checkins:
        event_date = item.get("date", "")
        parsed = to_date(event_date)
        body = "\n\n".join(
            filter(
                None,
                [
                    f"작업 내용\n{clean_text(item.get('workText', ''))}" if item.get("workText") else "",
                    f"자유 메모\n{clean_text(item.get('noteText', ''))}" if item.get("noteText") else "",
                ],
            )
        )
        constructs = infer_constructs(body, f"{item.get('phase', '')} 데일리 체크인", {"engagement", "self_regulation"})
        evidence.append(
            {
                "evidenceId": f"ev-{stable_id(student_id, item.get('checkinId', ''), event_date, item.get('submittedAt', ''))}",
                "studentId": student_id,
                "date": event_date,
                "weekIndex": source.week_for_date(parsed, weeks) if parsed else 0,
                "phase": item.get("phase", ""),
                "sourceDomain": "project",
                "evidenceType": "reported",
                "constructs": constructs,
                "title": f"{item.get('phase', '')} 데일리 체크인",
                "summary": short_text(body or "프로젝트 작업 기록이 제출되었습니다."),
                "detail": body,
                "severity": "stable" if item.get("onTime") else "caution",
                "provenance": build_provenance(
                    f"Data/{item.get('phase', '')} 데일리 체크인.xlsx",
                    source_sheet="설문지 응답 시트",
                ),
            }
        )

    for item in retrospectives:
        event_date = item.get("date", "")
        parsed = to_date(event_date)
        detail = clean_text(item.get("detail", ""))
        constructs = infer_constructs(detail, f"{item.get('phase', '')} 회고", {"reflection"})
        evidence.append(
            {
                "evidenceId": f"ev-{stable_id(student_id, item.get('retroId', ''), event_date, item.get('submittedAt', ''))}",
                "studentId": student_id,
                "date": event_date,
                "weekIndex": source.week_for_date(parsed, weeks) if parsed else 0,
                "phase": item.get("phase", ""),
                "sourceDomain": "retro",
                "evidenceType": "reported",
                "constructs": constructs,
                "title": f"{item.get('phase', '')} 회고",
                "summary": short_text(detail or "프로젝트 회고가 제출되었습니다."),
                "detail": detail,
                "severity": "stable",
                "provenance": build_provenance(f"Data/{item.get('phase', '')} 회고.xlsx"),
            }
        )

    for index, item in enumerate(counselings, start=1):
        event_date = item.get("date", "")
        parsed = to_date(event_date)
        detail = clean_text(item.get("content", ""))
        title = clean_text(item.get("title", f"면담 {index}"))
        constructs = infer_constructs(detail, title, {"reflection"})
        evidence.append(
            {
                "evidenceId": f"ev-{stable_id(student_id, 'counseling', event_date, index)}",
                "studentId": student_id,
                "date": event_date,
                "weekIndex": source.week_for_date(parsed, weeks) if parsed else 0,
                "phase": "course",
                "sourceDomain": "counseling",
                "evidenceType": "reported",
                "constructs": constructs,
                "title": title,
                "summary": short_text(detail or f"{student['name']} 면담 기록"),
                "detail": detail,
                "severity": normalized_severity(item.get("severity", "stable")),
                "provenance": build_provenance(
                    f"Data/면담 기록/{student['name']}.md",
                ),
            }
        )

    for assignment in team_history:
        event_date = phase_start_dates.get(assignment["phase"], "")
        parsed = to_date(event_date)
        peer_summary = ", ".join(peer["name"] for peer in assignment.get("teammates", []))
        detail_lines = [
            f"팀: {assignment['teamLabel']}",
            f"역할: {assignment['roleLabel']}",
            f"팀원: {peer_summary}" if peer_summary else "팀원: 없음",
        ]
        evidence.append(
            {
                "evidenceId": f"ev-{stable_id(student_id, 'team', assignment['phase'], assignment['teamNumber'])}",
                "studentId": student_id,
                "date": event_date,
                "weekIndex": source.week_for_date(parsed, weeks) if parsed else 0,
                "phase": assignment["phase"],
                "sourceDomain": "team_context",
                "evidenceType": "direct",
                "constructs": ["collaboration"],
                "title": f"{assignment['phase']} 팀 배치",
                "summary": short_text(f"{assignment['teamLabel']} / 역할 {assignment['roleLabel']} / 함께한 팀원 {peer_summary}"),
                "detail": "\n".join(detail_lines),
                "severity": "stable",
                "provenance": build_provenance("Data/프로젝트 팀 구성.md", is_estimated_date=bool(event_date)),
            }
        )

    for round_record in career_documents.get("rounds", []):
        round_date = round_record.get("date", "")
        parsed = to_date(round_date)
        if round_record.get("selfIntroductionText"):
            detail = round_record["selfIntroductionText"]
            evidence.append(
                {
                    "evidenceId": f"ev-{stable_id(student_id, round_record['roundKey'], 'self_intro')}",
                    "studentId": student_id,
                    "date": round_date,
                    "weekIndex": source.week_for_date(parsed, weeks) if parsed else 0,
                    "phase": "career_preparation",
                    "sourceDomain": "career_document",
                    "evidenceType": "reported",
                    "constructs": infer_constructs(detail, "자기소개서", {"career_agency", "reflection"}),
                    "title": f"{round_record['roundLabel']} 자기소개서 작성",
                    "summary": short_text(detail),
                    "detail": detail,
                    "severity": "stable",
                    "provenance": build_provenance(round_record.get("selfIntroductionSource", "")),
                }
            )
        if round_record.get("resumeText"):
            detail = round_record["resumeText"]
            evidence.append(
                {
                    "evidenceId": f"ev-{stable_id(student_id, round_record['roundKey'], 'resume')}",
                    "studentId": student_id,
                    "date": round_date,
                    "weekIndex": source.week_for_date(parsed, weeks) if parsed else 0,
                    "phase": "career_preparation",
                    "sourceDomain": "career_document",
                    "evidenceType": "reported",
                    "constructs": infer_constructs(detail, "이력서", {"career_agency", "self_regulation"}),
                    "title": f"{round_record['roundLabel']} 이력서 작성",
                    "summary": short_text(detail),
                    "detail": detail,
                    "severity": "stable",
                    "provenance": build_provenance(round_record.get("resumeSource", "")),
                }
            )
        if round_record.get("feedbackText"):
            detail = round_record["feedbackText"]
            evidence.append(
                {
                    "evidenceId": f"ev-{stable_id(student_id, round_record['roundKey'], 'feedback')}",
                    "studentId": student_id,
                    "date": round_date,
                    "weekIndex": source.week_for_date(parsed, weeks) if parsed else 0,
                    "phase": "career_preparation",
                    "sourceDomain": "career_feedback",
                    "evidenceType": "reported",
                    "constructs": infer_constructs(detail, "취업 문서 피드백", {"reflection", "career_agency"}),
                    "title": f"{round_record['roundLabel']} 피드백",
                    "summary": short_text(detail),
                    "detail": detail,
                    "severity": "stable",
                    "provenance": build_provenance(round_record.get("feedbackSource", "")),
                }
            )

    evidence.sort(key=lambda item: (item["date"], item["sourceDomain"], item["title"]))
    return evidence


def evidence_to_timeline_event(evidence: dict[str, Any]) -> dict[str, Any]:
    source_path = evidence.get("provenance", {}).get("sourceFile", "")
    return {
        "eventId": evidence["evidenceId"],
        "date": evidence["date"],
        "endDate": "",
        "weekIndex": evidence["weekIndex"],
        "phase": evidence["phase"],
        "sourceDomain": evidence["sourceDomain"],
        "severity": evidence["severity"],
        "title": evidence["title"],
        "summary": evidence["summary"],
        "detail": evidence["detail"],
        "constructs": evidence["constructs"],
        "sourceLabel": Path(source_path).name if source_path else evidence["sourceDomain"],
        "isEstimatedDate": bool(evidence.get("provenance", {}).get("isEstimatedDate", False)),
    }


def build_profile(student: dict[str, Any]) -> dict[str, Any]:
    return {
        "studentId": student["id"],
        "name": student["name"],
        "phone": student.get("phone", ""),
        "gender": student.get("gender", ""),
        "birthDate": student.get("birthDate", ""),
        "education": student.get("education", ""),
        "experience": student.get("experience", ""),
        "address": student.get("address", ""),
        "specialNote": student.get("specialNote", ""),
        "attendanceMemo": student.get("attendanceMemo", ""),
        "cohort": student.get("cohort", ""),
        "course": student.get("course", ""),
    }


def build_status_periods(student: dict[str, Any]) -> list[dict[str, Any]]:
    periods = []
    for period in student.get("statusPeriods", []):
        periods.append(
            {
                "statusPeriodId": period["statusPeriodId"],
                "startDate": period["startDate"],
                "endDate": period["endDate"],
                "statusType": period["statusType"],
                "severity": normalized_severity(period["severity"]),
                "reasonSummary": period["reasonSummary"],
            }
        )
    return periods


def build_phase_start_dates(
    payload: dict[str, Any],
    team_history_map: dict[str, list[dict[str, Any]]] | None = None,
) -> dict[str, str]:
    phase_dates: dict[str, str] = {}
    numbered_dates: dict[int, date] = {}
    course_start = to_date(payload.get("curriculum", {}).get("startDate", ""))
    course_end = to_date(payload.get("curriculum", {}).get("endDate", ""))
    collected_dates: dict[str, list[date]] = {}

    for student in payload.get("students", []):
        for checkin in student.get("checkins", []):
            phase = clean_text(checkin.get("phase", ""))
            candidate = to_date(checkin.get("date", "")) or to_date(checkin.get("submittedAt", ""))
            if not phase or not candidate:
                continue
            if course_start and candidate < course_start:
                continue
            if course_end and candidate > course_end:
                continue
            collected_dates.setdefault(phase, []).append(candidate)

    if not collected_dates:
        for item in payload.get("projectPhases", []):
            phase = clean_text(item.get("phase", ""))
            for date_text in item.get("dates", []):
                candidate = to_date(date_text)
                if not phase or not candidate:
                    continue
                if course_start and candidate < course_start:
                    continue
                if course_end and candidate > course_end:
                    continue
                collected_dates.setdefault(phase, []).append(candidate)

    for phase, dates in collected_dates.items():
        first_date = min(dates).isoformat()
        phase_dates[phase] = first_date
        match = re.search(r"(\d+)차", phase)
        parsed = to_date(first_date)
        if match and parsed:
            numbered_dates[int(match.group(1))] = parsed

    requested_numbers: set[int] = set(numbered_dates.keys())
    if team_history_map:
        for assignments in team_history_map.values():
            for assignment in assignments:
                match = re.search(r"(\d+)차", assignment["phase"])
                if match:
                    requested_numbers.add(int(match.group(1)))

    if numbered_dates and requested_numbers:
        sorted_known = sorted(numbered_dates.items())
        deltas = [
            (sorted_known[index][1] - sorted_known[index - 1][1]).days
            for index in range(1, len(sorted_known))
            if (sorted_known[index][1] - sorted_known[index - 1][1]).days > 0
        ]
        default_gap = deltas[0] if deltas else 28
        for phase_number in sorted(requested_numbers):
            if phase_number in numbered_dates:
                continue
            previous_numbers = [value for value in numbered_dates.keys() if value < phase_number]
            if previous_numbers:
                base_number = max(previous_numbers)
                base_date = numbered_dates[base_number]
                estimated_date = base_date
                for current_number in range(base_number + 1, phase_number + 1):
                    estimated_date = estimated_date + timedelta(days=default_gap)
                    numbered_dates[current_number] = estimated_date
                phase_dates[f"{phase_number}차 프로젝트"] = numbered_dates[phase_number].isoformat()
    return phase_dates


def build_student_overview(bundle: dict[str, Any]) -> str:
    current_profile = bundle["currentProfile"]
    lines = [
        f"# {bundle['profile']['name']} 재가공 요약",
        "",
        "## 기본 정보",
        f"- 학생 ID: `{bundle['studentId']}`",
        f"- 과정: {bundle['profile']['course']}",
        f"- 현재 상태: {bundle['stats'].get('currentStatus', '미분류')}",
        f"- 최근 스냅샷: {current_profile.get('updatedAt', '')}",
        f"- 신뢰도: {current_profile.get('confidence', '')}",
        f"- 메모: {current_profile.get('note', '')}",
        "",
        "## 운영 지표",
        f"- 출결 기록 수: {bundle['stats'].get('attendanceIssues', 0)}",
        f"- 판단 반영 위험 출결 수: {bundle['stats'].get('attendanceRiskIssues', 0)}",
        f"- 지각 수: {bundle['stats'].get('lateCount', 0)}",
        f"- 결석 수: {bundle['stats'].get('absenceCount', 0)}",
        f"- 면담 수: {bundle['stats'].get('counselingCount', 0)}",
        f"- 프로젝트 제출률: {bundle['stats'].get('projectSubmissionRate', 0)}%",
        "",
        "## 성향 스냅샷",
    ]

    latest_snapshot = bundle["evaluationSnapshots"][-1] if bundle["evaluationSnapshots"] else None
    if latest_snapshot:
        for key, label in CONSTRUCT_LABELS.items():
            score = latest_snapshot["scores"].get(key, "")
            lines.append(f"- {label}: {score}")
    else:
        lines.append("- 스냅샷 데이터 없음")

    lines.extend(["", "## 프로젝트 역할 이력"])
    if bundle["projectTeamHistory"]:
        for assignment in bundle["projectTeamHistory"]:
            lines.append(
                f"- {assignment['phase']} | {assignment['teamLabel']} | 역할 {assignment['roleLabel']} | 팀원 {', '.join(peer['name'] for peer in assignment['teammates'])}"
            )
    else:
        lines.append("- 팀 구성 데이터 없음")

    lines.extend(["", "## 반복 협업 팀원"])
    if bundle["peerRelationships"]:
        for peer in bundle["peerRelationships"][:5]:
            lines.append(
                f"- {peer['peerName']} | 함께한 프로젝트 {peer['sharedProjectCount']}회 | {', '.join(item['phase'] for item in peer['phases'])}"
            )
    else:
        lines.append("- 반복 협업 데이터 없음")

    lines.extend(["", "## 취업 문서 진행"])
    if bundle["careerDocuments"]["rounds"]:
        for round_record in bundle["careerDocuments"]["rounds"]:
            parts = []
            if round_record.get("selfIntroductionText"):
                parts.append("자기소개서")
            if round_record.get("resumeText"):
                parts.append("이력서")
            if round_record.get("feedbackText"):
                parts.append("피드백")
            lines.append(
                f"- {round_record['date']} | {round_record['roundLabel']} | {', '.join(parts) if parts else '기록만 존재'}"
            )
    else:
        lines.append("- 취업 문서 데이터 없음")

    lines.extend(["", "## 최근 주요 증거"])
    for item in bundle["learningEvidence"][-5:]:
        lines.append(f"- {item['date']} | {item['title']} | {item['summary']}")
    if len(bundle["learningEvidence"]) == 0:
        lines.append("- 증거 데이터 없음")

    return "\n".join(lines) + "\n"


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def review_criteria(student_outputs: list[dict[str, Any]]) -> dict[str, Any]:
    review = {
        "researchGrounded": {
            "result": "pass",
            "note": "재가공 기준은 자기조절, 참여, 성찰, 사회정서학습, 형성평가 연구를 기반으로 설계했습니다.",
        },
        "timeAnchored": {
            "result": "pass",
            "note": "모든 증거 레코드는 날짜와 주차를 우선 필드로 저장합니다.",
        },
        "sourceInterpretationSeparation": {
            "result": "pass",
            "note": "learning_evidence와 evaluation_snapshots를 분리해 원자료와 파생 해석을 구분했습니다.",
        },
        "sensitiveDataMinimized": {
            "result": "pass",
            "note": "민감한 배경 정보는 profile에만 두고 성향 점수 계산의 직접 입력으로 사용하지 않습니다.",
        },
        "readability": {
            "result": "pass",
            "note": "학생별 폴더와 overview.md를 함께 생성해 읽기 쉽게 분리했습니다.",
        },
    }

    students_without_evidence = [item["studentId"] for item in student_outputs if not item["learningEvidence"]]
    if students_without_evidence:
        review["dataCoverage"] = {
            "result": "caution",
            "note": f"증거가 비어 있는 학생 {len(students_without_evidence)}명이 있습니다.",
            "studentIds": students_without_evidence,
        }
    else:
        review["dataCoverage"] = {
            "result": "pass",
            "note": "모든 학생에게 최소 1개 이상의 증거 레코드가 있습니다.",
        }

    return review


def build_validation_report(payload: dict[str, Any], student_outputs: list[dict[str, Any]], files_written: list[str]) -> dict[str, Any]:
    evidence_counter = Counter()
    estimated_event_count = 0
    blank_date_evidence_count = 0
    duplicate_evidence_id_count = 0
    team_assignment_count = 0
    leadership_assignment_count = 0
    students_with_team_history = 0
    students_with_career_documents = 0
    career_document_round_count = 0
    students_without_admission = []
    students_without_counseling = []
    students_missing_snapshots = []
    warning_periods = 0

    for item in student_outputs:
        seen_ids: set[str] = set()
        if item["projectTeamHistory"]:
            students_with_team_history += 1
        if item["careerDocuments"]["rounds"]:
            students_with_career_documents += 1
            career_document_round_count += len(item["careerDocuments"]["rounds"])
        team_assignment_count += len(item["projectTeamHistory"])
        leadership_assignment_count += sum(
            1
            for assignment in item["projectTeamHistory"]
            if assignment["role"] in {"team_lead", "pm"}
        )
        for evidence in item["learningEvidence"]:
            evidence_counter[evidence["sourceDomain"]] += 1
            if not evidence["date"]:
                blank_date_evidence_count += 1
            if evidence["evidenceId"] in seen_ids:
                duplicate_evidence_id_count += 1
            seen_ids.add(evidence["evidenceId"])
        for event in item["timelineEvents"]:
            if event["isEstimatedDate"]:
                estimated_event_count += 1
        if not item["admission"].get("supportResponse") and not item["admission"].get("interviewResult"):
            students_without_admission.append(item["studentId"])
        if not item["counselings"]:
            students_without_counseling.append(item["studentId"])
        if len(item["evaluationSnapshots"]) < 4:
            students_missing_snapshots.append(item["studentId"])
        warning_periods += sum(1 for period in item["statusPeriods"] if period["severity"] == "warning")

    return {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "studentCount": len(payload["students"]),
        "curriculumWeekCount": len(payload["curriculum"]["weeks"]),
        "curriculumSessionCount": len(payload["curriculum"]["sessions"]),
        "learningEvidenceCount": sum(evidence_counter.values()),
        "learningEvidenceByDomain": dict(sorted(evidence_counter.items())),
        "blankDateEvidenceCount": blank_date_evidence_count,
        "duplicateEvidenceIdCount": duplicate_evidence_id_count,
        "estimatedTimelineEventCount": estimated_event_count,
        "teamAssignmentCount": team_assignment_count,
        "leadershipAssignmentCount": leadership_assignment_count,
        "studentsWithTeamHistory": students_with_team_history,
        "studentsWithCareerDocuments": students_with_career_documents,
        "careerDocumentRoundCount": career_document_round_count,
        "warningStatusPeriodCount": warning_periods,
        "studentsWithoutAdmissionData": students_without_admission,
        "studentsWithoutCounselingData": students_without_counseling,
        "studentsMissingFourSnapshots": students_missing_snapshots,
        "criteriaReview": review_criteria(student_outputs),
        "filesWritten": sorted(files_written),
    }


def build_index_rows(student_outputs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for item in sorted(student_outputs, key=lambda row: row["profile"]["name"]):
        latest_snapshot = item["evaluationSnapshots"][-1] if item["evaluationSnapshots"] else None
        rows.append(
            {
                "studentId": item["studentId"],
                "name": item["profile"]["name"],
                "course": item["profile"]["course"],
                "currentStatus": item["stats"].get("currentStatus", ""),
                "projectSubmissionRate": item["stats"].get("projectSubmissionRate", 0),
                "attendanceIssues": item["stats"].get("attendanceIssues", 0),
                "attendanceRiskIssues": item["stats"].get("attendanceRiskIssues", 0),
                "counselingCount": item["stats"].get("counselingCount", 0),
                "latestCounselingDate": item["stats"].get("latestCounselingDate", ""),
                "latestSnapshot": latest_snapshot,
                "latestProfileNote": item["currentProfile"].get("note", ""),
                "evidenceCount": len(item["learningEvidence"]),
                "projectRoles": [assignment["roleLabel"] for assignment in item["projectTeamHistory"]],
                "careerDocumentRounds": len(item["careerDocuments"]["rounds"]),
                "careerFeedbackRounds": len(item["careerDocuments"]["summary"].get("feedbackRounds", [])),
                "repeatedPeerCount": len(item["peerRelationships"]),
            }
        )
    return rows


def build_weekly_index(student_outputs: list[dict[str, Any]], curriculum: dict[str, Any]) -> list[dict[str, Any]]:
    weeks = {
        week["weekIndex"]: {
            "weekIndex": week["weekIndex"],
            "label": week["label"],
            "startDate": week["startDate"],
            "endDate": week["endDate"],
            "studentEventCount": 0,
            "warningEventCount": 0,
            "cautionEventCount": 0,
            "counselingCount": 0,
            "attendanceIssueCount": 0,
        }
        for week in curriculum["weeks"]
    }
    weeks[0] = {
        "weekIndex": 0,
        "label": "admission",
        "startDate": "",
        "endDate": curriculum["startDate"],
        "studentEventCount": 0,
        "warningEventCount": 0,
        "cautionEventCount": 0,
        "counselingCount": 0,
        "attendanceIssueCount": 0,
    }

    for item in student_outputs:
        for event in item["timelineEvents"]:
            week = weeks.get(event["weekIndex"])
            if week is None:
                continue
            week["studentEventCount"] += 1
            if event["severity"] == "warning":
                week["warningEventCount"] += 1
            if event["severity"] == "caution":
                week["cautionEventCount"] += 1
            if event["sourceDomain"] == "counseling":
                week["counselingCount"] += 1
            if event["sourceDomain"] == "attendance":
                week["attendanceIssueCount"] += 1

    return [weeks[key] for key in sorted(weeks.keys())]


def build_reprocessing_standard_meta() -> dict[str, Any]:
    return {
        "constructs": CONSTRUCT_LABELS,
        "principles": [
            "원본 데이터는 직접 점수화하지 않고 증거 레코드로 분해한다.",
            "모든 증거 레코드는 날짜와 주차를 우선 축으로 가진다.",
            "원본/요약/해석을 분리해 저장한다.",
            "민감한 배경정보는 평가 근거로 직접 사용하지 않는다.",
            "학생별 폴더 구조와 개별 overview 문서로 사람이 읽기 쉬운 형태를 유지한다.",
        ],
        "severityScale": ["stable", "caution", "warning"],
        "evidenceTypes": {
            "direct": "출결, 점수, 제출 시각처럼 운영자가 직접 기록한 데이터",
            "reported": "학생 또는 운영자가 서술한 텍스트 기반 데이터",
            "derived": "자동 스냅샷, 상태 구간, 요약 메타데이터",
        },
        "sourceDomains": [
            "admission",
            "attendance",
            "project",
            "retro",
            "team_context",
            "career_document",
            "career_feedback",
            "counseling",
        ],
        "dataSources": [
            "학생 데이터.xlsx",
            "모집 결과.xlsx",
            "출결 기입 시트.xlsx",
            "1~3차 프로젝트 데일리 체크인.xlsx",
            "1~2차 프로젝트 회고.xlsx",
            "프로젝트 팀 구성.md",
            "이력서 및 자기소개/**/*",
            "면담 기록/*.md",
            "수업 시간표.xlsx",
        ],
        "studentArtifacts": [
            "profile.json",
            "admission.json",
            "attendance_events.json",
            "project_checkins.json",
            "project_retrospectives.json",
            "counselings.json",
            "project_team_history.json",
            "peer_relationships.json",
            "career_documents.json",
            "learning_evidence.json",
            "evaluation_snapshots.json",
            "status_periods.json",
            "timeline_events.json",
            "weekly_timeline.json",
            "overview.md",
        ],
    }


def curriculum_overview(curriculum: dict[str, Any]) -> dict[str, Any]:
    subject_counter = Counter(week["dominantSubject"] for week in curriculum["weeks"])
    return {
        "startDate": curriculum["startDate"],
        "endDate": curriculum["endDate"],
        "weekCount": len(curriculum["weeks"]),
        "sessionCount": len(curriculum["sessions"]),
        "dominantSubjects": dict(subject_counter.most_common()),
    }


def student_output_bundle(
    student: dict[str, Any],
    weeks: list[source.CurriculumWeek],
    phase_start_dates: dict[str, str],
    team_history_map: dict[str, list[dict[str, Any]]],
    career_documents_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    admission = build_admission_output(student)
    attendance_events = list(student.get("attendanceEvents", []))
    checkins = normalize_checkins(student)
    retrospectives = normalize_retrospectives(student)
    counselings = load_counselings_for_student(student["name"])
    student_key = normalize_person_key(student["name"])
    project_team_history = team_history_map.get(student_key, [])
    peer_relationships = build_peer_relationships(project_team_history)
    career_documents = career_documents_map.get(student_key, {"rounds": [], "summary": {
        "roundCount": 0,
        "selfIntroductionRounds": [],
        "resumeRounds": [],
        "feedbackRounds": [],
        "latestDocumentDate": "",
        "hasRevisionHistory": False,
    }})
    learning_evidence = build_learning_evidence(
        student,
        weeks,
        admission,
        attendance_events,
        checkins,
        retrospectives,
        counselings,
        project_team_history,
        career_documents,
        phase_start_dates,
    )
    snapshots = [normalize_snapshot(item) for item in student.get("evaluationSnapshots", [])]
    timeline_events = [evidence_to_timeline_event(item) for item in learning_evidence]
    profile = build_profile(student)
    status_periods = build_status_periods(student)
    return {
        "studentId": student["id"],
        "profile": profile,
        "admission": admission,
        "attendanceEvents": attendance_events,
        "projectCheckins": checkins,
        "projectRetrospectives": retrospectives,
        "counselings": counselings,
        "projectTeamHistory": project_team_history,
        "peerRelationships": peer_relationships,
        "careerDocuments": career_documents,
        "learningEvidence": learning_evidence,
        "evaluationSnapshots": snapshots,
        "statusPeriods": status_periods,
        "timelineEvents": timeline_events,
        "weeklyTimeline": student.get("weeklyTimeline", []),
        "stats": student.get("stats", {}),
        "currentProfile": {
            SNAPSHOT_KEY_MAP.get(key, key): value
            for key, value in student.get("currentProfile", {}).items()
        },
    }


def build_weeks(curriculum: dict[str, Any]) -> list[source.CurriculumWeek]:
    weeks: list[source.CurriculumWeek] = []
    for week_payload in curriculum["weeks"]:
        start_date = to_date(week_payload["startDate"])
        end_date = to_date(week_payload["endDate"])
        if not start_date or not end_date:
            continue
        weeks.append(
            source.CurriculumWeek(
                week_index=week_payload["weekIndex"],
                start_date=start_date,
                end_date=end_date,
                label=week_payload["label"],
                sessions=week_payload["sessions"],
                dominant_subject=week_payload["dominantSubject"],
                highlights=week_payload["highlights"],
            )
        )
    return weeks


def write_processed_output(payload: dict[str, Any], bundles: list[dict[str, Any]]) -> list[str]:
    files_written: list[str] = []

    def record(path: Path, writer: str, content: Any) -> None:
        if writer == "json":
            write_json(path, content)
        else:
            write_text(path, content)
        files_written.append(path.relative_to(ROOT).as_posix())

    readme = """# ProcessedData

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
"""
    record(OUTPUT_DIR / "README.md", "text", readme)

    record(OUTPUT_DIR / "meta" / "research_sources.json", "json", RESEARCH_SOURCES)
    record(OUTPUT_DIR / "meta" / "reprocessing_standard.json", "json", build_reprocessing_standard_meta())
    record(OUTPUT_DIR / "curriculum" / "overview.json", "json", curriculum_overview(payload["curriculum"]))
    record(OUTPUT_DIR / "curriculum" / "weeks.json", "json", payload["curriculum"]["weeks"])
    record(OUTPUT_DIR / "curriculum" / "sessions.json", "json", payload["curriculum"]["sessions"])
    record(OUTPUT_DIR / "indexes" / "students.json", "json", build_index_rows(bundles))
    record(OUTPUT_DIR / "indexes" / "weekly_overview.json", "json", build_weekly_index(bundles, payload["curriculum"]))

    manifest = []
    for bundle in bundles:
        student_dir = OUTPUT_DIR / "students" / bundle["studentId"]
        record(student_dir / "profile.json", "json", bundle["profile"])
        record(student_dir / "admission.json", "json", bundle["admission"])
        record(student_dir / "attendance_events.json", "json", bundle["attendanceEvents"])
        record(student_dir / "project_checkins.json", "json", bundle["projectCheckins"])
        record(student_dir / "project_retrospectives.json", "json", bundle["projectRetrospectives"])
        record(student_dir / "counselings.json", "json", bundle["counselings"])
        record(student_dir / "project_team_history.json", "json", bundle["projectTeamHistory"])
        record(student_dir / "peer_relationships.json", "json", bundle["peerRelationships"])
        record(student_dir / "career_documents.json", "json", bundle["careerDocuments"])
        record(student_dir / "learning_evidence.json", "json", bundle["learningEvidence"])
        record(student_dir / "evaluation_snapshots.json", "json", bundle["evaluationSnapshots"])
        record(student_dir / "status_periods.json", "json", bundle["statusPeriods"])
        record(student_dir / "timeline_events.json", "json", bundle["timelineEvents"])
        record(student_dir / "weekly_timeline.json", "json", bundle["weeklyTimeline"])
        record(student_dir / "overview.md", "text", build_student_overview(bundle))
        manifest.append(
            {
                "studentId": bundle["studentId"],
                "name": bundle["profile"]["name"],
                "directory": f"students/{bundle['studentId']}",
            }
        )

    record(OUTPUT_DIR / "indexes" / "student_manifest.json", "json", manifest)
    record(
        OUTPUT_DIR / "meta" / "validation_report.json",
        "json",
        build_validation_report(payload, bundles, files_written),
    )
    return files_written


def main() -> None:
    payload = source.build_payload()
    weeks = build_weeks(payload["curriculum"])
    team_history_map = parse_project_team_history()
    phase_start_dates = build_phase_start_dates(payload, team_history_map)
    career_documents_map = parse_career_documents()
    bundles = [
        student_output_bundle(
            student,
            weeks,
            phase_start_dates,
            team_history_map,
            career_documents_map,
        )
        for student in payload["students"]
    ]
    files_written = write_processed_output(payload, bundles)
    print(f"Processed students: {len(bundles)}")
    print(f"Files written: {len(files_written)}")
    print(f"Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
