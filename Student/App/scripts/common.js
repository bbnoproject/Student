(function () {
  const rawData = window.STUDENT_TIMELINE_DATA || { students: [], dashboard: {}, milestones: [] };
  const STUDENT_EDIT_STORAGE_KEY = "student-manual-profile-edits";
  const EDITABLE_STUDENT_FIELDS = ["name", "gender", "birthDate", "address", "phone", "education", "course", "cohort", "specialNote"];
  const originalStudentValues = new Map(
    rawData.students.map((student) => [
      student.id,
      {
        ...Object.fromEntries(EDITABLE_STUDENT_FIELDS.map((field) => [field, student[field] || ""])),
        managementStatus: student.managementStatus || "일반",
      },
    ])
  );
  const sourceDropoutStudentIds = new Set(rawData.students.filter(hasDropoutRecord).map((student) => student.id));

  const MANAGEMENT_STATUS_META = {
    "일반": {
      label: "일반",
      tone: "success",
      description: "현재 교육 운영과 관찰 대상에 포함되는 학생",
    },
    "취업": {
      label: "취업",
      tone: "violet",
      description: "취업 또는 채용 연계가 확인되어 진로 관리 중심으로 보는 학생",
    },
    "이탈": {
      label: "과정이탈",
      tone: "neutral",
      description: "과정 이탈로 일반 관리 대상에서는 제외하되 통계에는 표시되는 학생",
    },
  };

  function loadStudentEdits() {
    try {
      return JSON.parse(localStorage.getItem(STUDENT_EDIT_STORAGE_KEY) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function hasDropoutRecord(student) {
    if (!student) return false;
    if (student.managementStatus === "이탈") return true;
    const dropoutInfo = student.dropoutInfo || {};
    return Object.values(dropoutInfo).some((value) => typeof value === "string" && value.trim());
  }

  function effectiveManagementStatus(student) {
    if (hasDropoutRecord(student)) return "이탈";
    return MANAGEMENT_STATUS_META[student?.managementStatus] ? student.managementStatus : "일반";
  }

  function saveStudentEdit(studentId, payload) {
    const edits = loadStudentEdits();
    edits[studentId] = {
      ...(edits[studentId] || {}),
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STUDENT_EDIT_STORAGE_KEY, JSON.stringify(edits));
    applyStudentEdits();
  }

  function clearStudentEdit(studentId) {
    const edits = loadStudentEdits();
    delete edits[studentId];
    localStorage.setItem(STUDENT_EDIT_STORAGE_KEY, JSON.stringify(edits));
    applyStudentEdits();
  }

  function applyStudentEdits() {
    const edits = loadStudentEdits();
    rawData.students.forEach((student) => {
      const edit = edits[student.id] || {};
      const originalValues = originalStudentValues.get(student.id) || {};
      const managementStatus = sourceDropoutStudentIds.has(student.id)
        ? "이탈"
        : MANAGEMENT_STATUS_META[edit.managementStatus]
          ? edit.managementStatus
          : originalValues.managementStatus || "일반";

      EDITABLE_STUDENT_FIELDS.forEach((field) => {
        student[field] = originalValues[field] || "";
        if (typeof edit[field] === "string" && edit[field].trim()) {
          student[field] = edit[field].trim();
        }
      });

      student.managementStatus = managementStatus;
      student.manual = edit;
    });

    rawData.dashboard = {
      ...(rawData.dashboard || {}),
      ...buildManagementSummary(rawData.students),
    };
  }

  function buildManagementSummary(students) {
    const activeStudents = students.filter((student) => !hasDropoutRecord(student));
    return {
      managedStudentCount: activeStudents.length,
      generalCount: students.filter((student) => effectiveManagementStatus(student) === "일반").length,
      employedCount: students.filter((student) => effectiveManagementStatus(student) === "취업").length,
      dropoutCount: students.filter((student) => hasDropoutRecord(student)).length,
    };
  }

  applyStudentEdits();
  const studentsById = new Map(rawData.students.map((student) => [student.id, student]));

  const PROFILE_KEYS = [
    "selfRegulation",
    "engagement",
    "collaboration",
    "resilience",
    "reflection",
    "careerAgency",
  ];

  const PROFILE_LABELS = {
    selfRegulation: "학습 자기조절",
    engagement: "학습 참여와 지속성",
    collaboration: "협업과 관계 형성",
    resilience: "도전 대응과 회복탄력성",
    reflection: "성찰과 피드백 활용",
    careerAgency: "진로 목적성과 전문성",
  };

  const PROFILE_SHORT_LABELS = {
    selfRegulation: "자기조절",
    engagement: "참여지속",
    collaboration: "협업",
    resilience: "회복탄력",
    reflection: "성찰",
    careerAgency: "진로목적성",
  };

  const PROFILE_CRITERIA = {
    selfRegulation: {
      question: "목표와 우선순위를 세우고 실행 결과를 수정하는가",
      evidence: "프로젝트 체크인, 제출 시점, 회고의 실행 계획, 면담 후속 실천, 컨디션 리듬",
      rubric: "수행 과정, 실행 지속성, 결과 점검을 분리해 보는 분석적 루브릭을 적용합니다.",
      rating: "1점 긴급 지원, 2점 교사 안내 필요, 3점 독립 수행 가능, 4점 자기주도 개선 수준입니다.",
      caution: "늦잠 지각은 태도형 위험으로 단정하지 않고 최근성, 반복 간격, 프로젝트 구간, 컨디션 흐름을 함께 봅니다.",
    },
    engagement: {
      question: "과정에 꾸준히 참여하고 흔들릴 때 복귀하는가",
      evidence: "체크인 응답률, 회고 지속 여부, 면담 이후 참여 회복, 무단/무연락 결석, 컨디션 리듬",
      rubric: "참여 빈도, 과제 지속성, 이탈 후 복귀 행동을 구분해 평정합니다.",
      rating: "1점 참여 단절, 2점 불안정 참여, 3점 대체로 지속, 4점 꾸준한 몰입과 회복 수준입니다.",
      caution: "건강형·컨디션형·행정형 출결은 참여 저하 근거로 직접 쓰지 않고 시간 흐름과 회복 행동을 함께 봅니다.",
    },
    collaboration: {
      question: "팀 안에서 역할을 이해하고 관계를 조율하는가",
      evidence: "프로젝트 데일리체크인 제출 리듬, 회고 내용, 역할 수행 기록, 타 학생의 불만/갈등 언급, 단계별 변화",
      rubric: "체크인 정시성, 회고 품질, 역할 수행, 프로젝트 진행 중 조율 흔적을 별도 준거로 관찰합니다.",
      rating: "1점 협업 저해, 2점 제한적 역할 수행, 3점 안정적 협업, 4점 팀 성과를 촉진하는 수준입니다.",
      caution: "비선호/선호 인원 언급은 관계 선호 참고값입니다. 다만 프로젝트 중 불만 표출, 불화 발생, 소통 저해는 협업 위험 신호로 봅니다.",
    },
    resilience: {
      question: "실패나 압박 후 다시 시도하고 방향을 조정하는가",
      evidence: "프로젝트 체크인과 회고, 면담 기록, 모집 단계 실패 대응 문항",
      rubric: "어려움 인식, 정서 조절, 대안 탐색, 재시도 행동을 단계적으로 봅니다.",
      rating: "1점 회피 또는 중단, 2점 외부 촉진 시 재시도, 3점 스스로 회복, 4점 실패를 전략 개선으로 전환하는 수준입니다.",
      caution: "실패 여부보다 실패를 해석하고 다음 행동으로 연결했는지를 봅니다.",
    },
    reflection: {
      question: "경험을 원인 분석과 다음 행동으로 연결하는가",
      evidence: "프로젝트 회고, 면담 기록, 자기소개·이력서 수정 이력",
      rubric: "사실 나열, 원인 해석, 피드백 수용, 다음 행동 설계를 구분해 평가합니다.",
      rating: "1점 단순 진술, 2점 부분적 원인 인식, 3점 개선 행동 제시, 4점 피드백을 체계적으로 반영하는 수준입니다.",
      caution: "문장 길이가 아니라 원인 분석, 다음 행동, 피드백 반영 흔적을 봅니다.",
    },
    careerAgency: {
      question: "목적, 자기 강점, 자신만의 스타일이 분명하게 드러나는가",
      evidence: "모집 단계 목표, 진로 면담, 취업 문서, 이력서, 피드백 반영, 직무 브랜딩 서술",
      rubric: "목적 명확성, 자기 강점 인식, 자신만의 스타일/색깔, 준비 과정을 나누어 봅니다.",
      rating: "1점 방향 불명확, 2점 관심 분야 나열, 3점 강점과 목표 연결, 4점 자기 색깔이 직무 전략으로 드러나는 수준입니다.",
      caution: "문서 제출 횟수보다 희망 직무의 초점, 본인 강점의 이해, 차별화된 기획자상이 중요합니다.",
    },
  };

  const TAG_META = {
    overall_strong: {
      label: "종합 우수",
      tone: "success",
      description: "총점과 세부 역량이 균형 있게 안정적인 학생",
    },
    growth_high: {
      label: "성장 가능성 우수",
      tone: "brand",
      description: "현재 수준, 상승 또는 고수준 유지, 근거 신뢰도가 함께 높은 학생",
    },
    support_priority: {
      label: "지원 검토",
      tone: "danger",
      description: "총점과 별개로 운영 개입과 점검이 우선 필요한 학생",
    },
    collaboration_strength: {
      label: "협업 강점",
      tone: "mint",
      description: "동료 평가, 팀 역할, 회고, 체크인 흐름에서 협업 강점이 확인된 학생",
    },
    career_progress: {
      label: "진로역량 우수",
      tone: "violet",
      description: "구체 목표, 객관 근거, 실행 계획이 비교적 명확한 학생",
    },
    attendance_watch: {
      label: "참여 회복 관찰",
      tone: "warning",
      description: "출결 또는 참여 지속성 회복을 함께 봐야 하는 학생",
    },
    steady_path: {
      label: "안정 관찰",
      tone: "neutral",
      description: "급격한 변동은 적고 안정적으로 추적 중인 학생",
    },
  };

  const SORT_OPTIONS = {
    name: { label: "가나다순", key: "name" },
    profile: { label: "총점", key: "totalRankScore" },
    initial: { label: "초기역량", key: "initialCapabilityRankScore" },
    growth: { label: "성장 가능성", key: "growthRankScore" },
    participation: { label: "과정참여도", key: "participationRankScore" },
    collaboration: { label: "협업", key: "collaborationRankScore" },
    career: { label: "진로역량", key: "careerRankScore" },
    support: { label: "지원 검토", key: "supportRankScore" },
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(parsed);
  }

  function formatRange(start, end) {
    if (!start && !end) return "-";
    if (!end || start === end) return formatDate(start);
    return `${formatDate(start)} - ${formatDate(end)}`;
  }

  function shortMilestoneLabel(label) {
    const value = String(label || "");
    if (value.includes("모집")) return "모집/개강";
    if (value.includes("1차 프로젝트 종료") && !value.includes("2차")) return "실습(1차)";
    if (value.includes("2차 프로젝트 종료") && value.includes("1차")) return "실습(2차)";
    if (value.includes("3차 프로젝트 종료") && value.includes("2차")) return "실습(3차)";
    if (value.includes("4차 프로젝트 종료") && value.includes("3차")) return "실습(4차)";
    if (value.includes("종강")) return "종강";
    return value.replaceAll(" 프로젝트 종료", "").replaceAll(" ~ ", "/");
  }

  function toneClass(tone) {
    return tone ? `tone-${tone}` : "tone-neutral";
  }

  function statusTone(status) {
    if (status === "취업") return "violet";
    if (status === "이탈") return "neutral";
    if (status === "경고") return "danger";
    if (status === "집중 관찰") return "warning";
    if (status === "주의") return "warning";
    return "success";
  }

  function statusReason(student) {
    const status = student.stats?.currentStatus || "안정";
    const attendanceRisk = student.stats?.attendanceRiskIssues || 0;
    const projectRate = student.stats?.projectSubmissionRate || 0;
    const counselingCount = student.stats?.counselingCount || 0;
    const profileAverage = averageScore(student.currentProfile);
    const reasons = [];

    if (attendanceRisk > 0) reasons.push(`무단/무연락 결석 ${attendanceRisk}건`);
    if (projectRate && projectRate < 70) reasons.push(`프로젝트 제출률 ${projectRate}%`);
    if (profileAverage && profileAverage < 2.6) reasons.push(`최근 프로파일 평균 ${profileAverage.toFixed(2)}`);
    if (counselingCount > 0) reasons.push(`면담 기록 ${counselingCount}건`);

    if (!reasons.length) {
      return status === "안정"
        ? "최근 데이터에서 반복 위험 신호가 크지 않아 안정으로 표시합니다."
        : "상태 구간, 출결, 프로젝트 기록을 종합해 관찰 상태로 표시합니다.";
    }

    return `${reasons.join(", ")}을 함께 확인해 ${status} 상태로 표시합니다.`;
  }

  function profileReason(key, value, student) {
    if (value === null || value === undefined || value === "") {
      return "이 준거는 해당 시점에 판단할 직접 근거가 없어 점수화하지 않았습니다.";
    }
    const score = Number(value || 0);
    const stats = student?.stats || {};
    const ratingLabel = score <= 1 ? "긴급 지원" : score === 2 ? "형성 중" : score === 3 ? "안정" : "확장";
    if (key === "selfRegulation") {
      if ((stats.attendanceRiskIssues || 0) > 0) return `${ratingLabel} 평정입니다. 무단/무연락 결석 ${stats.attendanceRiskIssues}건을 실행 지속성 루브릭에 반영했습니다.`;
      if ((stats.conditionAttendanceIssues || 0) > 0) return `${ratingLabel} 평정입니다. 늦잠 지각 등 컨디션형 출결 ${stats.conditionAttendanceIssues}건은 태도 문제가 아니라 건강/컨디션 관리 흐름으로 확인합니다.`;
      return score >= 3 ? `${ratingLabel} 평정입니다. 실행 지속성과 후속 점검에서 큰 위험 신호가 낮습니다.` : `${ratingLabel} 평정입니다. 계획 수립보다 실행 후 점검 근거가 부족합니다.`;
    }
    if (key === "engagement") {
      if ((stats.projectSubmissionRate || 0) < 70) return `${ratingLabel} 평정입니다. 프로젝트 제출률 ${stats.projectSubmissionRate || 0}%를 참여 지속성 준거에 반영했습니다.`;
      return score >= 3 ? `${ratingLabel} 평정입니다. 참여 빈도와 과제 지속성이 비교적 유지됩니다.` : `${ratingLabel} 평정입니다. 흔들린 뒤 복귀 행동을 더 확인해야 합니다.`;
    }
    if (key === "collaboration") {
      const readiness = student.derived?.collaborationReadiness;
      if (readiness) {
        const trajectory = readiness.trajectory || {};
        return `${ratingLabel} 평정입니다. 체크인 정시율 ${readiness.checkinOnTimeRate || 0}%, 회고 품질 ${readiness.retroQuality || 0}/4, 역할 수행 ${readiness.roleExecution || 0}/4, 타 학생 불만/갈등 언급 ${readiness.peerComplaintCount || 0}건, 변화 ${trajectory.label || "유지"}(${trajectory.delta || 0})를 반영했습니다.`;
      }
      return score >= 3 ? `${ratingLabel} 평정입니다. 데일리체크인과 회고에서 프로젝트 협업 흐름이 안정적입니다.` : `${ratingLabel} 평정입니다. 데일리체크인, 회고 품질, 역할 수행 근거를 더 확인해야 합니다.`;
    }
    if (key === "resilience") {
      return score >= 3 ? `${ratingLabel} 평정입니다. 압박 구간 이후 재시도와 방향 조정 흐름이 관찰됩니다.` : `${ratingLabel} 평정입니다. 실패 해석과 대안 실행의 연결 근거를 보강해야 합니다.`;
    }
    if (key === "reflection") {
      return score >= 3 ? `${ratingLabel} 평정입니다. 회고가 원인 분석과 다음 행동으로 이어진 흔적이 있습니다.` : `${ratingLabel} 평정입니다. 사실 나열을 넘어 개선 행동으로 연결되는 근거가 약합니다.`;
    }
    if (key === "careerAgency") {
      const readiness = student.derived?.careerReadiness;
      if (readiness) {
        return `${ratingLabel} 평정입니다. 구체 직무/목표 ${readiness.hasConcreteGoal ? "있음" : "부족"}, 객관 근거 ${readiness.objectiveEvidenceScore || 0}점, 추상 표현 ${readiness.abstractExpressionCount || 0}건, 발표 주제 직무 관련성 ${readiness.presentationContent?.score || 0}점을 함께 반영했습니다.`;
      }
      return score >= 3 ? `${ratingLabel} 평정입니다. 구체 직무 목표와 객관 자료가 비교적 확인됩니다.` : `${ratingLabel} 평정입니다. 직무 목표와 객관 근거가 부족합니다.`;
    }
    return "관련 기록을 종합해 산정한 보조 지표입니다.";
  }

  function averageScore(scores) {
    const values = PROFILE_KEYS
      .map((key) => scores?.[key])
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map(Number)
      .filter((value) => Number.isFinite(value));
    const total = values.reduce((sum, value) => sum + value, 0);
    return values.length ? total / values.length : 0;
  }

  function studentById(studentId) {
    return studentsById.get(studentId) || null;
  }

  function studentSearchPool(student) {
    const tags = (student.derived?.tags || []).map((tag) => TAG_META[tag]?.label || tag);
    const groupSignals = (student.studentGroupSignals || []).flatMap((signal) => [
      signal.label,
      signal.basis,
      studentGroupSignalMeta(signal.key).description,
    ]);
    const flowCases = (student.learningFlowCases || []).flatMap((item) => [
      item.label,
      item.summary,
      ...(item.evidence || []),
    ]);
    return [
      student.name,
      student.phone,
      student.education,
      student.address,
      student.specialNote,
      student.managementStatus,
      student.manual?.managementMemo,
      student.manual?.employmentCompany,
      student.manual?.employmentRole,
      student.manual?.dropoutReason,
      student.stats?.currentStatus,
      student.course,
      student.cohort,
      ...tags,
      ...groupSignals,
      ...flowCases,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function quickSearchResults(query) {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return [];
    return [...rawData.students]
      .filter((student) => studentSearchPool(student).includes(normalized))
      .slice(0, 6);
  }

  function getSavedTheme() {
    return localStorage.getItem("student-theme") || "light";
  }

  function setTheme(theme, themeToggle) {
    document.body.dataset.theme = theme;
    localStorage.setItem("student-theme", theme);
    if (themeToggle) {
      themeToggle.textContent = theme === "dark" ? "☀" : "◐";
      themeToggle.setAttribute("aria-label", theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function firstFiniteNumber(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return 0;
  }

  function score100(...values) {
    return clamp(firstFiniteNumber(...values), 0, 100);
  }

  function displayNumber(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString("ko-KR", { maximumFractionDigits: digits });
  }

  function displayPercent(value, digits = 1) {
    return `${displayNumber(value, digits)}%`;
  }

  const OPERATIONAL_HEALTH_CASES = ["health_management_watch", "health_project_strain", "oversleep_condition_rhythm", "condition_management_sequence"];
  const OPERATIONAL_CLASSIFICATION_COPY = {
    overall: {
      key: "overall",
      group: "excellent",
      groupLabel: "우수자",
      label: "총점",
      tone: "success",
      basis: "초기역량은 낮은 비중으로 두고 성장·참여·협업·진로를 종합한 학생",
    },
    initial: {
      key: "initial",
      group: "excellent",
      groupLabel: "우수자",
      label: "초기역량",
      tone: "brand",
      basis: "전공, 기존 경험, 모집 서류의 사전 역량이 확인된 학생",
    },
    growth: {
      key: "growth",
      group: "excellent",
      groupLabel: "우수자",
      label: "성장 가능성",
      tone: "brand",
      basis: "현재 수준, 상승 또는 고수준 유지, 근거 신뢰도가 함께 높은 학생",
    },
    participation: {
      key: "participation",
      group: "excellent",
      groupLabel: "우수자",
      label: "과정참여도",
      tone: "success",
      basis: "출석, 과제 제출, 데일리 체크인/TIL 응답이 안정적인 학생",
    },
    collaboration: {
      key: "collaboration",
      group: "excellent",
      groupLabel: "우수자",
      label: "협업",
      tone: "mint",
      basis: "동료 평가, 팀 역할, PM/팀장 수행, 회고에서 협업 신뢰도가 확인된 학생",
    },
    career: {
      key: "career",
      group: "excellent",
      groupLabel: "우수자",
      label: "진로역량",
      tone: "violet",
      basis: "구체적인 직무 목표와 객관 근거, 실행 계획이 확인된 학생",
    },
    health: {
      key: "health",
      group: "risk",
      groupLabel: "위험군",
      label: "건강",
      tone: "warning",
      basis: "병가·진료·컨디션·늦잠 리듬이 반복된 학생",
    },
    insincere: {
      key: "insincere",
      group: "risk",
      groupLabel: "위험군",
      label: "불성실",
      tone: "danger",
      basis: "출결 위험, 낮은 제출률, 반복 지각이 잡힌 학생",
    },
    character: {
      key: "character",
      group: "risk",
      groupLabel: "위험군",
      label: "인성",
      tone: "violet",
      basis: "학우 불만, 갈등, 소통 저해 언급이 확인된 학생",
    },
  };

  const STUDENT_GROUP_SIGNAL_META = {
    field_performance_risk: {
      key: "field_performance_risk",
      label: "현장평가 미진군",
      shortLabel: "현장 미진",
      tone: "danger",
      description: "출결·제출 기록과 별개로 운영진 이해도, 실력, 수업 적응 평가에서 강한 우려가 확인된 학생군",
      action: "작업물 결과보다 수업 이해도, 피드백 수용, 과제 품질을 먼저 재확인하고 보충 지도 또는 개별 면담을 배치합니다.",
    },
    peer_reputation_risk: {
      key: "peer_reputation_risk",
      label: "동료평판 위험군",
      shortLabel: "동료 위험",
      tone: "violet",
      description: "학생들이 공개적으로 말하기 어려운 동료 비판·비선호 신호가 자료 안에서 확인된 학생군",
      action: "같은 프로젝트 팀원의 체크인·회고·상담 근거를 우선 확인하고 팀 배치, 소통 방식, 갈등 중재 필요성을 판단합니다.",
    },
    evaluation_mismatch_review: {
      key: "evaluation_mismatch_review",
      label: "평가 불일치 검토군",
      shortLabel: "불일치 검토",
      tone: "warning",
      description: "제출·체크인 기록은 안정적이지만 현장 실력 또는 이해도 평가는 낮아 오판 가능성이 큰 학생군",
      action: "성실 기록으로 점수가 과대평가되지 않았는지 산출물 품질, 수업 이해도, 구두 설명 능력을 함께 재검토합니다.",
    },
    routine_participation_review: {
      key: "routine_participation_review",
      label: "기록/참여 루틴 검토군",
      shortLabel: "루틴 검토",
      tone: "warning",
      description: "TIL, 참여도, 소통 루틴 메모가 있으나 실력 저평가로 바로 보기 어려운 학생군",
      action: "실력 판단과 분리해 기록 습관, 참여 방식, 최신 프로젝트 기여 근거를 같이 확인합니다.",
    },
    role_conflict_review: {
      key: "role_conflict_review",
      label: "역할 갈등 검토군",
      shortLabel: "역할 갈등",
      tone: "violet",
      description: "팀장·PM 역할 수행 중 단일 갈등 신호가 있으나 긍정 리더십 근거도 함께 있는 학생군",
      action: "반복 갈등인지, 역할 조율 과정에서 생긴 단발 충돌인지 팀 회고와 이후 회복 여부를 확인합니다.",
    },
    operation_watch: {
      key: "operation_watch",
      label: "운영 관찰군",
      shortLabel: "운영 관찰",
      tone: "warning",
      description: "출결, 건강, 상태 경고처럼 운영자가 먼저 리듬을 확인해야 하는 학생군",
      action: "최근 2주 출결·체크인·면담 이력을 먼저 열어 반복 신호와 회복 여부를 확인합니다.",
    },
    portfolio_material_ready: {
      key: "portfolio_material_ready",
      label: "포트폴리오 소재 보유군",
      shortLabel: "포트폴리오",
      tone: "success",
      description: "실습 제출물과 강점 근거가 있어 포트폴리오 사례로 전환할 수 있는 학생군",
      action: "대표 제출물 1개를 골라 문제 정의, 의도, 결과, 개선점을 포트폴리오 문장으로 정리합니다.",
    },
    self_publication: {
      key: "self_publication",
      label: "자발적 공유군",
      shortLabel: "자발 공유",
      tone: "mint",
      description: "자원 발표나 관심사 공유처럼 자기표현 행동이 관찰된 학생군",
      action: "발표 주제와 제출물을 연결해 면접에서 말할 관심사와 학습 태도 근거로 다듬습니다.",
    },
    career_ready: {
      key: "career_ready",
      label: "취업 메시지 구체화군",
      shortLabel: "취업 메시지",
      tone: "violet",
      description: "구체 직무 목표, 객관 자료, 피드백 반영 근거가 비교적 확인되는 학생군",
      action: "자기소개서, 포트폴리오 소개문, 모의면접 답변을 한 문장 메시지로 정리합니다.",
    },
    steady_observation: {
      key: "steady_observation",
      label: "일반 관찰군",
      shortLabel: "일반 관찰",
      tone: "neutral",
      description: "강한 위험/강점 신호가 아직 적어 기본 루틴을 유지하며 관찰할 학생군",
      action: "제출물 1개와 체크인 표현을 추가 확인해 다음 운영 분류로 이동할 근거를 찾습니다.",
    },
  };

  const STUDENT_GROUP_SIGNAL_KEYS = [
    "field_performance_risk",
    "peer_reputation_risk",
    "evaluation_mismatch_review",
    "routine_participation_review",
    "role_conflict_review",
    "operation_watch",
    "portfolio_material_ready",
    "self_publication",
    "career_ready",
    "steady_observation",
  ];

  const OPERATIONAL_CLASSIFICATION_ORDER = ["overall", "initial", "growth", "participation", "collaboration", "career", "health", "insincere", "character"];

  function hasCaseType(student, caseTypes, severity = "") {
    const typeSet = new Set(caseTypes);
    return (student.learningFlowCases || []).some((item) => typeSet.has(item.caseType) && (!severity || item.severity === severity));
  }

  function expressionFocusScore(student) {
    const dimensions = student.derived?.expressionProfile?.dimensions || {};
    const values = ["specificity", "agency", "reflection", "career"]
      .map((key) => Number(dimensions[key]?.score || 0))
      .filter((value) => value > 0);
    if (!values.length) return 0;
    return (values.reduce((sum, value) => sum + value, 0) / values.length) * 25;
  }

  function diligenceScore(student) {
    const projectRate = Number(student.stats?.projectSubmissionRate || 0);
    const checkinRate = Number(student.derived?.collaborationReadiness?.checkinOnTimeRate || 0);
    const penalty = Math.min(
      100,
      (student.stats?.attendanceRiskIssues || 0) * 20 + (student.stats?.lateCount || 0) * 3 + (student.stats?.absenceCount || 0) * 10
    );
    return clamp(projectRate * 0.45 + checkinRate * 0.35 + (100 - penalty) * 0.2, 0, 100);
  }

  function operationalClassificationMeta(key) {
    return OPERATIONAL_CLASSIFICATION_COPY[key] || null;
  }

  function learningCaseSummaries(student, caseTypes, severity = "") {
    const typeSet = new Set(caseTypes);
    return (student.learningFlowCases || [])
      .filter((item) => typeSet.has(item.caseType) && (!severity || item.severity === severity))
      .slice(0, 3)
      .map((item) => `${item.label}: ${item.summary}`);
  }

  function studentOperationalAssessment(student, key) {
    const meta = operationalClassificationMeta(key);
    if (!meta || !student) return null;
    const derived = student.derived || {};
    const stats = student.stats || {};
    const readiness = derived.collaborationReadiness || {};
    const riskFlags = derived.operationalRiskFlags || {};
    const peerReputationRisk = riskFlags.peerReputation || {};
    const sourceCounts = derived.expressionProfile?.sourceCounts || {};
    const directTextCount = (sourceCounts.checkin || 0) + (sourceCounts.retro || 0) + (sourceCounts.careerDocument || 0);
    const focusScore = expressionFocusScore(student);
    const diligence = diligenceScore(student);
    const projectRate = Number(stats.projectSubmissionRate || 0);
    const attendanceRisk = Number(stats.attendanceRiskIssues || 0);
    const lateCount = Number(stats.lateCount || 0);
    const healthOrConditionIssues = Number(stats.healthAttendanceIssues || 0) + Number(stats.conditionAttendanceIssues || 0);
    const peerComplaintCount = Number(readiness.peerComplaintCount || 0);
    const peerAvoidCount = Number(readiness.peerAvoidCount || 0);
    const peerComplaintWeight = Number(readiness.peerComplaintWeight || 0);
    const peerAvoidWeight = Number(readiness.peerAvoidWeight || 0);
    const peerCriticalWeight = peerComplaintWeight + peerAvoidWeight;
    const projectIssueCount = Number(readiness.projectIssueCount || 0);
    const personalColor = Number(derived.careerReadiness?.personalColor || 0);
    const blocksExcellent = Boolean(riskFlags.blocksExcellent);
    const repeatedPeerCritical = peerAvoidCount > 0 || peerComplaintCount >= 2 || peerCriticalWeight >= 3;
    const singleRoleConflictReview = Boolean(peerReputationRisk.reviewOnly);
    const totalScore = score100(derived.totalRankScore, derived.profileRankScore, derived.profileIndex);
    const initialScore = score100(derived.initialCapabilityRankScore, derived.initialCapability?.score);
    const growthPotentialScore = score100(derived.growthPotentialRankScore, derived.growthRankScore, derived.growthIndex);
    const participationScore = score100(derived.participationRankScore, derived.participationReadiness?.score, diligence);
    const collaborationScore = score100(derived.collaborationRankScore, readiness.collaborationReadinessScore);
    const careerScore = score100(derived.careerRankScore, derived.careerReadiness?.careerReadinessScore);
    const reasons = [];
    const metrics = [];
    let qualified = false;
    let score = 0;

    if (key === "overall") {
      qualified = totalScore >= 78 && !blocksExcellent;
      score = totalScore;
      metrics.push(`총점 ${displayNumber(totalScore)}점`, `초기 ${displayNumber(initialScore)}점`, `성장 ${displayNumber(growthPotentialScore)}점`);
      metrics.push(`참여 ${displayNumber(participationScore)}점`, `협업 ${displayNumber(collaborationScore)}점`, `진로 ${displayNumber(careerScore)}점`);
      (derived.tagReasons?.overall_strong?.reasons || []).slice(0, 3).forEach((reason) => reasons.push(reason));
      if (!reasons.length) reasons.push("지원 필요도는 총점에서 제외하고, 다섯 역량 점수를 가중 합산했습니다.");
    } else if (key === "initial") {
      qualified = initialScore >= 74;
      score = initialScore;
      metrics.push(`초기역량 ${displayNumber(initialScore)}점`, `신뢰도 ${derived.initialCapability?.confidence || "Low"}`);
      (derived.initialCapability?.evidence || []).slice(0, 4).forEach((item) => reasons.push(item));
      if (!reasons.length) reasons.push("전공, 모집 서류, 사전 경험을 낮은 비중의 참고 점수로 반영했습니다.");
    } else if (key === "growth") {
      qualified = growthPotentialScore >= 85 && !riskFlags.evaluationMismatch?.hardGate && !riskFlags.fieldPerformance?.hardGate;
      score = growthPotentialScore;
      metrics.push(`성장 가능성 ${displayNumber(score)}점`, `현재 수준 ${displayNumber(derived.growthPotential?.currentLevelScore || 0)}점`, `유지/상승 ${displayNumber(derived.growthPotential?.sustainScore || 0)}점`);
      (derived.tagReasons?.growth_high?.reasons || []).slice(0, 2).forEach((reason) => reasons.push(reason));
      if (!reasons.length) reasons.push("현재 수준, 상승폭, 고수준 유지 여부, 근거 신뢰도를 함께 반영했습니다.");
    } else if (key === "participation") {
      qualified = participationScore >= 88 && attendanceRisk === 0 && projectRate >= 85;
      score = participationScore;
      const expectedCount = Number(derived.participationReadiness?.projectExpectedCount || stats.projectExpectedCount || 0);
      const submittedCount = Number(derived.participationReadiness?.projectSubmissionCount || stats.projectSubmissionCount || 0);
      metrics.push(`과정참여도 ${displayNumber(participationScore)}점`, `제출률 ${displayPercent(projectRate)}`, `체크인 정시율 ${displayPercent(readiness.checkinOnTimeRate || 0)}`);
      if (expectedCount) metrics.push(`관측기간 제출 ${submittedCount}/${expectedCount}`);
      metrics.push(`TIL/체크인 응답 ${displayNumber(derived.participationReadiness?.tilResponseScore || 0)}점`);
      reasons.push(`위험 출결 ${attendanceRisk}건, 지각 ${lateCount}건으로 출결 리스크가 낮습니다.`);
      reasons.push(`프로젝트 제출률은 학생별 관측 종료일까지의 기대 응답 ${expectedCount || 0}건을 기준으로 계산했습니다.`);
      reasons.push(`프로젝트 제출률 ${displayPercent(projectRate)}와 체크인 정시율 ${displayPercent(readiness.checkinOnTimeRate || 0)}을 함께 반영했습니다.`);
    } else if (key === "collaboration") {
      qualified = collaborationScore >= 72 && !peerReputationRisk.hardGate && peerCriticalWeight < 2.5;
      score = collaborationScore;
      metrics.push(`협업 ${displayNumber(collaborationScore)}점`, `동료 긍정 가중치 ${displayNumber(readiness.peerPositiveWeight || 0)}`, `동료 비판 가중치 ${displayNumber(peerCriticalWeight)}`);
      metrics.push(`팀장/PM ${readiness.leadershipRoleCount || 0}회`, `회고 품질 ${displayNumber(readiness.retroQuality || 0)}/4`);
      (derived.tagReasons?.collaboration_strength?.reasons || []).slice(0, 4).forEach((reason) => reasons.push(reason));
      if (!reasons.length) reasons.push("동료 평가, 같은 프로젝트 팀원 언급, 팀 역할 수행, 회고 품질을 함께 반영했습니다.");
    } else if (key === "career") {
      qualified = careerScore >= 70 && derived.careerReadiness?.hasConcreteGoal && Number(derived.careerReadiness?.objectiveEvidenceScore || 0) >= 55;
      score = careerScore;
      metrics.push(`진로역량 ${displayNumber(careerScore)}점`, `목적 명확성 ${displayNumber(derived.careerReadiness?.purposeClarity || 0)}`, `객관 근거 ${displayNumber(derived.careerReadiness?.objectiveEvidenceScore || 0)}점`);
      metrics.push(`구체 목표 ${derived.careerReadiness?.hasConcreteGoal ? "있음" : "부족"}`, `추상 표현 ${derived.careerReadiness?.abstractExpressionCount || 0}건`);
      (derived.tagReasons?.career_progress?.reasons || []).slice(0, 4).forEach((reason) => reasons.push(reason));
      if (!reasons.length) reasons.push("추상적 희망 표현보다 구체 목표, 객관 근거, 실행 계획, 발표 주제의 직무 관련성을 우선했습니다.");
    } else if (key === "health") {
      qualified = hasCaseType(student, OPERATIONAL_HEALTH_CASES, "warning");
      score = Number(stats.healthAttendanceIssues || 0) + Number(stats.conditionAttendanceIssues || 0);
      metrics.push(`건강/컨디션 출결 ${score}건`, `위험 출결 ${attendanceRisk}건`);
      reasons.push(...learningCaseSummaries(student, OPERATIONAL_HEALTH_CASES, "warning"));
      if (!reasons.length) reasons.push("건강, 컨디션, 늦잠 리듬 관련 경고 케이스가 확인되어 건강 위험군으로 분류됩니다.");
    } else if (key === "insincere") {
      qualified =
        projectRate < 70 ||
        attendanceRisk > 0 ||
        (projectRate < 80 && lateCount >= 3 && healthOrConditionIssues === 0) ||
        (lateCount >= 5 && healthOrConditionIssues === 0);
      score = 100 - projectRate + lateCount * 3 + attendanceRisk * 12;
      metrics.push(`제출률 ${displayPercent(projectRate)}`, `위험 출결 ${attendanceRisk}건`, `지각 ${lateCount}건`);
      if (projectRate < 70) reasons.push(`프로젝트 제출률이 ${displayPercent(projectRate)}로 70% 기준보다 낮습니다.`);
      if (projectRate < 80 && healthOrConditionIssues > 0) reasons.push("제출률과 지각은 건강/컨디션 맥락을 분리해 불성실로 단정하지 않습니다.");
      if (attendanceRisk > 0) reasons.push(`무단·무연락 등 위험 출결이 ${attendanceRisk}건 확인됩니다.`);
      if (lateCount >= 3 && healthOrConditionIssues === 0) reasons.push(`지각이 ${lateCount}건으로 반복 신호가 있습니다.`);
    } else if (key === "character") {
      qualified =
        peerReputationRisk.hardGate ||
        repeatedPeerCritical ||
        (projectIssueCount >= 10 && repeatedPeerCritical) ||
        (hasCaseType(student, ["collaboration_conflict_signal"], "warning") && repeatedPeerCritical);
      score = projectIssueCount + peerComplaintCount * 3 + peerAvoidCount * 5 + peerCriticalWeight * 4;
      metrics.push(`동료 비판 가중치 ${displayNumber(peerCriticalWeight)}`, `비선호 ${peerAvoidCount}건`, `불만 ${peerComplaintCount}건`, `프로젝트 이슈 ${projectIssueCount}건`);
      reasons.push(...learningCaseSummaries(student, ["collaboration_conflict_signal"], "warning"));
      (peerReputationRisk.reasons || []).slice(0, 3).forEach((reason) => reasons.push(reason));
      if (repeatedPeerCritical) reasons.push(`동료 비판·비선호 신호의 총 가중치가 ${displayNumber(peerCriticalWeight)}로 확인됩니다.`);
      if (singleRoleConflictReview) reasons.push("단일 갈등 신호는 팀장/역할 조율 검토로 분리해 봅니다.");
      if (projectIssueCount >= 10) reasons.push(`프로젝트 소통·진행 이슈가 ${projectIssueCount}건으로 높습니다.`);
      if (!reasons.length) reasons.push("협업 갈등 또는 불만 언행이 누적되어 인성 위험군으로 분류됩니다.");
    }

    return {
      ...meta,
      qualified,
      score,
      metrics,
      reasons: reasons.filter(Boolean),
    };
  }

  function studentOperationalAssessments(student, options = {}) {
    const onlyQualified = options.onlyQualified !== false;
    const rows = OPERATIONAL_CLASSIFICATION_ORDER.map((key) => studentOperationalAssessment(student, key)).filter(Boolean);
    return onlyQualified ? rows.filter((row) => row.qualified) : rows;
  }

  function studentOperationalAssessmentByKey(student, key) {
    return studentOperationalAssessment(student, key);
  }

  function operationalClassificationRankValue(row, student) {
    const assessment = studentOperationalAssessment(student, row.key);
    return assessment?.score || 0;
  }

  function operationalClassification(students) {
    const rows = OPERATIONAL_CLASSIFICATION_ORDER.map((key) => {
      const meta = operationalClassificationMeta(key);
      const matchedStudents = students.filter((student) => studentOperationalAssessment(student, key)?.qualified);
      return {
        ...meta,
        count: matchedStudents.length,
        students: matchedStudents,
      };
    });
    return {
      excellent: rows.filter((row) => row.group === "excellent"),
      risk: rows.filter((row) => row.group === "risk"),
      rows,
    };
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function studentPageHref(studentId, options = {}) {
    const params = new URLSearchParams({ id: studentId });
    if (options.focus) params.set("focus", options.focus);
    if (options.group) params.set("group", options.group);
    if (options.tab) params.set("tab", options.tab);
    return `./student.html?${params.toString()}`;
  }

  function lobbyPageHref() {
    return "./index.html";
  }

  function studentGroupSignalMeta(key) {
    return STUDENT_GROUP_SIGNAL_META[key] || {
      key,
      label: key || "학생군",
      shortLabel: key || "학생군",
      tone: "neutral",
      description: "추가 정의가 필요한 학생군입니다.",
      action: "근거 데이터를 확인해 운영 기준을 보강합니다.",
    };
  }

  function studentGroupSignalByKey(student, key) {
    if (!student || !key || key === "all") return null;
    return (student.studentGroupSignals || []).find((signal) => signal.key === key) || null;
  }

  function studentHasGroupSignal(student, key) {
    if (!key || key === "all") return true;
    return Boolean(studentGroupSignalByKey(student, key));
  }

  function tagBadge(tag) {
    const meta = TAG_META[tag] || TAG_META.steady_path;
    return `<span class="pill ${toneClass(meta.tone)}">${escapeHtml(meta.label)}</span>`;
  }

  function domainPills(keys, emptyLabel) {
    if (!keys?.length) {
      return `<span class="pill tone-neutral">${escapeHtml(emptyLabel)}</span>`;
    }
    return keys
      .map((key) => `<span class="pill tone-neutral">${escapeHtml(PROFILE_SHORT_LABELS[key] || PROFILE_LABELS[key] || key)}</span>`)
      .join("");
  }

  function metricCard(label, value, copy, tone = "neutral") {
    return `
      <article class="metric-card ${toneClass(tone)}">
        <span class="metric-label">${escapeHtml(label)}</span>
        <strong class="metric-value">${escapeHtml(String(value))}</strong>
        <p class="metric-copy">${escapeHtml(copy)}</p>
      </article>
    `;
  }

  function radarChart(scores) {
    const size = 240;
    const center = 120;
    const radius = 82;
    const levels = [1, 2, 3, 4];
    const points = PROFILE_KEYS.map((key, index) => {
      const angle = -Math.PI / 2 + (index / PROFILE_KEYS.length) * Math.PI * 2;
      const score = Number(scores?.[key] || 0);
      const scaled = (score / 4) * radius;
      return {
        key,
        x: center + Math.cos(angle) * scaled,
        y: center + Math.sin(angle) * scaled,
        labelX: center + Math.cos(angle) * (radius + 26),
        labelY: center + Math.sin(angle) * (radius + 26),
      };
    });

    const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");
    const grids = levels
      .map((level) => {
        const scaled = (level / 4) * radius;
        const gridPoints = PROFILE_KEYS.map((_, index) => {
          const angle = -Math.PI / 2 + (index / PROFILE_KEYS.length) * Math.PI * 2;
          return `${center + Math.cos(angle) * scaled},${center + Math.sin(angle) * scaled}`;
        }).join(" ");
        return `<polygon points="${gridPoints}" class="radar-grid"></polygon>`;
      })
      .join("");

    const axes = PROFILE_KEYS.map((_, index) => {
      const angle = -Math.PI / 2 + (index / PROFILE_KEYS.length) * Math.PI * 2;
      return `
        <line
          x1="${center}"
          y1="${center}"
          x2="${center + Math.cos(angle) * radius}"
          y2="${center + Math.sin(angle) * radius}"
          class="radar-axis"
        ></line>
      `;
    }).join("");

    const labels = points
      .map(
        (point) => `
          <text x="${point.labelX}" y="${point.labelY}" class="radar-label">
            ${escapeHtml(PROFILE_SHORT_LABELS[point.key] || PROFILE_LABELS[point.key])}
          </text>
        `
      )
      .join("");

    const dots = points
      .map(
        (point) => `
          <circle cx="${point.x}" cy="${point.y}" r="4.5" class="radar-dot"></circle>
        `
      )
      .join("");

    return `
      <svg class="radar-chart" viewBox="0 0 ${size} ${size}" role="img" aria-label="학생 프로파일 레이더 차트">
        ${grids}
        ${axes}
        <polygon points="${polygon}" class="radar-area"></polygon>
        ${dots}
        ${labels}
      </svg>
    `;
  }

  function growthChart(milestones) {
    const width = 760;
    const height = 220;
    const paddingX = 54;
    const paddingY = 34;
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;
    const points = milestones.map((milestone, index) => {
      const x = paddingX + (usableWidth / Math.max(1, milestones.length - 1)) * index;
      const y = height - paddingY - ((milestone.profileAverage - 1) / 3) * usableHeight;
      return { x, y, label: milestone.label, avg: milestone.profileAverage };
    });

    const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
    const gridLines = [1, 2, 3, 4]
      .map((score) => {
        const y = height - paddingY - ((score - 1) / 3) * usableHeight;
        return `
          <line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" class="growth-grid"></line>
          <text x="18" y="${y + 4}" class="growth-axis-label">${score}</text>
        `;
      })
      .join("");

    const labels = points
      .map(
        (point) => `
          <text x="${point.x}" y="${height - 12}" class="growth-label" text-anchor="middle">
            ${escapeHtml(shortMilestoneLabel(point.label))}
          </text>
        `
      )
      .join("");

    const dots = points
      .map(
        (point) => `
          <circle cx="${point.x}" cy="${point.y}" r="6" class="growth-dot"></circle>
          <text x="${point.x}" y="${point.y - 14}" class="growth-value" text-anchor="middle">${point.avg.toFixed(2)}</text>
        `
      )
      .join("");

    return `
      <svg class="growth-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="마일스톤 성장 곡선">
        ${gridLines}
        <polyline points="${polyline}" class="growth-line"></polyline>
        ${dots}
        ${labels}
      </svg>
    `;
  }

  function scatterPlot(students) {
    const dots = students
      .map((student) => {
        const x = student.derived?.growthIndex || 0;
        const y = student.derived?.profileIndex || 0;
        const meta = TAG_META[student.derived?.primaryTag] || TAG_META.steady_path;
        return `
          <a
            class="scatter-dot ${toneClass(meta.tone)}"
            href="${studentPageHref(student.id)}"
            style="left:${x}%; bottom:${y}%"
            title="${escapeHtml(student.name)}"
          >
            <span>${escapeHtml(student.name)}</span>
          </a>
        `;
      })
      .join("");

    return `
      <div class="scatter-frame">
        <div class="scatter-axis scatter-axis-y">현재 프로파일</div>
        <div class="scatter-axis scatter-axis-x">성장 곡선</div>
        <div class="scatter-quadrant scatter-top-left">안정적이지만 성장 정체</div>
        <div class="scatter-quadrant scatter-top-right">성장과 안정이 모두 높은 구간</div>
        <div class="scatter-quadrant scatter-bottom-left">기초 점검 우선</div>
        <div class="scatter-quadrant scatter-bottom-right">성장은 보이지만 관찰이 필요한 구간</div>
        ${dots}
      </div>
    `;
  }

  function renderQuickSearch(container, query) {
    if (!container) return;
    const results = quickSearchResults(query);
    if (!String(query || "").trim()) {
      container.innerHTML = "";
      container.classList.remove("is-visible");
      return;
    }

    container.classList.add("is-visible");
    container.innerHTML = `
      <div class="quick-search-card">
        <div class="quick-search-head">
          <strong>검색 결과</strong>
          <span>${escapeHtml(String(results.length))}명</span>
        </div>
        <div class="quick-search-list">
          ${results.length
            ? results
                .map(
                  (student) => `
                    <a class="quick-search-item" href="${studentPageHref(student.id)}">
                      <div>
                        <strong>${escapeHtml(student.name)}</strong>
                        <p>${escapeHtml(student.education || "학력 정보 없음")}</p>
                      </div>
                      ${tagBadge(student.derived?.primaryTag)}
                    </a>
                  `
                )
                .join("")
            : `<div class="empty-state compact">검색 결과가 없습니다.</div>`}
        </div>
      </div>
    `;
  }

  function renderProfileBars(scores) {
    return `
      <div class="profile-bar-list">
        ${PROFILE_KEYS.map((key) => {
          const rawValue = scores?.[key];
          const judged = rawValue !== null && rawValue !== undefined && rawValue !== "";
          const value = judged ? Number(rawValue) : 0;
          return `
            <article class="profile-bar-card">
              <div class="profile-bar-head">
                <span>${escapeHtml(PROFILE_LABELS[key])}</span>
                <strong>${judged ? `${value}/4` : "판단 전"}</strong>
              </div>
              <div class="profile-track">
                <div class="profile-fill" style="width:${(value / 4) * 100}%"></div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function milestoneStory(milestone) {
    const parts = [];
    const attendanceRisk = milestone.eventCounts.attendanceRisk || 0;
    if (milestone.growthDelta > 0.35) {
      parts.push("성장 곡선이 상승했습니다.");
    } else if (milestone.growthDelta < -0.35) {
      parts.push("프로파일이 흔들린 구간이 보입니다.");
    } else {
      parts.push("큰 폭의 변화보다 흐름 유지가 중심이었습니다.");
    }
    if (milestone.eventCounts.project > 0) {
      parts.push(`프로젝트 관련 기록 ${milestone.eventCounts.project}건이 누적되었습니다.`);
    }
    if (attendanceRisk > 0) {
      parts.push(`판단 반영 위험 출결 ${attendanceRisk}건을 함께 확인했습니다.`);
    } else if (milestone.eventCounts.attendance > 0) {
      parts.push(`출결 기록 ${milestone.eventCounts.attendance}건이 있었지만 판단 반영 위험으로 계산된 건은 없습니다.`);
    }
    if (milestone.eventCounts.counseling > 0) {
      parts.push(`면담 개입 ${milestone.eventCounts.counseling}건이 있었습니다.`);
    }
    if (milestone.dropoutDuringMilestone) {
      parts.push(`이 구간에 과정이탈 시점(${formatDate(milestone.dropoutDate)})이 포함됩니다.`);
    }
    if (milestone.cautionKeys?.length) {
      parts.push(`${PROFILE_LABELS[milestone.cautionKeys[0]]} 영역을 계속 봐야 합니다.`);
    }
    return parts.join(" ");
  }

  function recentEventCards(student) {
    return student.timelineEvents
      .slice()
      .reverse()
      .slice(0, 8)
      .map(
        (event) => `
          <article class="event-card">
            <div class="event-head">
              <strong>${escapeHtml(event.title)}</strong>
              <span class="status-badge ${toneClass(statusTone(event.severity === "warning" ? "경고" : event.severity === "caution" ? "주의" : "안정"))}">
                ${escapeHtml(formatDate(event.date))}
              </span>
            </div>
            <p class="event-copy">${escapeHtml(event.summary)}</p>
            <span class="event-meta">${escapeHtml(event.projectPhase || event.sourceLabel || event.type)}</span>
          </article>
        `
      )
      .join("");
  }

  function primaryMetaLabel(student) {
    return (TAG_META[student.derived?.primaryTag] || TAG_META.steady_path).label;
  }

  function renderClassificationReasons(student) {
    const reasons = student.derived?.tagReasons || {};
    const order = [
      "overall_strong",
      "growth_high",
      "support_priority",
      "collaboration_strength",
      "career_progress",
      "attendance_watch",
      "steady_path",
    ];
    return `
      <div class="classification-reason-list">
        ${order
          .map((tag) => {
            const meta = TAG_META[tag] || TAG_META.steady_path;
            const item = reasons[tag] || { qualified: false, reasons: ["판단 사유가 아직 생성되지 않았습니다."] };
            return `
              <article class="classification-reason-row ${item.qualified ? "is-qualified" : ""}">
                <div>
                  <strong>${escapeHtml(meta.label)}</strong>
                  <span>${item.qualified ? "해당" : "미해당"}</span>
                </div>
                <p>${escapeHtml((item.reasons || []).join(" · "))}</p>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function learningCaseTone(severity) {
    if (severity === "warning") return "danger";
    if (severity === "caution") return "warning";
    if (severity === "success") return "success";
    return "neutral";
  }

  function renderCollaborationTrajectory(student) {
    const readiness = student.derived?.collaborationReadiness || {};
    const trajectory = readiness.trajectory || {};
    const phaseScores = trajectory.phaseScores || [];
    const teamFeedback = readiness.teamPeerFeedback || [];
    const feedbackLabels = {
      praise: "긍정",
      want: "함께하고 싶음",
      complaint: "불만",
      avoid: "회피",
    };
    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Collaboration Timeline</span>
            <h3>프로젝트 협업 변화</h3>
          </div>
          <p class="panel-copy">협업은 운영진 관찰, 같은 프로젝트 팀원 언급, PM/팀장 수행 회고, 체크인·회고 흐름을 분리해서 봅니다.</p>
        </div>
        <div class="collaboration-trajectory-grid">
          <article class="trajectory-summary">
            <span>초기</span>
            <strong>${escapeHtml(String(Math.round(trajectory.earlyScore || readiness.collaborationReadinessScore || 0)))}</strong>
          </article>
          <article class="trajectory-summary">
            <span>현재</span>
            <strong>${escapeHtml(String(Math.round(trajectory.currentScore || readiness.collaborationReadinessScore || 0)))}</strong>
          </article>
          <article class="trajectory-summary">
            <span>변화</span>
            <strong>${escapeHtml(`${trajectory.label || "유지"} ${trajectory.delta > 0 ? "+" : ""}${trajectory.delta || 0}`)}</strong>
          </article>
        </div>
        <div class="collaboration-evidence-grid">
          <article>
            <span>같은 팀 긍정</span>
            <strong>${escapeHtml(String(readiness.sameProjectPeerPositiveWeight || 0))}</strong>
            <small>동일 프로젝트 팀원의 긍정·선호 언급 가중치</small>
          </article>
          <article>
            <span>같은 팀 위험</span>
            <strong>${escapeHtml(String((readiness.sameProjectPeerComplaintWeight || 0) + (readiness.sameProjectPeerAvoidWeight || 0)))}</strong>
            <small>동일 프로젝트 팀원의 불만·회피 언급 가중치</small>
          </article>
          <article>
            <span>PM/팀장 근거</span>
            <strong>${escapeHtml(String(readiness.leadershipRoleCount || 0))}</strong>
            <small>팀장 또는 PM 역할 수행 이력</small>
          </article>
          <article>
            <span>점수 보정</span>
            <strong>${escapeHtml(`+${readiness.peerPositiveBonus || 0} / -${readiness.peerRiskPenalty || 0}`)}</strong>
            <small>동료 긍정·위험 발화의 최종 반영값</small>
          </article>
        </div>
        ${
          teamFeedback.length
            ? `
              <div class="collaboration-feedback-list">
                ${teamFeedback
                  .map(
                    (item) => `
                      <article>
                        <div>
                          <strong>${escapeHtml(`${item.from || "-"} · ${feedbackLabels[item.type] || item.type || "언급"}`)}</strong>
                          <span>${escapeHtml([item.sourcePhase, (item.sharedTeams || [])[0]].filter(Boolean).join(" · ") || "프로젝트 맥락")}</span>
                        </div>
                        <p>${escapeHtml(item.snippet || "")}</p>
                        <small>${escapeHtml(`근거 가중치 ${item.weight || 1} · 대상 역할 ${(item.targetRoles || []).join(", ") || "-"}`)}</small>
                      </article>
                    `
                  )
                  .join("")}
              </div>
            `
            : ""
        }
        <div class="trajectory-phase-list">
          ${phaseScores.length
            ? phaseScores
                .map(
                  (item) => `
                    <article class="trajectory-phase-row">
                      <strong>${escapeHtml(item.phase)}</strong>
                      <div class="trajectory-track">
                        <span style="width:${Math.max(4, Math.min(100, Number(item.score) || 0))}%"></span>
                      </div>
                      <p>${escapeHtml(`점수 ${Math.round(item.score || 0)} · 체크인 ${item.checkinCount || 0}건 · 지연 ${item.lateCheckinCount || 0}건 · 회고 ${item.retroCount || 0}건 · 팀긍정 ${item.sameProjectPeerPositiveWeight || 0} · 팀위험 ${item.sameProjectPeerRiskWeight || 0}`)}</p>
                    </article>
                  `
                )
                .join("")
            : `<article class="trajectory-phase-row"><p>프로젝트 단계별 협업 변화 데이터가 아직 충분하지 않습니다.</p></article>`}
        </div>
      </section>
    `;
  }

  function renderLearningFlowCases(student) {
    const cases = student.learningFlowCases || [];
    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Learning Flow Cases</span>
            <h3>학습 흐름 복합 케이스</h3>
          </div>
          <p class="panel-copy">출결, 데일리체크인, 회고, 면담, 진로 문서를 시간 순서로 조합해 본 분석입니다.</p>
        </div>
        <div class="learning-case-list">
          ${cases.length
            ? cases
                .map(
                  (item) => `
                    <article class="learning-case-card ${toneClass(learningCaseTone(item.severity))}">
                      <div class="learning-case-head">
                        <strong>${escapeHtml(item.label)}</strong>
                        <span>${escapeHtml(item.startDate || "-")}${item.endDate && item.endDate !== item.startDate ? ` - ${escapeHtml(item.endDate)}` : ""}</span>
                      </div>
                      <p>${escapeHtml(item.summary)}</p>
                      <small>${escapeHtml((item.evidence || []).join(" · "))}</small>
                    </article>
                  `
                )
                .join("")
            : `<article class="learning-case-card"><p>현재 수집된 복합 케이스가 없습니다.</p></article>`}
        </div>
      </section>
    `;
  }

  function renderExpressionProfile(student) {
    const profile = student.derived?.expressionProfile || {};
    const dimensions = profile.dimensions || {};
    const entries = ["specificity", "agency", "reflection", "relation", "career", "emotion", "uncertainty"]
      .map((key) => dimensions[key])
      .filter(Boolean);
    return `
      <section class="panel section-panel expression-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Expression Profile</span>
            <h3>자기표현과 발화 특징</h3>
          </div>
          <p class="panel-copy">나이, 성별, 학력은 점수 근거가 아니라 맥락으로만 보고, 학생이 직접 작성한 문서의 표현 방식을 중심으로 해석합니다.</p>
        </div>
        <div class="expression-context-grid">
          <article>
            <span>기본 맥락</span>
            <strong>${escapeHtml([profile.basicContext?.ageBand, profile.basicContext?.gender, profile.basicContext?.education].filter(Boolean).join(" · ") || "정보 부족")}</strong>
            <p>${escapeHtml(profile.basicContext?.note || "기본 정보는 해석 맥락으로만 사용합니다.")}</p>
          </article>
          <article>
            <span>직접 작성 자료</span>
            <strong>${escapeHtml(String(profile.sourceTotal || 0))}건</strong>
            <p>${escapeHtml(`모집 ${profile.sourceCounts?.admission || 0} · 체크인 ${profile.sourceCounts?.checkin || 0} · 회고 ${profile.sourceCounts?.retro || 0} · 진로문서 ${profile.sourceCounts?.careerDocument || 0}`)}</p>
          </article>
          <article>
            <span>요약</span>
            <strong>${escapeHtml((profile.dominantTraits || []).join(", ") || "판단 보류")}</strong>
            <p>${escapeHtml(profile.summary || "직접 작성 자료가 부족해 표현 특징을 보류합니다.")}</p>
          </article>
        </div>
        <div class="expression-dimension-list">
          ${entries
            .map(
              (item) => `
                <article class="expression-dimension-row">
                  <div>
                    <strong>${escapeHtml(item.label)}</strong>
                    <span>${escapeHtml(item.level || "-")} · ${escapeHtml(item.evidence || "")}</span>
                  </div>
                  <div class="profile-track">
                    <div class="profile-fill" style="width:${Math.max(4, Math.min(100, (Number(item.score) || 0) / 4 * 100))}%"></div>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
        <div class="expression-sample-list">
          ${(profile.samples || [])
            .map(
              (sample) => `
                <article>
                  <strong>${escapeHtml(sample.label || "작성 자료")}</strong>
                  <span>${escapeHtml(sample.date || "날짜 없음")}</span>
                  <p>${escapeHtml(sample.excerpt || "")}</p>
                </article>
              `
            )
            .join("") || `<article><p>표시할 작성 자료 요약이 없습니다.</p></article>`}
        </div>
      </section>
    `;
  }

  function renderProfileReasonBars(student) {
    return `
      <div class="profile-reason-list">
        ${PROFILE_KEYS.map((key) => {
          const value = Number(student.currentProfile?.[key] || 0);
          return `
            <article class="profile-reason-row">
              <div class="profile-reason-main">
                <div class="profile-reason-title">
                  <strong>${escapeHtml(PROFILE_LABELS[key])}</strong>
                  <button type="button" class="info-icon" data-criterion="${escapeHtml(key)}" aria-label="${escapeHtml(PROFILE_LABELS[key])} 판단기준">!</button>
                </div>
                <p>${escapeHtml(profileReason(key, value, student))}</p>
              </div>
              <div class="profile-reason-score">
                <strong>${escapeHtml(String(value))}</strong>
                <span>/ 4</span>
              </div>
              <div class="profile-track">
                <div class="profile-fill" style="width:${(value / 4) * 100}%"></div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function managementStatusBadge(status) {
    const meta = MANAGEMENT_STATUS_META[status] || MANAGEMENT_STATUS_META["일반"];
    return `<span class="pill ${toneClass(meta.tone)}">${escapeHtml(meta.label)}</span>`;
  }

  function managementStatusLabel(status) {
    return (MANAGEMENT_STATUS_META[status] || MANAGEMENT_STATUS_META["일반"]).label;
  }

  function profileKeyText(keys) {
    if (!keys?.length) return "현재 뚜렷한 관찰 포인트 없음";
    return keys.map((key) => PROFILE_LABELS[key] || key).join(", ");
  }

  window.StudentAppCommon = {
    rawData,
    studentsById,
    MANAGEMENT_STATUS_META,
    STUDENT_GROUP_SIGNAL_META,
    STUDENT_GROUP_SIGNAL_KEYS,
    PROFILE_KEYS,
    PROFILE_LABELS,
    PROFILE_SHORT_LABELS,
    PROFILE_CRITERIA,
    TAG_META,
    SORT_OPTIONS,
    escapeHtml,
    formatDate,
    formatRange,
    shortMilestoneLabel,
    toneClass,
    statusTone,
    statusReason,
    profileReason,
    loadStudentEdits,
    saveStudentEdit,
    clearStudentEdit,
    applyStudentEdits,
    hasDropoutRecord,
    effectiveManagementStatus,
    averageScore,
    studentById,
    studentSearchPool,
    studentGroupSignalMeta,
    studentGroupSignalByKey,
    studentHasGroupSignal,
    quickSearchResults,
    getSavedTheme,
    setTheme,
    getQueryParam,
    studentPageHref,
    lobbyPageHref,
    operationalClassificationMeta,
    operationalClassification,
    operationalClassificationRankValue,
    studentOperationalAssessments,
    studentOperationalAssessmentByKey,
    expressionFocusScore,
    diligenceScore,
    tagBadge,
    domainPills,
    metricCard,
    radarChart,
    growthChart,
    scatterPlot,
    renderQuickSearch,
    renderProfileBars,
    renderProfileReasonBars,
    milestoneStory,
    recentEventCards,
    primaryMetaLabel,
    renderClassificationReasons,
    renderCollaborationTrajectory,
    renderLearningFlowCases,
    renderExpressionProfile,
    managementStatusBadge,
    managementStatusLabel,
    profileKeyText,
  };
})();
