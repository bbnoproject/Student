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
      evidence: "프로젝트 체크인, 제출 시점, 회고의 실행 계획, 면담 후속 실천",
      rubric: "수행 과정, 실행 지속성, 결과 점검을 분리해 보는 분석적 루브릭을 적용합니다.",
      rating: "1점 긴급 지원, 2점 교사 안내 필요, 3점 독립 수행 가능, 4점 자기주도 개선 수준입니다.",
      caution: "출결만으로 판단하지 않고 반복 무연락, 미제출, 계획 후 미이행을 함께 봅니다.",
    },
    engagement: {
      question: "과정에 꾸준히 참여하고 흔들릴 때 복귀하는가",
      evidence: "체크인 응답률, 회고 지속 여부, 면담 이후 참여 회복, 늦잠 지각/무단 결석",
      rubric: "참여 빈도, 과제 지속성, 이탈 후 복귀 행동을 구분해 평정합니다.",
      rating: "1점 참여 단절, 2점 불안정 참여, 3점 대체로 지속, 4점 꾸준한 몰입과 회복 수준입니다.",
      caution: "건강형·행정형 출결은 참여 저하 근거로 직접 쓰지 않습니다.",
    },
    collaboration: {
      question: "팀 안에서 역할을 이해하고 관계를 조율하는가",
      evidence: "프로젝트 데일리체크인 제출 리듬, 회고 내용, 역할 수행 기록, 단계별 변화",
      rubric: "체크인 정시성, 회고 품질, 역할 수행, 프로젝트 진행 중 조율 흔적을 별도 준거로 관찰합니다.",
      rating: "1점 협업 저해, 2점 제한적 역할 수행, 3점 안정적 협업, 4점 팀 성과를 촉진하는 수준입니다.",
      caution: "비선호/선호 인원 언급은 관계 선호 참고값이며 협업 점수에 직접 반영하지 않습니다.",
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
      description: "6개 준거가 비교적 균형 있게 안정적인 학생",
    },
    growth_high: {
      label: "성장 우수",
      tone: "brand",
      description: "마일스톤을 지나는 동안 상승 흐름이 분명한 학생",
    },
    support_priority: {
      label: "집중 지원",
      tone: "danger",
      description: "현재 개입과 점검이 우선 필요한 학생",
    },
    collaboration_strength: {
      label: "협업 강점",
      tone: "mint",
      description: "데일리체크인, 회고, 역할 수행 흐름에서 강점이 확인된 학생",
    },
    career_progress: {
      label: "진로 준비 진전",
      tone: "violet",
      description: "이력서/자기소개 등 진로 문서 학습이 진전된 학생",
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
    profile: { label: "종합 프로파일", key: "profileRankScore" },
    growth: { label: "성장 곡선", key: "growthRankScore" },
    support: { label: "지원 우선도", key: "supportRankScore" },
    collaboration: { label: "협업 강점", key: "collaborationRankScore" },
    career: { label: "진로 준비", key: "careerRankScore" },
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

    if (attendanceRisk > 0) reasons.push(`판단 반영 위험 출결 ${attendanceRisk}건`);
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
    const score = Number(value || 0);
    const stats = student?.stats || {};
    const ratingLabel = score <= 1 ? "긴급 지원" : score === 2 ? "형성 중" : score === 3 ? "안정" : "확장";
    if (key === "selfRegulation") {
      if ((stats.attendanceRiskIssues || 0) > 0) return `${ratingLabel} 평정입니다. 늦잠 지각/무단 결석 ${stats.attendanceRiskIssues}건을 실행 지속성 루브릭에 반영했습니다.`;
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
        return `${ratingLabel} 평정입니다. 체크인 정시율 ${readiness.checkinOnTimeRate || 0}%, 회고 품질 ${readiness.retroQuality || 0}/4, 역할 수행 ${readiness.roleExecution || 0}/4, 변화 ${trajectory.label || "유지"}(${trajectory.delta || 0})를 반영했습니다.`;
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
        return `${ratingLabel} 평정입니다. 목적 명확성 ${readiness.purposeClarity}, 자기 강점 ${readiness.selfStrengthAwareness}, 자기 색깔 ${readiness.personalColor}을 함께 반영했습니다.`;
      }
      return score >= 3 ? `${ratingLabel} 평정입니다. 진로 방향, 자기 강점, 기획자 색깔의 연결이 비교적 드러납니다.` : `${ratingLabel} 평정입니다. 직무 목표와 자신만의 강점/색깔의 연결 근거가 부족합니다.`;
    }
    return "관련 기록을 종합해 산정한 보조 지표입니다.";
  }

  function averageScore(scores) {
    const values = PROFILE_KEYS.map((key) => Number(scores?.[key] || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    return values.length ? total / values.length : 0;
  }

  function studentById(studentId) {
    return studentsById.get(studentId) || null;
  }

  function studentSearchPool(student) {
    const tags = (student.derived?.tags || []).map((tag) => TAG_META[tag]?.label || tag);
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

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function studentPageHref(studentId) {
    return `./student.html?id=${encodeURIComponent(studentId)}`;
  }

  function lobbyPageHref() {
    return "./index.html";
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
          const value = Number(scores?.[key] || 0);
          return `
            <article class="profile-bar-card">
              <div class="profile-bar-head">
                <span>${escapeHtml(PROFILE_LABELS[key])}</span>
                <strong>${value}/4</strong>
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
    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Collaboration Timeline</span>
            <h3>프로젝트 협업 변화</h3>
          </div>
          <p class="panel-copy">협업은 관계 선호가 아니라 프로젝트 데일리체크인과 회고 내용을 중심으로 과거와 현재를 비교합니다.</p>
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
                      <p>${escapeHtml(`점수 ${Math.round(item.score || 0)} · 체크인 ${item.checkinCount || 0}건 · 지연 ${item.lateCheckinCount || 0}건 · 회고 ${item.retroCount || 0}건`)}</p>
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
    quickSearchResults,
    getSavedTheme,
    setTheme,
    getQueryParam,
    studentPageHref,
    lobbyPageHref,
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
    managementStatusBadge,
    managementStatusLabel,
    profileKeyText,
  };
})();
