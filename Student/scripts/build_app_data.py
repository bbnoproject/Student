from __future__ import annotations

import csv
import json
import math
import re
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from statistics import mean
from typing import Any

from openpyxl import load_workbook
from openpyxl.utils.datetime import from_excel
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "Data"
APP_DIR = ROOT / "App"
OUTPUT_FILE = APP_DIR / "data.js"

EXPECTED_PROJECT_PHASE_LABELS = [
    "1차 프로젝트",
    "2차 프로젝트",
    "3차 프로젝트",
    "4차 프로젝트",
]


PROJECT_PHASES = [
    {"phase": "1차 프로젝트", "daily_index": 0, "retro_index": 1},
    {"phase": "2차 프로젝트", "daily_index": 2, "retro_index": 3},
    {"phase": "3차 프로젝트", "daily_index": 4, "retro_index": None},
]


POSITIVE_COLLAB_KEYWORDS = [
    "소통",
    "협업",
    "조율",
    "도움",
    "배려",
    "공유",
    "책임감",
    "정리",
    "존중",
    "칭찬",
    "조율",
    "함께",
]

NEGATIVE_COLLAB_KEYWORDS = [
    "갈등",
    "충돌",
    "트러블",
    "마찰",
    "답답",
    "소음",
    "소통문제",
    "힘들",
    "불만",
    "재촉",
    "팀장은 무리",
    "기분 나쁘지 않게",
    "말을 바꿔",
    "조급",
]

COLLAB_PEER_PRAISE_KEYWORDS = [
    "칭찬",
    "좋았습니다",
    "도와",
    "배려",
    "책임감",
    "공유",
    "정리",
    "믿고",
    "솔선",
    "분위기",
    "적극",
    "잘하",
    "잘 해",
    "잘 받아",
    "잘 정리",
    "잘 이끌",
]

COLLAB_WANT_KEYWORDS = [
    "함께하고 싶은",
    "함께 하고 싶은",
    "같이 하고 싶은",
    "다시 함께",
    "같이 일하고 싶은",
]

COLLAB_AVOID_KEYWORDS = [
    "함께하고 싶지",
    "함께 하고 싶지",
    "같이 하고 싶지",
    "같이 팀을 하고 싶지",
    "같이 팀 하고 싶지",
    "팀을 하고 싶지",
    "팀 하고 싶지",
    "다시 함께하고 싶지",
    "프로젝트를 함께하고 싶지",
    "같이 일하고 싶지",
    "함께 일하고 싶지",
    "피하고 싶",
    "꺼려",
    "불편",
    "다음엔 다른 팀",
]

COLLAB_COMPLAINT_KEYWORDS = [
    "불만",
    "갈등",
    "불화",
    "마찰",
    "트러블",
    "소통 문제",
    "소통문제",
    "의견충돌",
    "의견 충돌",
    "답답",
    "조율이 어려",
    "진행이 어려",
    "같이 하면 힘들",
    "소통이 어렵",
    "역할 분담이 안",
    "책임감이 부족",
    "피드백을 받아들이지",
    "분위기가 불편",
    "분위기를 해",
]

COLLAB_COMPLAINT_EXCLUSION_PHRASES = [
    "불만 없이",
    "불만없이",
    "불만도 없이",
    "불만이 없",
    "불만은 없",
    "큰 불만 없",
    "기분 나쁘지 않게",
]

PRACTICE_STRENGTH_KEYWORDS = {
    "system_design": {
        "label": "시스템/밸런스 설계",
        "keywords": ["시스템", "밸런스", "테이블", "수식", "경제", "BM", "지표", "공식", "규칙"],
    },
    "content_design": {
        "label": "콘텐츠/레벨 디자인",
        "keywords": ["레벨", "맵", "던전", "기믹", "동선", "스테이지", "퀘스트", "콘텐츠", "플레이"],
    },
    "narrative_world": {
        "label": "세계관/서사/연출",
        "keywords": ["스토리", "세계관", "시나리오", "연출", "캐릭터", "감정", "서사", "미장센"],
    },
    "ai_tooling": {
        "label": "AI 활용/자동화",
        "keywords": ["AI", "Gemini", "제미나이", "생성형", "프롬프트", "커스텀 봇", "자동화", "봇"],
    },
    "market_research": {
        "label": "시장/BM/유저 분석",
        "keywords": ["시장", "유저", "타겟", "분석", "매출", "지표", "BM", "리텐션", "퍼널"],
    },
    "communication": {
        "label": "문서화/커뮤니케이션",
        "keywords": ["정리", "문서", "보고서", "가이드", "튜토리얼", "설득", "소통", "피드백"],
    },
}

COLLAB_SERIOUSNESS_KEYWORDS = [
    "소통",
    "존중",
    "배려",
    "피드백",
    "조율",
    "공유",
    "타인",
    "팀원",
    "함께",
    "분위기",
    "협업",
    "의견",
    "대화",
    "갈등",
    "역할",
]

COLLAB_LEADERSHIP_GOOD_KEYWORDS = [
    "팀장",
    "PM",
    "리드",
    "정리",
    "공유",
    "조율",
    "분배",
    "회고",
    "피드백",
    "데일리",
    "체크인",
    "책임",
]

COLLAB_LEADERSHIP_BAD_KEYWORDS = [
    "팀장은 무리",
    "갈등",
    "트러블",
    "마찰",
    "소통문제",
    "불만",
]

LEARNING_FLOW_CASE_META = {
    "oversleep_condition_rhythm": {
        "label": "늦잠 지각 리듬 관찰",
        "description": "늦잠 지각이 최근 짧은 주기로 반복되어 컨디션 관리 확인이 필요한 케이스",
    },
    "condition_management_sequence": {
        "label": "컨디션 관리 연쇄",
        "description": "프로젝트 데일리체크인 지연 뒤 다음 날 지각 또는 병가가 이어진 케이스",
    },
    "health_management_watch": {
        "label": "건강 관리 관찰",
        "description": "병가·진료·컨디션 등 건강형 출결이 반복된 케이스",
    },
    "health_project_strain": {
        "label": "건강-프로젝트 부담",
        "description": "건강형 출결과 프로젝트 제출/체크인 흔들림이 함께 나타난 케이스",
    },
    "daily_checkin_pattern": {
        "label": "데일리체크인 리듬 흔들림",
        "description": "체크인 지연과 프로젝트 제출 흐름이 함께 흔들린 케이스",
    },
    "collaboration_conflict_signal": {
        "label": "협업 갈등 신호",
        "description": "프로젝트 진행 중 타 학생의 불만, 갈등, 불화 언급이 확인된 케이스",
    },
    "counseling_recovery": {
        "label": "면담 후 회복",
        "description": "면담 기록 이후 성장 곡선이 회복된 케이스",
    },
    "reflection_growth_link": {
        "label": "회고 기반 성장",
        "description": "프로젝트 회고와 성장 지표가 함께 상승한 케이스",
    },
    "career_revision_progress": {
        "label": "진로 문서 개선",
        "description": "진로 문서 수정/피드백과 진로 준비도가 함께 확인된 케이스",
    },
}

RESILIENCE_KEYWORDS = [
    "극복",
    "해결",
    "다시",
    "개선",
    "보완",
    "화이팅",
    "해보",
    "배웠",
    "성장",
]

LOW_RESILIENCE_KEYWORDS = [
    "포기",
    "무섭",
    "불안",
    "압박",
    "걱정",
    "회피",
    "힘들",
    "어렵",
    "버겁",
]

REFLECTION_KEYWORDS = [
    "느꼈",
    "배웠",
    "다음",
    "앞으로",
    "개선",
    "깨달",
    "생각",
    "반성",
    "보완",
]

CAREER_KEYWORDS = [
    "취업",
    "직무",
    "기획자",
    "포트폴리오",
    "자기소개서",
    "회사",
    "입사",
    "목표",
    "진로",
]

CAREER_PURPOSE_KEYWORDS = [
    "희망 직무",
    "목표",
    "입사",
    "취업",
    "포트폴리오",
    "브랜딩",
    "지원동기",
    "신입",
    "회사",
]

CAREER_ROLE_KEYWORDS = [
    "시스템 기획",
    "콘텐츠 기획",
    "컨텐츠 기획",
    "시나리오",
    "레벨",
    "밸런스",
    "사업",
    "PM",
    "디렉터",
    "테크니컬 기획",
    "기획자",
]

CAREER_CONCRETE_ROLE_KEYWORDS = [
    "시스템 기획",
    "콘텐츠 기획",
    "컨텐츠 기획",
    "시나리오 기획",
    "레벨 기획",
    "밸런스 기획",
    "전투 기획",
    "경제 기획",
    "퀘스트 기획",
    "UX 기획",
    "UI 기획",
    "서비스 기획",
    "사업 PM",
    "프로젝트 PM",
    "QA",
    "데이터 분석",
    "테크니컬 기획",
]

CAREER_TARGET_CONTEXT_KEYWORDS = [
    "희망 직무",
    "지원 직무",
    "지원 회사",
    "게임사",
    "스튜디오",
    "채용",
    "공고",
    "입사",
    "신입",
    "포트폴리오",
    "자기소개서",
    "이력서",
    "면접",
]

CAREER_STRENGTH_KEYWORDS = [
    "강점",
    "역량",
    "보유 역량",
    "경험",
    "프로젝트 경험",
    "자격증",
    "언어",
    "일본어",
    "영어",
    "분석",
    "문서",
    "시스템",
    "콘텐츠",
    "컨텐츠",
    "데이터",
    "피드백",
    "개선",
]

CAREER_OBJECTIVE_EVIDENCE_KEYWORDS = [
    "자기소개서",
    "이력서",
    "포트폴리오",
    "지원서",
    "피드백",
    "수정",
    "보완",
    "제출",
    "프로젝트",
    "산출물",
    "문서",
    "기획서",
    "역기획",
    "분석",
    "링크",
    "면접",
    "공고",
]

CAREER_COLOR_KEYWORDS = [
    "자신만의",
    "스타일",
    "색",
    "철학",
    "브랜딩",
    "관점",
    "구조",
    "세계관",
    "유저",
    "소비자",
    "재미",
    "감동",
    "경험",
    "디렉터",
    "만드는 기획자",
]

CAREER_UNFOCUSED_KEYWORDS = [
    "명확한 목표는 없어",
    "모르겠",
    "아직 정하지",
    "고민 중",
    "방향성을 찾아",
]

CAREER_ABSTRACT_KEYWORDS = [
    "좋은 기획자",
    "훌륭한 기획자",
    "멋진 기획자",
    "재미있는 게임",
    "사람들에게 즐거움",
    "열심히",
    "최선을",
    "성장하고 싶",
    "배우고 싶",
    "관심이 많",
    "좋아합니다",
    "하고 싶습니다",
    "되고 싶습니다",
    "다양한",
    "여러 가지",
    "무엇이든",
    "잘하고 싶",
    "꿈",
]

CAREER_PRESENTATION_RELEVANT_KEYWORDS = [
    "게임",
    "기획",
    "기획의도",
    "레벨",
    "밸런스",
    "시스템",
    "전투",
    "경제",
    "시나리오",
    "세계관",
    "퀘스트",
    "UX",
    "UI",
    "QA",
    "유저",
    "플레이",
    "튜토리얼",
    "피드백",
    "분석",
    "워크플로우",
    "AI",
    "BM",
    "재화",
    "시장",
    "포트폴리오",
]

CAREER_PRESENTATION_WEAK_KEYWORDS = [
    "홍보",
    "잡담",
    "취미",
    "일상",
    "좋아하는",
    "대하여",
    "이야기",
]

EXPRESSION_SPECIFIC_KEYWORDS = [
    "구체",
    "예를 들어",
    "먼저",
    "다음",
    "단계",
    "일정",
    "역할",
    "근거",
    "정리",
    "기록",
    "공유",
]

EXPRESSION_AGENCY_KEYWORDS = [
    "하겠습니다",
    "했습니다",
    "진행",
    "수행",
    "개선",
    "보완",
    "시도",
    "준비",
    "확인",
    "조율",
    "해보",
    "만들",
]

EXPRESSION_RELATION_KEYWORDS = [
    "팀원",
    "함께",
    "소통",
    "도움",
    "배려",
    "피드백",
    "조율",
    "공유",
    "존중",
    "의견",
    "대화",
]

EXPRESSION_EMOTION_KEYWORDS = [
    "힘들",
    "어렵",
    "불안",
    "걱정",
    "압박",
    "부담",
    "아쉽",
    "스트레스",
    "무섭",
    "답답",
]

EXPRESSION_UNCERTAINTY_KEYWORDS = [
    "모르겠",
    "고민",
    "아직",
    "어떻게",
    "잘 모르",
    "부족",
    "애매",
    "불확실",
]


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compact_text(value: Any) -> str:
    return re.sub(r"\s+", " ", clean_text(value))


def short_text(value: Any, limit: int = 140) -> str:
    text = compact_text(value)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def slugify_name(name: str) -> str:
    slug = re.sub(r"[^0-9A-Za-z가-힣]+", "-", name.strip())
    return slug.strip("-").lower()


def normalize_name(name: Any) -> str:
    return re.sub(r"\s+", "", str(name or "")).strip()


class NotionTextExtractor(HTMLParser):
    BLOCK_TAGS = {"p", "div", "li", "h1", "h2", "h3", "tr", "br", "summary"}

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"style", "script"}:
            self.skip_depth += 1
        elif tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"style", "script"} and self.skip_depth:
            self.skip_depth -= 1
        elif tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)

    def text(self) -> str:
        return clean_text(unescape(" ".join(self.parts)))


def html_fragment_text(fragment: str) -> str:
    parser = NotionTextExtractor()
    parser.feed(fragment)
    return parser.text()


def html_file_text(path: Path) -> str:
    parser = NotionTextExtractor()
    parser.feed(path.read_text(encoding="utf-8", errors="ignore"))
    return parser.text()


def parse_notion_properties(raw_html: str) -> dict[str, str]:
    properties: dict[str, str] = {}
    for match in re.finditer(r"<tr class=\"property-row[^\"]*\">(.*?)</tr>", raw_html, flags=re.S):
        row_html = match.group(1)
        th_match = re.search(r"<th[^>]*>(.*?)</th>", row_html, flags=re.S)
        td_match = re.search(r"<td[^>]*>(.*?)</td>", row_html, flags=re.S)
        if not th_match or not td_match:
            continue
        key = html_fragment_text(th_match.group(1))
        value = html_fragment_text(td_match.group(1))
        if key:
            properties[key] = value
    return properties


def page_title_from_html(raw_html: str, fallback: str) -> str:
    match = re.search(r"<h1 class=\"page-title\"[^>]*>(.*?)</h1>", raw_html, flags=re.S)
    if match:
        return html_fragment_text(match.group(1))
    title_match = re.search(r"<title>(.*?)</title>", raw_html, flags=re.S)
    if title_match:
        return html_fragment_text(title_match.group(1))
    return clean_text(fallback)


def match_student_from_text(value: str, students_by_name: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    normalized = normalize_name(value).lower()
    for key in sorted(students_by_name.keys(), key=len, reverse=True):
        if key.lower() in normalized:
            return students_by_name[key]
    return None


def split_notion_sections(text: str) -> dict[str, str]:
    section_names = [
        "총평",
        "Good",
        "Bad",
        "과정을 들어오게 된 계기와 포부",
        "간단한 자기소개",
        "나의 강점과 약점",
        "관심 있는 기술 스택 / 배우고 싶은 분야",
        "과정에서 이루고 싶은 목표",
        "스트레스 해소 방법",
        "TMI",
        "과정 수료 후 나의 모습 상상",
    ]
    lines = [clean_text(line) for line in text.splitlines() if clean_text(line)]
    sections: dict[str, list[str]] = {}
    current = "본문"
    for line in lines:
        matched = next((name for name in section_names if name in line), "")
        if matched:
            current = matched
            sections.setdefault(current, [])
            remainder = clean_text(line.replace(matched, ""))
            if remainder and re.search(r"[0-9A-Za-z가-힣]", remainder):
                sections[current].append(remainder)
            continue
        sections.setdefault(current, []).append(line)
    return {key: clean_text("\n".join(value)) for key, value in sections.items() if clean_text("\n".join(value))}


def phase_order_key(label: str) -> int:
    match = re.search(r"(\d+)", clean_text(label))
    return int(match.group(1)) if match else 999


def date_in_window(value: date | None, start: date, end: date) -> bool:
    return bool(value and start <= value <= end)


def normalize_project_date(
    raw_value: Any,
    submitted_at: datetime | None,
    course_start: date,
    course_end: date,
) -> date | None:
    parsed = parse_date(raw_value)
    min_date = course_start - timedelta(days=45)
    max_date = course_end + timedelta(days=30)
    timestamp_date = submitted_at.date() if submitted_at else None

    if isinstance(raw_value, str):
        day_match = re.search(r"(\d{1,2})\s*일", clean_text(raw_value))
        if day_match and timestamp_date:
            candidate = date(timestamp_date.year, timestamp_date.month, int(day_match.group(1)))
            if date_in_window(candidate, min_date, max_date):
                return candidate

    if date_in_window(parsed, min_date, max_date):
        return parsed
    if date_in_window(timestamp_date, min_date, max_date):
        return timestamp_date
    if parsed and timestamp_date and parsed.month == timestamp_date.month and parsed.day == timestamp_date.day:
        return timestamp_date
    return parsed


def profile_average(scores: dict[str, Any]) -> float | None:
    judged_values = [float(value) for value in scores.values() if isinstance(value, (int, float))]
    return round(mean(judged_values), 2) if judged_values else None


def percentile_value(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, round((len(ordered) - 1) * percentile)))
    return round(ordered[index], 2)


def dominant_phase_dates(dates: list[date]) -> list[date]:
    ordered = sorted(set(dates))
    if len(ordered) <= 1:
      return ordered

    groups: list[list[date]] = [[ordered[0]]]
    for item in ordered[1:]:
        if (item - groups[-1][-1]).days <= 14:
            groups[-1].append(item)
        else:
            groups.append([item])
    groups.sort(key=lambda group: (len(group), group[-1]), reverse=True)
    return sorted(groups[0]) if groups else ordered


def parse_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            excel_date = from_excel(value)
            if isinstance(excel_date, datetime):
                return excel_date.date()
            if isinstance(excel_date, date):
                return excel_date
        except Exception:
            pass
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    match = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
    if match:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    match = re.search(r"(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일", text)
    if match:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    return None


def parse_datetime(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, time(0, 0))
    text = str(value).strip()
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y.%m.%d %H:%M:%S"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    parsed = parse_date(text)
    if parsed:
        return datetime.combine(parsed, time(0, 0))
    return None


def severity_rank(level: str) -> int:
    return {"info": 1, "stable": 1, "success": 1, "caution": 2, "warning": 3}.get(level, 1)


def event_severity_from_attendance(value: str) -> str:
    if "연락 X" in value or "무단" in value:
        return "warning"
    if "결석" in value:
        return "caution"
    if "지각" in value or "조퇴" in value:
        return "caution"
    return "info"


def attendance_kind(value: str) -> str:
    for key in ["결석", "지각", "조퇴", "외출", "공가", "휴가"]:
        if key in value:
            return key
    return "기타"


def is_judgment_attendance_issue(detail: str, kind: str) -> bool:
    text = f"{detail}\n{kind}".lower()
    is_unexcused_absence = "결석" in text and any(
        keyword in text
        for keyword in ["무단", "연락 x", "연락x", "연락 없음", "연락없음", "연락 안", "연락안"]
    )
    return is_unexcused_absence


def is_oversleep_late_detail(detail: str, kind: str) -> bool:
    text = f"{detail}\n{kind}".lower()
    return "지각" in text and any(
        keyword in text
        for keyword in ["늦잠", "잠", "기상 실패", "기상실패"]
    )


def attendance_reason_profile(value: str, kind: str) -> dict[str, str]:
    detail = clean_text(value)
    lowered = detail.lower()
    if not detail or detail == "-":
        return {"category": "unknown", "impact": "contextual", "severity": "info"}

    health_keywords = [
        "아파",
        "병원",
        "몸살",
        "감기",
        "치과",
        "진료",
        "컨디션",
        "병결",
        "검진",
        "입원",
        "치료",
        "간병",
        "병가",
        "건강",
    ]
    administrative_keywords = [
        "국취제",
        "국민취업",
        "실업급여",
        "상담",
        "면접",
        "공가",
        "공결",
        "예비군",
        "민방위",
        "qr",
        "행정",
        "휴학",
    ]
    behavioral_keywords = [
        "연락 x",
        "연락x",
        "연락 안",
        "연락안",
        "연락 안됨",
        "연락안됨",
        "무단",
        "늦잠",
        "피곤",
        "기상 실패",
        "이탈",
    ]
    learning_keywords = ["학업", "시험", "기말고사", "게임잼", "해커톤", "프로젝트", "출장"]
    personal_keywords = [
        "개인 일정",
        "개인 사정",
        "가족 행사",
        "가족 여행",
        "가정사",
        "이사",
        "병문안",
        "가족 모임",
        "본가",
        "외가",
        "행사 방문",
        "여행",
        "휴식",
        "밭일",
    ]
    logistics_keywords = ["버스", "우체국", "지방 출장"]

    if any(keyword in lowered for keyword in health_keywords):
        return {"category": "health", "impact": "contextual", "severity": "info"}
    if any(keyword in lowered for keyword in administrative_keywords):
        return {"category": "administrative", "impact": "exempt", "severity": "info"}
    if is_oversleep_late_detail(detail, kind):
        return {"category": "condition", "impact": "condition", "severity": "info"}
    if is_judgment_attendance_issue(detail, kind):
        severity = "warning" if kind == "결석" else "caution"
        return {"category": "behavioral", "impact": "behavioral", "severity": severity}
    if any(keyword in lowered for keyword in learning_keywords):
        return {"category": "external_learning", "impact": "contextual", "severity": "info"}
    if any(keyword in lowered for keyword in personal_keywords):
        return {"category": "personal", "impact": "contextual", "severity": "info"}
    if any(keyword in lowered for keyword in logistics_keywords):
        return {"category": "logistics", "impact": "contextual", "severity": "info"}
    if kind == "결석":
        return {"category": "absence", "impact": "contextual", "severity": "caution"}
    if kind in {"지각", "조퇴"}:
        return {"category": "late", "impact": "contextual", "severity": "info"}
    return {"category": "other", "impact": "contextual", "severity": event_severity_from_attendance(detail)}


def score_level(value: int) -> str:
    if value <= 1:
        return "지원 시급"
    if value == 2:
        return "형성 중"
    if value == 3:
        return "안정적"
    return "확장적"


def clamp_score(value: float) -> int:
    return max(1, min(4, int(round(value))))


def keyword_hits(text: str, keywords: list[str]) -> int:
    return sum(text.count(keyword) for keyword in keywords)


def unique_keyword_hits(text: str, keywords: list[str]) -> int:
    return sum(1 for keyword in keywords if keyword and keyword in text)


def text_without_phrases(text: str, phrases: list[str]) -> str:
    cleaned = text
    for phrase in phrases:
        cleaned = cleaned.replace(phrase, "")
    return cleaned


def collaboration_complaint_hits(text: str) -> int:
    return unique_keyword_hits(text_without_phrases(text, COLLAB_COMPLAINT_EXCLUSION_PHRASES), COLLAB_COMPLAINT_KEYWORDS)


def collaboration_project_issue_hits(text: str, keywords: list[str]) -> int:
    return unique_keyword_hits(text_without_phrases(text, COLLAB_COMPLAINT_EXCLUSION_PHRASES), keywords)


def bounded_metric(value: float) -> float:
    return round(max(0.0, min(4.0, value)), 2)


def bounded_rank_score(value: float) -> float:
    return round(max(0.0, min(100.0, float(value or 0))), 2)


FIELD_LEVEL_SCORES = {
    "최상": 96,
    "상": 88,
    "우수": 86,
    "중상": 76,
    "중": 64,
    "평균": 60,
    "보통": 60,
    "중하": 46,
    "하": 34,
    "낮음": 34,
    "미진": 30,
    "성취 미진": 28,
}

FIELD_COLLAB_POSITIVE_KEYWORDS = [
    "소통이 원활",
    "소통 원활",
    "소통적",
    "친화",
    "유한",
    "따뜻",
    "팀장",
    "이끄",
    "분위기",
    "긍정적",
    "협업",
    "조율",
    "배려",
]

FIELD_COLLAB_NEGATIVE_KEYWORDS = [
    "비협조",
    "소통은 다소 어려",
    "소통이 다소 어려",
    "소통 역량은 다소",
    "소통 역량은 낮",
    "불만",
    "갈등",
    "마찰",
    "태도 관찰",
    "관찰 필요",
    "오만",
    "가르치려고",
    "어눌",
]

FIELD_CAREER_POSITIVE_KEYWORDS = [
    "희망 직무",
    "전투",
    "시스템",
    "시나리오",
    "레벨",
    "밸런스",
    "PM",
    "QA",
    "기획서",
    "포트폴리오",
    "자기소개서",
    "이력서",
    "지원 직무",
    "공고",
    "채용",
    "지원 회사",
    "게임사",
    "명확",
    "분명",
]

FIELD_CAREER_OBJECTIVE_KEYWORDS = [
    "포트폴리오",
    "자기소개서",
    "이력서",
    "기획서",
    "역기획",
    "피드백",
    "수정",
    "제출",
    "산출물",
    "공고",
    "지원 직무",
    "희망 직무",
    "명확",
    "분명",
]

FIELD_CAREER_NEGATIVE_KEYWORDS = [
    "확신은 없",
    "방향성에 대한 확신",
    "고민",
    "부족",
    "미진",
    "불명확",
    "정리되지",
    "취업 방향성이 아직",
    "막연",
    "추상",
    "좋은 기획자",
    "하고 싶",
    "되고 싶",
]

FIELD_SUPPORT_KEYWORDS = [
    "성취도 미진",
    "성취 미진",
    "미진",
    "자신감부족",
    "자신감 부족",
    "비협조",
    "건강문제",
    "ADHD",
    "불안",
    "부족",
    "어려",
    "관찰 필요",
]

FIELD_PERFORMANCE_HARD_RISK_KEYWORDS = [
    "주요미진자",
    "주요 미진자",
    "성취 미진",
    "성취도 미진",
    "매우 미진",
    "이해도 부족",
    "이해도가 부족",
    "수업을 따라가기 어렵",
    "따라가기 어렵",
    "과제물의 퀄리티가 좋지",
    "퀄리티가 좋지",
    "선발 보류",
    "의지가 약",
    "TIL 미진",
    "실력 부족",
]

FIELD_PERFORMANCE_CAUTION_KEYWORDS = [
    "미진",
    "부족",
    "미숙",
    "어눌",
    "관찰 필요",
    "자신감부족",
    "자신감 부족",
    "무난",
    "평범",
    "중간",
    "애매",
    "약간 우려",
]

FIELD_RECORD_ROUTINE_KEYWORDS = [
    "TIL 미진",
    "TIL은 여전히 미진",
    "장비 점검 시트 제출을 모름",
    "답 X",
]

FIELD_PARTICIPATION_RISK_KEYWORDS = [
    "참여도 매우 미진",
    "참여도 미진",
    "참여도 낮",
    "비협조적",
]

FIELD_COMMUNICATION_RISK_KEYWORDS = [
    "소통이 매우 미진",
    "소통 미진",
    "소통 부족",
    "비협조",
]

FIELD_NON_PERFORMANCE_CONTEXT_KEYWORDS = [
    "참여도",
    "TIL",
    "기록",
    "작성",
    "루틴",
    "출결",
]

FIELD_COMMUNICATION_CONTEXT_KEYWORDS = [
    "소통",
    "협업",
    "관계",
]

FIELD_PERFORMANCE_CONTEXT_KEYWORDS = [
    "역량",
    "성취",
    "과제",
    "작업물",
    "이해",
    "실력",
    "수업",
    "기획서",
    "퀄리티",
]

FIELD_COUNTER_EVIDENCE_KEYWORDS = [
    "양호",
    "우수",
    "큰 문제없이",
    "책임감",
    "리더쉽",
    "리더십",
    "신중한 판단",
    "의견 화합",
    "긍정적인 자세",
    "잘 이끌",
    "업계경력자",
]


def weighted_score(parts: list[tuple[float | None, float]]) -> float:
    valid_parts = [
        (float(value), weight)
        for value, weight in parts
        if value is not None and isinstance(value, (int, float)) and math.isfinite(float(value)) and weight > 0
    ]
    if not valid_parts:
        return 0.0
    total_weight = sum(weight for _, weight in valid_parts)
    return bounded_rank_score(sum(value * weight for value, weight in valid_parts) / total_weight)


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def field_level_score(value: Any, default: float | None = None) -> float | None:
    text = clean_text(value)
    if not text:
        return default
    for label in sorted(FIELD_LEVEL_SCORES, key=len, reverse=True):
        if label in text:
            return FIELD_LEVEL_SCORES[label]
    return default


def profile_score_100(student: dict[str, Any], key: str) -> float | None:
    value = student.get("currentProfile", {}).get(key)
    if not isinstance(value, (int, float)):
        return None
    return bounded_rank_score((value / 4) * 100)


def phrase_contexts(text: str, phrase: str, window: int = 60) -> list[str]:
    if not text or not phrase:
        return []
    contexts = []
    for match in re.finditer(re.escape(phrase), text):
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        contexts.append(text[start:end])
    return contexts


