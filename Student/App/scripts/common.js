(function () {
  const rawData = window.STUDENT_TIMELINE_DATA || { students: [], dashboard: {}, milestones: [] };
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
      description: "협업, 팀 역할, 반복 협업 관계가 강점인 학생",
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
    profile: { label: "종합 프로파일", key: "profileRankScore" },
    growth: { label: "성장 곡선", key: "growthRankScore" },
    support: { label: "지원 우선도", key: "supportRankScore" },
    collaboration: { label: "협업 강점", key: "collaborationRankScore" },
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

  function toneClass(tone) {
    return tone ? `tone-${tone}` : "tone-neutral";
  }

  function statusTone(status) {
    if (status === "경고") return "danger";
    if (status === "집중 관찰") return "warning";
    if (status === "주의") return "warning";
    return "success";
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
    return [
      student.name,
      student.phone,
      student.education,
      student.address,
      student.specialNote,
      student.stats?.currentStatus,
      student.course,
      student.cohort,
      ...tags,
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
      themeToggle.textContent = theme === "dark" ? "라이트 모드" : "다크 모드";
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
        (point, index) => `
          <text x="${point.x}" y="${height - 8}" class="growth-label" text-anchor="middle">
            M${index + 1}
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

  function profileKeyText(keys) {
    if (!keys?.length) return "현재 뚜렷한 관찰 포인트 없음";
    return keys.map((key) => PROFILE_LABELS[key] || key).join(", ");
  }

  window.StudentAppCommon = {
    rawData,
    studentsById,
    PROFILE_KEYS,
    PROFILE_LABELS,
    PROFILE_SHORT_LABELS,
    TAG_META,
    SORT_OPTIONS,
    escapeHtml,
    formatDate,
    formatRange,
    toneClass,
    statusTone,
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
    milestoneStory,
    recentEventCards,
    primaryMetaLabel,
    profileKeyText,
  };
})();