def field_counter_evidence(student: dict[str, Any], understanding_score: float | None) -> dict[str, Any]:
    staff_profile = student.get("staffProfile", {})
    properties = staff_profile.get("properties", {})
    staff_text = staff_field_text(student)
    career_rounds = student.get("careerDocuments", {}).get("rounds", [])
    admission = student.get("admission", {})
    career_text = "\n".join(
        [
            admission.get("intro", ""),
            admission.get("motivation", ""),
            admission.get("career", ""),
            admission.get("goal", ""),
            student.get("experience", ""),
            student.get("education", ""),
            "\n".join(
                "\n".join(
                    filter(
                        None,
                        [
                            round_item.get("documents", {}).get("selfIntroduction", ""),
                            round_item.get("documents", {}).get("resume", ""),
                            round_item.get("feedback", ""),
                        ],
                    )
                )
                for round_item in career_rounds
            ),
        ]
    )
    peer_positive_weight = weighted_peer_count(student.get("peerFeedback", []), {"praise", "want"}, same_project_only=True)
    leadership_count = int(safe_float(student.get("stats", {}).get("leadershipRoleCount")))
    project_rate = safe_float(student.get("stats", {}).get("projectSubmissionRate"))
    evidence = []
    if understanding_score is not None and understanding_score >= 60:
        evidence.append(f"이해도 {clean_text(properties.get('이해도', '평균 이상'))}")
    if unique_keyword_hits(staff_text, FIELD_COUNTER_EVIDENCE_KEYWORDS):
        evidence.append("운영진 긍정/완화 메모")
    if "업계경력자" in staff_text or "경력" in career_text or "근무" in career_text:
        evidence.append("경력/실무 배경")
    if peer_positive_weight >= 3.5:
        evidence.append(f"같은 팀 동료 긍정 가중치 {peer_positive_weight}")
    if leadership_count >= 1:
        evidence.append(f"팀장/PM 경험 {leadership_count}회")
    if project_rate >= 85:
        evidence.append(f"프로젝트 제출률 {project_rate}%")
    return {
        "score": len(evidence),
        "evidence": evidence[:6],
        "peerPositiveWeight": peer_positive_weight,
        "leadershipRoleCount": leadership_count,
        "projectSubmissionRate": project_rate,
    }


def field_performance_risk(student: dict[str, Any]) -> dict[str, Any]:
    staff_profile = student.get("staffProfile", {})
    properties = staff_profile.get("properties", {})
    staff_text = staff_field_text(student)
    understanding_text = clean_text(properties.get("이해도", ""))
    understanding_score = field_level_score(understanding_text)
    routine_hits = [keyword for keyword in FIELD_RECORD_ROUTINE_KEYWORDS if keyword in staff_text]
    participation_hits = [keyword for keyword in FIELD_PARTICIPATION_RISK_KEYWORDS if keyword in staff_text]
    communication_hits = [keyword for keyword in FIELD_COMMUNICATION_RISK_KEYWORDS if keyword in staff_text]
    hard_hits = []
    for keyword in FIELD_PERFORMANCE_HARD_RISK_KEYWORDS:
        if keyword == "TIL 미진":
            continue
        if keyword == "매우 미진":
            for context in phrase_contexts(staff_text, keyword):
                if unique_keyword_hits(context, FIELD_NON_PERFORMANCE_CONTEXT_KEYWORDS):
                    participation_hits.append("참여/기록 맥락의 매우 미진")
                elif unique_keyword_hits(context, FIELD_COMMUNICATION_CONTEXT_KEYWORDS):
                    communication_hits.append("소통 맥락의 매우 미진")
                elif unique_keyword_hits(context, FIELD_PERFORMANCE_CONTEXT_KEYWORDS):
                    hard_hits.append(keyword)
                else:
                    communication_hits.append("맥락 확인 필요 매우 미진")
            continue
        if keyword in staff_text:
            hard_hits.append(keyword)
    caution_hits = [
        keyword
        for keyword in FIELD_PERFORMANCE_CAUTION_KEYWORDS
        if keyword in staff_text and keyword not in hard_hits
    ]
    if not hard_hits and (routine_hits or participation_hits) and caution_hits == ["미진"]:
        caution_hits = []
    if understanding_score is not None and understanding_score <= 34 and understanding_text:
        hard_hits.append(f"이해도 {understanding_text}")
    hard_hits = sorted(set(hard_hits), key=str)
    routine_hits = sorted(set(routine_hits), key=str)
    participation_hits = sorted(set(participation_hits), key=str)
    communication_hits = sorted(set(communication_hits), key=str)
    caution_hits = sorted(set(caution_hits), key=str)
    counter_evidence = field_counter_evidence(student, understanding_score)
    strong_counter_evidence = counter_evidence["score"] >= 3 or (
        counter_evidence["score"] >= 2 and understanding_score is not None and understanding_score >= 60
    )
    risk_score = bounded_rank_score(
        min(72, len(hard_hits) * 22)
        + min(18, len(routine_hits) * 8)
        + min(18, len(participation_hits) * 9)
        + min(18, len(communication_hits) * 9)
        + min(24, len(caution_hits) * 6)
        + (18 if understanding_score is not None and understanding_score <= 34 else 0)
        + (8 if understanding_score is not None and understanding_score <= 46 else 0)
        - min(28, counter_evidence["score"] * 7)
    )
    hard_gate = bool(understanding_score is not None and understanding_score <= 34)
    if hard_hits and not hard_gate:
        hard_gate = not (strong_counter_evidence and understanding_score is not None and understanding_score >= 60)
    has_risk = hard_gate or bool(caution_hits) or risk_score >= 30
    has_risk = has_risk or bool(routine_hits or participation_hits or communication_hits)
    review_only = has_risk and not hard_gate and bool(
        routine_hits or participation_hits or communication_hits or counter_evidence["evidence"]
    )
    reasons = []
    if hard_hits:
        reasons.append("현장 실력 저평가: " + ", ".join(hard_hits[:4]))
    if routine_hits or participation_hits:
        reasons.append("참여/기록 루틴 이슈: " + ", ".join([*participation_hits, *routine_hits][:4]))
    if communication_hits:
        reasons.append("소통/협업 메모: " + ", ".join(communication_hits[:3]))
    if caution_hits:
        reasons.append("주의 표현: " + ", ".join(caution_hits[:4]))
    if review_only and counter_evidence["evidence"]:
        reasons.append("반대 근거: " + ", ".join(counter_evidence["evidence"][:3]))
    return {
        "hasRisk": has_risk,
        "hardGate": hard_gate,
        "reviewOnly": review_only,
        "riskScore": risk_score,
        "supportNeedScore": bounded_rank_score(max(risk_score, 70 if hard_gate else 46 if has_risk else 0)),
        "understandingScore": understanding_score,
        "hardHits": hard_hits,
        "routineHits": routine_hits,
        "participationHits": participation_hits,
        "communicationHits": communication_hits,
        "cautionHits": caution_hits,
        "counterEvidence": counter_evidence,
        "reasons": reasons,
    }


def peer_reputation_risk(collaboration_readiness: dict[str, Any]) -> dict[str, Any]:
    complaint_weight = safe_float(collaboration_readiness.get("peerComplaintWeight"))
    avoid_weight = safe_float(collaboration_readiness.get("peerAvoidWeight"))
    same_complaint = safe_float(collaboration_readiness.get("sameProjectPeerComplaintWeight"))
    same_avoid = safe_float(collaboration_readiness.get("sameProjectPeerAvoidWeight"))
    complaint_count = int(safe_float(collaboration_readiness.get("peerComplaintCount")))
    avoid_count = int(safe_float(collaboration_readiness.get("peerAvoidCount")))
    peer_positive_weight = safe_float(collaboration_readiness.get("peerPositiveWeight"))
    leadership_count = int(safe_float(collaboration_readiness.get("leadershipRoleCount")))
    collaboration_score = safe_float(collaboration_readiness.get("collaborationReadinessScore"))
    risk_score = bounded_rank_score(
        (complaint_weight * 24)
        + (avoid_weight * 32)
        + (same_complaint * 18)
        + (same_avoid * 24)
    )
    has_role_counter_evidence = leadership_count >= 1 or peer_positive_weight >= 3.5 or collaboration_score >= 70
    single_conflict_review = (
        complaint_count == 1
        and avoid_count == 0
        and same_avoid == 0
        and has_role_counter_evidence
    )
    repeated_or_severe_complaint = complaint_count >= 2 or same_complaint >= 3.0
    hard_gate = avoid_count >= 1 or same_avoid > 0 or repeated_or_severe_complaint or (
        complaint_count >= 1 and not single_conflict_review
    )
    if single_conflict_review:
        risk_score = bounded_rank_score(risk_score * 0.55)
    reasons = []
    if avoid_count:
        reasons.append(f"동료 비선호/회피 표현 {avoid_count}건")
    if complaint_count:
        reasons.append(f"{'단일 ' if single_conflict_review else ''}동료 불만/갈등 표현 {complaint_count}건")
    if same_complaint or same_avoid:
        reasons.append(f"같은 프로젝트 팀원 비판 가중치 {round(same_complaint + same_avoid, 2)}")
    if single_conflict_review:
        reasons.append("팀장/협업 긍정 근거가 있어 평판 위험이 아니라 역할 조율 검토로 분류")
    return {
        "hasRisk": hard_gate or risk_score > 0,
        "hardGate": hard_gate,
        "reviewOnly": bool(single_conflict_review and not hard_gate),
        "singleConflictReview": single_conflict_review,
        "riskScore": risk_score,
        "complaintWeight": complaint_weight,
        "avoidWeight": avoid_weight,
        "sameProjectCriticalWeight": round(same_complaint + same_avoid, 2),
        "counterEvidence": {
            "peerPositiveWeight": peer_positive_weight,
            "leadershipRoleCount": leadership_count,
            "collaborationReadinessScore": collaboration_score,
        },
        "reasons": reasons,
    }


def evaluation_mismatch_risk(
    student: dict[str, Any],
    field_risk: dict[str, Any],
    collaboration_readiness: dict[str, Any],
) -> dict[str, Any]:
    high_record_signal = (
        student.get("stats", {}).get("projectSubmissionRate", 0) >= 90
        and collaboration_readiness.get("checkinOnTimeRate", 0) >= 90
        and student.get("currentProfile", {}).get("reflection", 0) >= 3
    )
    mismatch = bool(high_record_signal and field_risk.get("hasRisk"))
    reasons = []
    if mismatch:
        reasons.append("제출·체크인·회고 기록은 안정적이나 현장 실력/이해도 저평가가 함께 확인됨")
    return {
        "hasRisk": mismatch,
        "hardGate": bool(mismatch and field_risk.get("hardGate")),
        "recordSignal": high_record_signal,
        "reasons": reasons,
    }


def keyword_context_count(text: str, anchors: list[str], context_keywords: list[str], window: int = 140) -> int:
    if not text:
        return 0
    count = 0
    for anchor in {item for item in anchors if item}:
        matched = False
        for match in re.finditer(re.escape(anchor), text):
            start = max(0, match.start() - window)
            end = min(len(text), match.end() + window)
            snippet = text[start:end]
            if unique_keyword_hits(snippet, context_keywords):
                matched = True
                break
        if matched:
            count += 1
    return count


def contextual_phrase_counts(text: str, phrases: list[str], support_keywords: list[str], window: int = 140) -> dict[str, int]:
    supported = 0
    unsupported = 0
    for phrase in {item for item in phrases if item and item in text}:
        phrase_supported = False
        for match in re.finditer(re.escape(phrase), text):
            start = max(0, match.start() - window)
            end = min(len(text), match.end() + window)
            snippet = text[start:end]
            if unique_keyword_hits(snippet, support_keywords):
                phrase_supported = True
                break
        if phrase_supported:
            supported += 1
        else:
            unsupported += 1
    return {"supported": supported, "unsupported": unsupported}


def career_specificity_metrics(text: str, career_rounds: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    career_rounds = career_rounds or []
    concrete_role_hits = unique_keyword_hits(text, CAREER_CONCRETE_ROLE_KEYWORDS)
    role_hits = unique_keyword_hits(text, CAREER_ROLE_KEYWORDS)
    target_context_hits = unique_keyword_hits(text, CAREER_TARGET_CONTEXT_KEYWORDS)
    objective_hits = unique_keyword_hits(text, CAREER_OBJECTIVE_EVIDENCE_KEYWORDS)
    concrete_goal_context_count = keyword_context_count(
        text,
        CAREER_CONCRETE_ROLE_KEYWORDS,
        CAREER_TARGET_CONTEXT_KEYWORDS + CAREER_OBJECTIVE_EVIDENCE_KEYWORDS,
    )
    abstract_context = contextual_phrase_counts(
        text,
        CAREER_ABSTRACT_KEYWORDS,
        CAREER_CONCRETE_ROLE_KEYWORDS + CAREER_TARGET_CONTEXT_KEYWORDS + CAREER_OBJECTIVE_EVIDENCE_KEYWORDS,
    )
    abstract_hits = abstract_context["unsupported"]
    unfocused_hits = unique_keyword_hits(text, CAREER_UNFOCUSED_KEYWORDS)
    self_intro_round_count = sum(1 for item in career_rounds if item.get("documents", {}).get("selfIntroduction"))
    resume_round_count = sum(1 for item in career_rounds if item.get("documents", {}).get("resume"))
    feedback_round_count = sum(1 for item in career_rounds if item.get("feedback"))
    has_revision_history = self_intro_round_count >= 2
    objective_document_count = self_intro_round_count + resume_round_count + feedback_round_count + (1 if has_revision_history else 0)
    concrete_goal = concrete_goal_context_count >= 1
    overbroad_role_signal = role_hits >= 6 and concrete_role_hits <= 1
    objective_evidence_score = bounded_rank_score(
        35
        + min(25, objective_hits * 4)
        + min(28, objective_document_count * 7)
        + min(14, concrete_goal_context_count * 7)
        - min(20, abstract_hits * 3)
        - (10 if overbroad_role_signal else 0)
        - min(18, unfocused_hits * 6)
    )
    return {
        "concreteRoleCount": concrete_role_hits,
        "roleFocusCount": role_hits,
        "targetContextCount": target_context_hits,
        "contextualGoalCount": concrete_goal_context_count,
        "objectiveEvidenceCount": objective_hits + objective_document_count,
        "abstractExpressionCount": abstract_hits,
        "supportedAbstractExpressionCount": abstract_context["supported"],
        "unfocusedExpressionCount": unfocused_hits,
        "objectiveDocumentCount": objective_document_count,
        "hasConcreteGoal": concrete_goal,
        "hasRevisionHistory": has_revision_history,
        "selfIntroRoundCount": self_intro_round_count,
        "resumeRoundCount": resume_round_count,
        "feedbackRoundCount": feedback_round_count,
        "overbroadRoleSignal": overbroad_role_signal,
        "objectiveEvidenceScore": objective_evidence_score,
    }


def score_field_career_signal(staff_text: str, target_role_text: str) -> float:
    concrete_hits = unique_keyword_hits(staff_text, CAREER_CONCRETE_ROLE_KEYWORDS)
    concrete_context_hits = keyword_context_count(
        staff_text,
        CAREER_CONCRETE_ROLE_KEYWORDS,
        FIELD_CAREER_OBJECTIVE_KEYWORDS + CAREER_TARGET_CONTEXT_KEYWORDS,
    )
    objective_hits = unique_keyword_hits(staff_text, FIELD_CAREER_OBJECTIVE_KEYWORDS)
    positive_hits = unique_keyword_hits(staff_text, FIELD_CAREER_POSITIVE_KEYWORDS)
    negative_hits = unique_keyword_hits(staff_text, FIELD_CAREER_NEGATIVE_KEYWORDS)
    abstract_hits = contextual_phrase_counts(
        staff_text,
        CAREER_ABSTRACT_KEYWORDS,
        CAREER_CONCRETE_ROLE_KEYWORDS + FIELD_CAREER_OBJECTIVE_KEYWORDS + CAREER_TARGET_CONTEXT_KEYWORDS,
    )["unsupported"]
    target_has_concrete_role = unique_keyword_hits(target_role_text, CAREER_CONCRETE_ROLE_KEYWORDS) > 0
    target_has_context = keyword_context_count(
        target_role_text,
        CAREER_CONCRETE_ROLE_KEYWORDS + CAREER_ROLE_KEYWORDS,
        CAREER_TARGET_CONTEXT_KEYWORDS + FIELD_CAREER_OBJECTIVE_KEYWORDS,
        window=80,
    ) > 0
    score = 48 + min(18, positive_hits * 3) + min(18, objective_hits * 4) + min(14, concrete_context_hits * 7)
    if concrete_hits and not concrete_context_hits:
        score += min(6, concrete_hits * 2)
    score -= min(30, negative_hits * 6) + min(16, abstract_hits * 4)
    if clean_text(target_role_text):
        score += 8 if target_has_concrete_role or target_has_context else -6
    return bounded_rank_score(score)


def score_career_presentation_content(student: dict[str, Any]) -> dict[str, Any]:
    presentations = student.get("morningPresentations", [])
    if not presentations:
        return {
            "score": None,
            "topicCount": 0,
            "relevantTopicCount": 0,
            "concreteTopicCount": 0,
            "weakTopicCount": 0,
            "topics": [],
        }
    topic_results = []
    for item in presentations:
        topic = item.get("topic", "")
        relevant_hits = unique_keyword_hits(topic, CAREER_PRESENTATION_RELEVANT_KEYWORDS)
        concrete_hits = unique_keyword_hits(topic, CAREER_CONCRETE_ROLE_KEYWORDS + CAREER_OBJECTIVE_EVIDENCE_KEYWORDS)
        weak_hits = unique_keyword_hits(topic, CAREER_PRESENTATION_WEAK_KEYWORDS)
        topic_score = 38 + min(34, relevant_hits * 7) + min(22, concrete_hits * 9)
        topic_score -= min(24, weak_hits * 7)
        if relevant_hits == 0:
            topic_score -= 14
        if item.get("isVolunteer") and relevant_hits >= 2:
            topic_score += 4
        topic_results.append(
            {
                "date": item.get("presentationDate", ""),
                "topic": topic,
                "isVolunteer": bool(item.get("isVolunteer")),
                "relevantHits": relevant_hits,
                "concreteHits": concrete_hits,
                "weakHits": weak_hits,
                "score": bounded_rank_score(topic_score),
            }
        )
    score = weighted_score([(item["score"], 1.0) for item in topic_results])
    return {
        "score": score,
        "topicCount": len(topic_results),
        "relevantTopicCount": sum(1 for item in topic_results if item["relevantHits"] > 0),
        "concreteTopicCount": sum(1 for item in topic_results if item["concreteHits"] > 0),
        "weakTopicCount": sum(1 for item in topic_results if item["weakHits"] > 0 or item["relevantHits"] == 0),
        "topics": topic_results[:6],
    }


def staff_field_text(student: dict[str, Any]) -> str:
    staff_profile = student.get("staffProfile", {})
    properties = staff_profile.get("properties", {})
    return "\n".join(
        filter(
            None,
            [
                properties.get("이해도", ""),
                properties.get("발표 실력", ""),
                properties.get("특징", ""),
                properties.get("한줄평", ""),
                properties.get("희망 직무", ""),
                staff_profile.get("summary", ""),
                staff_profile.get("fullText", ""),
            ],
        )
    )


def field_signal_score(
    text: str,
    positive_keywords: list[str],
    negative_keywords: list[str],
    *,
    base: float = 60.0,
    positive_relations: int = 0,
    negative_relations: int = 0,
) -> float:
    positive_hits = unique_keyword_hits(text, positive_keywords)
    negative_hits = unique_keyword_hits(text, negative_keywords)
    score = base + min(24, positive_hits * 4) + min(12, positive_relations * 4)
    score -= min(34, negative_hits * 6) + min(18, negative_relations * 6)
    return bounded_rank_score(score)


BACKGROUND_RELEVANT_KEYWORDS = [
    "게임",
    "기획",
    "프로그래밍",
    "컴퓨터",
    "소프트",
    "개발",
    "디자인",
    "UI",
    "UX",
    "영상",
    "애니메이션",
    "그래픽",
    "마케팅",
    "경영",
    "비즈니스",
    "통계",
    "분석",
    "QA",
    "운영",
    "프로젝트",
    "포트폴리오",
]

BACKGROUND_EXPERIENCE_KEYWORDS = [
    "경력",
    "근무",
    "회사",
    "인턴",
    "프로젝트",
    "팀장",
    "PM",
    "리더",
    "출시",
    "서비스",
    "외주",
    "공모전",
    "동아리",
    "포트폴리오",
    "개발",
    "디자인",
    "QA",
]

NO_EXPERIENCE_KEYWORDS = ["없습니다", "없음", "없다", "처음", "무경험"]


def confidence_score_100(value: str) -> float:
    return {"High": 92.0, "Medium": 74.0, "Low": 52.0}.get(clean_text(value), 58.0)


def score_initial_capability(student: dict[str, Any]) -> dict[str, Any]:
    admission = student.get("admission", {})
    staff_properties = student.get("staffProfile", {}).get("properties", {})
    education = clean_text(student.get("education", ""))
    experience = clean_text(student.get("experience", ""))
    admission_experience = clean_text(admission.get("experience", ""))
    staff_feature = clean_text(staff_properties.get("특징", ""))
    text = "\n".join(
        [
            education,
            experience,
            admission_experience,
            clean_text(admission.get("intro", "")),
            clean_text(admission.get("motivation", "")),
            clean_text(admission.get("career", "")),
            clean_text(admission.get("goal", "")),
            staff_feature,
        ]
    )
    score = 42.0
    evidence: list[str] = []

    if "대학원" in education:
        score += 13
        evidence.append("대학원 학력")
    elif "대학졸업" in education or "대학교 졸업" in education or "졸업" in education:
        score += 10
        evidence.append("대학졸업 학력")
    elif "대학재학" in education or "대학교 재학" in education or "재학" in education:
        score += 8
        evidence.append("대학재학 학력")
    elif "고등학교" in education or "고졸" in education:
        score += 4
        evidence.append("고등학교 학력")

    relevant_hits = unique_keyword_hits(text, BACKGROUND_RELEVANT_KEYWORDS)
    experience_hits = unique_keyword_hits("\n".join([experience, admission_experience, staff_feature]), BACKGROUND_EXPERIENCE_KEYWORDS)
    score += min(20, relevant_hits * 3.0)
    score += min(22, experience_hits * 4.0)

    if relevant_hits:
        evidence.append(f"직무 관련 배경 키워드 {relevant_hits}개")
    if experience_hits:
        evidence.append(f"경험/프로젝트 키워드 {experience_hits}개")
    if "업계경력자" in staff_feature or "게임업계" in text:
        score += 10
        evidence.append("게임업계 또는 유관 실무 배경")
    elif "타직군경력자" in staff_feature:
        score += 6
        evidence.append("타 직군 실무 전환 배경")
    if admission_experience and not any(keyword in admission_experience for keyword in NO_EXPERIENCE_KEYWORDS):
        score += 5
        evidence.append("지원서에 사전 경험 기재")
    if admission_experience and any(keyword in admission_experience for keyword in NO_EXPERIENCE_KEYWORDS) and relevant_hits <= 1:
        score -= 6
        evidence.append("지원서 기준 사전 경험 부족")

    evidence_count = sum(bool(value) for value in [education, experience, admission_experience, staff_feature])
    confidence = "High" if evidence_count >= 3 else "Medium" if evidence_count >= 2 else "Low"
    return {
        "score": round(bounded_rank_score(score), 2),
        "confidence": confidence,
        "evidence": evidence[:6] or ["초기 배경 근거가 제한적입니다."],
        "basis": "전공/학력, 지원서의 사전 경험, 이전 프로젝트·실무 배경을 낮은 비중으로 반영",
    }


def score_participation_readiness(student: dict[str, Any], collaboration_readiness: dict[str, Any]) -> dict[str, Any]:
    stats = student.get("stats", {})
    project_rate = safe_float(stats.get("projectSubmissionRate"))
    checkin_rate = safe_float(collaboration_readiness.get("checkinOnTimeRate"))
    project_expected_count = int(safe_float(stats.get("projectExpectedCount")))
    project_submission_count = int(safe_float(stats.get("projectSubmissionCount")))
    checkin_count = int(safe_float(collaboration_readiness.get("checkinCount")))
    retro_count = int(safe_float(collaboration_readiness.get("retroCount")))
    attendance_risk = int(safe_float(stats.get("attendanceRiskIssues")))
    late_count = int(safe_float(stats.get("lateCount")))
    absence_count = int(safe_float(stats.get("absenceCount")))
    health_or_condition = int(safe_float(stats.get("healthAttendanceIssues"))) + int(safe_float(stats.get("conditionAttendanceIssues")))
    project_component = project_rate if project_expected_count else None
    checkin_component = checkin_rate if project_submission_count else None
    # TIL/check-in should be scored against the student's observed window.
    # A dropout student with all expected responses before dropout should not be
    # penalized for later course dates that they never attended.
    til_response_score = project_rate if project_expected_count else 0.0
    til_component = til_response_score if project_expected_count else None
    attendance_score = bounded_rank_score(
        100
        - (attendance_risk * 18)
        - (late_count * 3)
        - (absence_count * 7)
        - min(10, health_or_condition * 1.5)
    )
    score = weighted_score(
        [
            (project_component, 0.34),
            (checkin_component, 0.28),
            (attendance_score, 0.26),
            (til_component, 0.12),
        ]
    )
    return {
        "score": round(score, 2),
        "projectSubmissionRate": project_rate,
        "projectExpectedCount": project_expected_count,
        "projectSubmissionCount": project_submission_count,
        "checkinOnTimeRate": checkin_rate,
        "tilResponseScore": round(til_response_score, 2),
        "attendanceScore": round(attendance_score, 2),
        "basis": "출석, 과제 제출, 데일리 체크인/TIL 응답과 회고 지속성을 반영합니다. 과정이탈자는 이탈일까지 기대된 응답만 분모로 사용하고 건강/컨디션 이슈는 낮은 감점으로 분리합니다.",
    }


def score_growth_potential(
    *,
    first_average: float,
    current_average: float,
    growth_delta: float,
    positive_growth_steps: int,
    latest_confidence: str,
    field_risk: dict[str, Any],
    mismatch_risk: dict[str, Any],
) -> dict[str, Any]:
    current_level_score = bounded_rank_score((current_average / 4) * 100) if current_average else 0.0
    improvement_score = bounded_rank_score(50 + (growth_delta * 28) + (positive_growth_steps * 4))
    if first_average >= 3.0 and current_average >= 3.0:
        sustain_score = bounded_rank_score(86 + ((current_average - 3.0) * 12) - max(0, -growth_delta) * 14)
        pattern = "초기 고수준 유지"
    elif current_average >= 3.0 and growth_delta >= 0:
        sustain_score = bounded_rank_score(78 + (growth_delta * 8))
        pattern = "상승 후 안정"
    elif growth_delta >= 0.5:
        sustain_score = bounded_rank_score(70 + growth_delta * 12)
        pattern = "저점 개선"
    else:
        sustain_score = bounded_rank_score(42 + current_average * 10 + max(0, growth_delta) * 8)
        pattern = "추가 검증 필요"
    confidence_component = confidence_score_100(latest_confidence)
    score = weighted_score(
        [
            (current_level_score, 0.42),
            (improvement_score, 0.22),
            (sustain_score, 0.24),
            (confidence_component, 0.12),
        ]
    )
    if field_risk.get("hardGate"):
        score = min(score, 62.0)
    elif mismatch_risk.get("hardGate"):
        score = min(score, 68.0)
    return {
        "score": round(score, 2),
        "currentLevelScore": round(current_level_score, 2),
        "improvementScore": round(improvement_score, 2),
        "sustainScore": round(sustain_score, 2),
        "confidenceScore": round(confidence_component, 2),
        "pattern": pattern,
        "basis": "현재 수준, 초기 대비 상승폭, 높은 수준 유지 여부, 최신 근거 신뢰도를 함께 반영",
    }


def build_rank_scores(
    student: dict[str, Any],
    *,
    first_average: float,
    current_average: float,
    growth_delta: float,
    positive_growth_steps: int,
    latest_confidence: str,
    support_score: int,
    support_index: float,
    collaboration_readiness: dict[str, Any],
    career_readiness: dict[str, Any],
) -> dict[str, float]:
    staff_profile = student.get("staffProfile", {})
    staff_properties = staff_profile.get("properties", {})
    staff_text = staff_field_text(student)
    understanding = field_level_score(staff_properties.get("이해도"))
    presentation = field_level_score(staff_properties.get("발표 실력"))
    positive_relations = len(staff_profile.get("positiveRelations", []))
    negative_relations = len(staff_profile.get("negativeRelations", []))
    field_risk = field_performance_risk(student)
    peer_risk = peer_reputation_risk(collaboration_readiness)
    mismatch_risk = evaluation_mismatch_risk(student, field_risk, collaboration_readiness)

    profile_average_score = bounded_rank_score((current_average / 4) * 100) if current_average else None
    initial_capability = score_initial_capability(student)
    participation_readiness = score_participation_readiness(student, collaboration_readiness)
    growth_potential = score_growth_potential(
        first_average=first_average,
        current_average=current_average,
        growth_delta=growth_delta,
        positive_growth_steps=positive_growth_steps,
        latest_confidence=latest_confidence,
        field_risk=field_risk,
        mismatch_risk=mismatch_risk,
    )
    growth_score = growth_potential["score"]

    support_field_signal = field_signal_score(
        staff_text,
        [],
        FIELD_SUPPORT_KEYWORDS,
        base=38,
        positive_relations=0,
        negative_relations=negative_relations,
    )
    support_field_need = 100 - understanding if understanding is not None else None
    attendance_need = bounded_rank_score(student["stats"].get("attendanceRiskIssues", 0) * 18 + student["stats"].get("lateCount", 0) * 4)
    submission_need = (
        bounded_rank_score(100 - safe_float(student["stats"].get("projectSubmissionRate", 0)))
        if safe_float(student["stats"].get("projectExpectedCount", 0)) > 0
        else None
    )
    support_need_score = weighted_score(
        [
            (support_field_need, 0.18),
            (support_index, 0.20),
            (support_field_signal, 0.18),
            (field_risk.get("supportNeedScore"), 0.24),
            (peer_risk.get("riskScore"), 0.10),
            (72 if mismatch_risk.get("hasRisk") else None, 0.10),
            (attendance_need, 0.07),
            (submission_need, 0.03),
        ]
    )
    if support_score >= 3:
        support_need_score = bounded_rank_score(support_need_score + 8)
    if field_risk.get("hardGate"):
        support_need_score = max(support_need_score, field_risk.get("supportNeedScore", 70))
    if peer_risk.get("hardGate"):
        support_need_score = max(support_need_score, min(92, 62 + peer_risk.get("riskScore", 0) * 0.2))
    if mismatch_risk.get("hasRisk"):
        support_need_score = max(support_need_score, 68 if not mismatch_risk.get("hardGate") else 82)

    field_collaboration = field_signal_score(
        staff_text,
        FIELD_COLLAB_POSITIVE_KEYWORDS,
        FIELD_COLLAB_NEGATIVE_KEYWORDS,
        base=62,
        positive_relations=positive_relations,
        negative_relations=negative_relations,
    )
    peer_collaboration = bounded_rank_score(
        60
        + (safe_float(collaboration_readiness.get("peerPositiveWeight")) * 3.5)
        + (safe_float(collaboration_readiness.get("sameProjectPeerPositiveWeight")) * 4.5)
        + (safe_float(collaboration_readiness.get("leadershipPeerPositiveWeight")) * 3.0)
        - (safe_float(collaboration_readiness.get("peerComplaintWeight")) * 4.5)
        - (safe_float(collaboration_readiness.get("sameProjectPeerComplaintWeight")) * 5.5)
        - (safe_float(collaboration_readiness.get("peerAvoidWeight")) * 3.5)
        - (safe_float(collaboration_readiness.get("sameProjectPeerAvoidWeight")) * 4.0)
        - (safe_float(collaboration_readiness.get("leadershipPeerRiskWeight")) * 3.0)
    )
    role_collaboration = weighted_score(
        [
            (bounded_rank_score((safe_float(collaboration_readiness.get("roleExecution")) / 4) * 100), 0.55),
            (bounded_rank_score((safe_float(collaboration_readiness.get("leadershipPractice")) / 4) * 100), 0.45),
        ]
    )
    collaboration_score = weighted_score(
        [
            (field_collaboration, 0.34),
            (peer_collaboration, 0.26),
            (role_collaboration, 0.18),
            (profile_score_100(student, "collaboration"), 0.12),
            (collaboration_readiness.get("collaborationReadinessScore"), 0.10),
        ]
    )
    if peer_risk.get("hardGate"):
        collaboration_score = min(collaboration_score, 54.0)

    field_career = score_field_career_signal(staff_text, staff_properties.get("희망 직무", ""))
    career_presentation = score_career_presentation_content(student)
    career_score = weighted_score(
        [
            (career_readiness.get("careerReadinessScore"), 0.34),
            (career_readiness.get("objectiveEvidenceScore"), 0.22),
            (field_career, 0.22),
            (profile_score_100(student, "careerAgency"), 0.12),
            (career_presentation.get("score"), 0.10),
        ]
    )

    total_score = weighted_score(
        [
            (initial_capability["score"], 0.10),
            (career_score, 0.22),
            (growth_score, 0.28),
            (participation_readiness["score"], 0.20),
            (collaboration_score, 0.20),
        ]
    )

    return {
        "initialCapability": initial_capability,
        "growth": growth_score,
        "growthPotential": growth_potential,
        "participation": participation_readiness,
        "supportNeed": support_need_score,
        "collaboration": collaboration_score,
        "career": career_score,
        "total": round(total_score, 2),
        "weights": {
            "initialCapability": 0.10,
            "career": 0.22,
            "growthPotential": 0.28,
            "participation": 0.20,
            "collaboration": 0.20,
        },
    }


def score_career_readiness(text: str, career_rounds: list[dict[str, Any]]) -> dict[str, Any]:
    metrics = career_specificity_metrics(text, career_rounds)
    purpose_hits = unique_keyword_hits(text, CAREER_PURPOSE_KEYWORDS)
    role_hits = metrics["roleFocusCount"]
    strength_hits = unique_keyword_hits(text, CAREER_STRENGTH_KEYWORDS)
    color_hits = unique_keyword_hits(text, CAREER_COLOR_KEYWORDS)
    abstract_hits = metrics["abstractExpressionCount"]
    unfocused_hits = metrics["unfocusedExpressionCount"]
    concrete_role_hits = metrics["concreteRoleCount"]
    target_context_hits = metrics["targetContextCount"]
    objective_evidence_count = metrics["objectiveEvidenceCount"]
    feedback_round_count = metrics["feedbackRoundCount"]
    resume_round_count = metrics["resumeRoundCount"]
    self_intro_round_count = metrics["selfIntroRoundCount"]
    has_revision_history = metrics["hasRevisionHistory"]

    purpose = 0.8
    if metrics["hasConcreteGoal"]:
        purpose += 1.0
    elif concrete_role_hits >= 1 and target_context_hits >= 1:
        purpose += 0.45
    elif concrete_role_hits >= 1:
        purpose += 0.25
    elif role_hits >= 1:
        purpose += 0.35
    if target_context_hits >= 2:
        purpose += 0.7
    elif purpose_hits >= 3:
        purpose += 0.25
    if feedback_round_count >= 1 and metrics["hasConcreteGoal"]:
        purpose += 0.25
    if metrics["overbroadRoleSignal"]:
        purpose -= 0.8
    if concrete_role_hits == 0:
        purpose -= 0.45
    purpose -= min(0.9, abstract_hits * 0.12)
    purpose -= min(1.0, unfocused_hits * 0.45)

    strength = 0.8
    if strength_hits >= 3 and objective_evidence_count >= 2:
        strength += 0.8
    elif strength_hits >= 3:
        strength += 0.35
    if objective_evidence_count >= 4:
        strength += 0.75
    if resume_round_count >= 1:
        strength += 0.3
    if feedback_round_count >= 1:
        strength += 0.25
    if has_revision_history:
        strength += 0.25
    strength -= min(0.6, abstract_hits * 0.08)

    color = 0.8
    if color_hits >= 3 and (concrete_role_hits >= 1 or objective_evidence_count >= 3):
        color += 0.75
    elif color_hits >= 3:
        color += 0.25
    if color_hits >= 7 and objective_evidence_count >= 4:
        color += 0.45
    if metrics["hasConcreteGoal"]:
        color += 0.35
    if feedback_round_count >= 1:
        color += 0.15
    color -= min(0.7, abstract_hits * 0.1)

    process = 0.8
    if self_intro_round_count >= 1:
        process += 0.65
    if resume_round_count >= 1:
        process += 0.65
    if feedback_round_count >= 1:
        process += 0.65
    if has_revision_history:
        process += 0.55
    if not career_rounds and objective_evidence_count < 2:
        process -= 0.35

    purpose = bounded_metric(purpose)
    strength = bounded_metric(strength)
    color = bounded_metric(color)
    process = bounded_metric(process)
    score = round(((purpose * 0.42) + (strength * 0.28) + (color * 0.15) + (process * 0.15)) / 4 * 100, 2)
    profile_score = clamp_score((purpose * 0.45) + (strength * 0.25) + (color * 0.15) + (process * 0.15))

    return {
        "purposeClarity": purpose,
        "selfStrengthAwareness": strength,
        "personalColor": color,
        "preparationProcess": process,
        "careerReadinessScore": score,
        "profileScore": profile_score,
        "roleFocusCount": role_hits,
        "concreteRoleCount": metrics["concreteRoleCount"],
        "targetContextCount": metrics["targetContextCount"],
        "contextualGoalCount": metrics["contextualGoalCount"],
        "objectiveEvidenceCount": metrics["objectiveEvidenceCount"],
        "abstractExpressionCount": metrics["abstractExpressionCount"],
        "supportedAbstractExpressionCount": metrics["supportedAbstractExpressionCount"],
        "unfocusedExpressionCount": metrics["unfocusedExpressionCount"],
        "objectiveEvidenceScore": metrics["objectiveEvidenceScore"],
        "hasConcreteGoal": metrics["hasConcreteGoal"],
        "overbroadRoleSignal": metrics["overbroadRoleSignal"],
        "hasRevisionHistory": has_revision_history,
    }


def age_band_for_student(student: dict[str, Any], reference: date | None = None) -> str:
    birth = parse_date(student.get("birthDate"))
    if not birth:
        return "미상"
    reference = reference or date.today()
    age = reference.year - birth.year - ((reference.month, reference.day) < (birth.month, birth.day))
    if age < 25:
        return "24세 이하"
    if age < 30:
        return "25-29세"
    if age < 35:
        return "30-34세"
    if age < 40:
        return "35-39세"
    return "40세 이상"


def expression_level(score: float) -> str:
    if score >= 3.2:
        return "높음"
    if score >= 2.3:
        return "보통"
    return "낮음"


def text_density_score(hit_count: int, text_length: int, unit: int = 750) -> float:
    if text_length <= 0:
        return 1.0
    density = hit_count / max(1, text_length / unit)
    return bounded_metric(1.0 + min(3.0, density * 0.55))


def keyword_occurrence_count(text: str, keywords: list[str]) -> int:
    if not text:
        return 0
    total = 0
    for keyword in {item for item in keywords if item}:
        total += text.count(keyword)
    return total


def keyword_source_coverage(sources: list[dict[str, str]], keywords: list[str]) -> tuple[int, int]:
    source_hits = 0
    domain_hits: set[str] = set()
    for source in sources:
        source_text = source.get("text", "")
        if unique_keyword_hits(source_text, keywords):
            source_hits += 1
            domain_hits.add(source.get("domain", ""))
    return source_hits, len(domain_hits)


def expression_signal_score(unique_hits: int, occurrence_hits: int, source_hits: int, domain_hits: int) -> float:
    # Expression traits are stronger when they recur across document types, not just in one long text.
    signal = (
        unique_hits * 0.12
        + min(occurrence_hits, 80) * 0.025
        + min(source_hits, 12) * 0.08
        + domain_hits * 0.22
    )
    return bounded_metric(1.0 + min(3.0, signal))


def collect_self_authored_sources(student: dict[str, Any]) -> list[dict[str, str]]:
    admission = student.get("admission", {})
    sources: list[dict[str, str]] = []
    admission_text = "\n".join(
        filter(
            None,
            [
                admission.get("intro", ""),
                admission.get("motivation", ""),
                admission.get("goal", ""),
                admission.get("career", ""),
                admission.get("conflict", ""),
                admission.get("failure", ""),
                admission.get("peer", ""),
            ],
        )
    )
    if admission_text.strip():
        sources.append({"domain": "admission", "label": "모집서류", "date": "", "text": admission_text})
    cadet_text = student.get("cadetCard", {}).get("fullText", "")
    if cadet_text.strip():
        sources.append({"domain": "cadetCard", "label": "대원카드", "date": "", "text": cadet_text})
    for item in student.get("checkins", []):
        text = "\n".join([item.get("workText", ""), item.get("noteText", "")]).strip()
        if text:
            sources.append({"domain": "checkin", "label": f"데일리체크인 · {item.get('phase', '')}", "date": item.get("date", ""), "text": text})
    for item in student.get("retrospectives", []):
        text = item.get("detail", "").strip()
        if text:
            sources.append({"domain": "retro", "label": f"프로젝트 회고 · {item.get('phase', '')}", "date": item.get("date", ""), "text": text})
    for round_item in student.get("careerDocuments", {}).get("rounds", []):
        documents = round_item.get("documents", {})
        text = "\n".join(
            filter(
                None,
                [
                    documents.get("selfIntroduction", ""),
                    documents.get("resume", ""),
                ],
            )
        ).strip()
        if text:
            sources.append({"domain": "careerDocument", "label": f"진로 문서 · {round_item.get('roundLabel', '')}", "date": round_item.get("date", ""), "text": text})
    for item in student.get("morningPresentations", []):
        text = item.get("topic", "").strip()
        if text:
            sources.append({"domain": "morningPresentation", "label": "아침 발표", "date": item.get("presentationDate", ""), "text": text})
    for item in student.get("practiceSubmissions", []):
        text = "\n".join([item.get("assignment", ""), item.get("fileName", ""), item.get("excerpt", "")]).strip()
        if text:
            sources.append({"domain": "practiceSubmission", "label": f"실습 제출 · {item.get('assignment', '')}", "date": item.get("date", ""), "text": text})
    return sources


def source_counts(sources: list[dict[str, str]]) -> dict[str, int]:
    counts = Counter(source["domain"] for source in sources)
    return {
        "admission": counts.get("admission", 0),
        "cadetCard": counts.get("cadetCard", 0),
        "checkin": counts.get("checkin", 0),
        "retro": counts.get("retro", 0),
        "careerDocument": counts.get("careerDocument", 0),
        "morningPresentation": counts.get("morningPresentation", 0),
        "practiceSubmission": counts.get("practiceSubmission", 0),
    }


def source_sample(sources: list[dict[str, str]], domain: str) -> dict[str, str]:
    candidates = [source for source in sources if source["domain"] == domain and source.get("text", "").strip()]
    if not candidates:
        return {}
    candidates = sorted(candidates, key=lambda item: item.get("date", ""))
    selected = candidates[-1]
    return {
        "label": selected.get("label", ""),
        "date": selected.get("date", ""),
        "excerpt": short_text(selected.get("text", ""), 180),
    }


def expression_dimension(label: str, evidence_label: str, keywords: list[str], sources: list[dict[str, str]], text: str) -> dict[str, Any]:
    unique_hits = unique_keyword_hits(text, keywords)
    occurrence_hits = keyword_occurrence_count(text, keywords)
    source_hits, domain_hits = keyword_source_coverage(sources, keywords)
    return {
        "label": label,
        "score": expression_signal_score(unique_hits, occurrence_hits, source_hits, domain_hits),
        "evidence": f"{evidence_label} {unique_hits}종 · 반복 {occurrence_hits}회 · 문서 {source_hits}건",
    }


def score_expression_profile(student: dict[str, Any]) -> dict[str, Any]:
    sources = collect_self_authored_sources(student)
    text = "\n".join(source["text"] for source in sources)
    text_length = len(text)

    dimensions = {
        "specificity": expression_dimension("구체성", "구체 표현", EXPRESSION_SPECIFIC_KEYWORDS, sources, text),
        "agency": expression_dimension("주도성 표현", "실행/개선 표현", EXPRESSION_AGENCY_KEYWORDS, sources, text),
        "reflection": expression_dimension("성찰 표현", "회고/개선 표현", REFLECTION_KEYWORDS, sources, text),
        "relation": expression_dimension("관계/협업 언어", "관계/협업 표현", EXPRESSION_RELATION_KEYWORDS, sources, text),
        "career": expression_dimension(
            "진로 언어",
            "진로/직무 표현",
            CAREER_PURPOSE_KEYWORDS + CAREER_ROLE_KEYWORDS + CAREER_STRENGTH_KEYWORDS + CAREER_COLOR_KEYWORDS,
            sources,
            text,
        ),
        "emotion": expression_dimension("정서/부담 표현", "정서/부담 표현", EXPRESSION_EMOTION_KEYWORDS, sources, text),
        "uncertainty": expression_dimension("탐색/불확실 표현", "탐색/불확실 표현", EXPRESSION_UNCERTAINTY_KEYWORDS, sources, text),
    }
    for value in dimensions.values():
        value["level"] = expression_level(value["score"])

    trait_candidates = [
        dimensions["specificity"],
        dimensions["agency"],
        dimensions["reflection"],
        dimensions["relation"],
        dimensions["career"],
    ]
    ranked_traits = sorted(trait_candidates, key=lambda item: item["score"], reverse=True)
    dominant_traits = [
        item["label"]
        for item in ranked_traits
        if item["score"] >= 2.3
    ][:3]
    caution_traits = [
        item["label"]
        for item in [dimensions["emotion"], dimensions["uncertainty"]]
        if item["score"] >= 2.8
    ]
    if not dominant_traits and sources:
        dominant_traits = [item["label"] for item in ranked_traits[:2] if item["score"] > 1.0] or ["표현 근거 수집 중"]
    trait_text = ", ".join(dominant_traits) if dominant_traits else "표현 특징"
    summary = (
        f"학생이 직접 작성한 자료 {len(sources)}건에서 {trait_text} 중심의 표현 특징이 관찰됩니다."
        if sources
        else "학생이 직접 작성한 문서가 부족해 표현 특징 판단을 보류합니다."
    )
    if caution_traits:
        summary += f" 다만 {', '.join(caution_traits)}은 개인 맥락과 함께 확인합니다."

    counts = source_counts(sources)
    return {
        "basicContext": {
            "ageBand": age_band_for_student(student),
            "gender": student.get("gender", ""),
            "education": student.get("education", ""),
            "note": "나이, 성별, 학력은 점수 근거가 아니라 학생의 표현과 선택을 이해하기 위한 맥락 정보입니다.",
        },
        "sourceCounts": counts,
        "sourceTotal": len(sources),
        "textLength": text_length,
        "dimensions": dimensions,
        "dominantTraits": dominant_traits,
        "cautionTraits": caution_traits,
        "samples": [
            sample
            for sample in [
                source_sample(sources, "admission"),
                source_sample(sources, "checkin"),
                source_sample(sources, "retro"),
                source_sample(sources, "careerDocument"),
            ]
            if sample
        ][:4],
        "summary": summary,
    }


def is_late_event(event: dict[str, Any]) -> bool:
    text = "\n".join(
        str(event.get(key, ""))
        for key in ["kind", "title", "summary", "detail", "reason"]
    )
    return "지각" in text


def text_windows_for_name(text: str, name: str, window: int = 90) -> list[str]:
    if not text or not name:
        return []
    windows = []
    for match in re.finditer(re.escape(name), text):
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        windows.append(text[start:end])
    return windows


def shared_project_context(
    source: dict[str, Any],
    target_name: str,
    phase: str = "",
    target: dict[str, Any] | None = None,
) -> dict[str, Any]:
    source_key = normalize_name(source.get("name", ""))
    target_key = normalize_name(target_name)
    matches = []
    seen: set[tuple[str, str, str, str]] = set()

    def add_match(phase_label: str, team_label: str, source_role: str, target_role: str) -> None:
        key = (phase_label, team_label, source_role, target_role)
        if key in seen:
            return
        seen.add(key)
        matches.append(
            {
                "phase": phase_label,
                "teamLabel": team_label,
                "sourceRole": source_role,
                "targetRole": target_role,
            }
        )

    for assignment in source.get("projectTeamHistory", []):
        if phase and assignment.get("phase") != phase:
            continue
        for peer in assignment.get("teammates", []):
            if normalize_name(peer.get("name", "")) != target_key:
                continue
            add_match(
                assignment.get("phase", ""),
                assignment.get("teamLabel", ""),
                assignment.get("roleLabel", ""),
                peer.get("roleLabel", ""),
            )
    if target:
        for assignment in target.get("projectTeamHistory", []):
            if phase and assignment.get("phase") != phase:
                continue
            for peer in assignment.get("teammates", []):
                if normalize_name(peer.get("name", "")) != source_key:
                    continue
                add_match(
                    assignment.get("phase", ""),
                    assignment.get("teamLabel", ""),
                    peer.get("roleLabel", ""),
                    assignment.get("roleLabel", ""),
                )
    if target and not matches:
        source_assignments = source.get("projectTeamHistory", [])
        target_assignments = target.get("projectTeamHistory", [])
        for source_assignment in source_assignments:
            if phase and source_assignment.get("phase") != phase:
                continue
            for target_assignment in target_assignments:
                if phase and target_assignment.get("phase") != phase:
                    continue
                same_phase = source_assignment.get("phase") == target_assignment.get("phase")
                same_team = source_assignment.get("teamLabel") and source_assignment.get("teamLabel") == target_assignment.get("teamLabel")
                if same_phase and same_team:
                    add_match(
                        source_assignment.get("phase", ""),
                        source_assignment.get("teamLabel", ""),
                        source_assignment.get("roleLabel", ""),
                        target_assignment.get("roleLabel", ""),
                    )
    return {
        "sameProject": bool(matches),
        "sharedPhases": sorted({item["phase"] for item in matches if item.get("phase")}, key=phase_order_key),
        "sharedTeams": sorted({item["teamLabel"] for item in matches if item.get("teamLabel")}),
        "sourceRoles": sorted({item["sourceRole"] for item in matches if item.get("sourceRole")}),
        "targetRoles": sorted({item["targetRole"] for item in matches if item.get("targetRole")}),
    }


def peer_feedback_weight(feedback_type: str, source_domain: str, same_project: bool) -> float:
    if source_domain in {"retro", "checkin"}:
        base = 1.25
    elif source_domain in {"counseling", "staffProfile"}:
        base = 1.0
    else:
        base = 0.75
    if same_project:
        base += 0.65
    if feedback_type in {"want", "complaint", "avoid"}:
        base += 0.15
    return round(base, 2)


def weighted_peer_count(peer_feedback: list[dict[str, Any]], types: set[str], same_project_only: bool = False) -> float:
    total = 0.0
    for item in peer_feedback:
        if item.get("type") not in types:
            continue
        if same_project_only and not item.get("sameProject"):
            continue
        total += safe_float(item.get("weight", 1.0), 1.0)
    return round(total, 2)


def role_label_is_leadership(label: str) -> bool:
    lowered = str(label or "").lower()
    return "팀장" in lowered or "pm" in lowered or "리더" in lowered or "lead" in lowered


def weighted_leadership_peer_count(peer_feedback: list[dict[str, Any]], types: set[str]) -> float:
    total = 0.0
    for item in peer_feedback:
        if item.get("type") not in types or not item.get("sameProject"):
            continue
        target_roles = item.get("targetRoles", [])
        if not any(role_label_is_leadership(role) for role in target_roles):
            continue
        total += safe_float(item.get("weight", 1.0), 1.0)
    return round(total, 2)


def collect_collaboration_text(
    student: dict[str, Any],
    checkins: list[dict[str, Any]] | None = None,
    retros: list[dict[str, Any]] | None = None,
    counselings: list[dict[str, Any]] | None = None,
) -> dict[str, str]:
    admission = student.get("admission", {})
    checkins = student.get("checkins", []) if checkins is None else checkins
    retros = student.get("retrospectives", []) if retros is None else retros
    counselings = student.get("counselings", []) if counselings is None else counselings
    base_text = "\n".join(
        [
            admission.get("intro", ""),
            admission.get("conflict", ""),
            admission.get("peer", ""),
            student.get("cadetCard", {}).get("fullText", ""),
            student.get("staffProfile", {}).get("fullText", ""),
            "\n".join(item.get("content", "") for item in counselings),
        ]
    )
    retro_text = "\n".join(item.get("detail", "") for item in retros)
    checkin_text = "\n".join(
        "\n".join([item.get("workText", ""), item.get("noteText", "")])
        for item in checkins
    )
    return {
        "base": base_text,
        "retro": retro_text,
        "checkin": checkin_text,
        "all": "\n".join([base_text, retro_text, checkin_text]),
    }


def score_collaboration_readiness(
    student: dict[str, Any],
    checkins: list[dict[str, Any]] | None = None,
    retros: list[dict[str, Any]] | None = None,
    counselings: list[dict[str, Any]] | None = None,
    attendance_events: list[dict[str, Any]] | None = None,
    team_history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    checkins = student.get("checkins", []) if checkins is None else checkins
    retros = student.get("retrospectives", []) if retros is None else retros
    counselings = student.get("counselings", []) if counselings is None else counselings
    attendance_events = student.get("attendanceEvents", []) if attendance_events is None else attendance_events
    team_history = student.get("projectTeamHistory", []) if team_history is None else team_history
    text = collect_collaboration_text(student, checkins, retros, counselings)
    peer_feedback = student.get("peerFeedback", [])

    peer_praise_count = sum(1 for item in peer_feedback if item.get("type") in {"praise", "want"})
    peer_avoid_count = sum(1 for item in peer_feedback if item.get("type") == "avoid")
    peer_complaint_count = sum(1 for item in peer_feedback if item.get("type") == "complaint")
    peer_praise_weight = weighted_peer_count(peer_feedback, {"praise"})
    peer_want_weight = weighted_peer_count(peer_feedback, {"want"})
    peer_positive_weight = weighted_peer_count(peer_feedback, {"praise", "want"})
    peer_avoid_weight = weighted_peer_count(peer_feedback, {"avoid"})
    peer_complaint_weight = weighted_peer_count(peer_feedback, {"complaint"})
    same_project_peer_positive_weight = weighted_peer_count(peer_feedback, {"praise", "want"}, same_project_only=True)
    same_project_peer_avoid_weight = weighted_peer_count(peer_feedback, {"avoid"}, same_project_only=True)
    same_project_peer_complaint_weight = weighted_peer_count(peer_feedback, {"complaint"}, same_project_only=True)
    leadership_peer_positive_weight = weighted_leadership_peer_count(peer_feedback, {"praise", "want"})
    leadership_peer_risk_weight = weighted_leadership_peer_count(peer_feedback, {"complaint", "avoid"})
    leader_count = sum(1 for item in team_history if item.get("role") in {"team_lead", "pm"})
    peer_positive_bonus = min(0.55, (peer_positive_weight * 0.06) + (same_project_peer_positive_weight * 0.08))
    peer_risk_penalty = min(
        1.55,
        (peer_complaint_weight * 0.20)
        + (same_project_peer_complaint_weight * 0.18)
        + (peer_avoid_weight * 0.26)
        + (same_project_peer_avoid_weight * 0.24),
    )
    single_conflict_with_role_counter = (
        peer_complaint_count == 1
        and peer_avoid_count == 0
        and (leader_count >= 1 or peer_positive_weight >= 3.5)
    )
    if single_conflict_with_role_counter:
        peer_risk_penalty *= 0.45
    if peer_complaint_count or peer_avoid_count:
        peer_positive_bonus *= 0.35
    leadership_peer_bonus = min(0.45, (leadership_peer_positive_weight * 0.12))
    leadership_peer_penalty = min(0.55, (leadership_peer_risk_weight * 0.13))
    project_text = "\n".join([text["retro"], text["checkin"]])
    checkin_quality_hits = unique_keyword_hits(text["checkin"], POSITIVE_COLLAB_KEYWORDS + COLLAB_SERIOUSNESS_KEYWORDS)
    retro_quality_hits = unique_keyword_hits(text["retro"], POSITIVE_COLLAB_KEYWORDS + COLLAB_SERIOUSNESS_KEYWORDS + COLLAB_LEADERSHIP_GOOD_KEYWORDS)
    project_issue_hits = collaboration_project_issue_hits(project_text, NEGATIVE_COLLAB_KEYWORDS + COLLAB_LEADERSHIP_BAD_KEYWORDS)
    leadership_good = unique_keyword_hits(text["retro"], COLLAB_LEADERSHIP_GOOD_KEYWORDS) * 1.4
    leadership_good += unique_keyword_hits(text["checkin"], COLLAB_LEADERSHIP_GOOD_KEYWORDS) * 0.6
    late_count = sum(1 for event in attendance_events if is_late_event(event))
    dated_checkins = [item for item in checkins if parse_date(item.get("date"))]
    delayed_checkins = [item for item in dated_checkins if not item.get("onTime")]
    on_time_rate = (
        sum(1 for item in dated_checkins if item.get("onTime")) / len(dated_checkins)
        if dated_checkins
        else 0.0
    )
    retro_count = len([item for item in retros if parse_date(item.get("date")) or item.get("detail")])

    checkin_consistency = bounded_metric(
        1.0
        + (on_time_rate * 2.1)
        + min(0.6, len(dated_checkins) * 0.04)
        - min(1.1, len(delayed_checkins) * 0.08)
    )
    retro_quality = bounded_metric(
        1.0
        + min(1.6, retro_quality_hits * 0.18)
        + min(0.7, retro_count * 0.18)
        - min(1.0, project_issue_hits * 0.12)
    )
    role_execution = bounded_metric(
        1.0
        + min(1.1, checkin_quality_hits * 0.12)
        + min(0.7, leadership_good * 0.08)
        + (0.35 if leader_count > 0 and (retro_quality_hits >= 3 or checkin_quality_hits >= 4) else 0)
        + min(0.35, same_project_peer_positive_weight * 0.05)
        - min(0.9, project_issue_hits * 0.12)
        - min(0.45, (same_project_peer_complaint_weight * 0.08) + (same_project_peer_avoid_weight * 0.05))
    )
    leadership_practice = bounded_metric(
        1.0
        + (0.35 if leader_count > 0 else 0)
        + min(0.45, leader_count * 0.12)
        + min(1.3, leadership_good * 0.12)
        + min(0.4, retro_count * 0.08)
        + leadership_peer_bonus
        - min(0.8, project_issue_hits * 0.1)
        - leadership_peer_penalty
    )
    raw = (
        (checkin_consistency * 0.3)
        + (retro_quality * 0.4)
        + (role_execution * 0.2)
        + (leadership_practice * 0.1)
    )
    raw = bounded_metric(raw + peer_positive_bonus - peer_risk_penalty)
    readiness_score = round((bounded_metric(raw) / 4) * 100, 2)
    profile_score = clamp_score(raw)

    phase_scores = []
    phases = sorted({item.get("phase", "") for item in dated_checkins + retros if item.get("phase")}, key=phase_order_key)
    for phase in phases:
        phase_checkins = [item for item in dated_checkins if item.get("phase") == phase]
        phase_retros = [item for item in retros if item.get("phase") == phase]
        if not phase_checkins and not phase_retros:
            continue
        phase_text = collect_collaboration_text(student, phase_checkins, phase_retros, [])
        phase_on_time_rate = (
            sum(1 for item in phase_checkins if item.get("onTime")) / len(phase_checkins)
            if phase_checkins
            else 0.0
        )
        phase_checkin_hits = unique_keyword_hits(phase_text["checkin"], POSITIVE_COLLAB_KEYWORDS + COLLAB_SERIOUSNESS_KEYWORDS)
        phase_retro_hits = unique_keyword_hits(phase_text["retro"], POSITIVE_COLLAB_KEYWORDS + COLLAB_SERIOUSNESS_KEYWORDS + COLLAB_LEADERSHIP_GOOD_KEYWORDS)
        phase_issue_hits = collaboration_project_issue_hits("\n".join([phase_text["retro"], phase_text["checkin"]]), NEGATIVE_COLLAB_KEYWORDS + COLLAB_LEADERSHIP_BAD_KEYWORDS)
        if phase_retros:
            phase_raw = bounded_metric(
                1.0
                + (phase_on_time_rate * 1.3)
                + min(0.9, phase_retro_hits * 0.16)
                + min(0.6, phase_checkin_hits * 0.08)
                + min(0.4, len(phase_retros) * 0.15)
                - min(0.8, phase_issue_hits * 0.12)
            )
        else:
            phase_raw = bounded_metric(
                1.0
                + (phase_on_time_rate * 1.8)
                + min(0.9, phase_checkin_hits * 0.12)
                + min(0.3, len(phase_checkins) * 0.02)
                - min(0.8, phase_issue_hits * 0.12)
            )
        phase_feedback = [
            item
            for item in peer_feedback
            if item.get("sourcePhase") == phase or phase in item.get("sharedPhases", [])
        ]
        phase_peer_positive_weight = weighted_peer_count(phase_feedback, {"praise", "want"}, same_project_only=True)
        phase_peer_risk_weight = weighted_peer_count(phase_feedback, {"complaint", "avoid"}, same_project_only=True)
        phase_raw = bounded_metric(
            phase_raw
            + min(0.35, phase_peer_positive_weight * 0.08)
            - min(0.55, phase_peer_risk_weight * 0.12)
        )
        phase_scores.append(
            {
                "phase": phase,
                "score": round((phase_raw / 4) * 100, 2),
                "checkinCount": len(phase_checkins),
                "lateCheckinCount": sum(1 for item in phase_checkins if not item.get("onTime")),
                "retroCount": len(phase_retros),
                "sameProjectPeerPositiveWeight": phase_peer_positive_weight,
                "sameProjectPeerRiskWeight": phase_peer_risk_weight,
            }
        )
    early_score = phase_scores[0]["score"] if phase_scores else readiness_score
    current_score = phase_scores[-1]["score"] if phase_scores else readiness_score
    trajectory_delta = round(current_score - early_score, 2)
    if trajectory_delta >= 8:
        trajectory_label = "개선"
    elif trajectory_delta <= -8:
        trajectory_label = "하락"
    else:
        trajectory_label = "유지"

    return {
        "peerPraiseCount": peer_praise_count,
        "peerAvoidCount": peer_avoid_count,
        "peerComplaintCount": peer_complaint_count,
        "peerPraiseWeight": peer_praise_weight,
        "peerWantWeight": peer_want_weight,
        "peerPositiveWeight": peer_positive_weight,
        "peerAvoidWeight": peer_avoid_weight,
        "peerComplaintWeight": peer_complaint_weight,
        "sameProjectPeerPositiveWeight": same_project_peer_positive_weight,
        "sameProjectPeerAvoidWeight": same_project_peer_avoid_weight,
        "sameProjectPeerComplaintWeight": same_project_peer_complaint_weight,
        "leadershipPeerPositiveWeight": leadership_peer_positive_weight,
        "leadershipPeerRiskWeight": leadership_peer_risk_weight,
        "peerPositiveBonus": round(peer_positive_bonus, 2),
        "peerRiskPenalty": round(peer_risk_penalty, 2),
        "leadershipPeerBonus": round(leadership_peer_bonus, 2),
        "leadershipPeerPenalty": round(leadership_peer_penalty, 2),
        "leadershipRoleCount": leader_count,
        "teamPeerFeedback": [
            {
                "from": item.get("from", ""),
                "type": item.get("type", ""),
                "sourceDomain": item.get("sourceDomain", ""),
                "sourcePhase": item.get("sourcePhase", ""),
                "sharedTeams": item.get("sharedTeams", []),
                "sourceRoles": item.get("sourceRoles", []),
                "targetRoles": item.get("targetRoles", []),
                "weight": item.get("weight", 1.0),
                "snippet": item.get("snippet", ""),
            }
            for item in peer_feedback
            if item.get("sameProject")
        ][:8],
        "relationshipPreferenceNote": "선호/비선호 언급은 기본적으로 관계 선호 참고값이지만, 같은 프로젝트 팀원의 체크인·회고·상담 근거와 PM/팀장 수행 맥락은 협업 점수에 별도 가중합니다.",
        "checkinConsistency": checkin_consistency,
        "checkinCount": len(dated_checkins),
        "checkinOnTimeRate": round(on_time_rate * 100, 1),
        "lateCheckinCount": len(delayed_checkins),
        "retroQuality": retro_quality,
        "retroCount": retro_count,
        "roleExecution": role_execution,
        "leadershipPractice": leadership_practice,
        "projectIssueCount": project_issue_hits,
        "punctuality": 4.0 if late_count == 0 else bounded_metric(3.0 - min(2.0, late_count * 0.35)),
        "peopleSeriousness": bounded_metric(1.0 + min(1.4, unique_keyword_hits(text["base"], COLLAB_SERIOUSNESS_KEYWORDS) * 0.12)),
        "riskSignal": bounded_metric((project_issue_hits * 0.12) + peer_risk_penalty + leadership_peer_penalty),
        "collaborationReadinessScore": readiness_score,
        "profileScore": profile_score,
        "lateCount": late_count,
        "trajectory": {
            "earlyScore": early_score,
            "currentScore": current_score,
            "delta": trajectory_delta,
            "label": trajectory_label,
            "phaseScores": phase_scores,
        },
    }


def add_peer_feedback_mentions(students: list[dict[str, Any]]) -> None:
    names = [student["name"] for student in students if student.get("name")]
    by_name = {student["name"]: student for student in students if student.get("name")}

    for student in students:
        student["peerFeedback"] = []

    for source in students:
        source_segments: list[dict[str, str]] = []

        def add_segment(domain: str, text: str, phase: str = "", date_value: str = "") -> None:
            if not clean_text(text):
                return
            source_segments.append(
                {
                    "domain": domain,
                    "text": text,
                    "phase": phase,
                    "date": date_value,
                }
            )

        add_segment("cadetCard", source.get("cadetCard", {}).get("fullText", ""))
        add_segment("staffProfile", source.get("staffProfile", {}).get("fullText", ""))
        for item in source.get("counselings", []):
            add_segment("counseling", item.get("content", ""), item.get("phase", ""), item.get("date", ""))
        for item in source.get("retrospectives", []):
            add_segment("retro", item.get("detail", ""), item.get("phase", ""), item.get("date", ""))
        for item in source.get("checkins", []):
            add_segment(
                "checkin",
                "\n".join([item.get("workText", ""), item.get("noteText", "")]),
                item.get("phase", ""),
                item.get("date", ""),
            )
        if not source_segments:
            continue

        seen_mentions: set[tuple[str, str, str, str, str, str]] = set()
        for target_name in names:
            if target_name == source.get("name"):
                continue
            target = by_name[target_name]
            for segment in source_segments:
                for window in text_windows_for_name(segment["text"], target_name):
                    feedback_type = ""
                    if unique_keyword_hits(window, COLLAB_AVOID_KEYWORDS):
                        feedback_type = "avoid"
                    elif collaboration_complaint_hits(window):
                        feedback_type = "complaint"
                    elif unique_keyword_hits(window, COLLAB_WANT_KEYWORDS):
                        feedback_type = "want"
                    elif unique_keyword_hits(window, COLLAB_PEER_PRAISE_KEYWORDS):
                        feedback_type = "praise"
                    if not feedback_type:
                        continue
                    snippet = short_text(window, 180)
                    dedupe_key = (
                        target_name,
                        source.get("name", ""),
                        feedback_type,
                        segment["domain"],
                        segment["phase"],
                        snippet,
                    )
                    if dedupe_key in seen_mentions:
                        continue
                    seen_mentions.add(dedupe_key)
                    context = shared_project_context(source, target_name, segment["phase"], target)
                    weight = peer_feedback_weight(feedback_type, segment["domain"], context["sameProject"])
                    target["peerFeedback"].append(
                        {
                            "from": source.get("name", ""),
                            "type": feedback_type,
                            "snippet": snippet,
                            "sourceDomain": segment["domain"],
                            "sourcePhase": segment["phase"],
                            "sourceDate": segment["date"],
                            "sameProject": context["sameProject"],
                            "sharedPhases": context["sharedPhases"],
                            "sharedTeams": context["sharedTeams"],
                            "sourceRoles": context["sourceRoles"],
                            "targetRoles": context["targetRoles"],
                            "weight": weight,
                        }
                    )


def project_checkin_delay_hours(checkin: dict[str, Any]) -> float:
    assigned_date = parse_date(checkin.get("date"))
    submitted_at = parse_datetime(checkin.get("submittedAt"))
    if not assigned_date or not submitted_at:
        return 0.0
    due_at = datetime.combine(assigned_date + timedelta(days=1), time(9, 0))
    delay = (submitted_at - due_at).total_seconds() / 3600
    return round(max(0.0, delay), 1)


def max_events_in_window(events: list[dict[str, Any]], days: int) -> int:
    dates = sorted(parse_date(event.get("date")) for event in events if parse_date(event.get("date")))
    if not dates:
        return 0
    best = 1
    for index, start_date in enumerate(dates):
        count = sum(1 for item in dates[index:] if (item - start_date).days <= days)
        best = max(best, count)
    return best


def min_gap_days(events: list[dict[str, Any]]) -> int | None:
    dates = sorted(parse_date(event.get("date")) for event in events if parse_date(event.get("date")))
    if len(dates) < 2:
        return None
    gaps = [(right - left).days for left, right in zip(dates, dates[1:])]
    return min(gaps) if gaps else None


def latest_observed_date(student: dict[str, Any]) -> date | None:
    dates: list[date] = []
    for event in student.get("timelineEvents", []):
        parsed = parse_date(event.get("date"))
        if parsed:
            dates.append(parsed)
    for checkin in student.get("checkins", []):
        parsed = parse_date(checkin.get("date"))
        if parsed:
            dates.append(parsed)
    for retro in student.get("retrospectives", []):
        parsed = parse_date(retro.get("date"))
        if parsed:
            dates.append(parsed)
    return max(dates) if dates else None


def career_text_for_student(student: dict[str, Any]) -> str:
    admission = student.get("admission", {})
    career_rounds = student.get("careerDocuments", {}).get("rounds", [])
    return "\n".join(
        [
            admission.get("intro", ""),
            admission.get("motivation", ""),
            admission.get("career", ""),
            admission.get("goal", ""),
            student.get("cadetCard", {}).get("fullText", ""),
            student.get("staffProfile", {}).get("fullText", ""),
            "\n".join(
                "\n".join(
                    filter(
                        None,
                        [
                            round_item.get("documents", {}).get("selfIntroduction", ""),
                            round_item.get("documents", {}).get("resume", ""),
                            round_item.get("feedback", ""),
                        ],
                    )
                )
                for round_item in career_rounds
            ),
        ]
    )


def add_learning_flow_case(
    student: dict[str, Any],
    cases: list[dict[str, Any]],
    case_type: str,
    severity: str,
    summary: str,
    evidence: list[str],
    dates: list[str],
) -> None:
    meta = LEARNING_FLOW_CASE_META[case_type]
    parsed_dates = sorted(parse_date(item) for item in dates if parse_date(item))
    case_index = len(cases) + 1
    cases.append(
        {
            "caseId": f"{student['id']}-flow-{case_index}",
            "caseType": case_type,
            "label": meta["label"],
            "description": meta["description"],
            "severity": severity,
            "summary": summary,
            "evidence": evidence[:5],
            "startDate": parsed_dates[0].isoformat() if parsed_dates else "",
            "endDate": parsed_dates[-1].isoformat() if parsed_dates else "",
        }
    )


def analyze_learning_flow_cases(student: dict[str, Any]) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    attendance_events = student.get("attendanceEvents", [])
    health_events = [event for event in attendance_events if event.get("category") == "health"]
    condition_events = [
        event for event in attendance_events if event.get("category") in {"health", "condition"}
    ]
    oversleep_late_events = [
        event for event in attendance_events if event.get("category") == "condition" and event.get("kind") == "지각"
    ]
    risk_events = [event for event in attendance_events if event.get("impact") == "behavioral"]
    checkins = student.get("checkins", [])
    late_checkins = [item for item in checkins if not item.get("onTime") and parse_date(item.get("date"))]
    delayed_checkins = [item for item in late_checkins if project_checkin_delay_hours(item) > 0]
    project_rate = student.get("stats", {}).get("projectSubmissionRate", 0)

    if len(health_events) >= 3:
        clustered_count = max_events_in_window(health_events, 21)
        add_learning_flow_case(
            student,
            cases,
            "health_management_watch",
            "warning" if len(health_events) >= 5 or clustered_count >= 3 else "caution",
            f"건강형 출결 {len(health_events)}건이 확인되어 건강 관리 흐름을 따로 봐야 합니다.",
            [f"{event.get('date')}: {event.get('detail')}" for event in health_events],
            [event.get("date", "") for event in health_events],
        )

    if oversleep_late_events:
        latest_context_date = latest_observed_date(student)
        latest_oversleep_date = max(
            (parse_date(event.get("date")) for event in oversleep_late_events if parse_date(event.get("date"))),
            default=None,
        )
        clustered_count = max_events_in_window(oversleep_late_events, 14)
        min_gap = min_gap_days(oversleep_late_events)
        is_recent = bool(
            latest_context_date
            and latest_oversleep_date
            and (latest_context_date - latest_oversleep_date).days <= 21
        )
        if len(oversleep_late_events) >= 2 and (is_recent or clustered_count >= 2):
            add_learning_flow_case(
                student,
                cases,
                "oversleep_condition_rhythm",
                "warning" if is_recent and clustered_count >= 2 else "caution",
                "늦잠 지각이 최근 짧은 주기로 반복되어 건강/컨디션 관리 흐름을 확인해야 합니다.",
                [
                    f"늦잠 지각 {len(oversleep_late_events)}건",
                    f"14일 내 최대 {clustered_count}건",
                    f"최소 발생 간격 {min_gap if min_gap is not None else '-'}일",
                    f"최근 발생일 {latest_oversleep_date.isoformat() if latest_oversleep_date else '-'}",
                ],
                [event.get("date", "") for event in oversleep_late_events],
            )

    sequence_evidence = []
    sequence_dates = []
    attendance_by_date: dict[date, list[dict[str, Any]]] = defaultdict(list)
    for event in attendance_events:
        event_date = parse_date(event.get("date"))
        if event_date:
            attendance_by_date[event_date].append(event)
    for checkin in delayed_checkins:
        checkin_date = parse_date(checkin.get("date"))
        if not checkin_date:
            continue
        next_day = checkin_date + timedelta(days=1)
        next_events = [
            event
            for event in attendance_by_date.get(next_day, [])
            if event.get("kind") == "지각" or event.get("category") in {"health", "condition"}
        ]
        for event in next_events:
            sequence_evidence.append(
                f"{checkin.get('phase')} {checkin.get('date')} 체크인 {project_checkin_delay_hours(checkin)}시간 지연 -> {event.get('date')} {event.get('detail')}"
            )
            sequence_dates.extend([checkin.get("date", ""), event.get("date", "")])
    if sequence_evidence:
        add_learning_flow_case(
            student,
            cases,
            "condition_management_sequence",
            "warning" if len(sequence_evidence) >= 2 else "caution",
            "데일리체크인 지연 뒤 다음 날 지각/병가가 이어져 컨디션 관리 능력을 확인해야 합니다.",
            sequence_evidence,
            sequence_dates,
        )

    if len(condition_events) >= 2 and (len(delayed_checkins) >= 2 or project_rate < 80):
        add_learning_flow_case(
            student,
            cases,
            "health_project_strain",
            "caution",
            "건강형 출결과 프로젝트 제출/체크인 흔들림이 함께 보여 학습 부담 조절이 필요합니다.",
            [
                f"건강/컨디션형 출결 {len(condition_events)}건",
                f"지연 체크인 {len(delayed_checkins)}건",
                f"프로젝트 제출률 {project_rate}%",
            ],
            [event.get("date", "") for event in condition_events] + [item.get("date", "") for item in delayed_checkins],
        )

    if len(delayed_checkins) >= 3 and project_rate < 90:
        add_learning_flow_case(
            student,
            cases,
            "daily_checkin_pattern",
            "caution",
            "데일리체크인 지연이 반복되고 제출 흐름도 완전하지 않아 일정 관리 리듬을 봐야 합니다.",
            [
                f"지연 체크인 {len(delayed_checkins)}건",
                f"프로젝트 제출률 {project_rate}%",
                *[
                    f"{item.get('phase')} {item.get('date')} {project_checkin_delay_hours(item)}시간 지연"
                    for item in delayed_checkins[:3]
                ],
            ],
            [item.get("date", "") for item in delayed_checkins],
        )

    collaboration_readiness = score_collaboration_readiness(student)
    complaint_feedback = [
        item for item in student.get("peerFeedback", []) if item.get("type") == "complaint"
    ]
    if collaboration_readiness["peerComplaintCount"] > 0:
        add_learning_flow_case(
            student,
            cases,
            "collaboration_conflict_signal",
            "warning" if collaboration_readiness["peerComplaintCount"] >= 2 else "caution",
            "프로젝트 진행 중 타 학생의 불만/갈등 언급이 확인되어 협업 맥락을 확인해야 합니다.",
            [
                f"타 학생 불만/갈등 언급 {collaboration_readiness['peerComplaintCount']}건",
                f"프로젝트 이슈 키워드 {collaboration_readiness['projectIssueCount']}건",
                *[
                    f"{item.get('from', '미상')} 언급: {item.get('snippet', '')}"
                    for item in complaint_feedback[:3]
                ],
            ],
            [],
        )

    milestones = [item for item in student.get("milestones", []) if item.get("profileAverage") is not None]
    growth_delta = (
        round(milestones[-1]["profileAverage"] - milestones[0]["profileAverage"], 2)
        if len(milestones) >= 2
        else 0
    )
    positive_growth_steps = sum(1 for item in milestones if (item.get("growthDelta") or 0) > 0)
    has_prior_risk_signal = bool(risk_events) or project_rate < 90 or student.get("stats", {}).get("currentStatus") != "안정"
    if student.get("counselings") and has_prior_risk_signal and growth_delta >= 0.75 and positive_growth_steps >= 2:
        add_learning_flow_case(
            student,
            cases,
            "counseling_recovery",
            "success",
            "면담 기록 이후 성장 곡선이 회복되어 개입 반응이 긍정적으로 보입니다.",
            [
                f"면담 {len(student.get('counselings', []))}건",
                f"초기 대비 성장 {growth_delta:+.2f}",
                f"성장 구간 {positive_growth_steps}개",
            ],
            [item.get("date", "") for item in student.get("counselings", [])],
        )

    if len(student.get("retrospectives", [])) >= 2 and student.get("currentProfile", {}).get("reflection", 0) >= 3 and growth_delta >= 0.75 and positive_growth_steps >= 2:
        add_learning_flow_case(
            student,
            cases,
            "reflection_growth_link",
            "success",
            "회고 기록과 성장 지표가 함께 올라가 회고가 학습 개선으로 연결된 케이스입니다.",
            [
                f"회고 {len(student.get('retrospectives', []))}건",
                f"성찰 점수 {student.get('currentProfile', {}).get('reflection', 0)}/4",
                f"초기 대비 성장 {growth_delta:+.2f}",
            ],
            [item.get("date", "") for item in student.get("retrospectives", [])],
        )

    career_rounds = student.get("careerDocuments", {}).get("rounds", [])
    career_readiness = score_career_readiness(career_text_for_student(student), career_rounds)
    if (
        len(career_rounds) >= 2
        and career_readiness["careerReadinessScore"] >= 62
        and career_readiness["hasRevisionHistory"]
        and career_readiness["hasConcreteGoal"]
    ):
        add_learning_flow_case(
            student,
            cases,
            "career_revision_progress",
            "success",
            "진로 문서 수정 이력과 진로 준비도가 함께 확인됩니다.",
            [
                f"진로 문서 라운드 {len(career_rounds)}회",
                f"진로 준비 점수 {career_readiness['careerReadinessScore']}",
                f"자기소개 수정 이력 {'있음' if career_readiness['hasRevisionHistory'] else '없음'}",
            ],
            [item.get("date", "") for item in career_rounds],
        )

    return sorted(cases, key=lambda item: (severity_rank(item["severity"]), item.get("startDate", "")), reverse=True)


def build_learning_case_library(students: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for student in students:
        for case in student.get("learningFlowCases", []):
            grouped[case["caseType"]].append({"studentName": student["name"], **case})

    library = []
    for case_type, cases in grouped.items():
        meta = LEARNING_FLOW_CASE_META[case_type]
        severity_counts = Counter(case["severity"] for case in cases)
        library.append(
            {
                "caseType": case_type,
                "label": meta["label"],
                "description": meta["description"],
                "count": len(cases),
                "severityCounts": dict(severity_counts),
                "examples": [
                    {
                        "studentName": case["studentName"],
                        "summary": case["summary"],
                        "severity": case["severity"],
                    }
                    for case in cases[:5]
                ],
            }
        )
    return sorted(library, key=lambda item: item["count"], reverse=True)


def find_header_indexes(headers: list[Any], mapping: dict[str, list[str]]) -> dict[str, int]:
    resolved: dict[str, int] = {}
    cleaned = [compact_text(header) for header in headers]
    for field, keywords in mapping.items():
        resolved[field] = -1
        for idx, header in enumerate(cleaned):
            if any(keyword in header for keyword in keywords):
                resolved[field] = idx
                break
    return resolved


def workbook_by_index(index: int):
    files = sorted(
        [
            path
            for path in DATA_DIR.iterdir()
            if path.suffix.lower() == ".xlsx" and not path.name.startswith("~$")
        ]
    )
    return load_workbook(files[index], read_only=True, data_only=True)


@dataclass
class CurriculumWeek:
    week_index: int
    start_date: date
    end_date: date
    label: str
    sessions: list[dict[str, Any]]
    dominant_subject: str
    highlights: list[str]


def build_students() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    wb = workbook_by_index(8)
    ws = wb.worksheets[0]
    students: list[dict[str, Any]] = []
    by_name: dict[str, dict[str, Any]] = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        name = clean_text(row[0])
        phone = clean_text(row[1])
        has_student_details = any(clean_text(value) for value in row[1:9])
        if not name:
            continue
        if not has_student_details:
            continue
        student = {
            "id": slugify_name(name),
            "name": name,
            "nameKey": normalize_name(name),
            "phone": phone,
            "gender": clean_text(row[2]),
            "birthDate": parse_date(row[3]).isoformat() if parse_date(row[3]) else "",
            "education": clean_text(row[4]),
            "experience": clean_text(row[5]),
            "address": clean_text(row[6]),
            "specialNote": clean_text(row[7]),
            "attendanceMemo": clean_text(row[8]),
            "cohort": "기획4기",
            "course": "게임 기획 부트캠프",
            "admission": {},
            "timelineEvents": [],
            "checkins": [],
            "retrospectives": [],
            "counselings": [],
            "attendanceEvents": [],
            "projectTeamHistory": [],
            "peerRelationships": [],
            "peerFeedback": [],
            "learningFlowCases": [],
            "morningPresentations": [],
            "practiceSubmissions": [],
            "careerGuidance": {},
            "strengthProfile": {},
            "studentGroupSignals": [],
            "careerDocuments": {"rounds": [], "summary": {}},
            "staffProfile": {},
            "cadetCard": {},
            "managementStatus": "일반",
            "dropoutInfo": {},
            "evaluationSnapshots": [],
            "statusPeriods": [],
        }
        students.append(student)
        by_name[student["nameKey"]] = student
    return students, by_name


def build_curriculum() -> tuple[dict[str, Any], list[CurriculumWeek]]:
    wb = workbook_by_index(6)
    ws = wb.worksheets[1]
    start = None
    end = None
    sessions: list[dict[str, Any]] = []
    for row_index, row in enumerate(ws.iter_rows(values_only=True), start=1):
        values = list(row)
        if row_index == 2:
            start = parse_date(values[2])
        elif row_index == 3:
            end = parse_date(values[2])
        elif row_index >= 6:
            session_date = parse_date(values[2])
            subject = clean_text(values[4])
            title = clean_text(values[7])
            if not session_date or (not subject and not title):
                continue
            sessions.append(
                {
                    "date": session_date.isoformat(),
                    "subject": subject,
                    "lessonTitle": title,
                }
            )

    if not start or not end:
        raise RuntimeError("수업 시간표에서 개강일/종강일을 찾지 못했습니다.")

    weeks: list[CurriculumWeek] = []
    week_index = 1
    cursor = start
    while cursor <= end:
        week_end = min(cursor + timedelta(days=6), end)
        week_sessions = [
            session
            for session in sessions
            if cursor <= parse_date(session["date"]) <= week_end
        ]
        subjects = [session["subject"] for session in week_sessions if session["subject"]]
        dominant_subject = Counter(subjects).most_common(1)[0][0] if subjects else "운영 주간"
        highlight_candidates = []
        seen = set()
        for session in week_sessions:
            lesson_title = session["lessonTitle"]
            if lesson_title and lesson_title not in seen:
                highlight_candidates.append(lesson_title)
                seen.add(lesson_title)
            if len(highlight_candidates) == 3:
                break
        label = f"W{week_index:02d}"
        weeks.append(
            CurriculumWeek(
                week_index=week_index,
                start_date=cursor,
                end_date=week_end,
                label=label,
                sessions=week_sessions,
                dominant_subject=dominant_subject,
                highlights=highlight_candidates,
            )
        )
        cursor = week_end + timedelta(days=1)
        week_index += 1

    curriculum = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "sessions": sessions,
        "weeks": [
            {
                "weekIndex": week.week_index,
                "label": week.label,
                "startDate": week.start_date.isoformat(),
                "endDate": week.end_date.isoformat(),
                "dominantSubject": week.dominant_subject,
                "highlights": week.highlights,
                "sessions": week.sessions,
            }
            for week in weeks
        ],
    }
    return curriculum, weeks


def week_for_date(target: date, weeks: list[CurriculumWeek]) -> int:
    for week in weeks:
        if week.start_date <= target <= week.end_date:
            return week.week_index
    if target < weeks[0].start_date:
        return 0
    return weeks[-1].week_index


def add_admission_data(students_by_name: dict[str, dict[str, Any]], course_start: date, weeks: list[CurriculumWeek]) -> None:
    wb = workbook_by_index(5)
    raw_ws = wb.worksheets[0]
    headers = [cell for cell in next(raw_ws.iter_rows(min_row=1, max_row=1, values_only=True))]
    columns = find_header_indexes(
        headers,
        {
            "timestamp": ["타임스탬프", "wnwo"],
            "email": ["이메일"],
            "name": ["이름"],
            "intro": ["1분 자기소개"],
            "motivation": ["신청한 이유", "참여를 신청한 이유"],
            "experience": ["학습 및 업무 경험", "업무 경험"],
            "career": ["취업 분야"],
            "goal": ["수료 후 자신의 목표"],
            "cameraMic": ["캠 + 마이크"],
            "healthIssue": ["본인이 앓고 있는 지병", "지병 혹은 질환이 있나요"],
            "healthIssueDetail": ["지병 혹은 질환이 있다면"],
            "conflict": ["갈등"],
            "failure": ["실수나 실패"],
            "peer": ["타인의 부족한 부분"],
            "financialHardship": ["참여에 영향을 줄 경제적인 어려움", "경제적인 어려움"],
            "financialHardshipDetail": ["어려움이 있다면 어떤 상황"],
            "industryConnection": ["게임 업계 관련 종사자"],
            "referral": ["추천을 받았다면"],
            "concern": ["걱정되는 부분"],
        },
    )

    for row in raw_ws.iter_rows(min_row=2, values_only=True):
        name = clean_text(row[columns["name"]]) if columns["name"] >= 0 else ""
        student = students_by_name.get(normalize_name(name))
        if not student:
            continue
        submitted_at = parse_datetime(row[columns["timestamp"]]) if columns["timestamp"] >= 0 else None
        student["admission"] = {
            "submittedAt": submitted_at.isoformat() if submitted_at else "",
            "email": clean_text(row[columns["email"]]) if columns["email"] >= 0 else "",
            "intro": clean_text(row[columns["intro"]]) if columns["intro"] >= 0 else "",
            "motivation": clean_text(row[columns["motivation"]]) if columns["motivation"] >= 0 else "",
            "experience": clean_text(row[columns["experience"]]) if columns["experience"] >= 0 else "",
            "career": clean_text(row[columns["career"]]) if columns["career"] >= 0 else "",
            "goal": clean_text(row[columns["goal"]]) if columns["goal"] >= 0 else "",
            "cameraMic": clean_text(row[columns["cameraMic"]]) if columns["cameraMic"] >= 0 else "",
            "healthIssue": clean_text(row[columns["healthIssue"]]) if columns["healthIssue"] >= 0 else "",
            "healthIssueDetail": clean_text(row[columns["healthIssueDetail"]]) if columns["healthIssueDetail"] >= 0 else "",
            "conflict": clean_text(row[columns["conflict"]]) if columns["conflict"] >= 0 else "",
            "failure": clean_text(row[columns["failure"]]) if columns["failure"] >= 0 else "",
            "peer": clean_text(row[columns["peer"]]) if columns["peer"] >= 0 else "",
            "financialHardship": clean_text(row[columns["financialHardship"]]) if columns["financialHardship"] >= 0 else "",
            "financialHardshipDetail": clean_text(row[columns["financialHardshipDetail"]]) if columns["financialHardshipDetail"] >= 0 else "",
            "industryConnection": clean_text(row[columns["industryConnection"]]) if columns["industryConnection"] >= 0 else "",
            "referral": clean_text(row[columns["referral"]]) if columns["referral"] >= 0 else "",
            "concern": clean_text(row[columns["concern"]]) if columns["concern"] >= 0 else "",
        }
        if submitted_at:
            student["timelineEvents"].append(
                {
                    "id": f"admission-{student['id']}",
                    "date": submitted_at.date().isoformat(),
                    "endDate": "",
                    "type": "admission",
                    "severity": "info",
                    "title": "지원서 제출",
                    "summary": short_text(student["admission"]["motivation"] or student["admission"]["intro"]),
                    "detail": student["admission"]["intro"] or student["admission"]["motivation"],
                    "projectPhase": "",
                    "sourceLabel": "모집 결과.xlsx",
                    "relatedWeek": week_for_date(submitted_at.date(), weeks),
                    "isEstimated": False,
                }
            )

    result_ws = wb.worksheets[2]
    for row in result_ws.iter_rows(min_row=11, values_only=True):
        name = clean_text(row[2])
        if not name:
            continue
        student = students_by_name.get(normalize_name(name))
        if not student:
            continue
        estimated_result_date = course_start - timedelta(days=1)
        result = clean_text(row[12])
        score = row[11] if row[11] is not None else ""
        total_comment = clean_text(row[17])
        student["admission"].update(
            {
                "interviewScore": score,
                "interviewResult": result,
                "interviewSummary": total_comment,
            }
        )
        student["timelineEvents"].append(
            {
                "id": f"admission-result-{student['id']}",
                "date": estimated_result_date.isoformat(),
                "endDate": "",
                "type": "admission",
                "severity": "success" if "합격" in result else "caution",
                "title": "최종 선발 결과",
                "summary": f"{result or '결과 확인 필요'} · 면접 점수 {score}",
                "detail": total_comment,
                "projectPhase": "",
                "sourceLabel": "모집 결과.xlsx",
                "relatedWeek": 0,
                "isEstimated": True,
            }
        )


def add_staff_student_info(students_by_name: dict[str, dict[str, Any]], weeks: list[CurriculumWeek]) -> None:
    base_dir = DATA_DIR / "학생 정보"
    if not base_dir.exists():
        return

    for path in sorted(base_dir.glob("*.html")):
        raw_html = path.read_text(encoding="utf-8", errors="ignore")
        title = page_title_from_html(raw_html, path.stem)
        student = match_student_from_text(f"{title} {path.stem}", students_by_name)
        if not student:
            continue

        properties = parse_notion_properties(raw_html)
        full_text = html_file_text(path)
        sections = split_notion_sections(full_text)
        staff_profile = {
            "sourceFile": str(path.relative_to(DATA_DIR)).replace("\\", "/"),
            "title": title,
            "properties": properties,
            "summary": properties.get("한줄평", ""),
            "traits": [item for item in re.split(r"\s+", properties.get("특징", "")) if item],
            "positiveRelations": [item for item in re.split(r"\s+", properties.get("긍정적관계", "")) if item],
            "negativeRelations": [item for item in re.split(r"\s+", properties.get("부정적관계", "")) if item],
            "sections": sections,
            "fullText": full_text,
        }
        student["staffProfile"] = staff_profile
        if properties.get("한줄평") and not student.get("specialNote"):
            student["specialNote"] = properties["한줄평"]

        detail = "\n\n".join(
            filter(
                None,
                [
                    f"한줄평\n{staff_profile['summary']}" if staff_profile["summary"] else "",
                    f"총평\n{sections.get('총평', '')}" if sections.get("총평") else "",
                    f"Good\n{sections.get('Good', '')}" if sections.get("Good") else "",
                    f"Bad\n{sections.get('Bad', '')}" if sections.get("Bad") else "",
                ],
            )
        )
        student["timelineEvents"].append(
            {
                "id": f"staff-profile-{student['id']}",
                "date": "",
                "endDate": "",
                "type": "staff_profile",
                "severity": "info",
                "title": "운영진 학생 정보 기록",
                "summary": short_text(staff_profile["summary"] or sections.get("총평", "") or "운영진 학생 정보가 기록되었습니다."),
                "detail": detail or full_text,
                "projectPhase": "",
                "sourceLabel": "학생 정보",
                "relatedWeek": 0,
                "isEstimated": False,
            }
        )

    for csv_path in sorted(base_dir.glob("이탈자 LIST*.csv")):
        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                student = students_by_name.get(normalize_name(row.get("이름", "")))
                if not student:
                    continue
                dropout_date = parse_date(row.get("이탈 일자"))
                student["managementStatus"] = "이탈"
                student["dropoutInfo"] = {
                    "sourceFile": str(csv_path.relative_to(DATA_DIR)).replace("\\", "/"),
                    "type": clean_text(row.get("유형")),
                    "reason": clean_text(row.get("이탈 사유")),
                    "date": dropout_date.isoformat() if dropout_date else clean_text(row.get("이탈 일자")),
                    "attendanceDays": clean_text(row.get("출석 일수")),
                    "joinedAt": clean_text(row.get("합류 일자")),
                    "note": clean_text(row.get("기타")),
                    "traits": clean_text(row.get("특징")),
                    "gamePreference": clean_text(row.get("게임 선호")),
                }
                student["timelineEvents"].append(
                    {
                        "id": f"dropout-{student['id']}",
                        "date": student["dropoutInfo"]["date"],
                        "endDate": "",
                        "type": "management_status",
                        "severity": "caution",
                        "title": "과정이탈 기록",
                        "summary": short_text(student["dropoutInfo"]["reason"] or student["dropoutInfo"]["type"] or "과정이탈 기록"),
                        "detail": "\n".join(
                            filter(
                                None,
                                [
                                    f"유형: {student['dropoutInfo']['type']}",
                                    f"사유: {student['dropoutInfo']['reason']}",
                                    f"기타: {student['dropoutInfo']['note']}",
                                ],
                            )
                        ),
                        "projectPhase": "",
                        "sourceLabel": "학생 정보 이탈자 LIST",
                        "relatedWeek": week_for_date(dropout_date, weeks) if dropout_date else 0,
                        "isEstimated": False,
                    }
                )


def add_cadet_card_data(students_by_name: dict[str, dict[str, Any]], weeks: list[CurriculumWeek]) -> None:
    base_dir = DATA_DIR / "학생 대원카드"
    if not base_dir.exists():
        return

    csv_rows: dict[str, dict[str, str]] = {}
    for csv_path in sorted(base_dir.glob("*.csv")):
        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                student = match_student_from_text(row.get("이름", ""), students_by_name)
                if student:
                    csv_rows[student["nameKey"]] = {
                        "sourceFile": str(csv_path.relative_to(DATA_DIR)).replace("\\", "/"),
                        "status": clean_text(row.get("상태")),
                        "hobbies": clean_text(row.get("취미")),
                    }

    for path in sorted(base_dir.glob("*.html")):
        raw_html = path.read_text(encoding="utf-8", errors="ignore")
        title = page_title_from_html(raw_html, path.stem)
        student = match_student_from_text(f"{title} {path.stem}", students_by_name)
        if not student:
            continue

        properties = parse_notion_properties(raw_html)
        full_text = html_file_text(path)
        sections = split_notion_sections(full_text)
        csv_meta = csv_rows.get(student["nameKey"], {})
        motivation = sections.get("과정을 들어오게 된 계기와 포부", "")
        intro = sections.get("간단한 자기소개", "")
        strengths = sections.get("나의 강점과 약점", "")
        goal = sections.get("과정에서 이루고 싶은 목표", "")
        interests = sections.get("관심 있는 기술 스택 / 배우고 싶은 분야", "")
        cadet_card = {
            "sourceFile": str(path.relative_to(DATA_DIR)).replace("\\", "/"),
            "title": title,
            "status": properties.get("상태", "") or csv_meta.get("status", ""),
            "hobbies": properties.get("취미", "") or csv_meta.get("hobbies", ""),
            "motto": sections.get("본문", ""),
            "motivation": motivation,
            "intro": intro,
            "strengthsAndWeaknesses": strengths,
            "interests": interests,
            "goal": goal,
            "stressRelief": sections.get("스트레스 해소 방법", ""),
            "tmi": sections.get("TMI", ""),
            "futureSelf": sections.get("과정 수료 후 나의 모습 상상", ""),
            "sections": sections,
            "fullText": full_text,
        }
        student["cadetCard"] = cadet_card
        if motivation and not student["admission"].get("motivation"):
            student["admission"]["motivation"] = motivation
        if intro and not student["admission"].get("intro"):
            student["admission"]["intro"] = intro
        if goal and not student["admission"].get("goal"):
            student["admission"]["goal"] = goal
        if interests and not student["admission"].get("career"):
            student["admission"]["career"] = interests

        detail = "\n\n".join(
            filter(
                None,
                [
                    f"자기소개\n{intro}" if intro else "",
                    f"지원 계기와 포부\n{motivation}" if motivation else "",
                    f"강점과 약점\n{strengths}" if strengths else "",
                    f"관심 분야\n{interests}" if interests else "",
                    f"과정 목표\n{goal}" if goal else "",
                ],
            )
        )
        student["timelineEvents"].append(
            {
                "id": f"cadet-card-{student['id']}",
                "date": "",
                "endDate": "",
                "type": "admission",
                "severity": "info",
                "title": "대원카드 자기소개",
                "summary": short_text(motivation or intro or "대원카드가 작성되었습니다."),
                "detail": detail or full_text,
                "projectPhase": "",
                "sourceLabel": "학생 대원카드",
                "relatedWeek": 0,
                "isEstimated": False,
            }
        )


def collect_project_date_sheet(workbook) -> list[date]:
    for sheet in workbook.worksheets:
        if "Date" == sheet.title:
            values = []
            for row in sheet.iter_rows(values_only=True):
                parsed = parse_date(row[0] if row else None)
                if parsed:
                    values.append(parsed)
            return sorted(set(values))
    return []


def build_project_phase_anchor_dates(
    phase_dates: dict[str, list[date]],
    extra_phases: list[str],
) -> dict[str, date]:
    anchors = {
        phase: min(dates)
        for phase, dates in phase_dates.items()
        if dates
    }
    ordered_phases = sorted(
        {phase for phase in list(anchors.keys()) + list(extra_phases)},
        key=phase_order_key,
    )
    numbered_anchors = sorted(
        (
            phase_order_key(phase),
            anchor_date,
        )
        for phase, anchor_date in anchors.items()
        if phase_order_key(phase) < 999
    )
    deltas = [
        (numbered_anchors[idx + 1][1] - numbered_anchors[idx][1]).days
        for idx in range(len(numbered_anchors) - 1)
        if 7 <= (numbered_anchors[idx + 1][1] - numbered_anchors[idx][1]).days <= 60
    ]
    default_gap = deltas[len(deltas) // 2] if deltas else 28

    for index, phase in enumerate(ordered_phases):
        if phase in anchors:
            continue
        prev_phase = next(
            (
                ordered_phases[cursor]
                for cursor in range(index - 1, -1, -1)
                if ordered_phases[cursor] in anchors
            ),
            None,
        )
        next_phase = next(
            (
                ordered_phases[cursor]
                for cursor in range(index + 1, len(ordered_phases))
                if ordered_phases[cursor] in anchors
            ),
            None,
        )
        if prev_phase and next_phase:
            prev_order = phase_order_key(prev_phase)
            next_order = phase_order_key(next_phase)
            distance = max(1, next_order - prev_order)
            step = max(7, (anchors[next_phase] - anchors[prev_phase]).days // distance)
            anchors[phase] = anchors[prev_phase] + timedelta(days=step * (phase_order_key(phase) - prev_order))
        elif prev_phase:
            anchors[phase] = anchors[prev_phase] + timedelta(days=default_gap * max(1, phase_order_key(phase) - phase_order_key(prev_phase)))
        elif next_phase:
            anchors[phase] = anchors[next_phase] - timedelta(days=default_gap * max(1, phase_order_key(next_phase) - phase_order_key(phase)))
    return anchors


def parse_project_team_history() -> dict[str, list[dict[str, Any]]]:
    path = DATA_DIR / "프로젝트 팀 구성.md"
    if not path.exists():
        return {}

    team_history_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    phase = ""
    team_label = ""
    team_members: list[dict[str, str]] = []

    def flush_team() -> None:
        nonlocal team_members
        if not phase or not team_label or not team_members:
            team_members = []
            return
        team_number_match = re.search(r"(\d+)", team_label)
        team_number = int(team_number_match.group(1)) if team_number_match else None
        for member in team_members:
            teammates = [
                {"name": peer["name"], "roleLabel": peer["roleLabel"]}
                for peer in team_members
                if peer["name"] != member["name"]
            ]
            role_label = member["roleLabel"]
            role = "team_lead" if "팀장" in role_label else "pm" if "pm" in role_label.lower() else "member"
            team_history_by_name[normalize_name(member["name"])].append(
                {
                    "phase": phase,
                    "teamLabel": team_label,
                    "teamNumber": team_number,
                    "role": role,
                    "roleLabel": role_label,
                    "teammates": teammates,
                }
            )
        team_members = []

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        phase_match = re.match(r"^##\s+(.+)$", line)
        if phase_match:
            flush_team()
            phase = phase_match.group(1).strip()
            team_label = ""
            continue
        team_match = re.match(r"^###\s+(.+)$", line)
        if team_match:
            flush_team()
            team_label = team_match.group(1).strip()
            continue
        member_match = re.match(r"^-?\s*([^\(\n]+?)\s*(?:\(([^)]+)\))?$", line)
        if member_match and team_label:
            name = clean_text(member_match.group(1))
            role_label = clean_text(member_match.group(2) or "팀원")
            if name:
                team_members.append({"name": name, "roleLabel": role_label})

    flush_team()
    for assignments in team_history_by_name.values():
        assignments.sort(key=lambda item: (phase_order_key(item["phase"]), item["teamNumber"] or 999))
    return team_history_by_name


def build_peer_relationships(team_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    relationship_map: dict[str, dict[str, Any]] = {}
    for assignment in team_history:
        for peer in assignment.get("teammates", []):
            key = normalize_name(peer["name"])
            relation = relationship_map.setdefault(
                key,
                {
                    "name": peer["name"],
                    "count": 0,
                    "phases": [],
                    "teams": [],
                },
            )
            relation["count"] += 1
            if assignment["phase"] not in relation["phases"]:
                relation["phases"].append(assignment["phase"])
            if assignment["teamLabel"] and assignment["teamLabel"] not in relation["teams"]:
                relation["teams"].append(assignment["teamLabel"])
    return sorted(
        relationship_map.values(),
        key=lambda item: (-item["count"], item["name"]),
    )


def parse_round_date(label: str) -> date | None:
    match = re.search(r"\((\d{2})(\d{2})(\d{2})\)", label)
    if not match:
        return None
    year = 2000 + int(match.group(1))
    month = int(match.group(2))
    day = int(match.group(3))
    return date(year, month, day)


def parse_career_documents() -> dict[str, dict[str, Any]]:
    base_dir = DATA_DIR / "이력서 및 자기소개"
    if not base_dir.exists():
        return {}

    records: dict[str, dict[str, Any]] = defaultdict(lambda: {"rounds": []})

    def ensure_round(student_name: str, round_label: str, round_date: date | None) -> dict[str, Any]:
        student_key = normalize_name(student_name)
        student_bucket = records[student_key]
        for entry in student_bucket["rounds"]:
            if entry["roundLabel"] == round_label:
                return entry
        entry = {
            "roundLabel": round_label,
            "roundIndex": phase_order_key(round_label),
            "date": round_date.isoformat() if round_date else "",
            "documents": {
                "selfIntroduction": "",
                "resume": "",
            },
            "feedback": "",
            "sourceFiles": [],
        }
        student_bucket["rounds"].append(entry)
        return entry

    for round_dir in sorted(path for path in base_dir.iterdir() if path.is_dir()):
        round_label = clean_text(round_dir.name).split("(")[0]
        round_date = parse_round_date(round_dir.name)

        if round_label == "1차":
            intro_dir = round_dir / "자소서 모음집"
            if intro_dir.exists():
                for path in sorted(intro_dir.glob("*.txt")):
                    if path.name.startswith("_"):
                        continue
                    student_name = clean_text(path.stem.split("_")[0])
                    round_entry = ensure_round(student_name, round_label, round_date)
                    round_entry["documents"]["selfIntroduction"] = clean_text(path.read_text(encoding="utf-8"))
                    round_entry["sourceFiles"].append(str(path.relative_to(DATA_DIR)).replace("\\", "/"))

            feedback_dir = round_dir / "개인 피드백"
            if feedback_dir.exists():
                for path in sorted(feedback_dir.glob("*.md")):
                    student_name = clean_text(path.stem)
                    round_entry = ensure_round(student_name, round_label, round_date)
                    round_entry["feedback"] = clean_text(path.read_text(encoding="utf-8"))
                    round_entry["sourceFiles"].append(str(path.relative_to(DATA_DIR)).replace("\\", "/"))

        if round_label == "2차":
            text_dir = round_dir / "피드백" / "_추출텍스트"
            if text_dir.exists():
                for path in sorted(text_dir.glob("*.txt")):
                    student_name = clean_text(path.stem.split("_")[0])
                    round_entry = ensure_round(student_name, round_label, round_date)
                    content = clean_text(path.read_text(encoding="utf-8"))
                    if "이력서" in path.stem:
                        round_entry["documents"]["resume"] = content
                    if "자기소개서" in path.stem:
                        round_entry["documents"]["selfIntroduction"] = content
                    round_entry["sourceFiles"].append(str(path.relative_to(DATA_DIR)).replace("\\", "/"))

            feedback_dir = round_dir / "피드백"
            if feedback_dir.exists():
                for path in sorted(feedback_dir.glob("*.md")):
                    if path.name.startswith("_"):
                        continue
                    student_name = clean_text(path.stem)
                    round_entry = ensure_round(student_name, round_label, round_date)
                    round_entry["feedback"] = clean_text(path.read_text(encoding="utf-8"))
                    round_entry["sourceFiles"].append(str(path.relative_to(DATA_DIR)).replace("\\", "/"))

    finalized: dict[str, dict[str, Any]] = {}
    for student_key, payload in records.items():
        rounds = sorted(payload["rounds"], key=lambda item: item["roundIndex"])
        self_intro_rounds = [item["roundLabel"] for item in rounds if item["documents"]["selfIntroduction"]]
        resume_rounds = [item["roundLabel"] for item in rounds if item["documents"]["resume"]]
        feedback_rounds = [item["roundLabel"] for item in rounds if item["feedback"]]
        latest_date = max((item["date"] for item in rounds if item["date"]), default="")
        finalized[student_key] = {
            "rounds": rounds,
            "summary": {
                "roundCount": len(rounds),
                "selfIntroductionRounds": self_intro_rounds,
                "resumeRounds": resume_rounds,
                "feedbackRounds": feedback_rounds,
                "latestDocumentDate": latest_date,
                "hasRevisionHistory": len(self_intro_rounds) >= 2,
            },
        }
    return finalized


def add_project_data(students_by_name: dict[str, dict[str, Any]], weeks: list[CurriculumWeek]) -> dict[str, list[date]]:
    course_start = weeks[0].start_date
    course_end = weeks[-1].end_date
    phase_dates: dict[str, list[date]] = {}
    for phase_meta in PROJECT_PHASES:
        phase = phase_meta["phase"]
        daily_wb = workbook_by_index(phase_meta["daily_index"])
        raw_ws = next(sheet for sheet in daily_wb.worksheets if "설문지 응답" in sheet.title)
        headers = list(next(raw_ws.iter_rows(min_row=1, max_row=1, values_only=True)))
        columns = find_header_indexes(
            headers,
            {
                "timestamp": ["타임스탬프"],
                "name": ["이름"],
                "team": ["소속 팀", "소속팀"],
                "date": ["작성 날짜"],
                "workload": ["작업량", "작업 이력", "오늘 작업한 내용"],
                "note": ["자유로운 한마디"],
            },
        )

        known_dates = [
            item
            for item in collect_project_date_sheet(daily_wb)
            if date_in_window(item, course_start - timedelta(days=45), course_end + timedelta(days=30))
        ]

        for row in raw_ws.iter_rows(min_row=2, values_only=True):
            name = clean_text(row[columns["name"]]) if columns["name"] >= 0 else ""
            if not name:
                continue
            student = students_by_name.get(normalize_name(name))
            if not student:
                continue
            submitted_at = parse_datetime(row[columns["timestamp"]]) if columns["timestamp"] >= 0 else None
            assigned_date = normalize_project_date(
                row[columns["date"]] if columns["date"] >= 0 else None,
                submitted_at,
                course_start,
                course_end,
            )
            if assigned_date and assigned_date not in known_dates:
                known_dates.append(assigned_date)
            work_text = clean_text(row[columns["workload"]]) if columns["workload"] >= 0 else ""
            note_text = clean_text(row[columns["note"]]) if columns["note"] >= 0 else ""
            team = clean_text(row[columns["team"]]) if columns["team"] >= 0 else ""
            due_end = datetime.combine(assigned_date + timedelta(days=1), time(9, 0)) if assigned_date else None
            on_time = bool(submitted_at and due_end and submitted_at <= due_end)
            submission = {
                "phase": phase,
                "date": assigned_date.isoformat() if assigned_date else "",
                "submittedAt": submitted_at.isoformat() if submitted_at else "",
                "team": team,
                "workText": work_text,
                "noteText": note_text,
                "onTime": on_time,
            }
            student["checkins"].append(submission)
            if assigned_date:
                student["timelineEvents"].append(
                    {
                        "id": f"{phase}-{student['id']}-{assigned_date.isoformat()}",
                        "date": assigned_date.isoformat(),
                        "endDate": "",
                        "type": "project",
                        "severity": "info" if on_time else "caution",
                        "title": f"{phase} 데일리 체크인",
                        "summary": short_text(work_text or note_text or "프로젝트 일일 기록 제출"),
                        "detail": "\n\n".join(filter(None, [work_text, note_text])),
                        "projectPhase": phase,
                        "sourceLabel": "프로젝트 데일리 체크인",
                        "relatedWeek": week_for_date(assigned_date, weeks),
                        "isEstimated": False,
                    }
                )

        known_dates = dominant_phase_dates(known_dates)
        phase_dates[phase] = known_dates

        retro_index = phase_meta["retro_index"]
        if retro_index is not None:
            retro_wb = workbook_by_index(retro_index)
            retro_ws = retro_wb.worksheets[0]
            retro_headers = list(next(retro_ws.iter_rows(min_row=1, max_row=1, values_only=True)))
            retro_cols = find_header_indexes(
                retro_headers,
                {
                    "timestamp": ["타임스탬프"],
                    "name": ["이름"],
                    "team": ["소속팀", "소속 팀"],
                },
            )
            text_indexes = [
                idx
                for idx, header in enumerate(retro_headers)
                if idx > 3 and compact_text(header)
            ]
            for row in retro_ws.iter_rows(min_row=2, values_only=True):
                name = clean_text(row[retro_cols["name"]]) if retro_cols["name"] >= 0 else ""
                if not name:
                    continue
                student = students_by_name.get(normalize_name(name))
                if not student:
                    continue
                submitted_at = parse_datetime(row[retro_cols["timestamp"]]) if retro_cols["timestamp"] >= 0 else None
                retro_date = submitted_at.date() if submitted_at else (known_dates[-1] if known_dates else None)
                text_blocks = []
                for idx in text_indexes:
                    header = compact_text(retro_headers[idx])
                    content = clean_text(row[idx])
                    if content:
                        text_blocks.append(f"{header}\n{content}")
                retro_text = "\n\n".join(text_blocks)
                student["retrospectives"].append(
                    {
                        "phase": phase,
                        "date": retro_date.isoformat() if retro_date else "",
                        "submittedAt": submitted_at.isoformat() if submitted_at else "",
                        "detail": retro_text,
                    }
                )
                if retro_date:
                    student["timelineEvents"].append(
                        {
                            "id": f"{phase}-retro-{student['id']}-{retro_date.isoformat()}",
                            "date": retro_date.isoformat(),
                            "endDate": "",
                            "type": "retro",
                            "severity": "info",
                            "title": f"{phase} 회고 제출",
                            "summary": short_text(retro_text or "프로젝트 종료 후 회고 제출"),
                            "detail": retro_text,
                            "projectPhase": phase,
                            "sourceLabel": "프로젝트 회고",
                            "relatedWeek": week_for_date(retro_date, weeks),
                            "isEstimated": False,
                        }
                    )

    return phase_dates


def add_project_team_data(
    students_by_name: dict[str, dict[str, Any]],
    weeks: list[CurriculumWeek],
    phase_dates: dict[str, list[date]],
) -> None:
    team_history_map = parse_project_team_history()
    phase_anchors = build_project_phase_anchor_dates(
        phase_dates,
        sorted(
            {
                assignment["phase"]
                for assignments in team_history_map.values()
                for assignment in assignments
            },
            key=phase_order_key,
        ),
    )

    for student_key, assignments in team_history_map.items():
        student = students_by_name.get(student_key)
        if not student:
            continue
        student_assignments = []
        for assignment in assignments:
            event_date = phase_anchors.get(assignment["phase"])
            student_assignments.append(
                {
                    **assignment,
                    "date": event_date.isoformat() if event_date else "",
                }
            )
        student["projectTeamHistory"] = student_assignments
        student["peerRelationships"] = build_peer_relationships(student_assignments)
        for index, assignment in enumerate(student_assignments, start=1):
            event_date = parse_date(assignment.get("date"))
            if not event_date:
                continue
            role_label = assignment.get("roleLabel") or "팀원"
            teammate_names = [peer["name"] for peer in assignment.get("teammates", [])]
            student["timelineEvents"].append(
                {
                    "id": f"team-{student['id']}-{phase_order_key(assignment['phase'])}-{index}",
                    "date": event_date.isoformat(),
                    "endDate": "",
                    "type": "project",
                    "severity": "info",
                    "title": f"{assignment['phase']} 팀 배치",
                    "summary": f"{assignment['teamLabel']} · 역할 {role_label} · 팀원 {len(teammate_names)}명",
                    "detail": "\n".join(
                        [
                            f"팀: {assignment['teamLabel']}",
                            f"역할: {role_label}",
                            f"함께한 팀원: {', '.join(teammate_names) if teammate_names else '-'}",
                        ]
                    ),
                    "projectPhase": assignment["phase"],
                    "sourceLabel": "프로젝트 팀 구성",
                    "relatedWeek": week_for_date(event_date, weeks),
                    "isEstimated": True,
                }
            )


def add_career_document_data(students_by_name: dict[str, dict[str, Any]], weeks: list[CurriculumWeek]) -> None:
    career_documents_map = parse_career_documents()
    for student_key, payload in career_documents_map.items():
        student = students_by_name.get(student_key)
        if not student:
            continue
        student["careerDocuments"] = payload
        for round_entry in payload.get("rounds", []):
            event_date = parse_date(round_entry.get("date"))
            if not event_date:
                continue
            round_label = round_entry["roundLabel"]
            documents = round_entry.get("documents", {})
            if documents.get("selfIntroduction"):
                student["timelineEvents"].append(
                    {
                        "id": f"career-intro-{student['id']}-{round_label}",
                        "date": event_date.isoformat(),
                        "endDate": "",
                        "type": "career",
                        "severity": "info",
                        "title": f"{round_label} 자기소개서 작성",
                        "summary": short_text(documents["selfIntroduction"]),
                        "detail": documents["selfIntroduction"],
                        "projectPhase": "취업 준비",
                        "sourceLabel": "이력서 및 자기소개",
                        "relatedWeek": week_for_date(event_date, weeks),
                        "isEstimated": False,
                    }
                )
            if documents.get("resume"):
                student["timelineEvents"].append(
                    {
                        "id": f"career-resume-{student['id']}-{round_label}",
                        "date": event_date.isoformat(),
                        "endDate": "",
                        "type": "career",
                        "severity": "info",
                        "title": f"{round_label} 이력서 작성",
                        "summary": short_text(documents["resume"]),
                        "detail": documents["resume"],
                        "projectPhase": "취업 준비",
                        "sourceLabel": "이력서 및 자기소개",
                        "relatedWeek": week_for_date(event_date, weeks),
                        "isEstimated": False,
                    }
                )
            if round_entry.get("feedback"):
                student["timelineEvents"].append(
                    {
                        "id": f"career-feedback-{student['id']}-{round_label}",
                        "date": event_date.isoformat(),
                        "endDate": "",
                        "type": "career",
                        "severity": "info",
                        "title": f"{round_label} 취업 문서 피드백",
                        "summary": short_text(round_entry["feedback"]),
                        "detail": round_entry["feedback"],
                        "projectPhase": "취업 준비",
                        "sourceLabel": "이력서 및 자기소개",
                        "relatedWeek": week_for_date(event_date, weeks),
                        "isEstimated": False,
                    }
                )


def parse_morning_presentation_line(line: str) -> dict[str, str] | None:
    raw = unescape(line).replace("\t", " ")
    text = clean_text(raw)
    if not text or text.startswith("*") or text.startswith("지각일"):
        return None
    dates = list(re.finditer(r"\d{4}-\d{2}-\d{2}", text))
    if not dates:
        return None
    if len(dates) >= 2:
        late_date = parse_date(dates[0].group(0))
        presentation_date = parse_date(dates[1].group(0))
        rest = text[dates[1].end() :].strip()
    else:
        late_date = None
        presentation_date = parse_date(dates[0].group(0))
        rest = text[dates[0].end() :].strip()
    if not presentation_date:
        return None
    name_match = re.match(r"([가-힣A-Za-z0-9]+)\s+(.+)", rest)
    if not name_match:
        return None
    return {
        "lateDate": late_date.isoformat() if late_date else "",
        "presentationDate": presentation_date.isoformat(),
        "name": clean_text(name_match.group(1)),
        "topic": clean_text(name_match.group(2)),
        "isVolunteer": not bool(late_date),
    }


def add_morning_presentation_data(students_by_name: dict[str, dict[str, Any]], weeks: list[CurriculumWeek]) -> None:
    path = DATA_DIR / "아침 발표.md"
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        entry = parse_morning_presentation_line(raw_line)
        if not entry:
            continue
        student = students_by_name.get(normalize_name(entry["name"]))
        if not student:
            continue
        student["morningPresentations"].append(entry)
        event_date = parse_date(entry["presentationDate"])
        if not event_date:
            continue
        source_reason = "자원 발표" if entry["isVolunteer"] else f"지각 후 발표 · 지각일 {entry['lateDate']}"
        student["timelineEvents"].append(
            {
                "id": f"morning-presentation-{student['id']}-{entry['presentationDate']}-{len(student['morningPresentations'])}",
                "date": entry["presentationDate"],
                "endDate": "",
                "type": "morning_presentation",
                "severity": "success" if entry["isVolunteer"] else "info",
                "title": "아침 발표",
                "summary": short_text(entry["topic"]),
                "detail": f"{source_reason}\n발표 주제: {entry['topic']}",
                "projectPhase": "",
                "sourceLabel": "아침 발표.md",
                "relatedWeek": week_for_date(event_date, weeks),
                "isEstimated": False,
            }
        )


def extract_pdf_text(path: Path, max_pages: int = 3, max_chars: int = 6000) -> str:
    try:
        reader = PdfReader(str(path))
        return clean_text("\n".join((page.extract_text() or "") for page in reader.pages[:max_pages]))[:max_chars]
    except Exception:
        return ""


def extract_xlsx_text(path: Path, max_cells: int = 120, max_chars: int = 6000) -> str:
    try:
        wb = load_workbook(path, read_only=True, data_only=True)
        values = []
        for ws in wb.worksheets[:2]:
            for row in ws.iter_rows(values_only=True):
                for value in row:
                    text = clean_text(value)
                    if text:
                        values.append(text)
                    if len(values) >= max_cells:
                        return "\n".join(values)[:max_chars]
        return "\n".join(values)[:max_chars]
    except Exception:
        return ""


def extract_docx_text(path: Path, max_chars: int = 6000) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            xml_text = archive.read("word/document.xml").decode("utf-8", errors="ignore")
        return clean_text(re.sub(r"<[^>]+>", " ", xml_text))[:max_chars]
    except Exception:
        return ""


def extract_submission_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_pdf_text(path)
    if suffix in {".xlsx", ".xlsm"}:
        return extract_xlsx_text(path)
    if suffix == ".docx":
        return extract_docx_text(path)
    if suffix in {".txt", ".md"}:
        try:
            return clean_text(path.read_text(encoding="utf-8", errors="ignore"))[:6000]
        except Exception:
            return ""
    return ""


def infer_submission_date(path: Path) -> str:
    text = path.name
    for pattern in [r"(20\d{2})[.\-_년 ]{0,2}(\d{1,2})[.\-_월 ]{0,2}(\d{1,2})", r"(\d{2})[.\-_](\d{1,2})[.\-_](\d{1,2})", r"(\d{6})"]:
        match = re.search(pattern, text)
        if not match:
            continue
        try:
            if len(match.groups()) == 1:
                token = match.group(1)
                return date(2000 + int(token[:2]), int(token[2:4]), int(token[4:6])).isoformat()
            year = int(match.group(1))
            if year < 100:
                year += 2000
            return date(year, int(match.group(2)), int(match.group(3))).isoformat()
        except ValueError:
            continue
    return ""


def practice_strength_hits(text: str) -> dict[str, int]:
    hits = {}
    for key, meta in PRACTICE_STRENGTH_KEYWORDS.items():
        count = keyword_occurrence_count(text, meta["keywords"])
        if count > 0:
            hits[key] = count
    return hits


def add_practice_submission_data(students_by_name: dict[str, dict[str, Any]], weeks: list[CurriculumWeek]) -> None:
    base_dir = DATA_DIR / "실습 제출"
    if not base_dir.exists():
        return
    supported = {".pdf", ".xlsx", ".xlsm", ".docx", ".txt", ".md"}
    for path in sorted(item for item in base_dir.rglob("*") if item.is_file() and item.suffix.lower() in supported):
        student = match_student_from_text(path.name, students_by_name)
        if not student:
            continue
        relative_parts = path.relative_to(base_dir).parts
        module = relative_parts[0].replace(" (File responses)", "") if len(relative_parts) >= 1 else "실습"
        assignment = relative_parts[-2].replace(" (File responses)", "") if len(relative_parts) >= 2 else module
        extracted = extract_submission_text(path)
        combined_text = "\n".join([module, assignment, path.stem, extracted])
        strength_hits = practice_strength_hits(combined_text)
        submission_date = infer_submission_date(path)
        submission = {
            "module": clean_text(module),
            "assignment": clean_text(assignment),
            "fileName": path.name,
            "sourceFile": str(path.relative_to(DATA_DIR)).replace("\\", "/"),
            "date": submission_date,
            "fileType": path.suffix.lower().lstrip("."),
            "excerpt": short_text(extracted or path.stem, 220),
            "textExtracted": bool(extracted),
            "strengthHits": strength_hits,
        }
        student["practiceSubmissions"].append(submission)
        event_date = parse_date(submission_date)
        if not event_date:
            continue
        student["timelineEvents"].append(
            {
                "id": f"practice-submission-{student['id']}-{submission_date}-{len(student['practiceSubmissions'])}",
                "date": submission_date,
                "endDate": "",
                "type": "practice_submission",
                "severity": "success" if extracted else "info",
                "title": f"실습 제출 · {clean_text(assignment)}",
                "summary": short_text(path.stem),
                "detail": extracted or path.name,
                "projectPhase": "",
                "sourceLabel": "실습 제출",
                "relatedWeek": week_for_date(event_date, weeks),
                "isEstimated": False,
            }
        )


def infer_missing_dropout_dates(students: list[dict[str, Any]], weeks: list[CurriculumWeek]) -> None:
    for student in students:
        dropout_info = student.get("dropoutInfo", {}) or {}
        if not dropout_info or parse_date(dropout_info.get("date", "")):
            continue

        candidates: list[dict[str, Any]] = []
        for event in student.get("timelineEvents", []):
            event_date = parse_date(event.get("date", ""))
            if not event_date:
                continue
            event_text = "\n".join(str(event.get(key, "")) for key in ("title", "summary", "detail"))
            if event.get("type") == "attendance" and "이탈" in event_text:
                candidates.append(
                    {
                        "date": event_date,
                        "source": event.get("sourceLabel", "출결 기록"),
                        "basis": short_text(event_text),
                        "priority": 3,
                    }
                )
            elif event.get("type") == "counseling" and "이탈" in event_text:
                decisive = any(keyword in event_text for keyword in ("최종", "결정", "하차", "이탈 처리"))
                candidates.append(
                    {
                        "date": event_date,
                        "source": event.get("sourceLabel", "면담 기록"),
                        "basis": short_text(event_text),
                        "priority": 2 if decisive else 1,
                    }
                )

        if not candidates:
            continue

        best = sorted(candidates, key=lambda item: (item["priority"], item["date"]), reverse=True)[0]
        dropout_info["date"] = best["date"].isoformat()
        dropout_info["dateInferred"] = True
        dropout_info["dateSource"] = best["source"]
        dropout_info["dateBasis"] = best["basis"]
        student["dropoutInfo"] = dropout_info

        for event in student.get("timelineEvents", []):
            if event.get("id") == f"dropout-{student['id']}":
                event["date"] = dropout_info["date"]
                event["relatedWeek"] = week_for_date(best["date"], weeks)
                event["summary"] = short_text(dropout_info.get("reason") or best["basis"] or "과정이탈 기록")
                event["detail"] = "\n".join(
                    filter(
                        None,
                        [
                            event.get("detail", ""),
                            f"이탈 시점 보조 근거: {best['source']} · {best['basis']}",
                        ],
                    )
                )
                break


def career_document_summary(rounds: list[dict[str, Any]]) -> dict[str, Any]:
    ordered = sorted(
        rounds,
        key=lambda item: (
            safe_float(item.get("roundIndex"), 999),
            item.get("date", ""),
            item.get("roundLabel", ""),
        ),
    )
    self_intro_rounds = [
        item.get("roundLabel", "")
        for item in ordered
        if item.get("documents", {}).get("selfIntroduction")
    ]
    resume_rounds = [
        item.get("roundLabel", "")
        for item in ordered
        if item.get("documents", {}).get("resume")
    ]
    feedback_rounds = [
        item.get("roundLabel", "")
        for item in ordered
        if item.get("feedback")
    ]
    latest_date = max((item.get("date", "") for item in ordered if item.get("date")), default="")
    return {
        "roundCount": len(ordered),
        "selfIntroductionRounds": self_intro_rounds,
        "resumeRounds": resume_rounds,
        "feedbackRounds": feedback_rounds,
        "latestDocumentDate": latest_date,
        "hasRevisionHistory": len(self_intro_rounds) >= 2,
    }


def dated_record_date(record: dict[str, Any], keys: tuple[str, ...]) -> date | None:
    for key in keys:
        parsed = parse_date(record.get(key, ""))
        if parsed:
            return parsed
    return None


def keep_record_until(record: dict[str, Any], cutoff: date, keys: tuple[str, ...]) -> bool:
    record_date = dated_record_date(record, keys)
    return not record_date or record_date <= cutoff


def student_observation_end(student: dict[str, Any], course_end: date | None) -> date | None:
    dropout_date = parse_date((student.get("dropoutInfo") or {}).get("date", ""))
    return dropout_date or course_end


def cap_student_records_to_observation_window(
    students: list[dict[str, Any]],
    curriculum: dict[str, Any],
) -> None:
    course_start = parse_date(curriculum.get("startDate", ""))
    course_end = parse_date(curriculum.get("endDate", ""))
    dated_fields: dict[str, tuple[str, ...]] = {
        "attendanceEvents": ("date",),
        "checkins": ("date", "submittedAt"),
        "retrospectives": ("date", "submittedAt"),
        "counselings": ("date",),
        "projectTeamHistory": ("date",),
        "morningPresentations": ("presentationDate", "lateDate"),
        "practiceSubmissions": ("date",),
        "peerFeedback": ("sourceDate",),
        "timelineEvents": ("date",),
    }

    for student in students:
        dropout_date = parse_date((student.get("dropoutInfo") or {}).get("date", ""))
        observation_end = student_observation_end(student, course_end)
        student["dataWindow"] = {
            "startDate": course_start.isoformat() if course_start else "",
            "endDate": observation_end.isoformat() if observation_end else "",
            "endReason": "dropout" if dropout_date else "course",
            "dropoutDate": dropout_date.isoformat() if dropout_date else "",
            "isCapped": bool(dropout_date),
        }

        if not dropout_date or not observation_end:
            continue

        for field, keys in dated_fields.items():
            records = student.get(field, [])
            if isinstance(records, list):
                student[field] = [
                    record
                    for record in records
                    if not isinstance(record, dict) or keep_record_until(record, observation_end, keys)
                ]

        career_documents = student.get("careerDocuments") or {}
        career_rounds = [
            round_item
            for round_item in career_documents.get("rounds", [])
            if keep_record_until(round_item, observation_end, ("date",))
        ]
        career_rounds = sorted(career_rounds, key=lambda item: (safe_float(item.get("roundIndex"), 999), item.get("date", "")))
        student["careerDocuments"] = {
            **career_documents,
            "rounds": career_rounds,
            "summary": career_document_summary(career_rounds),
        }
        student["peerRelationships"] = build_peer_relationships(student.get("projectTeamHistory", []))


def expected_project_dates_for_student(
    student: dict[str, Any],
    phase_dates: dict[str, list[date]],
    cutoff: date,
) -> set[date]:
    expected_dates = {
        item
        for dates in phase_dates.values()
        for item in dates
        if item <= cutoff
    }
    # Student check-in dates are also treated as expected dates for that
    # student's observed window. This prevents early dropout students from
    # being judged against future dates or against a missing global date list.
    for item in student.get("checkins", []):
        submitted_date = parse_date(item.get("date", ""))
        if submitted_date and submitted_date <= cutoff:
            expected_dates.add(submitted_date)
    return expected_dates


def add_attendance_data(students_by_name: dict[str, dict[str, Any]], weeks: list[CurriculumWeek]) -> None:
    wb = workbook_by_index(7)
    for ws in wb.worksheets:
        if ws.title in {"지각", "결석"}:
            continue
        headers = list(next(ws.iter_rows(min_row=4, max_row=4, values_only=True)))
        date_columns: list[tuple[int, date]] = []
        for idx, value in enumerate(headers):
            parsed = parse_date(value)
            if parsed:
                date_columns.append((idx, parsed))
        for row in ws.iter_rows(min_row=5, values_only=True):
            name = clean_text(row[0])
            phone = clean_text(row[1])
            if not name:
                continue
            student = students_by_name.get(normalize_name(name))
            if not student:
                continue
            if phone and student["phone"] and phone != student["phone"]:
                continue
            for idx, event_date in date_columns:
                raw_value = clean_text(row[idx]) if idx < len(row) else ""
                if not raw_value:
                    continue
                kind = attendance_kind(raw_value)
                reason_profile = attendance_reason_profile(raw_value, kind)
                severity = reason_profile["severity"]
                event = {
                    "id": f"attendance-{student['id']}-{event_date.isoformat()}-{idx}",
                    "date": event_date.isoformat(),
                    "endDate": "",
                    "type": "attendance",
                    "severity": severity,
                    "title": f"출결 이슈 · {kind}",
                    "summary": short_text(raw_value),
                    "detail": raw_value,
                    "projectPhase": "",
                    "sourceLabel": "출결 기입 시트",
                    "relatedWeek": week_for_date(event_date, weeks),
                    "isEstimated": False,
                    "attendanceCategory": reason_profile["category"],
                    "scoreImpact": reason_profile["impact"],
                }
                student["attendanceEvents"].append(
                    {
                        "date": event_date.isoformat(),
                        "kind": kind,
                        "detail": raw_value,
                        "severity": severity,
                        "category": reason_profile["category"],
                        "impact": reason_profile["impact"],
                    }
                )
                student["timelineEvents"].append(event)


def parse_counseling_sections(text: str) -> list[dict[str, str]]:
    sections: list[dict[str, str]] = []
    pattern = re.compile(r"^##\s+(.+)$", re.MULTILINE)
    matches = list(pattern.finditer(text))
    if not matches:
        return sections
    for idx, match in enumerate(matches):
        title = match.group(1).strip()
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        counselor_match = re.search(r"-\s*면담자\s*:\s*(.+)", block)
        date_match = re.search(r"-\s*면담일\s*:\s*(\d{4}-\d{2}-\d{2})", block)
        content = re.sub(r"-\s*면담자\s*:\s*.+", "", block)
        content = re.sub(r"-\s*면담일\s*:\s*.+", "", content)
        content = content.strip()
        sections.append(
            {
                "title": title,
                "counselor": counselor_match.group(1).strip() if counselor_match else "",
                "date": date_match.group(1).strip() if date_match else "",
                "content": content,
            }
        )
    return sections


def add_counseling_data(students_by_name: dict[str, dict[str, Any]], weeks: list[CurriculumWeek]) -> None:
    counsel_dir = DATA_DIR / "면담 기록"
    for path in sorted(counsel_dir.glob("*.md")):
        student = students_by_name.get(normalize_name(path.stem))
        if not student:
            continue
        text = path.read_text(encoding="utf-8")
        sections = parse_counseling_sections(text)
        for index, section in enumerate(sections, start=1):
            event_date = parse_date(section["date"])
            severity = "warning" if ("경고" in section["title"] or "이탈" in section["title"]) else "info"
            summary = short_text(section["content"])
            counseling = {
                "title": section["title"],
                "counselor": section["counselor"],
                "date": event_date.isoformat() if event_date else "",
                "content": section["content"],
                "severity": severity,
            }
            student["counselings"].append(counseling)
            if event_date:
                student["timelineEvents"].append(
                    {
                        "id": f"counseling-{student['id']}-{event_date.isoformat()}-{index}",
                        "date": event_date.isoformat(),
                        "endDate": "",
                        "type": "counseling",
                        "severity": severity,
                        "title": section["title"],
                        "summary": summary,
                        "detail": section["content"],
                        "projectPhase": "",
                        "sourceLabel": "면담 기록",
                        "relatedWeek": week_for_date(event_date, weeks),
                        "isEstimated": False,
                    }
                )


def build_snapshot(student: dict[str, Any], label: str, snapshot_date: date, cutoff: date, phase_dates: dict[str, list[date]]) -> dict[str, Any]:
    attendance_events = [event for event in student["attendanceEvents"] if parse_date(event["date"]) and parse_date(event["date"]) <= cutoff]
    counselings = [item for item in student["counselings"] if parse_date(item["date"]) and parse_date(item["date"]) <= cutoff]
    checkins = [item for item in student["checkins"] if parse_date(item["date"]) and parse_date(item["date"]) <= cutoff]
    retros = [item for item in student["retrospectives"] if parse_date(item["date"]) and parse_date(item["date"]) <= cutoff]
    team_history = [item for item in student.get("projectTeamHistory", []) if parse_date(item.get("date")) is None or parse_date(item.get("date")) <= cutoff]
    career_rounds = [item for item in student.get("careerDocuments", {}).get("rounds", []) if not item.get("date") or parse_date(item.get("date")) <= cutoff]
    admission = student.get("admission", {})

    expected_dates = expected_project_dates_for_student(student, phase_dates, cutoff)

    submission_dates = {parse_date(item["date"]) for item in checkins if parse_date(item["date"])}
    response_rate = len(submission_dates.intersection(expected_dates)) / len(expected_dates) if expected_dates else 0.0
    behavioral_attendance_issues = [
        event for event in attendance_events if event.get("impact") == "behavioral"
    ]
    contextual_attendance_issues = [
        event for event in attendance_events if event.get("impact") == "contextual"
    ]
    exempt_attendance_issues = [
        event for event in attendance_events if event.get("impact") == "exempt"
    ]
    health_attendance_issues = [
        event for event in attendance_events if event.get("category") in {"health", "condition"}
    ]
    condition_attendance_issues = [
        event for event in attendance_events if event.get("category") == "condition"
    ]
    risk_attendance_count = len(behavioral_attendance_issues)
    behavioral_absence_count = sum(
        1 for event in behavioral_attendance_issues if event["kind"] == "결석"
    )
    on_time_rate = (
        sum(1 for item in checkins if item["onTime"]) / len(checkins)
        if checkins
        else 0.0
    )

    all_text = "\n".join(
        [
            admission.get("intro", ""),
            admission.get("motivation", ""),
            admission.get("goal", ""),
            admission.get("conflict", ""),
            admission.get("failure", ""),
            admission.get("peer", ""),
            student.get("cadetCard", {}).get("fullText", ""),
            student.get("staffProfile", {}).get("fullText", "") if label == "현재" else "",
            student.get("dropoutInfo", {}).get("reason", ""),
            student.get("dropoutInfo", {}).get("note", ""),
            "\n".join(item["detail"] for item in retros),
            "\n".join(item["content"] for item in counselings),
            "\n".join(item["workText"] + "\n" + item["noteText"] for item in checkins),
            "\n".join(
                "\n".join(
                    filter(
                        None,
                        [
                            round_item.get("documents", {}).get("selfIntroduction", ""),
                            round_item.get("documents", {}).get("resume", ""),
                            round_item.get("feedback", ""),
                        ],
                    )
                )
                for round_item in career_rounds
            ),
        ]
    )

    resilience_up = keyword_hits(all_text, RESILIENCE_KEYWORDS)
    resilience_down = keyword_hits(all_text, LOW_RESILIENCE_KEYWORDS)
    reflection_hits = keyword_hits(all_text, REFLECTION_KEYWORDS)
    career_hits = keyword_hits(all_text, CAREER_KEYWORDS)
    career_readiness = score_career_readiness(all_text, career_rounds)
    leader_count = sum(1 for item in team_history if item.get("role") in {"team_lead", "pm"})
    collaboration_readiness = score_collaboration_readiness(
        student,
        checkins=checkins,
        retros=retros,
        counselings=counselings,
        attendance_events=attendance_events,
        team_history=team_history,
    )
    feedback_round_count = sum(1 for item in career_rounds if item.get("feedback"))
    resume_round_count = sum(1 for item in career_rounds if item.get("documents", {}).get("resume"))
    self_intro_round_count = sum(1 for item in career_rounds if item.get("documents", {}).get("selfIntroduction"))
    has_revision_history = self_intro_round_count >= 2

    self_regulation = 2.0
    if response_rate >= 0.8:
        self_regulation += 1
    if response_rate >= 0.95 and on_time_rate >= 0.85:
        self_regulation += 0.5
    if response_rate < 0.6:
        self_regulation -= 0.8
    if risk_attendance_count >= 3:
        self_regulation -= 0.8
    if behavioral_absence_count >= 1:
        self_regulation -= 0.5
    if has_revision_history:
        self_regulation += 0.2

    engagement = 2.0
    if response_rate >= 0.75 and risk_attendance_count <= 1:
        engagement += 1
    if response_rate >= 0.9 and behavioral_absence_count == 0:
        engagement += 0.5
    if response_rate < 0.5:
        engagement -= 0.9
    if risk_attendance_count >= 2:
        engagement -= 0.5
    if behavioral_absence_count >= 1:
        engagement -= 0.7

    collaboration = float(collaboration_readiness["profileScore"])
    # Collaboration risk is already reflected in collaboration_readiness.
    resilience = 2.0
    if resilience_up > resilience_down:
        resilience += 0.8
    if reflection_hits >= 5:
        resilience += 0.3
    if resilience_down >= 4:
        resilience -= 0.9
    if behavioral_absence_count >= 1:
        resilience -= 0.4

    reflection = 2.0
    if reflection_hits >= 4:
        reflection += 1
    if len(retros) >= 2:
        reflection += 0.5
    if not retros and not counselings:
        reflection -= 0.5
    if feedback_round_count >= 1:
        reflection += 0.2
    if has_revision_history:
        reflection += 0.2

    career_agency = float(career_readiness["profileScore"])

    snapshot_scores = {
        "selfRegulation": clamp_score(self_regulation),
        "engagement": clamp_score(engagement),
        "collaboration": clamp_score(collaboration),
        "resilience": clamp_score(resilience),
        "reflection": clamp_score(reflection),
        "careerAgency": clamp_score(career_agency),
    }
    judged_keys = []
    if expected_dates or attendance_events or checkins:
        judged_keys.extend(["selfRegulation", "engagement"])
    if team_history or checkins or retros:
        judged_keys.append("collaboration")
    if admission or student.get("cadetCard") or counselings or retros or checkins or attendance_events:
        judged_keys.append("resilience")
    if admission or student.get("cadetCard") or retros or counselings:
        judged_keys.append("reflection")
    if admission or student.get("cadetCard") or career_rounds:
        judged_keys.append("careerAgency")
    judged_keys = sorted(set(judged_keys))
    snapshot_scores = {
        key: value if key in judged_keys else None
        for key, value in snapshot_scores.items()
    }

    sources = 0
    for value in [attendance_events, counselings, checkins, retros, team_history, career_rounds]:
        if value:
            sources += 1
    if admission:
        sources += 1
    if student.get("cadetCard"):
        sources += 1
    if student.get("staffProfile"):
        sources += 1
    if len(exempt_attendance_issues) >= 2 and risk_attendance_count == 0:
        confidence = "High" if sources >= 4 else "Medium" if sources >= 2 else "Low"
    else:
        confidence = "High" if sources >= 4 else "Medium" if sources >= 2 else "Low"

    judged_score_items = [(key, value) for key, value in snapshot_scores.items() if isinstance(value, (int, float))]
    weakest_area = min(judged_score_items, key=lambda item: item[1])[0] if judged_score_items else ""
    weakest_map = {
        "selfRegulation": "자기조절 지원 필요",
        "engagement": "참여 지속성 점검 필요",
        "collaboration": "협업 상황 면담 권장",
        "resilience": "도전 대응 지원 필요",
        "reflection": "회고 구조화 필요",
        "careerAgency": "진로 목적성 구체화 필요",
    }

    note = weakest_map.get(weakest_area, "판단 가능한 근거 부족")
    judged_values = [value for _, value in judged_score_items]
    if judged_values and max(judged_values) >= 4 and min(judged_values) >= 3:
        note = "전반적으로 안정적인 성장 흐름"
    elif len(health_attendance_issues) >= 2 and risk_attendance_count == 0:
        note = "건강 및 컨디션 변동 맥락을 함께 살필 필요"
    elif len(exempt_attendance_issues) >= 2 and risk_attendance_count == 0:
        note = "행정 및 외부 일정이 반복되어 맥락 확인 필요"
    elif len(contextual_attendance_issues) >= 2 and risk_attendance_count == 0 and weakest_area == "engagement":
        note = "출결 기록은 있으나 성향 감점보다 배경 확인이 우선"

    return {
        "snapshotId": f"{student['id']}-{label}",
        "snapshotDate": snapshot_date.isoformat(),
        "snapshotType": label,
        "scores": snapshot_scores,
        "judgedKeys": judged_keys,
        "confidence": confidence,
        "note": note,
    }


def build_evaluation_and_status(students: list[dict[str, Any]], curriculum: dict[str, Any], weeks: list[CurriculumWeek], phase_dates: dict[str, list[date]]) -> None:
    course_start = parse_date(curriculum["startDate"])
    current_end = parse_date(curriculum["endDate"])
    if not course_start or not current_end:
        return

    snapshot_targets = [
        ("입과 초기", course_start),
        ("1차 프로젝트 이후", max(phase_dates.get("1차 프로젝트", [course_start])) + timedelta(days=3) if phase_dates.get("1차 프로젝트") else course_start),
        ("2차 프로젝트 이후", max(phase_dates.get("2차 프로젝트", [course_start])) + timedelta(days=3) if phase_dates.get("2차 프로젝트") else course_start + timedelta(days=60)),
        ("현재", current_end),
    ]

    for student in students:
        student_end = student_observation_end(student, current_end) or current_end
        timeline_weeks = [week for week in weeks if week.start_date <= student_end]
        snapshots = []
        for label, cutoff in snapshot_targets:
            effective_cutoff = min(cutoff, student_end)
            snapshots.append(build_snapshot(student, label, effective_cutoff, effective_cutoff, phase_dates))
        student["evaluationSnapshots"] = snapshots
        latest_scores = snapshots[-1]["scores"]
        student["currentProfile"] = {
            **latest_scores,
            "confidence": snapshots[-1]["confidence"],
            "note": snapshots[-1]["note"],
            "updatedAt": snapshots[-1]["snapshotDate"],
        }

        weekly_map: dict[int, dict[str, Any]] = {}
        for week in weeks:
            weekly_map[week.week_index] = {
                "weekIndex": week.week_index,
                "label": week.label,
                "startDate": week.start_date.isoformat(),
                "endDate": week.end_date.isoformat(),
                "counts": {
                    "attendance": 0,
                    "attendanceRisk": 0,
                    "project": 0,
                    "retro": 0,
                    "counseling": 0,
                    "admission": 0,
                    "career": 0,
                },
                "severity": "stable",
                "headline": "안정적인 학습 흐름",
                "notes": [],
                "snapshot": None,
            }
        weekly_map[0] = {
            "weekIndex": 0,
            "label": "모집",
            "startDate": "",
            "endDate": curriculum["startDate"],
            "counts": {
                "attendance": 0,
                "attendanceRisk": 0,
                "project": 0,
                "retro": 0,
                "counseling": 0,
                "admission": 0,
                "career": 0,
            },
            "severity": "stable",
            "headline": "모집 및 선발 기록",
            "notes": [],
            "snapshot": None,
        }

        for event in sorted(student["timelineEvents"], key=lambda item: (item["date"], item["title"])):
            week_index = event.get("relatedWeek", 0)
            if week_index not in weekly_map:
                continue
            week = weekly_map[week_index]
            event_type = event["type"]
            if event_type == "attendance":
                week["counts"]["attendance"] += 1
                if event.get("scoreImpact") == "behavioral":
                    week["counts"]["attendanceRisk"] += 1
            elif event_type in week["counts"]:
                week["counts"][event_type] += 1
            elif event_type == "project":
                week["counts"]["project"] += 1
            elif event_type == "retro":
                week["counts"]["retro"] += 1
            elif event_type == "counseling":
                week["counts"]["counseling"] += 1
            elif event_type == "admission":
                week["counts"]["admission"] += 1
            elif event_type == "career":
                week["counts"]["career"] += 1
            week["notes"].append(
                {
                    "type": event["type"],
                    "title": event["title"],
                    "summary": event["summary"],
                    "severity": event["severity"],
                    "date": event["date"],
                }
            )
            if severity_rank(event["severity"]) >= severity_rank(week["severity"]):
                week["severity"] = event["severity"] if event["severity"] != "success" else "stable"

        for snapshot in snapshots:
            snapshot_week = week_for_date(parse_date(snapshot["snapshotDate"]), weeks)
            if snapshot_week in weekly_map:
                weekly_map[snapshot_week]["snapshot"] = snapshot
                weekly_map[snapshot_week]["notes"].append(
                    {
                        "type": "snapshot",
                        "title": "성향 스냅샷 갱신",
                        "summary": snapshot["note"],
                        "severity": "info",
                        "date": snapshot["snapshotDate"],
                    }
                )

        # derive headlines
        for week_index, week in weekly_map.items():
            attendance_count = week["counts"]["attendance"]
            attendance_risk_count = week["counts"]["attendanceRisk"]
            counseling_count = week["counts"]["counseling"]
            project_count = week["counts"]["project"]
            retro_count = week["counts"]["retro"]
            career_count = week["counts"]["career"]
            if week["severity"] == "warning":
                week["headline"] = "집중 확인이 필요한 구간"
            elif attendance_risk_count >= 2:
                week["headline"] = "출결 위험 신호가 집중된 구간"
                week["severity"] = "caution"
            elif attendance_risk_count == 1:
                week["headline"] = "출결 위험 신호를 확인한 구간"
                week["severity"] = "caution"
            elif attendance_count >= 2:
                week["headline"] = "출결 배경 확인이 필요한 구간"
            elif counseling_count >= 1:
                week["headline"] = "면담 개입이 있었던 구간"
            elif career_count >= 1:
                week["headline"] = "취업 문서 학습이 진행된 구간"
            elif project_count >= 2 or retro_count >= 1:
                week["headline"] = "프로젝트 활동이 밀집된 구간"
            elif week_index == 0:
                week["headline"] = "모집 및 선발 단계"

            week["notes"] = sorted(
                week["notes"],
                key=lambda item: (severity_rank(item["severity"]), item["date"]),
                reverse=True,
            )[:4]

        # status periods from severity streaks
        active_period = None
        periods = []
        observed_week_indexes = {week.week_index for week in timeline_weeks}
        for week_index in sorted(index for index in weekly_map.keys() if index != 0 and index in observed_week_indexes):
            week = weekly_map[week_index]
            if week["severity"] in {"caution", "warning"}:
                if active_period is None:
                    active_period = {
                        "statusType": "집중 관찰" if week["severity"] == "warning" else "주의",
                        "severity": week["severity"],
                        "startDate": week["startDate"],
                        "endDate": week["endDate"],
                        "reasonSummary": week["headline"],
                    }
                else:
                    active_period["endDate"] = week["endDate"]
                    if week["severity"] == "warning":
                        active_period["statusType"] = "경고"
                        active_period["severity"] = "warning"
            elif active_period is not None:
                periods.append(active_period)
                active_period = None
        if active_period is not None:
            periods.append(active_period)

        student["statusPeriods"] = [
            {
                "statusPeriodId": f"{student['id']}-status-{idx + 1}",
                **period,
            }
            for idx, period in enumerate(periods)
        ]
        student["weeklyTimeline"] = [weekly_map[0]] + [weekly_map[week.week_index] for week in timeline_weeks]

        attendance_total = len(student["attendanceEvents"])
        attendance_risk_total = len(
            [event for event in student["attendanceEvents"] if event.get("impact") == "behavioral"]
        )
        health_attendance_total = len(
            [event for event in student["attendanceEvents"] if event.get("category") in {"health", "condition"}]
        )
        condition_attendance_total = len(
            [event for event in student["attendanceEvents"] if event.get("category") == "condition"]
        )
        expected_project_dates = expected_project_dates_for_student(student, phase_dates, student_end)
        project_expected_total = len(expected_project_dates)
        project_submission_dates = {
            parse_date(item.get("date", ""))
            for item in student["checkins"]
            if parse_date(item.get("date", "")) and parse_date(item.get("date", "")) <= student_end
        }
        project_submissions = len(project_submission_dates.intersection(expected_project_dates))
        counseling_dates = [item["date"] for item in student["counselings"] if item["date"]]
        student["stats"] = {
            "attendanceIssues": attendance_total,
            "attendanceRiskIssues": attendance_risk_total,
            "healthAttendanceIssues": health_attendance_total,
            "conditionAttendanceIssues": condition_attendance_total,
            "lateCount": sum(1 for event in student["attendanceEvents"] if event["kind"] == "지각"),
            "absenceCount": sum(1 for event in student["attendanceEvents"] if event["kind"] == "결석"),
            "counselingCount": len(student["counselings"]),
            "projectExpectedCount": project_expected_total,
            "projectSubmissionCount": project_submissions,
            "projectSubmissionRate": round(min(100, (project_submissions / project_expected_total) * 100), 1) if project_expected_total else 0,
            "latestCounselingDate": max(counseling_dates) if counseling_dates else "",
            "leadershipRoleCount": sum(1 for item in student.get("projectTeamHistory", []) if item.get("role") in {"team_lead", "pm"}),
            "repeatedPeerCount": len([item for item in student.get("peerRelationships", []) if item.get("count", 0) >= 2]),
            "careerDocumentRounds": student.get("careerDocuments", {}).get("summary", {}).get("roundCount", 0),
            "morningPresentationCount": len(student.get("morningPresentations", [])),
            "volunteerPresentationCount": len([item for item in student.get("morningPresentations", []) if item.get("isVolunteer")]),
            "practiceSubmissionCount": len(student.get("practiceSubmissions", [])),
            "practiceTextExtractedCount": len([item for item in student.get("practiceSubmissions", []) if item.get("textExtracted")]),
            "managementStatus": student.get("managementStatus", "일반"),
            "dropoutDate": student.get("dropoutInfo", {}).get("date", ""),
            "dropoutReason": student.get("dropoutInfo", {}).get("reason", ""),
            "dataStartDate": student.get("dataWindow", {}).get("startDate", ""),
            "dataEndDate": student.get("dataWindow", {}).get("endDate", ""),
            "dataEndReason": student.get("dataWindow", {}).get("endReason", ""),
            "hasStaffProfile": bool(student.get("staffProfile")),
            "hasCadetCard": bool(student.get("cadetCard")),
            "currentStatus": student["statusPeriods"][-1]["statusType"] if student["statusPeriods"] else "안정",
        }

        student["timelineEvents"] = sorted(
            student["timelineEvents"],
            key=lambda item: (item["date"], severity_rank(item["severity"])),
        )


def event_in_range(event_date: str, start: date, end: date) -> bool:
    parsed = parse_date(event_date)
    return bool(parsed and start <= parsed <= end)


def student_milestone_participation(student: dict[str, Any], start: date, end: date) -> dict[str, Any]:
    dropout_info = student.get("dropoutInfo", {}) or {}
    dropout_date = parse_date(dropout_info.get("date", ""))
    joined_date = parse_date(dropout_info.get("joinedAt", ""))
    if not joined_date:
        admission_dates = [
            parse_date(event.get("date", ""))
            for event in student.get("timelineEvents", [])
            if event.get("type") == "admission"
        ]
        joined_date = min([item for item in admission_dates if item], default=None)

    participated = True
    reason = ""
    if joined_date and joined_date > end:
        participated = False
        reason = "마일스톤 종료 후 합류"
    if dropout_date and dropout_date < start:
        participated = False
        reason = "마일스톤 시작 전 이탈"

    return {
        "participated": participated,
        "joinedDate": joined_date.isoformat() if joined_date else "",
        "dropoutDate": dropout_date.isoformat() if dropout_date else "",
        "dropoutDuringMilestone": bool(dropout_date and start <= dropout_date <= end),
        "participationReason": reason,
    }


def build_project_phase_ranges(curriculum: dict[str, Any], phase_dates: dict[str, list[date]]) -> list[dict[str, Any]]:
    course_start = parse_date(curriculum["startDate"])
    course_end = parse_date(curriculum["endDate"])
    if not course_start or not course_end:
        return []

    phase_end_dates = {
        label: max(
            [
                item
                for item in phase_dates.get(label, [])
                if date_in_window(item, course_start - timedelta(days=45), course_end + timedelta(days=30))
            ],
            default=None,
        )
        for label in EXPECTED_PROJECT_PHASE_LABELS
    }

    for index, label in enumerate(EXPECTED_PROJECT_PHASE_LABELS):
        if phase_end_dates[label]:
            continue

        previous_labels = EXPECTED_PROJECT_PHASE_LABELS[:index]
        next_labels = EXPECTED_PROJECT_PHASE_LABELS[index + 1 :]
        previous_end = next(
            (phase_end_dates[item] for item in reversed(previous_labels) if phase_end_dates[item]),
            None,
        )
        next_end = next(
            (phase_end_dates[item] for item in next_labels if phase_end_dates[item]),
            None,
        )

        if previous_end and next_end:
            prev_index = max(i for i, item in enumerate(EXPECTED_PROJECT_PHASE_LABELS[:index]) if phase_end_dates[item])
            next_index = min(
                index + 1 + i
                for i, item in enumerate(EXPECTED_PROJECT_PHASE_LABELS[index + 1 :])
                if phase_end_dates[item]
            )
            step = max(7, (next_end - previous_end).days // max(1, next_index - prev_index))
            phase_end_dates[label] = previous_end + timedelta(days=step * (index - prev_index))
        elif previous_end:
            remaining_segments = (len(EXPECTED_PROJECT_PHASE_LABELS) - index) + 1
            remaining_days = max(14, (course_end - previous_end).days)
            step = max(7, remaining_days // remaining_segments)
            phase_end_dates[label] = min(course_end - timedelta(days=remaining_segments - 1), previous_end + timedelta(days=step))
        elif next_end:
            remaining_segments = index + 1
            remaining_days = max(14, (next_end - course_start).days)
            step = max(7, remaining_days // remaining_segments)
            phase_end_dates[label] = course_start + timedelta(days=step * (index + 1))
        else:
            total_segments = len(EXPECTED_PROJECT_PHASE_LABELS) + 1
            total_days = max(28, (course_end - course_start).days)
            step = max(7, total_days // total_segments)
            phase_end_dates[label] = course_start + timedelta(days=step * (index + 1))

    ranges = []
    range_start = course_start
    for label in EXPECTED_PROJECT_PHASE_LABELS:
        range_end = min(course_end, phase_end_dates[label] or course_end)
        ranges.append(
            {
                "phase": label,
                "startDate": range_start.isoformat(),
                "endDate": range_end.isoformat(),
                "dates": [item.isoformat() for item in sorted(phase_dates.get(label, [])) if item],
                "isEstimated": not bool(phase_dates.get(label)),
            }
        )
        range_start = min(course_end, range_end + timedelta(days=1))
    return ranges


def build_milestones(
    curriculum: dict[str, Any],
    phase_ranges: list[dict[str, Any]],
    students: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    course_start = parse_date(curriculum["startDate"])
    course_end = parse_date(curriculum["endDate"])
    if not course_start or not course_end:
        return []

    admission_dates = [
        parse_date(event["date"])
        for student in students
        for event in student.get("timelineEvents", [])
        if event.get("type") == "admission" and parse_date(event.get("date"))
    ]
    admission_start = min(admission_dates, default=course_start - timedelta(days=21))
    phase_ends = {item["phase"]: parse_date(item["endDate"]) for item in phase_ranges}

    milestone_specs = [
        {
            "id": "m1",
            "label": "모집 ~ 개강",
            "startDate": admission_start.isoformat(),
            "endDate": (course_start - timedelta(days=1)).isoformat(),
            "isEstimated": False,
        },
        {
            "id": "m2",
            "label": "개강 ~ 1차 프로젝트 종료",
            "startDate": course_start.isoformat(),
            "endDate": (phase_ends.get(EXPECTED_PROJECT_PHASE_LABELS[0]) or course_start).isoformat(),
            "isEstimated": phase_ranges[0]["isEstimated"] if phase_ranges else False,
        },
        {
            "id": "m3",
            "label": "1차 프로젝트 종료 ~ 2차 프로젝트 종료",
            "startDate": ((phase_ends.get(EXPECTED_PROJECT_PHASE_LABELS[0]) or course_start) + timedelta(days=1)).isoformat(),
            "endDate": (phase_ends.get(EXPECTED_PROJECT_PHASE_LABELS[1]) or course_start).isoformat(),
            "isEstimated": phase_ranges[1]["isEstimated"] if len(phase_ranges) > 1 else False,
        },
        {
            "id": "m4",
            "label": "2차 프로젝트 종료 ~ 3차 프로젝트 종료",
            "startDate": ((phase_ends.get(EXPECTED_PROJECT_PHASE_LABELS[1]) or course_start) + timedelta(days=1)).isoformat(),
            "endDate": (phase_ends.get(EXPECTED_PROJECT_PHASE_LABELS[2]) or course_start).isoformat(),
            "isEstimated": phase_ranges[2]["isEstimated"] if len(phase_ranges) > 2 else False,
        },
        {
            "id": "m5",
            "label": "3차 프로젝트 종료 ~ 4차 프로젝트 종료",
            "startDate": ((phase_ends.get(EXPECTED_PROJECT_PHASE_LABELS[2]) or course_start) + timedelta(days=1)).isoformat(),
            "endDate": (phase_ends.get(EXPECTED_PROJECT_PHASE_LABELS[3]) or course_end).isoformat(),
            "isEstimated": phase_ranges[3]["isEstimated"] if len(phase_ranges) > 3 else True,
        },
        {
            "id": "m6",
            "label": "4차 프로젝트 종료 ~ 종강",
            "startDate": ((phase_ends.get(EXPECTED_PROJECT_PHASE_LABELS[3]) or course_end) + timedelta(days=1)).isoformat(),
            "endDate": course_end.isoformat(),
            "isEstimated": phase_ranges[3]["isEstimated"] if len(phase_ranges) > 3 else True,
        },
    ]

    milestones = []
    for item in milestone_specs:
        start_date = parse_date(item["startDate"]) or course_start
        end_date = parse_date(item["endDate"]) or course_end
        if end_date < start_date:
            end_date = start_date
        milestones.append(
            {
                **item,
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
            }
        )
    return milestones


def summarize_milestone(
    student: dict[str, Any],
    milestone: dict[str, Any],
    phase_dates: dict[str, list[date]],
    previous_average: float | None,
) -> dict[str, Any]:
    start_date = parse_date(milestone["startDate"])
    end_date = parse_date(milestone["endDate"])
    if not start_date or not end_date:
        return {}

    participation = student_milestone_participation(student, start_date, end_date)
    observation_end = student_observation_end(student, end_date) or end_date
    effective_end = min(end_date, observation_end)
    snapshot = build_snapshot(student, milestone["label"], effective_end, effective_end, phase_dates)
    profile_avg = profile_average(snapshot["scores"])
    events = [
        event
        for event in student.get("timelineEvents", [])
        if event_in_range(event.get("date", ""), start_date, effective_end)
    ]
    role_history = [
        item
        for item in student.get("projectTeamHistory", [])
        if event_in_range(item.get("date", ""), start_date, effective_end)
    ]
    career_rounds = [
        item
        for item in student.get("careerDocuments", {}).get("rounds", [])
        if event_in_range(item.get("date", ""), start_date, effective_end)
    ]
    attendance_count = sum(1 for event in events if event.get("type") == "attendance")
    attendance_risk_count = sum(
        1
        for event in events
        if event.get("type") == "attendance" and event.get("scoreImpact") == "behavioral"
    )
    counseling_count = sum(1 for event in events if event.get("type") == "counseling")
    project_count = sum(1 for event in events if event.get("type") in {"project", "retro"})
    career_count = sum(1 for event in events if event.get("type") == "career")
    growth_delta = round(profile_avg - previous_average, 2) if profile_avg is not None and previous_average is not None else None
    judged_scores = [(key, value) for key, value in snapshot["scores"].items() if isinstance(value, (int, float))]
    sorted_scores = sorted(judged_scores, key=lambda item: item[1], reverse=True)
    strength_keys = [key for key, _ in sorted_scores[:2]]
    caution_keys = [key for key, value in sorted(judged_scores, key=lambda item: item[1])[:2] if value <= 2]

    return {
        "id": milestone["id"],
        "label": milestone["label"],
        "startDate": milestone["startDate"],
        "endDate": milestone["endDate"],
        "effectiveEndDate": effective_end.isoformat(),
        "dataWindowCapped": bool(student.get("dataWindow", {}).get("isCapped") and effective_end < end_date),
        "isEstimated": milestone["isEstimated"],
        **participation,
        "scores": snapshot["scores"],
        "judgedKeys": snapshot.get("judgedKeys", []),
        "profileAverage": profile_avg,
        "growthDelta": growth_delta,
        "strengthKeys": strength_keys,
        "cautionKeys": caution_keys,
        "confidence": snapshot["confidence"],
        "note": snapshot["note"],
        "eventCounts": {
            "attendance": attendance_count,
            "attendanceRisk": attendance_risk_count,
            "counseling": counseling_count,
            "project": project_count,
            "career": career_count,
            "dropout": 1 if participation["dropoutDuringMilestone"] else 0,
        },
        "events": [
            {
                "id": event["id"],
                "date": event["date"],
                "title": event["title"],
                "summary": event["summary"],
                "detail": event.get("detail", event["summary"]),
                "severity": event["severity"],
                "type": event["type"],
                "sourceLabel": event.get("sourceLabel", ""),
            }
            for event in events
        ],
        "roles": [item.get("roleLabel", "") for item in role_history if item.get("roleLabel")],
        "careerRoundCount": len(career_rounds),
    }


def classify_student(student: dict[str, Any], growth_high_threshold: float) -> dict[str, Any]:
    milestone_summaries = [
        item
        for item in student.get("milestones", [])
        if item.get("participated", True) and item.get("profileAverage") is not None
    ]
    first_average = milestone_summaries[0]["profileAverage"] if milestone_summaries else 0.0
    current_average = milestone_summaries[-1]["profileAverage"] if milestone_summaries else 0.0
    latest_confidence = milestone_summaries[-1].get("confidence", "Low") if milestone_summaries else "Low"
    growth_delta = round(current_average - first_average, 2)
    positive_growth_steps = sum(1 for item in milestone_summaries if (item.get("growthDelta") or 0) > 0)
    profile_keys = ["selfRegulation", "engagement", "collaboration", "resilience", "reflection", "careerAgency"]
    current_profile_values = [
        student["currentProfile"].get(key)
        for key in profile_keys
        if isinstance(student["currentProfile"].get(key), (int, float))
    ]
    caution_count = len([value for value in current_profile_values if value <= 2])
    support_reasons = []
    if student["stats"].get("attendanceRiskIssues", 0) >= 2:
        support_reasons.append(f"무단/무연락 결석 {student['stats'].get('attendanceRiskIssues', 0)}건")
    if student["stats"]["projectSubmissionRate"] < 70:
        support_reasons.append(f"프로젝트 제출률 {student['stats']['projectSubmissionRate']}%")
    if student["stats"]["currentStatus"] != "안정":
        support_reasons.append(f"현재 상태 {student['stats']['currentStatus']}")
    if current_profile_values and min(current_profile_values) <= 1:
        support_reasons.append("프로파일 1점 이하 영역 존재")
    if caution_count >= 3:
        support_reasons.append(f"주의 프로파일 {caution_count}개")
    learning_support_cases = [
        case
        for case in student.get("learningFlowCases", [])
        if case.get("caseType") in {"oversleep_condition_rhythm", "condition_management_sequence", "health_project_strain", "daily_checkin_pattern", "collaboration_conflict_signal"}
        or (case.get("caseType") == "health_management_watch" and case.get("severity") == "warning")
    ]
    if learning_support_cases:
        support_reasons.append(
            "학습 흐름 케이스 "
            + ", ".join(case["label"] for case in learning_support_cases[:3])
        )
    field_risk = field_performance_risk(student)
    if field_risk.get("hardGate"):
        support_reasons.extend(field_risk.get("reasons", [])[:2] or ["현장 실력/이해도 저평가 하드 게이트"])
    elif field_risk.get("hasRisk"):
        support_reasons.extend(field_risk.get("reasons", [])[:1])

    profile_index = round((current_average / 4) * 100) if current_average else 0
    growth_index = round(max(0, min(100, 50 + (growth_delta * 30))))
    staff_profile = student.get("staffProfile", {})
    career_rounds = student.get("careerDocuments", {}).get("rounds", [])
    admission = student.get("admission", {})
    career_text = "\n".join(
        [
            admission.get("intro", ""),
            admission.get("motivation", ""),
            admission.get("career", ""),
            admission.get("goal", ""),
            student.get("cadetCard", {}).get("fullText", ""),
            staff_profile.get("fullText", ""),
            "\n".join(
                "\n".join(
                    filter(
                        None,
                        [
                            round_item.get("documents", {}).get("selfIntroduction", ""),
                            round_item.get("documents", {}).get("resume", ""),
                            round_item.get("feedback", ""),
                        ],
                    )
                )
                for round_item in career_rounds
            ),
        ]
    )
    career_readiness = score_career_readiness(career_text, career_rounds)
    career_readiness["presentationContent"] = score_career_presentation_content(student)
    collaboration_readiness = score_collaboration_readiness(student)
    expression_profile = score_expression_profile(student)
    peer_risk = peer_reputation_risk(collaboration_readiness)
    mismatch_risk = evaluation_mismatch_risk(student, field_risk, collaboration_readiness)
    if peer_risk.get("hardGate"):
        support_reasons.extend(peer_risk.get("reasons", [])[:3] or ["동료 평판 위험 신호 확인"])
    if mismatch_risk.get("hasRisk"):
        support_reasons.extend(mismatch_risk.get("reasons", [])[:2])
    support_score = len(support_reasons)
    support_index = round(
        max(
            0,
            min(
                100,
                support_score * 18
                + student["stats"].get("attendanceRiskIssues", 0) * 10
                + (10 if field_risk.get("hardGate") else 0)
                + (10 if peer_risk.get("hardGate") else 0)
                + (8 if mismatch_risk.get("hasRisk") else 0),
            ),
        )
    )
    risk_flags = {
        "fieldPerformance": field_risk,
        "peerReputation": peer_risk,
        "evaluationMismatch": mismatch_risk,
        "blocksExcellent": bool(field_risk.get("hardGate") or peer_risk.get("hardGate") or mismatch_risk.get("hardGate")),
        "blocksCollaborationStrength": bool(peer_risk.get("hardGate")),
    }
    rank_scores = build_rank_scores(
        student,
        first_average=first_average,
        current_average=current_average,
        growth_delta=growth_delta,
        positive_growth_steps=positive_growth_steps,
        latest_confidence=latest_confidence,
        support_score=support_score,
        support_index=support_index,
        collaboration_readiness=collaboration_readiness,
        career_readiness=career_readiness,
    )

    overall_condition = (
        rank_scores["total"] >= 78
        and caution_count <= 1
        and student["stats"]["currentStatus"] == "안정"
        and not risk_flags["blocksExcellent"]
    )
    growth_condition = (
        rank_scores["growth"] >= 85
        and current_average >= 2.8
        and not field_risk.get("hardGate")
        and not mismatch_risk.get("hardGate")
    )
    support_condition = (
        support_index >= 70
        or field_risk.get("hardGate")
        or peer_risk.get("hardGate")
        or mismatch_risk.get("hasRisk")
    )
    career_condition = (
        rank_scores["career"] >= 68
        and career_readiness["careerReadinessScore"] >= 62
        and career_readiness["purposeClarity"] >= 2.5
        and career_readiness["selfStrengthAwareness"] >= 2.5
        and career_readiness["hasConcreteGoal"]
        and career_readiness["objectiveEvidenceScore"] >= 55
    )
    engagement_score = student["currentProfile"].get("engagement")
    collaboration_score = student["currentProfile"].get("collaboration")
    condition_attention_cases = [
        case
        for case in student.get("learningFlowCases", [])
        if case.get("caseType") in {"oversleep_condition_rhythm", "condition_management_sequence", "health_project_strain"}
    ]
    attendance_condition = student["stats"].get("attendanceRiskIssues", 0) >= 2 or bool(condition_attention_cases) or (
        isinstance(engagement_score, (int, float)) and engagement_score <= 2
    )

    tags = []
    if overall_condition:
        tags.append("overall_strong")
    if growth_condition:
        tags.append("growth_high")
    if support_condition:
        tags.append("support_priority")
    has_collaboration_quality = (
        collaboration_readiness["retroQuality"] >= 2.7
        or collaboration_readiness["roleExecution"] >= 2.7
        or (
            collaboration_readiness["trajectory"]["delta"] >= 8
            and collaboration_readiness["trajectory"]["currentScore"] >= 80
        )
    )
    collaboration_condition = (
        isinstance(collaboration_score, (int, float))
        and collaboration_score >= 3
        and has_collaboration_quality
        and rank_scores["collaboration"] >= 70
        and collaboration_readiness["collaborationReadinessScore"] >= 68
        and collaboration_readiness["sameProjectPeerComplaintWeight"] == 0
        and collaboration_readiness["peerRiskPenalty"] < 0.45
        and (collaboration_readiness["checkinCount"] >= 3 or collaboration_readiness["retroCount"] >= 1)
        and not risk_flags["blocksCollaborationStrength"]
    )
    if collaboration_condition:
        tags.append("collaboration_strength")
    if career_condition:
        tags.append("career_progress")
    if attendance_condition:
        tags.append("attendance_watch")
    if not tags:
        tags.append("steady_path")

    strength_keys = sorted(
        [key for key in profile_keys if isinstance(student["currentProfile"].get(key), (int, float))],
        key=lambda key: student["currentProfile"][key],
        reverse=True,
    )[:2]
    caution_keys = [
        key
        for key in sorted(
            [key for key in profile_keys if isinstance(student["currentProfile"].get(key), (int, float))],
            key=lambda key: student["currentProfile"][key],
        )[:2]
        if student["currentProfile"][key] <= 2
    ]

    primary_tag_order = [
        "overall_strong",
        "growth_high",
        "collaboration_strength",
        "career_progress",
        "attendance_watch",
        "support_priority",
        "steady_path",
    ]
    primary_tag = next((tag for tag in primary_tag_order if tag in tags), "steady_path")
    tag_reasons = {
        "overall_strong": {
            "qualified": overall_condition,
            "reasons": [
                f"총점 {rank_scores['total']}/100",
                f"현재 평균 {current_average}/4",
                f"주의 프로파일 {caution_count}개",
                f"현재 상태 {student['stats']['currentStatus']}",
            ],
        },
        "growth_high": {
            "qualified": growth_condition,
            "reasons": [
                f"성장 가능성 {rank_scores['growth']}/100",
                f"패턴 {rank_scores['growthPotential']['pattern']}",
                f"초기 대비 변화 {growth_delta:+.2f}",
                f"성장 구간 {positive_growth_steps}개",
                f"현재 평균 {current_average}/4",
                f"신뢰도 {latest_confidence}",
            ],
        },
        "support_priority": {
            "qualified": support_condition,
            "reasons": support_reasons
            if support_reasons
            else ["출결, 제출률, 현재 상태, 프로파일 저점이 집중 지원 기준 미만입니다."],
        },
        "collaboration_strength": {
            "qualified": collaboration_condition,
            "reasons": [
                f"협업 점수 {student['currentProfile']['collaboration']}/4",
                f"체크인 정시율 {collaboration_readiness['checkinOnTimeRate']}%",
                f"회고 품질 {collaboration_readiness['retroQuality']}/4",
                f"프로젝트 역할 수행 {collaboration_readiness['roleExecution']}/4",
                f"같은 프로젝트 팀원 불만/갈등 가중치 {collaboration_readiness['sameProjectPeerComplaintWeight']}",
                f"협업 변화 {collaboration_readiness['trajectory']['label']} ({collaboration_readiness['trajectory']['delta']:+.1f})",
            ],
        },
        "career_progress": {
            "qualified": career_condition,
            "reasons": [
                f"진로역량 {rank_scores['career']}/100",
                f"진로 준비 점수 {career_readiness['careerReadinessScore']}",
                f"목적 명확성 {career_readiness['purposeClarity']}",
                f"자기 강점 {career_readiness['selfStrengthAwareness']}",
                f"구체 직무/목표 {'있음' if career_readiness['hasConcreteGoal'] else '부족'}",
                f"객관 근거 점수 {career_readiness['objectiveEvidenceScore']}",
                f"추상 표현 {career_readiness['abstractExpressionCount']}건",
            ],
        },
        "attendance_watch": {
            "qualified": attendance_condition,
            "reasons": [
                f"무단/무연락 결석 {student['stats'].get('attendanceRiskIssues', 0)}건",
                f"건강/컨디션 출결 {student['stats'].get('healthAttendanceIssues', 0)}건",
                f"컨디션 케이스 {len(condition_attention_cases)}건",
                f"참여 지속성 {student['currentProfile']['engagement']}/4",
                "늦잠 지각은 태도형 위험이 아니라 건강/컨디션 관리 흐름으로 해석합니다.",
            ],
        },
        "steady_path": {
            "qualified": primary_tag == "steady_path",
            "reasons": ["상위 위험/강점 분류 기준에 뚜렷하게 걸리지 않아 안정 관찰로 분류했습니다."],
        },
    }

    return {
        "profileAverage": current_average,
        "profileIndex": profile_index,
        "growthDelta": growth_delta,
        "growthIndex": growth_index,
        "supportIndex": support_index,
        "tags": tags,
        "primaryTag": primary_tag,
        "tagReasons": tag_reasons,
        "strengthKeys": strength_keys,
        "cautionKeys": caution_keys,
        "careerReadiness": career_readiness,
        "collaborationReadiness": collaboration_readiness,
        "expressionProfile": expression_profile,
        "operationalRiskFlags": risk_flags,
        "initialCapability": rank_scores["initialCapability"],
        "growthPotential": rank_scores["growthPotential"],
        "participationReadiness": rank_scores["participation"],
        "scoreWeights": rank_scores["weights"],
        "profileRankScore": rank_scores["total"],
        "totalRankScore": rank_scores["total"],
        "initialCapabilityRankScore": rank_scores["initialCapability"]["score"],
        "growthRankScore": rank_scores["growth"],
        "growthPotentialRankScore": rank_scores["growth"],
        "participationRankScore": rank_scores["participation"]["score"],
        "supportRankScore": rank_scores["supportNeed"],
        "collaborationRankScore": rank_scores["collaboration"],
        "careerRankScore": rank_scores["career"],
        "rankScoreBasis": {
            "total": "총점은 초기역량 10%, 진로역량 22%, 성장가능성 28%, 과정참여도 20%, 협업 20%로 산정하며 지원 필요도는 합산하지 않음",
            "initialCapability": "초기역량은 전공/학력, 기존 경험, 모집 서류의 사전 경험을 낮은 비중으로 반영",
            "growth": "성장 가능성은 현재 수준, 상승폭, 높은 수준 유지, 최신 근거 신뢰도를 함께 반영",
            "participation": "과정참여도는 출석, 과제 제출, 데일리 체크인/TIL 응답, 회고 지속성을 반영",
            "support": "지원 필요도 점수. 총점과 분리된 운영 검토 지표로, 현장 우려·출결/제출 위험·동료 평판 위험·기록-평가 불일치를 반영",
            "collaboration": "운영진 관계·소통 메모, 같은 프로젝트 팀원 언급, PM/팀장 수행 회고, 동료 긍정·부정 발화를 분리 가중하고 동료 비판은 우수 협업 판정을 차단",
            "career": "진로역량은 구체 직무/목표, 객관 자료, 진로 문서 피드백, 현장 메모의 명확성, 발표 주제의 직무 관련성을 함께 반영",
        },
    }


def build_career_guidance(student: dict[str, Any]) -> dict[str, Any]:
    strength_counter: Counter[str] = Counter()
    evidence: list[str] = []
    for submission in student.get("practiceSubmissions", []):
        for key, count in submission.get("strengthHits", {}).items():
            strength_counter[key] += count
        if submission.get("excerpt"):
            evidence.append(f"{submission.get('assignment', '실습')}: {submission['excerpt']}")
    presentation_topics = [item.get("topic", "") for item in student.get("morningPresentations", []) if item.get("topic")]
    presentation_text = "\n".join(presentation_topics)
    for key, meta in PRACTICE_STRENGTH_KEYWORDS.items():
        count = keyword_occurrence_count(presentation_text, meta["keywords"])
        if count:
            strength_counter[key] += count
    profile_strengths = student.get("derived", {}).get("strengthKeys", [])
    career = student.get("derived", {}).get("careerReadiness", {})
    top_domains = [
        {
            "key": key,
            "label": PRACTICE_STRENGTH_KEYWORDS[key]["label"],
            "score": count,
        }
        for key, count in strength_counter.most_common(4)
    ]
    if not top_domains and profile_strengths:
        fallback_labels = {
            "reflection": "성찰 기반 성장",
            "collaboration": "협업/소통",
            "careerAgency": "진로 주도성",
            "selfRegulation": "자기관리",
            "engagement": "참여 지속성",
            "resilience": "회복탄력성",
        }
        top_domains = [{"key": key, "label": fallback_labels.get(key, key), "score": 1} for key in profile_strengths[:3]]

    selling_points = []
    if top_domains:
        selling_points.append(f"{top_domains[0]['label']} 관련 산출물과 발표 이력이 있어 포트폴리오의 첫 인상으로 활용할 수 있습니다.")
    if student.get("stats", {}).get("volunteerPresentationCount", 0) > 0:
        selling_points.append("지각 보완이 아닌 자원 발표 이력이 있어 관심사를 공개적으로 정리하고 공유한 경험을 강조할 수 있습니다.")
    if career.get("purposeClarity", 0) >= 2.5:
        selling_points.append("지원서·진로 문서에서 직무 목적성이 비교적 분명하게 드러납니다.")
    if student.get("derived", {}).get("collaborationReadiness", {}).get("peerPraiseCount", 0) >= 2:
        selling_points.append("동료 언급에서 긍정적 관계 신호가 있어 협업 사례로 전환할 수 있습니다.")
    if not selling_points:
        selling_points.append("현재 자료는 제출 이력과 기본 프로파일 중심이므로, 대표 산출물 1개를 골라 강점 문장으로 재정리하는 것이 우선입니다.")

    portfolio_angles = []
    for domain in top_domains[:3]:
        portfolio_angles.append(f"{domain['label']} 사례: 관련 실습 제출물과 발표 주제를 연결해 문제 정의, 의도, 결과를 3단 구성으로 정리")
    if not portfolio_angles:
        portfolio_angles.append("대표 프로젝트/실습 1개를 선택해 맡은 역할, 판단 근거, 개선점을 정리")

    return {
        "topDomains": top_domains,
        "sellingPoints": selling_points[:4],
        "portfolioAngles": portfolio_angles[:4],
        "evidence": evidence[:6],
        "presentationTopics": presentation_topics[:8],
        "submissionCount": len(student.get("practiceSubmissions", [])),
        "presentationCount": len(student.get("morningPresentations", [])),
    }


def build_student_group_signals(student: dict[str, Any]) -> list[dict[str, Any]]:
    signals = []
    stats = student.get("stats", {})
    derived = student.get("derived", {})
    guidance = student.get("careerGuidance", {})
    risk_flags = derived.get("operationalRiskFlags", {})
    field_flag = risk_flags.get("fieldPerformance", {})
    peer_flag = risk_flags.get("peerReputation", {})
    mismatch_flag = risk_flags.get("evaluationMismatch", {})
    if field_flag.get("hardGate"):
        signals.append(
            {
                "key": "field_performance_risk",
                "label": "현장평가 미진군",
                "basis": "; ".join(field_flag.get("reasons", [])[:2]) or "운영진 이해도/실력 저평가 하드 게이트 확인",
            }
        )
    elif field_flag.get("reviewOnly"):
        signals.append(
            {
                "key": "routine_participation_review",
                "label": "기록/참여 루틴 검토군",
                "basis": "; ".join(field_flag.get("reasons", [])[:2]) or "TIL·참여·소통 메모와 반대 근거를 함께 재검토",
            }
        )
    if peer_flag.get("hardGate"):
        signals.append(
            {
                "key": "peer_reputation_risk",
                "label": "동료평판 위험군",
                "basis": "; ".join(peer_flag.get("reasons", [])[:2]) or "동료 비판/비선호 표현 확인",
            }
        )
    elif peer_flag.get("reviewOnly"):
        signals.append(
            {
                "key": "role_conflict_review",
                "label": "역할 갈등 검토군",
                "basis": "; ".join(peer_flag.get("reasons", [])[:2]) or "단일 갈등 신호와 팀장/동료 긍정 근거를 함께 확인",
            }
        )
    if mismatch_flag.get("hasRisk"):
        signals.append(
            {
                "key": "evaluation_mismatch_review",
                "label": "평가 불일치 검토군",
                "basis": "; ".join(mismatch_flag.get("reasons", [])[:2]) or "성실 기록과 현장 평가의 불일치 확인",
            }
        )
    if stats.get("attendanceRiskIssues", 0) >= 2 or stats.get("currentStatus") in {"주의", "경고"}:
        signals.append(
            {
                "key": "operation_watch",
                "label": "운영 관찰군",
                "basis": f"현재 상태 {stats.get('currentStatus', '-')} · 출결 기록 {stats.get('attendanceIssues', 0)}건",
            }
        )
    if stats.get("practiceSubmissionCount", 0) >= 5 and guidance.get("topDomains"):
        signals.append(
            {
                "key": "portfolio_material_ready",
                "label": "포트폴리오 소재 보유군",
                "basis": f"실습 제출 {stats.get('practiceSubmissionCount', 0)}건 · 대표 강점 {guidance['topDomains'][0]['label']}",
            }
        )
    if stats.get("volunteerPresentationCount", 0) >= 1:
        signals.append(
            {
                "key": "self_publication",
                "label": "자발적 공유군",
                "basis": f"자원 발표 {stats.get('volunteerPresentationCount', 0)}건",
            }
        )
    if derived.get("careerReadiness", {}).get("careerReadinessScore", 0) >= 62:
        signals.append(
            {
                "key": "career_ready",
                "label": "취업 메시지 구체화군",
                "basis": f"진로 준비 점수 {derived['careerReadiness']['careerReadinessScore']}",
            }
        )
    if not signals:
        signals.append(
            {
                "key": "steady_observation",
                "label": "일반 관찰군",
                "basis": "위험/강점 행동군 기준에 뚜렷하게 걸리지 않아 일반 관찰로 분류",
            }
        )
    return signals


def evidence_item(source_type: str, source_label: str, excerpt: str, **extra: Any) -> dict[str, Any]:
    payload = {
        "sourceType": source_type,
        "sourceLabel": source_label,
        "excerpt": short_text(excerpt, 260),
    }
    payload.update({key: value for key, value in extra.items() if value})
    return payload


def birth_year_from_student(student: dict[str, Any]) -> int | None:
    parsed = parse_date(student.get("birthDate", ""))
    return parsed.year if parsed else None


def background_strengths(student: dict[str, Any]) -> list[dict[str, Any]]:
    strengths = []
    admission_experience = student.get("admission", {}).get("experience", "")
    has_positive_experience = bool(admission_experience) and not any(
        keyword in admission_experience for keyword in ["없습니다", "처음", "없음", "없다"]
    )
    education_text = " ".join(
        filter(
            None,
            [
                student.get("education", ""),
                student.get("experience", ""),
                admission_experience if has_positive_experience else "",
                student.get("staffProfile", {}).get("properties", {}).get("특징", ""),
            ],
        )
    )
    education_evidence = []
    if student.get("education"):
        education_evidence.append(evidence_item("기본정보", "학력", student["education"]))
    if student.get("experience"):
        education_evidence.append(evidence_item("기본정보", "경력/전공", student["experience"]))
    if has_positive_experience:
        education_evidence.append(evidence_item("지원서", "게임 관련 학습/업무 경험", admission_experience))
    background_keywords = [
        "게임",
        "프로그래밍",
        "컴퓨터",
        "소프트",
        "개발",
        "디자인",
        "영상",
        "애니메이션",
        "마케팅",
        "경영",
        "비즈니스",
        "통계",
        "사회과학",
        "QA",
        "업계경력자",
        "타직군경력자",
    ]
    if any(keyword in education_text for keyword in background_keywords):
        strengths.append(
            {
                "category": "기본 배경",
                "title": "전공/경력 배경을 게임기획 서사로 전환 가능",
                "claim": "기본정보와 지원서에 직무 관련 전공, 타 직군 경력, 또는 게임 관련 경험이 확인되어 취업 서사의 출발점으로 사용할 수 있습니다.",
                "evidence": education_evidence[:4],
                "careerUse": "자기소개서에서는 '이전 배경이 게임기획 문제 해결에 어떻게 연결되는지'를 한 문장으로 고정해 활용합니다.",
                "caution": "성별이나 나이 자체는 강점으로 쓰지 않고, 검증 가능한 학습/경력/산출물로만 설명해야 합니다.",
            }
        )

    address = student.get("address", "")
    if address and any(region in address for region in ["서울", "경기", "인천", "성남", "수원", "부천", "용인", "고양"]):
        strengths.append(
            {
                "category": "기본 배경",
                "title": "수도권 게임사 지원 접근성",
                "claim": "거주지가 수도권 또는 수도권 인접 지역으로 확인되어 오프라인 면접, 하이브리드 근무, 경기권 게임사 지원에서 일정 대응력을 설명할 수 있습니다.",
                "evidence": [evidence_item("기본정보", "거주지역", address)],
                "careerUse": "근무 가능 지역을 묻는 면접에서 통근/이주 계획을 현실적으로 답변하는 근거로 사용합니다.",
                "caution": "거주지는 역량 강점이 아니라 지원 가능성과 운영 참고 정보로만 다룹니다.",
            }
        )

    birth_year = birth_year_from_student(student)
    if birth_year and birth_year <= 1996 and any(keyword in education_text for keyword in ["경력", "업무", "회사", "QA", "마케팅", "디자인", "개발"]):
        strengths.append(
            {
                "category": "기본 배경",
                "title": "사회 경험 기반 실무 전환 서사",
                "claim": "연령 자체가 아니라 이전 업무/경력 기록이 함께 확인되어 실무 커뮤니케이션과 책임 경험을 게임업계 전환 서사로 사용할 수 있습니다.",
                "evidence": [
                    evidence_item("기본정보", "생년", f"{birth_year}년생"),
                    *education_evidence[:2],
                ],
                "careerUse": "신입 지원 시에도 '완전한 무경험자'가 아니라 실무 태도와 협업 경험을 갖춘 전환형 지원자로 설명합니다.",
                "caution": "나이 표현은 차별적 요소가 될 수 있으므로 경력과 산출물 중심으로만 표현합니다.",
            }
        )
    return strengths


def motivation_profile(student: dict[str, Any]) -> dict[str, Any]:
    admission = student.get("admission", {})
    text_sources = [
        ("지원서", "참여 신청 이유", admission.get("motivation", "")),
        ("지원서", "희망 취업 분야", admission.get("career", "")),
        ("지원서", "수료 후 목표", admission.get("goal", "")),
        ("대원카드", "대원카드 원문", student.get("cadetCard", {}).get("fullText", "")),
        ("면담", "면담 기록", "\n".join(item.get("content", "") for item in student.get("counselings", []))),
        ("아침 발표", "발표 주제", "\n".join(item.get("topic", "") for item in student.get("morningPresentations", []))),
    ]
    full_text = "\n".join(text for _, _, text in text_sources if text)
    career_hits = unique_keyword_hits(full_text, CAREER_PURPOSE_KEYWORDS + CAREER_ROLE_KEYWORDS)
    action_hits = len(student.get("practiceSubmissions", [])) + len(student.get("careerDocuments", {}).get("rounds", []))
    evidence = [
        evidence_item(source_type, source_label, text)
        for source_type, source_label, text in text_sources
        if text
    ][:5]
    missing = []
    if career_hits < 2:
        missing.append("지원 동기가 직무명, 지원 회사 유형, 만들고 싶은 산출물과 충분히 연결되지 않았습니다.")
    if action_hits < 4:
        missing.append("동기를 뒷받침하는 실습/진로 문서 행동 근거가 아직 적습니다.")
    if not admission.get("goal"):
        missing.append("수료 후 목표 원문이 약하거나 비어 있어 면접용 목표 문장을 보완해야 합니다.")

    if career_hits >= 4 and action_hits >= 5:
        motivation_type = "명확"
        reason = "지원서의 진로 언어와 이후 실습/문서 행동이 함께 확인되어 게임업계 진입 이유가 비교적 분명합니다."
    elif career_hits >= 2 and action_hits >= 4:
        motivation_type = "성장형"
        reason = "초기 동기는 완전히 선명하지 않더라도 과정 중 실습과 발표를 통해 관심 영역이 구체화되고 있습니다."
    elif any(keyword in full_text for keyword in ["전환", "이직", "경력", "회사", "업계"]):
        motivation_type = "전환형"
        reason = "이전 경험에서 게임업계로 이동하려는 맥락은 보이나, 희망 직무와 대표 산출물 연결을 더 정리해야 합니다."
    else:
        motivation_type = "약함"
        reason = "게임을 좋아한다는 수준의 동기 또는 추상적 목표는 확인되지만, 직무 선택 이유와 행동 근거가 부족합니다."

    return {
        "type": motivation_type,
        "reason": reason,
        "evidence": evidence,
        "missing": missing,
        "coachingQuestions": [
            "왜 게임업계여야 하는가?",
            "왜 이 직무를 선택했는가?",
            "가장 자신 있게 보여줄 산출물은 무엇이며, 그 산출물에서 본인의 판단은 무엇이었는가?",
        ],
    }


def practice_strength_cards(student: dict[str, Any]) -> list[dict[str, Any]]:
    by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for submission in student.get("practiceSubmissions", []):
        for key, count in submission.get("strengthHits", {}).items():
            by_domain[key].append({**submission, "hitCount": count})
    cards = []
    for key, submissions in sorted(by_domain.items(), key=lambda item: sum(sub.get("hitCount", 0) for sub in item[1]), reverse=True)[:4]:
        meta = PRACTICE_STRENGTH_KEYWORDS[key]
        examples = sorted(submissions, key=lambda item: item.get("hitCount", 0), reverse=True)[:3]
        cards.append(
            {
                "category": "실습 과제",
                "title": meta["label"],
                "claim": f"{meta['label']} 관련 키워드와 산출물이 여러 실습에서 확인됩니다.",
                "evidence": [
                    evidence_item("실습 제출", item.get("assignment", "실습"), item.get("excerpt") or item.get("fileName", ""), fileName=item.get("fileName", ""), sourceFile=item.get("sourceFile", ""))
                    for item in examples
                ],
                "careerUse": f"{meta['label']} 역량을 대표 포트폴리오 섹션으로 묶고, 문제 정의-기획 의도-검증/개선 순서로 설명합니다.",
                "caution": "키워드 출현만으로 역량을 확정하지 말고, 실제 문서 안에서 본인의 판단과 결과물을 확인해야 합니다.",
            }
        )
    return cards


def behavior_trait_cards(student: dict[str, Any]) -> list[dict[str, Any]]:
    cards = []
    positive_peer = [item for item in student.get("peerFeedback", []) if item.get("type") in {"praise", "want"}]
    positive_peer = sorted(positive_peer, key=lambda item: (not item.get("sameProject"), -safe_float(item.get("weight", 1.0))))
    complaints = [item for item in student.get("peerFeedback", []) if item.get("type") in {"complaint", "avoid"}]
    complaints = sorted(complaints, key=lambda item: (not item.get("sameProject"), -safe_float(item.get("weight", 1.0))))
    presentations = student.get("morningPresentations", [])
    volunteer = [item for item in presentations if item.get("isVolunteer")]

    def peer_label(item: dict[str, Any]) -> str:
        context = "같은 프로젝트" if item.get("sameProject") else "일반 언급"
        phase = item.get("sourcePhase") or "단계 미상"
        return f"{item.get('from', '')} 언급 · {context} · {phase}"

    if positive_peer:
        cards.append(
            {
                "category": "생활/주변 평가",
                "title": "동료에게 긍정적으로 언급된 협업 신호",
                "claim": "학생간 기록에서 배울 점, 함께하고 싶은 동료, 긍정 관계로 언급된 흔적이 확인됩니다. 같은 프로젝트 팀원의 체크인·회고 언급은 더 강한 근거로 봅니다.",
                "evidence": [
                    evidence_item(
                        "학생간 평가",
                        peer_label(item),
                        item.get("snippet", ""),
                        weight=item.get("weight"),
                    )
                    for item in positive_peer[:4]
                ],
                "careerUse": "면접에서 협업 강점을 말할 때 동료에게 어떤 점을 인정받았는지 사례형으로 정리합니다.",
                "caution": "간접 언급이므로 실제 프로젝트 역할, PM/팀장 수행 여부, 산출물과 함께 검증해야 합니다.",
            }
        )
    if volunteer:
        cards.append(
            {
                "category": "생활/주변 평가",
                "title": "자발적 발표와 관심사 공유",
                "claim": "지각 보완이 아닌 자원 발표 이력이 있어 관심사를 공개적으로 정리하고 공유한 행동이 확인됩니다.",
                "evidence": [
                    evidence_item("아침 발표", "자원 발표", item.get("topic", ""), date=item.get("presentationDate", ""))
                    for item in volunteer[:4]
                ],
                "careerUse": "관심 분야를 스스로 학습하고 팀에 공유하는 태도, 발표/문서화 역량으로 연결합니다.",
                "caution": "발표 주제와 지원 직무 사이의 연결 문장을 별도로 정리해야 합니다.",
            }
        )
    if complaints or student.get("stats", {}).get("attendanceIssues", 0) >= 8:
        evidence = [
            evidence_item(
                "학생간 평가",
                peer_label(item),
                item.get("snippet", ""),
                weight=item.get("weight"),
            )
            for item in complaints[:3]
        ]
        if student.get("stats", {}).get("attendanceIssues", 0) >= 8:
            evidence.append(evidence_item("출결 기록", "출결 기록", f"출결 기록 {student['stats'].get('attendanceIssues', 0)}건 · 무단/무연락 {student['stats'].get('attendanceRiskIssues', 0)}건"))
        cards.append(
            {
                "category": "개선점",
                "title": "생활 리듬/협업 신뢰도 점검 필요",
                "basis": "출결 기록 또는 주변 평가에서 취업 전 점검이 필요한 신호가 확인됩니다.",
                "evidence": evidence,
                "coachingQuestion": "반복되는 리듬 문제나 협업 우려를 줄이기 위해 어떤 관리 루틴을 만들었는가?",
            }
        )
    return cards


def build_strength_profile(student: dict[str, Any]) -> dict[str, Any]:
    motivation = motivation_profile(student)
    strengths = []
    strengths.extend(background_strengths(student))
    strengths.extend(practice_strength_cards(student))
    behavior_cards = behavior_trait_cards(student)
    strengths.extend([card for card in behavior_cards if card.get("category") != "개선점"])

    improvements = [card for card in behavior_cards if card.get("category") == "개선점"]
    if motivation["type"] in {"약함", "전환형"} or motivation.get("missing"):
        improvements.append(
            {
                "title": "게임업계 진입 동기 보완",
                "basis": motivation["reason"],
                "evidence": motivation["evidence"][:3],
                "coachingQuestion": "지원 직무와 대표 산출물을 기준으로 게임업계 진입 이유를 한 문단으로 다시 정리하세요.",
            }
        )
    if student.get("stats", {}).get("practiceSubmissionCount", 0) < 3:
        improvements.append(
            {
                "title": "검증 가능한 실습 산출물 부족",
                "basis": f"연결된 실습 제출 {student.get('stats', {}).get('practiceSubmissionCount', 0)}건으로 강점 검증 자료가 부족합니다.",
                "evidence": [evidence_item("실습 제출", "제출 집계", f"실습 제출 {student.get('stats', {}).get('practiceSubmissionCount', 0)}건")],
                "coachingQuestion": "가장 직무와 가까운 실습 1개를 보완 제출하거나 기존 프로젝트 산출물을 정리하세요.",
            }
        )

    confidence = "high" if len(strengths) >= 3 and sum(len(item.get("evidence", [])) for item in strengths) >= 5 else "medium" if strengths else "low"
    headline = strengths[0]["title"] if strengths else "검증 가능한 강점 정리 필요"
    return {
        "overview": {
            "headline": headline,
            "confidence": confidence,
            "summary": f"{headline} 중심으로 취업 서사를 구성하되, 개선점 {len(improvements)}개를 함께 코칭해야 합니다.",
        },
        "strengths": strengths[:8],
        "improvements": improvements[:6],
        "motivation": motivation,
        "behaviorTraits": [card for card in behavior_cards if card.get("category") != "개선점"],
        "employabilityAngles": student.get("careerGuidance", {}).get("portfolioAngles", [])[:4],
    }


def build_dashboard_summary(students: list[dict[str, Any]], milestones: list[dict[str, Any]]) -> dict[str, Any]:
    stable_count = sum(1 for student in students if student["stats"]["currentStatus"] == "안정")
    caution_count = sum(1 for student in students if student["stats"]["currentStatus"] == "주의")
    warning_count = len(students) - stable_count - caution_count

    def pick_top(score_key: str, limit: int = 5) -> list[dict[str, Any]]:
        ordered = sorted(students, key=lambda item: item["derived"][score_key], reverse=True)
        return [
            {
                "id": student["id"],
                "name": student["name"],
                "score": student["derived"][score_key],
                "primaryTag": student["derived"]["primaryTag"],
                "strengthKeys": student["derived"]["strengthKeys"],
                "cautionKeys": student["derived"]["cautionKeys"],
                "profileIndex": student["derived"]["profileIndex"],
                "growthIndex": student["derived"]["growthIndex"],
            }
            for student in ordered[:limit]
        ]

    scatter_points = [
        {
            "id": student["id"],
            "name": student["name"],
            "x": student["derived"]["growthIndex"],
            "y": student["derived"]["profileIndex"],
            "primaryTag": student["derived"]["primaryTag"],
        }
        for student in students
    ]

    return {
        "studentCount": len(students),
        "stableCount": stable_count,
        "cautionCount": caution_count,
        "warningCount": warning_count,
        "studentsWithCareerDocuments": sum(1 for student in students if student["stats"]["careerDocumentRounds"] > 0),
        "milestoneCount": len(milestones),
        "topOverall": pick_top("profileRankScore"),
        "topInitialCapability": pick_top("initialCapabilityRankScore"),
        "topGrowth": pick_top("growthRankScore"),
        "topParticipation": pick_top("participationRankScore"),
        "supportPriority": pick_top("supportRankScore"),
        "collaborationStrength": pick_top("collaborationRankScore"),
        "careerProgress": pick_top("careerRankScore"),
        "learningCaseLibrary": build_learning_case_library(students),
        "scatterPoints": scatter_points,
    }


def enrich_student_analysis(
    students: list[dict[str, Any]],
    curriculum: dict[str, Any],
    phase_dates: dict[str, list[date]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    phase_ranges = build_project_phase_ranges(curriculum, phase_dates)
    milestones = build_milestones(curriculum, phase_ranges, students)

    for student in students:
        milestone_summaries = []
        previous_average = None
        for milestone in milestones:
            summary = summarize_milestone(student, milestone, phase_dates, previous_average)
            milestone_summaries.append(summary)
            if summary.get("participated", True) and summary.get("profileAverage") is not None:
                previous_average = summary.get("profileAverage", previous_average)
        student["milestones"] = milestone_summaries
        student["evaluationSnapshots"] = [
            {
                "snapshotId": f"{student['id']}-{item['id']}",
                "snapshotDate": item.get("effectiveEndDate", item["endDate"]),
                "snapshotType": item["label"],
                "scores": item["scores"],
                "confidence": item["confidence"],
                "note": item["note"],
            }
            for item in milestone_summaries
        ]
        latest_snapshot = next(
            (
                snapshot
                for snapshot, milestone in zip(reversed(student["evaluationSnapshots"]), reversed(milestone_summaries))
                if milestone.get("participated", True)
            ),
            student["evaluationSnapshots"][-1] if student["evaluationSnapshots"] else None,
        )
        if latest_snapshot:
            student["currentProfile"] = {
                **latest_snapshot["scores"],
                "confidence": latest_snapshot["confidence"],
                "note": latest_snapshot["note"],
                "updatedAt": latest_snapshot["snapshotDate"],
            }

    for student in students:
        student["learningFlowCases"] = analyze_learning_flow_cases(student)

    growth_high_threshold = max(
        0.75,
        percentile_value(
            [
                round(participated[-1]["profileAverage"] - participated[0]["profileAverage"], 2)
                for item in students
                if (
                    participated := [
                        milestone
                        for milestone in item.get("milestones", [])
                        if milestone.get("participated", True) and milestone.get("profileAverage") is not None
                    ]
                )
            ],
            0.75,
        ),
    )

    for student in students:
        student["derived"] = classify_student(student, growth_high_threshold)
        student["careerGuidance"] = build_career_guidance(student)
        student["strengthProfile"] = build_strength_profile(student)
        student["studentGroupSignals"] = build_student_group_signals(student)

    dashboard = build_dashboard_summary(students, milestones)
    return phase_ranges, {
        "phaseRanges": phase_ranges,
        "milestones": milestones,
        "dashboard": dashboard,
    }


def build_payload() -> dict[str, Any]:
    students, students_by_name = build_students()
    curriculum, weeks = build_curriculum()
    course_start = parse_date(curriculum["startDate"])
    if course_start is None:
        raise RuntimeError("커리큘럼 시작일을 찾을 수 없습니다.")

    add_admission_data(students_by_name, course_start, weeks)
    add_staff_student_info(students_by_name, weeks)
    add_cadet_card_data(students_by_name, weeks)
    phase_dates = add_project_data(students_by_name, weeks)
    add_project_team_data(students_by_name, weeks, phase_dates)
    add_attendance_data(students_by_name, weeks)
    add_counseling_data(students_by_name, weeks)
    add_career_document_data(students_by_name, weeks)
    add_morning_presentation_data(students_by_name, weeks)
    add_practice_submission_data(students_by_name, weeks)
    infer_missing_dropout_dates(students, weeks)
    cap_student_records_to_observation_window(students, curriculum)
    add_peer_feedback_mentions(students)
    cap_student_records_to_observation_window(students, curriculum)
    build_evaluation_and_status(students, curriculum, weeks, phase_dates)
    phase_ranges, analysis = enrich_student_analysis(students, curriculum, phase_dates)

    students = sorted(students, key=lambda item: item["name"])
    payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "curriculum": curriculum,
        "milestones": analysis["milestones"],
        "dashboard": analysis["dashboard"],
        "projectPhases": [
            {
                "phase": phase,
                "dates": [item.isoformat() for item in dates],
            }
            for phase, dates in phase_dates.items()
        ],
        "projectPhaseRanges": phase_ranges,
        "students": students,
    }
    return payload


def main() -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    payload = build_payload()
    json_text = json.dumps(payload, ensure_ascii=False, indent=2)
    OUTPUT_FILE.write_text(
        "window.STUDENT_TIMELINE_DATA = " + json_text + ";\n",
        encoding="utf-8",
        errors="replace",
    )
    print(f"Generated {OUTPUT_FILE}")
    print(f"Students: {len(payload['students'])}")
    print(f"Weeks: {len(payload['curriculum']['weeks'])}")


if __name__ == "__main__":
    main()
