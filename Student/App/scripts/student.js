(function () {
  const App = window.StudentAppCommon;
  const appRoot = document.getElementById("app-root");
  const searchInput = document.getElementById("global-search");
  const quickSearch = document.getElementById("quick-search");
  const themeToggle = document.getElementById("theme-toggle");

  const fallbackStudentId = App.rawData.students[0]?.id || "";
  const TAB_ALIASES = {
    dashboard: "status",
    detail: "records",
  };
  const STUDENT_TABS = [
    { key: "status", label: "성장지도" },
    { key: "score", label: "성적" },
    { key: "evaluation", label: "평가" },
    { key: "records", label: "기록" },
    { key: "materials", label: "추가자료" },
    { key: "basic", label: "기본정보" },
  ];

  function normalizeStudentTab(tab) {
    const normalized = TAB_ALIASES[tab] || tab || "status";
    return [...STUDENT_TABS.map((item) => item.key), "management"].includes(normalized) ? normalized : "status";
  }

  const state = {
    theme: App.getSavedTheme(),
    query: "",
    studentId: App.getQueryParam("id") || fallbackStudentId,
    studentTab: normalizeStudentTab(App.getQueryParam("tab")),
    detailMilestoneId: "all",
    activeCriterion: "",
    focusClassification: App.getQueryParam("focus") || "",
    focusStudentGroup: App.getQueryParam("group") || "",
  };

  function currentStudent() {
    return App.studentById(state.studentId) || App.rawData.students[0] || null;
  }

  function renderStudentHeader(student) {
    const primaryMeta = App.TAG_META[student.derived?.primaryTag] || App.TAG_META.steady_path;
    const direction = growthMapDirection(student);
    const totalScore = firstScore(student.derived?.totalRankScore, student.derived?.profileRankScore);
    const keywordStripHtml = `
      <div class="student-keyword-strip">
        <span class="${App.toneClass(App.statusTone(student.stats?.currentStatus))}"><em>상태</em><strong>${App.escapeHtml(student.stats?.currentStatus || "안정")}</strong></span>
        <span class="tone-brand"><em>대표 색</em><strong>${App.escapeHtml(compactKeyword(direction.headline, "강점 보류", 16))}</strong></span>
        <span class="tone-violet"><em>방향</em><strong>${App.escapeHtml(compactKeyword(direction.domains, "방향 보류", 24))}</strong></span>
      </div>
    `;
    return `
      <section class="hero-panel student-hero">
        <div class="student-hero-top">
          <a class="back-link" href="${App.lobbyPageHref()}">과정 개요로 돌아가기</a>
          <div class="pill-row">
            ${App.managementStatusBadge(student.managementStatus)}
            <span class="status-badge ${App.toneClass(App.statusTone(student.stats?.currentStatus))}">
              ${App.escapeHtml(student.stats?.currentStatus || "-")}
            </span>
            ${App.tagBadge(student.derived?.primaryTag)}
            ${
              state.studentTab === "management"
                ? `<button type="button" class="secondary-action compact-action" data-tab="status">개요로 돌아가기</button>`
                : `<button type="button" class="primary-action compact-action" data-tab="management">정보 수정</button>`
            }
          </div>
        </div>

        <div class="student-hero-grid">
          <section class="student-basic-panel">
            <div class="student-summary-head">
              <div>
                <p class="eyebrow">개인정보 개요</p>
                <h2>${App.escapeHtml(student.name)}</h2>
                <p class="student-intro">${App.escapeHtml(primaryMeta.description)}</p>
              </div>
              <div class="compact-profile-score">
                <span>총점</span>
                <strong>${App.escapeHtml(scoreLabel(totalScore))}</strong>
              </div>
            </div>

            ${keywordStripHtml}

            <div class="student-basic-grid">
              <div><span>성별</span><strong>${App.escapeHtml(student.gender || "-")}</strong></div>
              <div><span>생년월일</span><strong>${App.escapeHtml(App.formatDate(student.birthDate))}</strong></div>
              <div><span>거주지역</span><strong>${App.escapeHtml(student.address || "-")}</strong></div>
              <div><span>연락처</span><strong>${App.escapeHtml(student.phone || "-")}</strong></div>
              <div><span>학력</span><strong>${App.escapeHtml(student.education || "-")}</strong></div>
              <div><span>과정/기수</span><strong>${App.escapeHtml(`${student.course || "-"} / ${student.cohort || "-"}`)}</strong></div>
            </div>

          </section>
        </div>
      </section>
    `;
  }

  function plainText(value) {
    return String(value || "").trim();
  }

  function valueOrEmpty(value) {
    const text = plainText(value);
    return text && text !== "-" ? text : "";
  }

  function renderAdmissionValue(primary, detail) {
    const primaryText = valueOrEmpty(primary);
    const detailText = valueOrEmpty(detail);
    if (primaryText && detailText) return `${primaryText} · ${detailText}`;
    return primaryText || detailText || "기록 없음";
  }

  function admissionSummaryTone(value) {
    const text = plainText(value);
    if (/예|있|어려움|복용|질환|지병|추천/i.test(text)) return "tone-warning";
    if (/아니|없/i.test(text)) return "tone-mint";
    return "tone-neutral";
  }

  function writingInterpretation(label, text, student) {
    const profile = student.derived?.expressionProfile || {};
    const dominant = profile.summary ? `표현 분석: ${profile.summary}` : "";
    if (/자기소개/.test(label)) return "학생이 스스로 설명한 현재 배경과 과정 진입 전 자기 인식입니다.";
    if (/지원|계기|포부/.test(label)) return "과정 참여 동기와 지속 동기를 확인하는 원문입니다.";
    if (/경험|경력|취업|직무|분야/.test(label)) return "모집 단계에서 파악한 사전 경험, 희망 직무, 업계 이해 수준을 함께 보는 근거입니다.";
    if (/목표|수료/.test(label)) return "수료 후 목표가 얼마나 구체적인지, 취업 방향과 연결되는지 확인하는 근거입니다.";
    if (/갈등|협업/.test(label)) return "팀 프로젝트에서 갈등을 처리하는 방식과 소통 기준을 예측하는 근거입니다.";
    if (/실수|실패/.test(label)) return "실패 이후 회복 방식과 피드백 수용 태도를 보는 근거입니다.";
    if (/타인|부족/.test(label)) return "동료의 미흡함을 발견했을 때의 개입 방식과 협업 안전감을 보는 근거입니다.";
    if (/강점|약점/.test(label)) return "학생이 인식하는 장단점과 운영 관찰 포인트를 비교하기 위한 원문입니다.";
    if (/관심|기술|분야/.test(label)) return "관심 기술과 학습 욕구가 실제 프로젝트 선택과 맞물리는지 보는 근거입니다.";
    return dominant || "학생이 직접 작성한 문장을 원문 기준으로 확인하는 근거입니다.";
  }

  function uniqueEvidenceItems(items) {
    const seen = new Set();
    return items.filter((item) => {
      const text = valueOrEmpty(item.text);
      if (!text) return false;
      const key = `${item.source}::${item.label}::${text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      item.text = text;
      return true;
    });
  }

  function writingEvidenceItems(student) {
    const admission = student.admission || {};
    const cadet = student.cadetCard || {};
    const sections = cadet.sections || {};
    const baseItems = [
      { source: "지원서", label: "1분 자기소개", text: admission.intro },
      { source: "지원서", label: "참여 신청 이유", text: admission.motivation },
      { source: "지원서", label: "게임 관련 학습/업무 경험", text: admission.experience },
      { source: "지원서", label: "희망 취업 분야", text: admission.career },
      { source: "지원서", label: "수료 후 목표", text: admission.goal },
      { source: "지원서", label: "지병/질환 여부", text: admission.healthIssue },
      { source: "지원서", label: "지병/질환 상세", text: admission.healthIssueDetail },
      { source: "지원서", label: "갈등 대처", text: admission.conflict },
      { source: "지원서", label: "실수/실패 대응", text: admission.failure },
      { source: "지원서", label: "타인의 부족한 부분 대응", text: admission.peer },
      { source: "지원서", label: "경제적 어려움 여부", text: admission.financialHardship },
      { source: "지원서", label: "경제적 어려움 상세", text: admission.financialHardshipDetail },
      { source: "지원서", label: "게임업계 지인 여부", text: admission.industryConnection },
      { source: "지원서", label: "추천인/업계 지인", text: admission.referral },
      { source: "지원서", label: "걱정되는 부분/문의", text: admission.concern },
      { source: "대원카드", label: "과정을 들어오게 된 계기와 포부", text: cadet.motivation || sections["과정을 들어오게 된 계기와 포부"] },
      { source: "대원카드", label: "간단한 자기소개", text: cadet.intro || sections["간단한 자기소개"] },
      { source: "대원카드", label: "나의 강점과 약점", text: cadet.strengthsAndWeaknesses || sections["나의 강점과 약점"] },
      { source: "대원카드", label: "관심 기술/배우고 싶은 분야", text: cadet.interests || sections["관심 있는 기술 스택 / 배우고 싶은 분야"] },
      { source: "대원카드", label: "과정에서 이루고 싶은 목표", text: cadet.goal || sections["과정에서 이루고 싶은 목표"] },
      { source: "대원카드", label: "스트레스 해소 방법", text: cadet.stressRelief || sections["스트레스 해소 방법"] },
      { source: "대원카드", label: "TMI", text: cadet.tmi || sections.TMI },
      { source: "대원카드", label: "과정 수료 후 나의 모습 상상", text: cadet.futureSelf || sections["과정 수료 후 나의 모습 상상"] },
    ];
    const extraSectionItems = Object.entries(sections)
      .filter(([label]) => label && label !== "본문")
      .map(([label, text]) => ({ source: "대원카드", label, text }));
    return uniqueEvidenceItems([...baseItems, ...extraSectionItems]);
  }

  function renderAdmissionContextPanel(student) {
    const admission = student.admission || {};
    const contextItems = [
      {
        label: "지병/건강 제약",
        value: renderAdmissionValue(admission.healthIssue, admission.healthIssueDetail),
        tone: admissionSummaryTone(`${admission.healthIssue || ""} ${admission.healthIssueDetail || ""}`),
      },
      {
        label: "경제적 어려움",
        value: renderAdmissionValue(admission.financialHardship, admission.financialHardshipDetail),
        tone: admissionSummaryTone(`${admission.financialHardship || ""} ${admission.financialHardshipDetail || ""}`),
      },
      {
        label: "게임업계 지인 여부",
        value: renderAdmissionValue(admission.industryConnection, admission.referral),
        tone: admissionSummaryTone(`${admission.industryConnection || ""} ${admission.referral || ""}`),
      },
      {
        label: "경력사항/사전 경험",
        value: renderAdmissionValue(admission.experience, admission.career),
        tone: "tone-brand",
      },
      {
        label: "화상수업 장비",
        value: renderAdmissionValue(admission.cameraMic, ""),
        tone: "tone-neutral",
      },
      {
        label: "참여 걱정/문의",
        value: renderAdmissionValue(admission.concern, ""),
        tone: admissionSummaryTone(admission.concern),
      },
    ];

    return `
      <section class="panel section-panel admission-context-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Recruitment Context</span>
            <h3>모집 단계 핵심 정보</h3>
          </div>
          <p class="panel-copy">지원서와 면접 단계에서 직접 확인한 운영 참고 정보입니다.</p>
        </div>
        <div class="admission-context-grid">
          ${contextItems
            .map(
              (item) => `
                <article class="admission-context-card ${item.tone}">
                  <span>${App.escapeHtml(item.label)}</span>
                  <p>${App.escapeHtml(item.value)}</p>
                </article>
              `
            )
            .join("")}
        </div>
        <div class="admission-interview-summary">
          <span>면접 총평</span>
          <p>${App.escapeHtml(admission.interviewSummary || "기록 없음")}</p>
        </div>
      </section>
    `;
  }

  function renderWritingEvidencePanel(student) {
    const items = writingEvidenceItems(student);
    return `
      <section class="panel section-panel writing-evidence-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Original & Interpretation</span>
            <h3>학생 작성 원문과 해석</h3>
          </div>
          <p class="panel-copy">지원서와 대원카드의 학생 작성 내용을 원문 옆에서 바로 해석합니다.</p>
        </div>
        <div class="writing-evidence-list">
          ${
            items.length
              ? items
                  .map(
                    (item) => `
                      <article class="writing-evidence-card">
                        <div class="writing-evidence-head">
                          <span>${App.escapeHtml(item.source)}</span>
                          <strong>${App.escapeHtml(item.label)}</strong>
                        </div>
                        <div class="writing-evidence-columns">
                          <div class="writing-copy-block">
                            <span>원문</span>
                            <p>${App.escapeHtml(item.text)}</p>
                          </div>
                          <div class="writing-copy-block is-interpretation">
                            <span>해석</span>
                            <p>${App.escapeHtml(writingInterpretation(item.label, item.text, student))}</p>
                          </div>
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="empty-state compact">지원서 또는 대원카드 원문이 아직 연결되지 않았습니다.</div>`
          }
        </div>
      </section>
    `;
  }

  function renderStaffProfilePanel(student) {
    const profile = student.staffProfile || {};
    const properties = Object.entries(profile.properties || {}).filter(([, value]) => valueOrEmpty(value));
    const sections = Object.entries(profile.sections || {}).filter(([, value]) => valueOrEmpty(value));
    const hasProfile = properties.length || sections.length || valueOrEmpty(profile.fullText);

    return `
      <section class="panel section-panel staff-profile-panel-full">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Staff Student Profile</span>
            <h3>운영진 학생 정보 전체</h3>
          </div>
          <p class="panel-copy">학생 정보 원본에서 추출된 속성, 총평, Good/Bad, 특이사항을 누락 없이 확인합니다.</p>
        </div>
        ${
          hasProfile
            ? `
              <div class="staff-profile-meta-grid">
                ${properties
                  .map(
                    ([label, value]) => `
                      <article class="staff-profile-meta-card">
                        <span>${App.escapeHtml(label)}</span>
                        <p>${App.escapeHtml(value)}</p>
                      </article>
                    `
                  )
                  .join("")}
                ${
                  (profile.traits || []).length
                    ? `<article class="staff-profile-meta-card"><span>특징 태그</span><p>${App.escapeHtml(profile.traits.join(", "))}</p></article>`
                    : ""
                }
                ${
                  (profile.positiveRelations || []).length
                    ? `<article class="staff-profile-meta-card"><span>긍정적 관계</span><p>${App.escapeHtml(profile.positiveRelations.join(", "))}</p></article>`
                    : ""
                }
                ${
                  (profile.negativeRelations || []).length
                    ? `<article class="staff-profile-meta-card"><span>부정적 관계</span><p>${App.escapeHtml(profile.negativeRelations.join(", "))}</p></article>`
                    : ""
                }
              </div>
              <div class="source-section-list">
                ${
                  sections.length
                    ? sections
                        .map(
                          ([label, value]) => `
                            <article class="source-section-card">
                              <div class="source-section-head">
                                <span>학생 정보</span>
                                <strong>${App.escapeHtml(label)}</strong>
                              </div>
                              <p>${App.escapeHtml(value)}</p>
                            </article>
                          `
                        )
                        .join("")
                    : `<article class="source-section-card"><div class="source-section-head"><span>학생 정보</span><strong>전체 원문</strong></div><p>${App.escapeHtml(profile.fullText)}</p></article>`
                }
              </div>
            `
            : `<div class="empty-state compact">운영진 학생 정보 원본이 아직 연결되지 않았습니다.</div>`
        }
      </section>
    `;
  }

  function renderCounselingRecordsPanel(student) {
    const counselings = [...(student.counselings || [])].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    return `
      <section class="panel section-panel counseling-records-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Counseling Records</span>
            <h3>면담 기록 전체</h3>
          </div>
          <p class="panel-copy">요약 이벤트가 아니라 원본 면담 항목 전체를 날짜순으로 표시합니다.</p>
        </div>
        <div class="counseling-record-list">
          ${
            counselings.length
              ? counselings
                  .map(
                    (item, index) => `
                      <article class="counseling-record-card">
                        <div class="counseling-record-head">
                          <div>
                            <span>${App.escapeHtml(App.formatDate(item.date) || `면담 ${index + 1}`)}</span>
                            <strong>${App.escapeHtml(item.title || "면담 기록")}</strong>
                          </div>
                          ${item.counselor ? `<em>${App.escapeHtml(item.counselor)}</em>` : ""}
                        </div>
                        <p>${App.escapeHtml(item.content || "내용 없음")}</p>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="empty-state compact">면담 기록이 아직 연결되지 않았습니다.</div>`
          }
        </div>
      </section>
    `;
  }

  function renderCareerGuidancePanel(student) {
    const guidance = student.careerGuidance || {};
    const topDomains = guidance.topDomains || [];
    const sellingPoints = guidance.sellingPoints || [];
    const portfolioAngles = guidance.portfolioAngles || [];
    return `
      <section class="panel section-panel career-guidance-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Career Coaching</span>
            <h3>취업 지도용 강점 정리</h3>
          </div>
          <p class="panel-copy">실습 제출, 아침 발표, 자기 작성 자료를 바탕으로 학생이 취업 지원에서 활용할 수 있는 매력 포인트를 정리합니다.</p>
        </div>
        <div class="career-guidance-grid">
          <article class="career-guidance-card">
            <span>대표 강점 영역</span>
            <div class="guidance-chip-list">
              ${
                topDomains.length
                  ? topDomains.map((item) => `<strong>${App.escapeHtml(item.label)}</strong>`).join("")
                  : `<strong>대표 강점 분석 대기</strong>`
              }
            </div>
          </article>
          <article class="career-guidance-card">
            <span>자료 기반</span>
            <p>실습 제출 ${App.escapeHtml(String(guidance.submissionCount || 0))}건 · 발표 ${App.escapeHtml(String(guidance.presentationCount || 0))}건</p>
          </article>
        </div>
        <div class="guidance-section-grid">
          <article class="guidance-list-card">
            <h4>학생에게 알려줄 강점</h4>
            ${sellingPoints.length ? sellingPoints.map((item) => `<p>${App.escapeHtml(item)}</p>`).join("") : `<p>강점 문장 생성을 위한 자료가 아직 부족합니다.</p>`}
          </article>
          <article class="guidance-list-card">
            <h4>포트폴리오/면접 활용 방향</h4>
            ${portfolioAngles.length ? portfolioAngles.map((item) => `<p>${App.escapeHtml(item)}</p>`).join("") : `<p>대표 산출물을 먼저 선별해야 합니다.</p>`}
          </article>
        </div>
      </section>
    `;
  }

  function renderEvidenceList(evidence) {
    const items = evidence || [];
    return `
      <div class="strength-evidence-list">
        ${
          items.length
            ? items
                .map(
                  (item) => `
                    <article class="strength-evidence-item">
                      <span>${App.escapeHtml(item.sourceType || "자료")} · ${App.escapeHtml(item.sourceLabel || "근거")}</span>
                      <p>${App.escapeHtml(item.excerpt || "근거 원문 없음")}</p>
                      ${item.fileName ? `<small>${App.escapeHtml(item.fileName)}</small>` : ""}
                    </article>
                  `
                )
                .join("")
            : `<div class="empty-state compact">검증 가능한 근거가 아직 없습니다.</div>`
        }
      </div>
    `;
  }

  function renderStrengthProfilePanel(student) {
    const profile = student.strengthProfile || {};
    const overview = profile.overview || {};
    const motivation = profile.motivation || {};
    const strengths = profile.strengths || [];
    const improvements = profile.improvements || [];
    return `
      <section class="panel section-panel strength-profile-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Verified Strength Profile</span>
            <h3>검증 자료 기반 개별 강점</h3>
          </div>
          <p class="panel-copy">모든 강점과 개선점은 원문, 제출물, 평가, 행동 기록 같은 검증 가능한 자료와 함께 제시합니다.</p>
        </div>
        <div class="strength-overview-card">
          <span>취업 지도용 한줄 강점 · 신뢰도 ${App.escapeHtml(overview.confidence || "low")}</span>
          <strong>${App.escapeHtml(overview.headline || "강점 정리 필요")}</strong>
          <p>${App.escapeHtml(overview.summary || "검증 가능한 자료를 더 모아야 합니다.")}</p>
        </div>

        <article class="motivation-card">
          <div class="source-section-head">
            <span>게임업계 진입 동기</span>
            <strong>${App.escapeHtml(motivation.type || "판단 보류")}</strong>
          </div>
          <p>${App.escapeHtml(motivation.reason || "지원 동기 판단 근거가 부족합니다.")}</p>
          ${renderEvidenceList(motivation.evidence || [])}
          ${
            (motivation.missing || []).length
              ? `<div class="improvement-note-list">${motivation.missing.map((item) => `<p>${App.escapeHtml(item)}</p>`).join("")}</div>`
              : ""
          }
        </article>

        <div class="strength-card-list">
          ${
            strengths.length
              ? strengths
                  .map(
                    (item) => `
                      <article class="strength-card">
                        <div class="source-section-head">
                          <span>${App.escapeHtml(item.category || "강점")}</span>
                          <strong>${App.escapeHtml(item.title || "강점")}</strong>
                        </div>
                        <p>${App.escapeHtml(item.claim || "")}</p>
                        ${renderEvidenceList(item.evidence || [])}
                        <div class="strength-use-box">
                          <p><strong>취업 활용</strong>${App.escapeHtml(item.careerUse || "활용 문장 정리 필요")}</p>
                          <p><strong>주의</strong>${App.escapeHtml(item.caution || "근거 자료와 실제 산출물을 함께 확인하세요.")}</p>
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="empty-state compact">검증 가능한 강점 카드가 아직 없습니다.</div>`
          }
        </div>

        <div class="improvement-card-list">
          <h4>개선점과 코칭 질문</h4>
          ${
            improvements.length
              ? improvements
                  .map(
                    (item) => `
                      <article class="improvement-card">
                        <strong>${App.escapeHtml(item.title || "개선점")}</strong>
                        <p>${App.escapeHtml(item.basis || "")}</p>
                        ${renderEvidenceList(item.evidence || [])}
                        <em>${App.escapeHtml(item.coachingQuestion || "코칭 질문을 정리해야 합니다.")}</em>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="empty-state compact">우선 개선점이 크게 감지되지 않았습니다.</div>`
          }
        </div>
      </section>
    `;
  }

  function renderStudentGroupSignalsPanel(student) {
    const signals = student.studentGroupSignals || [];
    const focusMeta = state.focusStudentGroup ? App.studentGroupSignalMeta(state.focusStudentGroup) : null;
    return `
      <section class="panel section-panel group-signals-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Student Classification</span>
            <h3>학생군 분류 신호</h3>
          </div>
          <p class="panel-copy">${
            focusMeta
              ? App.escapeHtml(`${focusMeta.label} 필터에서 열었습니다. 이 학생이 해당 그룹에 묶인 근거를 먼저 확인하세요.`)
              : "생활/제출/발표/진로 데이터를 묶어 같은 행동 패턴의 학생군을 파악합니다."
          }</p>
        </div>
        <div class="group-signal-grid">
          ${
            signals.length
              ? signals
                  .map(
                    (signal) => `
                      <article class="group-signal-card ${App.toneClass(App.studentGroupSignalMeta(signal.key).tone)} ${signal.key === state.focusStudentGroup ? "is-focus" : ""}">
                        <strong>${App.escapeHtml(signal.label)}</strong>
                        <p>${App.escapeHtml(signal.basis)}</p>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="empty-state compact">분류 신호가 아직 없습니다.</div>`
          }
        </div>
      </section>
    `;
  }

  function renderMorningPresentationPanel(student) {
    const presentations = [...(student.morningPresentations || [])].sort((a, b) => String(a.presentationDate || "").localeCompare(String(b.presentationDate || "")));
    return `
      <section class="panel section-panel morning-presentation-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Morning Presentation</span>
            <h3>아침 발표 이력</h3>
          </div>
          <p class="panel-copy">지각 보완 발표와 자원 발표를 구분해 관심사, 공유성, 자기표현 신호로 봅니다.</p>
        </div>
        <div class="source-section-list">
          ${
            presentations.length
              ? presentations
                  .map(
                    (item) => `
                      <article class="source-section-card">
                        <div class="source-section-head">
                          <span>${item.isVolunteer ? "자원 발표" : "지각 후 발표"}</span>
                          <strong>${App.escapeHtml(App.formatDate(item.presentationDate))}</strong>
                        </div>
                        <p>${App.escapeHtml(item.topic || "발표 주제 없음")}${item.lateDate ? App.escapeHtml(`\n지각일: ${App.formatDate(item.lateDate)}`) : ""}</p>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="empty-state compact">아침 발표 이력이 없습니다.</div>`
          }
        </div>
      </section>
    `;
  }

  function renderPracticeSubmissionPanel(student) {
    const submissions = student.practiceSubmissions || [];
    const visible = submissions.slice(0, 18);
    return `
      <section class="panel section-panel practice-submission-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Practice Evidence</span>
            <h3>실습 제출 분석</h3>
          </div>
          <p class="panel-copy">제출 파일을 학생 수준과 강점 파악 근거로 연결합니다. 텍스트 추출이 가능한 문서는 요약 근거를 함께 표시합니다.</p>
        </div>
        <div class="practice-summary-row">
          ${App.metricCard("제출 수", `${submissions.length}건`, "실습 제출 폴더 기준", "brand")}
          ${App.metricCard("텍스트 분석", `${submissions.filter((item) => item.textExtracted).length}건`, "PDF/XLSX/DOCX 추출 성공", "mint")}
          ${App.metricCard("발표 이력", `${student.morningPresentations?.length || 0}건`, `자원 발표 ${(student.morningPresentations || []).filter((item) => item.isVolunteer).length}건`, "violet")}
        </div>
        <div class="practice-submission-list">
          ${
            visible.length
              ? visible
                  .map(
                    (item) => {
                      const strengths = Object.keys(item.strengthHits || {}).map((key) => key.replaceAll("_", " "));
                      return `
                        <article class="practice-submission-card">
                          <div class="source-section-head">
                            <span>${App.escapeHtml(item.module || "실습")}</span>
                            <strong>${App.escapeHtml(item.assignment || item.fileName)}</strong>
                          </div>
                          <p>${App.escapeHtml(item.excerpt || item.fileName)}</p>
                          <small>${App.escapeHtml(item.fileName)}${strengths.length ? App.escapeHtml(` · 신호 ${strengths.join(", ")}`) : ""}</small>
                        </article>
                      `;
                    }
                  )
                  .join("")
              : `<div class="empty-state compact">실습 제출물이 연결되지 않았습니다.</div>`
          }
        </div>
        ${submissions.length > visible.length ? `<p class="panel-copy">외 ${App.escapeHtml(String(submissions.length - visible.length))}건은 데이터에 포함되어 있으며 대표 항목만 표시합니다.</p>` : ""}
      </section>
    `;
  }

  function actualMilestones(student) {
    return (student.milestones || []).filter(
      (milestone) => !milestone.isEstimated && milestone.participated !== false && Number.isFinite(Number(milestone.profileAverage))
    );
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function firstScore(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return Math.max(0, Math.min(100, number));
    }
    return 0;
  }

  function scoreLabel(value) {
    return `${firstScore(value).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}점`;
  }

  function compactText(value, fallback = "기록 확인 필요", maxLength = 150) {
    const text = valueOrEmpty(value) || fallback;
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  }

  function isReliablePeerFeedback(item, studentName = "") {
    const snippet = valueOrEmpty(item?.snippet);
    if (!snippet) return false;
    if (/^[,.;:·\-–—\s]*(은|는|을|를|도|만|의|에|에서|로|으로)(\s|$)/.test(snippet)) return false;
    if (studentName && !snippet.includes(studentName)) return false;
    const quality = item?.attributionQuality || "direct_mention";
    return quality === "direct_mention" || quality === "relation_list";
  }

  function evidenceLabel(evidence) {
    const items = (evidence || [])
      .map((item) => [item.sourceType, item.sourceLabel].filter(Boolean).join(" · "))
      .filter(Boolean);
    return items.slice(0, 2).join(" / ") || "근거 자료 확인 필요";
  }

  function compactKeyword(value, fallback = "확인 필요", maxLength = 18) {
    const text = valueOrEmpty(value) || fallback;
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  }

  function domainPercentile(key, score) {
    const target = Number(score);
    if (!key || !Number.isFinite(target)) return 0;
    const scores = (App.rawData.students || [])
      .map((student) => (student.careerGuidance?.topDomains || []).find((item) => item.key === key)?.score)
      .map(Number)
      .filter((value) => Number.isFinite(value));
    if (!scores.length) return 0;
    return Math.round((scores.filter((value) => value <= target).length / scores.length) * 100);
  }

  function plannerColorFromText(text, fallback = "기획 색깔") {
    if (/내러티브|시나리오|세계관|스토리|연출|애니메이션|문화콘텐츠|PV/i.test(text)) {
      return { keyword: "내러티브/연출", title: "내러티브와 연출 감각을 기획 언어로 바꾸는 색" };
    }
    if (/시스템|밸런스|데이터|규칙|역기획|UI\/UX|테이블|레벨/i.test(text)) {
      return { keyword: "시스템 구조화", title: "규칙과 구조를 문서로 정리하는 시스템 기획 색" };
    }
    if (/BM|시장|유저|지표|분석|라이브|업데이트/i.test(text)) {
      return { keyword: "분석형 기획", title: "시장과 유저 흐름을 해석하는 분석형 기획 색" };
    }
    if (/팀장|PM|리더|조율|화합|방향성|협업/i.test(text)) {
      return { keyword: "조율형 리더십", title: "팀의 방향을 안정화하는 조율형 기획 색" };
    }
    return { keyword: fallback, title: `${fallback}을 포트폴리오 언어로 정리할 후보` };
  }

  function evidenceFromStrength(item) {
    return (item.evidence || [])
      .map((evidence) => evidence.excerpt || evidence.sourceLabel || evidence.sourceType || "")
      .filter(Boolean)
      .slice(0, 2);
  }

  function buildSignatureStrengths(student) {
    const guidance = student.careerGuidance || {};
    const collaboration = student.derived?.collaborationReadiness || {};
    const profileStrengths = Array.isArray(student.strengthProfile?.strengths) ? student.strengthProfile.strengths : [];
    const priorText = [student.education, student.admission?.experience, student.admission?.career, student.admission?.goal].filter(Boolean).join(" ");
    const candidates = [];
    const addCandidate = (candidate) => {
      if (!candidate || !candidate.title) return;
      const key = candidate.key || candidate.title;
      if (candidates.some((item) => item.key === key || item.keyword === candidate.keyword)) return;
      candidates.push({
        confidence: "강점 후보",
        tone: "neutral",
        evidence: [],
        caution: "제출 여부만으로는 강점으로 확정하지 않고, 원문과 산출물 질을 함께 확인해야 합니다.",
        ...candidate,
        key,
      });
    };

    if (/인턴|회사|근무|경력|게임잼|해커톤|공모|팬 게임|역기획|넥토리얼|포트폴리오|PV|전공|문화콘텐츠|컴퓨터공학/i.test(priorText)) {
      const color = plannerColorFromText(priorText, "경험 기반");
      const hasRareExperience = /인턴|회사|근무|게임잼|해커톤|팬 게임|역기획|넥토리얼|공모/i.test(priorText);
      addCandidate({
        key: "prior-experience",
        keyword: color.keyword,
        title: color.title,
        confidence: hasRareExperience ? "강한 근거" : "확인 필요",
        tone: hasRareExperience ? "brand" : "neutral",
        score: hasRareExperience ? 92 : 68,
        reason: compactText(priorText, "전공/경험 기반 색깔 확인 필요", 190),
        evidence: [student.education, student.admission?.experience, student.admission?.goal].filter(Boolean).slice(0, 3),
        caution: hasRareExperience ? "경험이 실제 기획 판단으로 연결되는지 산출물과 면담에서 확인합니다." : "전공은 출발점일 뿐이며, 기획 산출물의 판단력이 함께 확인되어야 합니다.",
      });
    }

    const qualityFeedback = (collaboration.teamPeerFeedback || []).filter((item) => {
      const text = item.snippet || "";
      return isReliablePeerFeedback(item, student.name) && item.type === "praise" && /기획|논리|방향|정리|이해|리더|화합|조율|책임|피드백|문서|설계|분석|안정|확고/i.test(text);
    });
    if (qualityFeedback.length) {
      const text = qualityFeedback.map((item) => item.snippet).join(" ");
      const color = plannerColorFromText(text, "동료 검증");
      addCandidate({
        key: "peer-quality",
        keyword: color.keyword,
        title: color.title,
        confidence: "동료 검증",
        tone: "violet",
        score: 86 + Math.min(8, qualityFeedback.length * 2),
        reason: compactText(qualityFeedback[0].snippet, "동료 평가에서 기획자적 강점이 언급되었습니다.", 190),
        evidence: qualityFeedback.slice(0, 3).map((item) => `${item.from} · ${item.sourcePhase || "기록"} · ${compactText(item.snippet, "", 90)}`),
        caution: "동료 칭찬도 관계성의 영향을 받을 수 있어, 같은 맥락의 산출물과 함께 확인합니다.",
      });
    }

    if ((collaboration.leadershipRoleCount || 0) >= 2 || (collaboration.leadershipPeerPositiveWeight || 0) >= 3) {
      addCandidate({
        key: "leadership",
        keyword: "팀 리딩",
        title: "반복된 팀장/PM 맥락에서 검증되는 운영형 기획 색",
        confidence: "역할 검증",
        tone: "success",
        score: 82 + Math.min(10, Number(collaboration.leadershipRoleCount || 0) * 3),
        reason: `팀장/PM 역할 ${collaboration.leadershipRoleCount || 0}회, 리더십 긍정 가중 ${collaboration.leadershipPeerPositiveWeight || 0}로 확인됩니다.`,
        evidence: (collaboration.teamPeerFeedback || [])
          .filter((item) => isReliablePeerFeedback(item, student.name) && item.type === "praise" && /팀장|리더|방향|화합|조율|안정/i.test(item.snippet || ""))
          .slice(0, 3)
          .map((item) => `${item.from} · ${compactText(item.snippet, "", 90)}`),
        caution: "리더 경험은 횟수보다 팀원이 체감한 방향성, 갈등 조율, 산출물 완성도를 함께 봅니다.",
      });
    }

    (guidance.topDomains || []).forEach((domain) => {
      const percentile = domainPercentile(domain.key, domain.score);
      const matchingStrength = profileStrengths.find((item) => item.title === domain.label || `${item.title || ""} ${item.claim || ""}`.includes(domain.label));
      const evidence = matchingStrength ? evidenceFromStrength(matchingStrength) : (guidance.evidence || []).filter((item) => item.includes(domain.label)).slice(0, 2);
      if ((Number(domain.score) >= 45 || percentile >= 85) && evidence.length >= 2) {
        addCandidate({
          key: `domain-${domain.key}`,
          keyword: domain.label,
          title: `${domain.label}을 자기 색으로 밀어볼 수 있는 후보`,
          confidence: percentile >= 90 ? "상위권 신호" : "검증 필요",
          tone: percentile >= 90 ? "brand" : "neutral",
          score: 50 + Math.min(18, Number(domain.score) / 5) + (percentile >= 90 ? 6 : 0),
          reason: `${domain.label} 관련 근거가 기수 내 ${percentile}백분위 수준으로 반복 확인됩니다.`,
          evidence,
          caution: "반복 키워드가 곧 실력은 아닙니다. 문제 정의, 판단 이유, 개선안의 깊이를 원문에서 확인해야 합니다.",
        });
      }
    });

    if (!candidates.length) {
      addCandidate({
        key: "insufficient",
        keyword: "강점 보류",
        title: "아직 독보적인 기획자 색깔을 확정하기 어렵습니다",
        confidence: "보류",
        tone: "warning",
        score: 0,
        reason: "현재 자료만으로는 이 학생만의 매력적인 기획 색깔을 확정하기 어렵습니다.",
        evidence: ["제출 여부보다 산출물의 판단력, 프로젝트 행동, 동료/강사 관찰을 추가 확인해야 합니다."],
        caution: "강점 후보를 억지로 만들지 말고 다음 면담과 산출물 리뷰에서 확인해야 합니다.",
      });
    }

    return candidates.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 4);
  }

  function growthMapDirection(student) {
    const signatures = buildSignatureStrengths(student);
    const primary = signatures[0] || {};
    const improvement = (student.strengthProfile?.improvements || [])[0] || {};
    const keywords = signatures
      .filter((item) => item.keyword && item.keyword !== "강점 보류")
      .slice(0, 3)
      .map((item) => item.keyword);
    return {
      headline: primary.keyword || "강점 보류",
      summary: primary.title || "독보적인 강점 후보를 더 확인해야 합니다.",
      domains: keywords.join(" · ") || "방향 보류",
      portfolio: primary.reason || "포트폴리오 방향은 강점 근거를 더 확인한 뒤 정리합니다.",
      coachingQuestion: improvement.coachingQuestion || primary.caution || "이 강점이 실제 산출물에서 어떻게 드러나는지 다음 면담에서 확인합니다.",
      signatures,
    };
  }

  function renderGrowthMapPanel(student) {
    const direction = growthMapDirection(student);
    const signatures = direction.signatures || [];
    const primary = signatures[0] || {};
    const dropoutDate = student.dropoutInfo?.date || student.stats?.dropoutDate || "";
    const dataWindow = dropoutDate
      ? `이탈 시점 ${App.formatDate(dropoutDate)}까지`
      : `${App.formatDate(student.stats?.dataStartDate)} - ${App.formatDate(student.stats?.dataEndDate)}`;

    return `
      <section class="panel section-panel growth-map-panel">
        <div class="growth-map-head">
          <div>
            <span class="panel-kicker">Growth Map</span>
            <h3>${App.escapeHtml(student.name)}의 기획자 색깔</h3>
            <p>단순 수행 기록은 제외하고, 전공·경험·프로젝트 행동·동료 언급·산출물 맥락에서 매력적인 강점 후보만 올립니다.</p>
          </div>
          <div class="growth-map-observation">
            <span>데이터 반영 기간</span>
            <strong>${App.escapeHtml(dataWindow)}</strong>
          </div>
        </div>

        <div class="growth-map-layout">
          <article class="planner-color-card ${App.toneClass(primary.tone)}">
            <span>${App.escapeHtml(primary.confidence || "강점 후보")}</span>
            <h4>${App.escapeHtml(primary.title || "강점 후보 확인 필요")}</h4>
            <p>${App.escapeHtml(compactText(primary.reason, "현재 자료만으로는 대표 강점을 확정하기 어렵습니다.", 260))}</p>
            <div class="signature-evidence-list">
              ${(primary.evidence || []).slice(0, 3).map((item) => `<em>${App.escapeHtml(compactText(item, "", 120))}</em>`).join("")}
            </div>
          </article>

          <aside class="growth-coaching-card">
            <span>미래 방향</span>
            <strong>${App.escapeHtml(direction.domains)}</strong>
            <p>${App.escapeHtml(compactText(direction.portfolio, "포트폴리오 방향 정리 필요", 210))}</p>
            <div>
              <span>다음 코칭 질문</span>
              <p>${App.escapeHtml(direction.coachingQuestion)}</p>
            </div>
          </aside>
        </div>

        <div class="growth-strength-section">
          <div class="growth-section-title">
            <span>강점 후보 검증</span>
            <strong>좋아 보이는 키워드가 아니라, 실제 기획자 매력으로 밀 수 있는지 냉정하게 봅니다.</strong>
          </div>
          <div class="growth-strength-grid">
            ${
              signatures.slice(1).length
                ? signatures
                    .slice(1)
                    .map(
                      (item) => `
                        <article class="growth-strength-card">
                          <span>${App.escapeHtml(item.confidence || "강점 후보")}</span>
                          <h4>${App.escapeHtml(item.title)}</h4>
                          <p>${App.escapeHtml(compactText(item.reason, "근거 확인 필요", 145))}</p>
                          <small>${App.escapeHtml(item.caution || evidenceLabel(item.evidence))}</small>
                        </article>
                      `
                    )
                    .join("")
                : `<div class="empty-state compact">대표 색깔 외에 추가로 확정할 강점은 아직 보류합니다.</div>`
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderOperationalScorePanel(student) {
    const derived = student.derived || {};
    const initial = derived.initialCapability || {};
    const growth = derived.growthPotential || {};
    const participation = derived.participationReadiness || {};
    const participationExpected = Number(participation.projectExpectedCount || student.stats?.projectExpectedCount || 0);
    const participationSubmitted = Number(participation.projectSubmissionCount || student.stats?.projectSubmissionCount || 0);
    const participationWindowCopy = participationExpected
      ? `제출 ${participationSubmitted}/${participationExpected} (${participation.projectSubmissionRate || 0}%)`
      : "관측기간 제출 기준 없음";
    const career = derived.careerReadiness || {};
    const collaboration = derived.collaborationReadiness || {};
    const support = derived.operationalRiskFlags || {};
    const competencyScores = [
      {
        label: "총점",
        score: firstScore(derived.totalRankScore, derived.profileRankScore),
        copy: "성장·참여·협업·진로 중심 종합",
        tone: "success",
      },
      {
        label: "성장",
        score: firstScore(derived.growthPotentialRankScore, derived.growthRankScore),
        copy: `${growth.pattern || "패턴 확인"} · 현재 ${scoreLabel(growth.currentLevelScore)} · 신뢰 ${scoreLabel(growth.confidenceScore)}`,
        tone: "mint",
      },
      {
        label: "참여",
        score: firstScore(derived.participationRankScore, participation.score),
        copy: `${participationWindowCopy} · 체크인 ${participation.checkinOnTimeRate || 0}% · TIL ${scoreLabel(participation.tilResponseScore)}`,
        tone: "success",
      },
      {
        label: "협업",
        score: firstScore(derived.collaborationRankScore, collaboration.collaborationReadinessScore),
        copy: `동료 긍정 ${collaboration.peerPositiveWeight || 0} · 비판 ${Number(collaboration.peerComplaintWeight || 0) + Number(collaboration.peerAvoidWeight || 0)} · PM/팀장 ${collaboration.leadershipRoleCount || 0}회`,
        tone: "violet",
      },
      {
        label: "진로",
        score: firstScore(derived.careerRankScore, career.careerReadinessScore),
        copy: `구체 목표 ${career.hasConcreteGoal ? "있음" : "부족"} · 객관 근거 ${scoreLabel(career.objectiveEvidenceScore)} · 추상 ${career.abstractExpressionCount || 0}건`,
        tone: "brand",
      },
      {
        label: "초기",
        score: firstScore(derived.initialCapabilityRankScore, initial.score),
        copy: initial.evidence?.slice(0, 2).join(" · ") || "전공/경험/지원서 기반",
        tone: "neutral",
      },
    ];
    const supportScore = {
      label: "지원검토",
      score: firstScore(derived.supportRankScore, derived.supportIndex),
      copy: `현장 ${support.fieldPerformance?.hardGate ? "하드" : support.fieldPerformance?.hasRisk ? "검토" : "낮음"} · 동료 ${support.peerReputation?.hardGate ? "하드" : support.peerReputation?.hasRisk ? "검토" : "낮음"} · 불일치 ${support.evaluationMismatch?.hasRisk ? "있음" : "낮음"}`,
      tone: "warning",
    };
    const nonTotalScores = competencyScores.filter((item) => item.label !== "총점");
    const strongest = [...nonTotalScores].sort((a, b) => b.score - a.score)[0] || competencyScores[0];
    const weakest = [...nonTotalScores].sort((a, b) => a.score - b.score)[0] || competencyScores[0];
    const scoreRows = [
      ...competencyScores.filter((item) => item.label !== "총점"),
      {
        ...supportScore,
        separate: true,
      },
    ];
    return `
      <section class="panel section-panel operational-score-panel score-board-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Score Model</span>
            <h3>운영 분류 점수</h3>
          </div>
          <p class="panel-copy">총점은 역량 판단, 지원검토는 개입 우선도입니다. 두 지표를 섞지 않고 핵심만 먼저 보여줍니다.</p>
        </div>

        <div class="score-summary-grid">
          <article class="score-total-card ${App.toneClass("success")}">
            <span>역량 총점</span>
            <strong>${App.escapeHtml(scoreLabel(competencyScores[0].score))}</strong>
            <p>${App.escapeHtml(competencyScores[0].copy)}</p>
          </article>
          <article class="score-total-card ${App.toneClass("warning")}">
            <span>지원검토</span>
            <strong>${App.escapeHtml(scoreLabel(supportScore.score))}</strong>
            <p>총점과 분리된 운영 개입 우선도</p>
          </article>
          <article class="score-insight-card">
            <span>가장 강한 축</span>
            <strong>${App.escapeHtml(strongest.label)} · ${App.escapeHtml(scoreLabel(strongest.score))}</strong>
            <p>${App.escapeHtml(compactText(strongest.copy, "근거 확인 필요", 120))}</p>
          </article>
          <article class="score-insight-card is-watch">
            <span>먼저 확인할 축</span>
            <strong>${App.escapeHtml(weakest.label)} · ${App.escapeHtml(scoreLabel(weakest.score))}</strong>
            <p>${App.escapeHtml(compactText(weakest.copy, "근거 확인 필요", 120))}</p>
          </article>
        </div>

        <div class="score-board-list">
          ${scoreRows
            .map(
              (item) => `
                <article class="score-board-row ${item.separate ? "is-separate" : ""}">
                  <div>
                    <span>${App.escapeHtml(item.label)}</span>
                    <strong>${App.escapeHtml(scoreLabel(item.score))}</strong>
                  </div>
                  <div class="score-track" aria-hidden="true">
                    <span class="${App.toneClass(item.tone)}" style="width:${firstScore(item.score)}%"></span>
                  </div>
                  <p>${App.escapeHtml(compactText(item.copy, "근거 확인 필요", 105))}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function jobFitTone(score) {
    const value = firstScore(score);
    if (value >= 76) return "success";
    if (value >= 66) return "brand";
    if (value >= 56) return "warning";
    return "neutral";
  }

  function renderJobFitPanel(student) {
    const fit = student.jobFit || {};
    const topRoles = fit.topRoles || [];
    const jobs = fit.recommendedJobs || [];
    const market = App.rawData.jobMarket || {};
    const score = firstScore(fit.score);
    return `
      <section class="panel section-panel job-fit-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">GameJob Match</span>
            <h3>채용공고 직무 적합도</h3>
          </div>
          <p class="panel-copy">게임잡 공고 ${App.escapeHtml(String(market.planningJobs || 0))}건 기준 · ${App.escapeHtml(fit.marketDate || market.latestUpdatedAt || "날짜 미확인")}</p>
        </div>
        <div class="job-fit-hero ${App.toneClass(jobFitTone(score))}">
          <div>
            <span>${App.escapeHtml(fit.label || "판단 보류")}</span>
            <strong>${App.escapeHtml(scoreLabel(score))}</strong>
            <p>${App.escapeHtml(fit.summary || "공고 매칭 데이터가 아직 없습니다.")}</p>
          </div>
          <a class="soft-action compact-action" href="${App.escapeHtml(fit.sourceUrl || market.sourceUrl || "https://rkdghkclgns-design.github.io/gamejob-crawler/")}" target="_blank" rel="noopener">공고 원본</a>
        </div>
        <div class="job-fit-grid">
          <section>
            <div class="growth-section-title">
              <span>적합 직무군</span>
              <strong>학생의 산출물/진로문서와 공고 키워드가 만나는 영역입니다.</strong>
            </div>
            <div class="job-role-list">
              ${
                topRoles.length
                  ? topRoles
                      .map(
                        (role) => `
                          <article>
                            <div>
                              <strong>${App.escapeHtml(role.label)}</strong>
                              <span>${App.escapeHtml(scoreLabel(role.score))} · 공고 ${App.escapeHtml(String(role.marketCount || 0))}건</span>
                            </div>
                            <i aria-hidden="true"><span style="width:${firstScore(role.score)}%"></span></i>
                          </article>
                        `
                      )
                      .join("")
                  : `<div class="empty-state compact">직무군 매칭 근거가 부족합니다.</div>`
              }
            </div>
          </section>
          <section>
            <div class="growth-section-title">
              <span>보완 포인트</span>
              <strong>지원 전 포트폴리오와 면접 답변에서 먼저 메워야 할 부분입니다.</strong>
            </div>
            <div class="job-gap-list">
              ${(fit.gaps || []).map((gap) => `<p>${App.escapeHtml(gap)}</p>`).join("") || `<p>보완 포인트가 아직 산정되지 않았습니다.</p>`}
            </div>
          </section>
        </div>
        <div class="job-card-list">
          ${jobs.length
            ? jobs
                .map(
                  (job) => `
                    <a class="job-match-card" href="${App.escapeHtml(job.link || "#")}" target="_blank" rel="noopener">
                      <div>
                        <strong>${App.escapeHtml(job.company || "-")}</strong>
                        <span>${App.escapeHtml(scoreLabel(job.score))}</span>
                      </div>
                      <h4>${App.escapeHtml(job.title || "공고 제목 없음")}</h4>
                      <p>${App.escapeHtml((job.reasons || []).join(" · ") || "매칭 근거 확인 필요")}</p>
                      <small>${App.escapeHtml([job.experience, job.employmentType, job.deadline].filter(Boolean).join(" · "))}</small>
                    </a>
                  `
                )
                .join("")
            : `<div class="empty-state compact">추천 공고가 아직 없습니다.</div>`}
        </div>
        <p class="panel-copy">${App.escapeHtml(fit.basis || "공고 데이터와 학생 자료를 별도 지표로 비교합니다.")}</p>
      </section>
    `;
  }

  function fiveMetricScores(student) {
    const profile = student.currentProfile || {};
    const stats = student.stats || {};
    const profileAverage = App.averageScore(profile);
    const selfDriven = App.averageScore({
      selfRegulation: profile.selfRegulation,
      reflection: profile.reflection,
      careerAgency: profile.careerAgency,
    });
    const attendancePenalty =
      (Number(stats.attendanceRiskIssues) || 0) * 16 +
      (Number(stats.lateCount) || 0) * 4 +
      (Number(stats.absenceCount) || 0) * 5 +
      (Number(stats.healthAttendanceIssues) || 0) * 2;
    return {
      attendance: clampScore(100 - attendancePenalty),
      engagement: clampScore(((Number(profile.engagement) || 0) / 4) * 60 + (Number(stats.projectSubmissionRate) || 0) * 0.4),
      output: clampScore(Number(stats.projectSubmissionRate) || 0),
      achievement: clampScore((profileAverage / 4) * 100),
      selfDirected: clampScore((selfDriven / 4) * 100),
    };
  }

  function courseFiveMetricAverages() {
    const totals = {};
    const students = App.rawData.students || [];
    students.forEach((student) => {
      const scores = fiveMetricScores(student);
      Object.entries(scores).forEach(([key, value]) => {
        totals[key] = (totals[key] || 0) + value;
      });
    });
    return Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, clampScore(value / Math.max(1, students.length))])
    );
  }

  function renderFiveMetricRadar(scores, averages) {
    const labels = [
      ["attendance", "출석 성실성"],
      ["engagement", "학습 참여도"],
      ["output", "산출 수행력"],
      ["achievement", "평가 성취도"],
      ["selfDirected", "자기주도 학습력"],
    ];
    const size = 280;
    const center = 140;
    const radius = 92;
    const polygonFor = (source) =>
      labels
        .map(([key], index) => {
          const angle = -Math.PI / 2 + (index / labels.length) * Math.PI * 2;
          const scaled = ((Number(source[key]) || 0) / 100) * radius;
          return `${center + Math.cos(angle) * scaled},${center + Math.sin(angle) * scaled}`;
        })
        .join(" ");
    const grid = [20, 40, 60, 80, 100]
      .map((level) => {
        const scaled = (level / 100) * radius;
        const points = labels
          .map((_, index) => {
            const angle = -Math.PI / 2 + (index / labels.length) * Math.PI * 2;
            return `${center + Math.cos(angle) * scaled},${center + Math.sin(angle) * scaled}`;
          })
          .join(" ");
        return `<polygon points="${points}" class="radar-grid"></polygon>`;
      })
      .join("");
    const axes = labels
      .map(([, label], index) => {
        const angle = -Math.PI / 2 + (index / labels.length) * Math.PI * 2;
        const x = center + Math.cos(angle) * (radius + 36);
        const y = center + Math.sin(angle) * (radius + 36);
        return `
          <line x1="${center}" y1="${center}" x2="${center + Math.cos(angle) * radius}" y2="${center + Math.sin(angle) * radius}" class="radar-axis"></line>
          <text x="${x}" y="${y}" class="radar-label">${App.escapeHtml(label)}</text>
        `;
      })
      .join("");
    return `
      <svg class="five-metric-radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="5대 역량 지표 레이더 차트">
        ${grid}
        ${axes}
        <polygon points="${polygonFor(averages)}" class="radar-average-area"></polygon>
        <polygon points="${polygonFor(scores)}" class="radar-area"></polygon>
      </svg>
    `;
  }

  function renderFiveMetricPanel(student) {
    const scores = fiveMetricScores(student);
    const averages = courseFiveMetricAverages();
    const metricLabels = {
      attendance: "출석 성실성",
      engagement: "학습 참여도",
      output: "산출 수행력",
      achievement: "평가 성취도",
      selfDirected: "자기주도 학습력",
    };
    const metricNotes = {
      attendance: "출결 위험, 지각, 결석, 건강/컨디션 출결을 함께 본 지표",
      engagement: "참여 프로파일과 프로젝트 제출률을 함께 본 지표",
      output: "프로젝트 데일리 기록 제출률 중심 지표",
      achievement: "현재 6개 프로파일 평균을 100점 척도로 환산",
      selfDirected: "자기조절, 성찰, 진로 주도성을 합산한 지표",
    };
    return `
      <section class="panel section-panel five-metric-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Score</span>
            <h3>5대 역량 지표</h3>
          </div>
          <p class="panel-copy">기존 학생 파악 페이지의 성적 관점을 현재 데이터 기준으로 재구성했습니다.</p>
        </div>
        <div class="five-metric-layout">
          <div class="student-profile-panel">
            ${renderFiveMetricRadar(scores, averages)}
            <div class="chart-legend">
              <span><i class="legend-dot is-student"></i>내 점수</span>
              <span><i class="legend-dot is-average"></i>과정 평균</span>
            </div>
          </div>
          <div class="five-metric-summary">
            ${Object.entries(metricLabels)
              .map(([key, label]) => {
                const score = scores[key] || 0;
                const average = averages[key] || 0;
                return `
                  <article class="five-metric-card">
                    <div>
                      <span>${App.escapeHtml(label)}</span>
                      <strong>${App.escapeHtml(String(score))}</strong>
                    </div>
                    <em class="${score >= average ? "is-up" : "is-down"}">${score >= average ? "+" : ""}${App.escapeHtml(String(score - average))}</em>
                    <div class="profile-track">
                      <div class="profile-fill" style="width:${score}%"></div>
                    </div>
                    <p>반 평균 ${App.escapeHtml(String(average))} · ${App.escapeHtml(metricNotes[key])}</p>
                  </article>
                `;
              })
              .join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderMilestoneGrowthPanel(student) {
    const milestones = actualMilestones(student);
    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Timeline</span>
            <h3>마일스톤 성장 곡선</h3>
          </div>
          <p class="panel-copy">아직 진행되지 않은 추정 구간은 제외합니다.</p>
        </div>
        ${App.growthChart(milestones)}
        <div class="milestone-analysis-list">
          ${milestones
            .map((milestone, index) => {
              const growthDelta = Number(milestone.growthDelta) || 0;
              const profileAverage = Number(milestone.profileAverage) || 0;
              return `
                <article class="milestone-analysis-row ${growthDelta > 0 ? "is-up" : growthDelta < 0 ? "is-down" : ""}">
                  <div class="milestone-analysis-name">
                    <span class="milestone-index">M${index + 1}</span>
                    <strong>${App.escapeHtml(App.shortMilestoneLabel(milestone.label))}</strong>
                    <small>${App.escapeHtml(App.formatRange(milestone.startDate, milestone.endDate))}</small>
                  </div>
                  <div class="milestone-score-row">
                    <strong>${App.escapeHtml(profileAverage.toFixed(2))}</strong>
                    <span class="growth-chip ${growthDelta > 0 ? "is-up" : growthDelta < 0 ? "is-down" : ""}">
                      ${growthDelta > 0 ? "+" : ""}${App.escapeHtml(growthDelta.toFixed(2))}
                    </span>
                  </div>
                  <p>${App.escapeHtml(milestone.note)} ${App.escapeHtml(App.milestoneStory(milestone))}</p>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderStatusTab(student) {
    return `
      ${renderGrowthMapPanel(student)}
      ${renderOperationalScorePanel(student)}
      ${renderJobFitPanel(student)}
      <section class="two-column-grid">
        <section class="panel section-panel">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">Recent Events</span>
              <h3>최근 주요 이벤트</h3>
            </div>
          </div>
          <div class="event-list">${App.recentEventCards(student)}</div>
        </section>
        ${renderCurrentInterpretationPanel(student)}
      </section>
      ${renderOperationalAssessmentPanel(student)}
    `;
  }

  function renderCurrentInterpretationPanel(student) {
    const collaborationReadiness = student.derived?.collaborationReadiness || {};
    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Interpretation</span>
            <h3>현재 해석 포인트</h3>
          </div>
        </div>
        <div class="interpretation-card">
          <p><strong>주 분류:</strong> ${App.escapeHtml(App.primaryMetaLabel(student))}</p>
          <p><strong>관리 상태:</strong> ${App.escapeHtml(student.managementStatus || "일반")}</p>
          <p><strong>강점:</strong> ${App.escapeHtml(App.profileKeyText(student.derived?.strengthKeys))}</p>
          <p><strong>관찰:</strong> ${App.escapeHtml(App.profileKeyText(student.derived?.cautionKeys))}</p>
          <p><strong>최신 면담:</strong> ${App.escapeHtml(App.formatDate(student.stats?.latestCounselingDate))}</p>
          <p><strong>협업 흐름:</strong> 체크인 정시율 ${App.escapeHtml(String(collaborationReadiness.checkinOnTimeRate || 0))}% · 회고 ${App.escapeHtml(String(collaborationReadiness.retroCount || 0))}건 · 변화 ${App.escapeHtml(String(collaborationReadiness.trajectory?.label || "유지"))}</p>
          <p><strong>진로 문서:</strong> ${App.escapeHtml(String(student.stats?.careerDocumentRounds || 0))}회</p>
        </div>
        ${App.renderClassificationReasons(student)}
      </section>
    `;
  }

  function renderScoreTab(student) {
    return `
      ${renderOperationalScorePanel(student)}
      ${renderFiveMetricPanel(student)}
      ${renderMilestoneGrowthPanel(student)}
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Profile</span>
            <h3>6개 교육학 준거 점수</h3>
          </div>
          <p class="panel-copy">기존 5대 지표와 별개로 현재 분석 모델의 세부 준거를 함께 봅니다.</p>
        </div>
        ${App.renderProfileReasonBars(student)}
      </section>
    `;
  }

  function renderEvaluationTab(student) {
    return `
      ${renderStrengthProfilePanel(student)}
      ${renderCareerGuidancePanel(student)}
      ${renderStudentGroupSignalsPanel(student)}
      ${renderOperationalAssessmentPanel(student)}
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Evaluation Criteria</span>
            <h3>현재 능력치와 평가 근거</h3>
          </div>
          <p class="panel-copy">6개 교육학 준거와 판단 기준을 근거 문장으로 확인합니다.</p>
        </div>
        ${App.renderProfileReasonBars(student)}
      </section>
      ${App.renderCollaborationTrajectory(student)}
      ${App.renderLearningFlowCases(student)}
      ${App.renderExpressionProfile(student)}
    `;
  }

  function renderRecordsTab(student) {
    return `
      ${renderCounselingRecordsPanel(student)}
      ${renderMorningPresentationPanel(student)}
      ${renderStudentDetail(student)}
    `;
  }

  function renderMaterialsTab(student) {
    return `
      ${renderAdmissionContextPanel(student)}
      ${renderPracticeSubmissionPanel(student)}
      ${renderMorningPresentationPanel(student)}
      ${renderWritingEvidencePanel(student)}
      ${renderStaffProfilePanel(student)}
    `;
  }

  function renderBasicInfoTab(student) {
    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Basic Info</span>
            <h3>기본정보</h3>
          </div>
          <p class="panel-copy">개인 기본값과 모집 단계 원천 출처를 분리해서 확인합니다.</p>
        </div>
        <div class="student-basic-grid expanded-basic-grid">
          <div><span>이름</span><strong>${App.escapeHtml(student.name || "-")}</strong></div>
          <div><span>성별</span><strong>${App.escapeHtml(student.gender || "-")}</strong></div>
          <div><span>생년월일</span><strong>${App.escapeHtml(App.formatDate(student.birthDate))}</strong></div>
          <div><span>연락처</span><strong>${App.escapeHtml(student.phone || "-")}</strong></div>
          <div><span>거주지역</span><strong>${App.escapeHtml(student.address || "-")}</strong></div>
          <div><span>학력</span><strong>${App.escapeHtml(student.education || "-")}</strong></div>
          <div><span>과정</span><strong>${App.escapeHtml(student.course || "-")}</strong></div>
          <div><span>기수</span><strong>${App.escapeHtml(student.cohort || "-")}</strong></div>
          <div><span>지원서 제출</span><strong>${App.escapeHtml(App.formatDate(student.admission?.submittedAt))}</strong></div>
          <div><span>지원 이메일</span><strong>${App.escapeHtml(student.admission?.email || "-")}</strong></div>
          <div><span>면접 결과</span><strong>${App.escapeHtml(student.admission?.interviewResult || "-")}</strong></div>
          <div><span>면접 점수</span><strong>${App.escapeHtml(String(student.admission?.interviewScore || "-"))}</strong></div>
        </div>
      </section>
      ${renderAdmissionContextPanel(student)}
    `;
  }

  function renderStudentDashboard(student) {
    const actualMilestones = (student.milestones || []).filter(
      (milestone) => !milestone.isEstimated && milestone.participated !== false && Number.isFinite(Number(milestone.profileAverage))
    );
    const collaborationReadiness = student.derived?.collaborationReadiness || {};
    const dropoutDate = student.dropoutInfo?.date || student.stats?.dropoutDate || "";
    return `
      <section class="snapshot-grid compact-snapshot-grid">
        ${App.metricCard("현재 상태", student.stats?.currentStatus || "-", "현재 운영 신호", App.statusTone(student.stats?.currentStatus))}
        ${App.metricCard("관리 상태", student.managementStatus || "일반", student.managementStatus === "이탈" ? `이탈 시점 ${App.formatDate(dropoutDate)}` : "현재 관리 분류", App.statusTone(student.managementStatus))}
        ${App.metricCard("프로젝트 제출률", `${student.stats?.projectSubmissionRate || 0}%`, "프로젝트 데일리 기록 기준", "brand")}
        ${App.metricCard("출결 기록", `${student.stats?.attendanceIssues || 0}건`, `무단/무연락 ${student.stats?.attendanceRiskIssues || 0}건 · 건강/컨디션 ${student.stats?.healthAttendanceIssues || 0}건`, "warning")}
        ${App.metricCard("면담", `${student.stats?.counselingCount || 0}건`, "기록된 전체 면담 수", "mint")}
        ${App.metricCard("프로젝트 협업", `${Math.round(collaborationReadiness.collaborationReadinessScore || 0)}점`, `변화 ${collaborationReadiness.trajectory?.label || "유지"} ${collaborationReadiness.trajectory?.delta || 0}`, "violet")}
      </section>

      ${renderOperationalScorePanel(student)}

      ${App.renderExpressionProfile(student)}

      ${renderAdmissionContextPanel(student)}

      ${renderWritingEvidencePanel(student)}

      ${renderStaffProfilePanel(student)}

      ${renderCounselingRecordsPanel(student)}

      ${renderOperationalAssessmentPanel(student)}

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Status Reason</span>
            <h3>현재 상태 판단 이유</h3>
          </div>
          <p class="panel-copy">${App.escapeHtml(student.currentProfile?.note || "최근 운영 해석 없음")}</p>
        </div>
        <div class="reason-box">
          <strong>${App.escapeHtml(student.stats?.currentStatus || "안정")}</strong>
          <p>${App.escapeHtml(App.statusReason(student))}</p>
        </div>
      </section>

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Dashboard</span>
            <h3>현재 능력치와 성향 프로파일</h3>
          </div>
          <p class="panel-copy">6개 교육학 준거와 근거 문장을 함께 읽습니다.</p>
        </div>
        ${App.renderProfileReasonBars(student)}
      </section>

      ${App.renderCollaborationTrajectory(student)}

      ${App.renderLearningFlowCases(student)}

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Timeline</span>
            <h3>마일스톤 성장 곡선</h3>
          </div>
          <p class="panel-copy">아직 진행되지 않은 추정 구간은 제외합니다.</p>
        </div>
        ${App.growthChart(actualMilestones)}
        <div class="milestone-analysis-list">
          ${actualMilestones
            .map((milestone, index) => {
              const growthDelta = Number(milestone.growthDelta) || 0;
              const profileAverage = Number(milestone.profileAverage) || 0;
              return `
                <article class="milestone-analysis-row ${growthDelta > 0 ? "is-up" : growthDelta < 0 ? "is-down" : ""}">
                  <div class="milestone-analysis-name">
                    <span class="milestone-index">M${index + 1}</span>
                    <strong>${App.escapeHtml(App.shortMilestoneLabel(milestone.label))}</strong>
                    <small>${App.escapeHtml(App.formatRange(milestone.startDate, milestone.endDate))}</small>
                  </div>
                  <div class="milestone-score-row">
                    <strong>${App.escapeHtml(profileAverage.toFixed(2))}</strong>
                    <span class="growth-chip ${growthDelta > 0 ? "is-up" : growthDelta < 0 ? "is-down" : ""}">
                      ${growthDelta > 0 ? "+" : ""}${App.escapeHtml(growthDelta.toFixed(2))}
                    </span>
                  </div>
                  <p>${App.escapeHtml(milestone.note)} ${App.escapeHtml(App.milestoneStory(milestone))}</p>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>

      <section class="two-column-grid">
        <section class="panel section-panel">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">Recent Events</span>
              <h3>최근 주요 이벤트</h3>
            </div>
          </div>
          <div class="event-list">
            ${App.recentEventCards(student)}
          </div>
        </section>

        <section class="panel section-panel">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">Interpretation</span>
              <h3>현재 해석 포인트</h3>
            </div>
          </div>
          <div class="interpretation-card">
            <p><strong>주 분류:</strong> ${App.escapeHtml(App.primaryMetaLabel(student))}</p>
            <p><strong>관리 상태:</strong> ${App.escapeHtml(student.managementStatus || "일반")}</p>
            <p><strong>강점:</strong> ${App.escapeHtml(App.profileKeyText(student.derived?.strengthKeys))}</p>
            <p><strong>관찰:</strong> ${App.escapeHtml(App.profileKeyText(student.derived?.cautionKeys))}</p>
            <p><strong>최신 면담:</strong> ${App.escapeHtml(App.formatDate(student.stats?.latestCounselingDate))}</p>
            <p><strong>협업 흐름:</strong> 체크인 정시율 ${App.escapeHtml(String(collaborationReadiness.checkinOnTimeRate || 0))}% · 회고 ${App.escapeHtml(String(collaborationReadiness.retroCount || 0))}건 · 변화 ${App.escapeHtml(String(collaborationReadiness.trajectory?.label || "유지"))}</p>
            <p><strong>진로 문서:</strong> ${App.escapeHtml(String(student.stats?.careerDocumentRounds || 0))}회</p>
          </div>
          ${App.renderClassificationReasons(student)}
        </section>
      </section>
    `;
  }

  function renderOperationalAssessmentPanel(student) {
    const focusAssessment = state.focusClassification ? App.studentOperationalAssessmentByKey(student, state.focusClassification) : null;
    const qualifiedAssessments = App.studentOperationalAssessments(student);
    const rows = focusAssessment
      ? [focusAssessment, ...qualifiedAssessments.filter((item) => item.key !== focusAssessment.key)]
      : qualifiedAssessments;
    const visibleRows = rows.filter(Boolean);
    const focusLabel = focusAssessment ? `${focusAssessment.groupLabel} · ${focusAssessment.label}` : "운영 포커스";
    return `
      <section class="panel section-panel operational-assessment-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Operational Focus</span>
            <h3>역량/위험군 평가 근거</h3>
          </div>
          <p class="panel-copy">${
            focusAssessment
              ? App.escapeHtml(`${focusLabel} 분류로 학생관리에서 열었습니다. 아래 기준과 근거를 먼저 확인하세요.`)
              : "현재 학생이 역량 분류나 위험군 기준에 해당하는 경우 그 이유를 표시합니다."
          }</p>
        </div>
        <div class="operational-assessment-list">
          ${
            visibleRows.length
              ? visibleRows
                  .map(
                    (assessment) => `
                      <article class="operational-assessment-row ${App.toneClass(assessment.tone)} ${assessment.key === state.focusClassification ? "is-focus" : ""} ${assessment.qualified ? "is-qualified" : "is-missing"}">
                        <div class="operational-assessment-head">
                          <div>
                            <span>${App.escapeHtml(assessment.groupLabel)}</span>
                            <strong>${App.escapeHtml(assessment.label)}</strong>
                          </div>
                          <em>${assessment.qualified ? "해당" : "미해당"}</em>
                        </div>
                        <p>${App.escapeHtml(assessment.basis)}</p>
                        <div class="assessment-metric-list">
                          ${(assessment.metrics || []).map((metric) => `<span>${App.escapeHtml(metric)}</span>`).join("")}
                        </div>
                        <div class="assessment-reason-list">
                          ${(assessment.reasons || ["세부 근거가 아직 충분하지 않습니다."]).map((reason) => `<p>${App.escapeHtml(reason)}</p>`).join("")}
                        </div>
                      </article>
                    `
                  )
                  .join("")
              : `<div class="empty-state compact">현재 우수자/위험군 운영 포커스에 해당하는 분류가 없습니다.</div>`
          }
        </div>
      </section>
    `;
  }

  function formValue(student, key) {
    return App.escapeHtml(student.manual?.[key] ?? student[key] ?? "");
  }

  function renderStudentManagement(student) {
    const manual = student.manual || {};
    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Profile Editor</span>
            <h3>학생 정보 입력 및 수정</h3>
          </div>
          <button type="button" class="secondary-action compact-action" data-tab="status">개요로 돌아가기</button>
        </div>
        <p class="panel-copy">이 페이지에서 저장한 값은 이 브라우저의 로컬 편집값으로 보관되고, 홈 통계와 검색에 즉시 반영됩니다.</p>

        <form id="student-edit-form" class="student-edit-form">
          <section class="edit-form-section">
            <div class="edit-section-head">
              <h4>기본 정보</h4>
              ${App.managementStatusBadge(student.managementStatus)}
            </div>
            <div class="edit-form-grid">
              <label>
                <span>이름</span>
                <input name="name" type="text" value="${formValue(student, "name")}" />
              </label>
              <label>
                <span>성별</span>
                <input name="gender" type="text" value="${formValue(student, "gender")}" />
              </label>
              <label>
                <span>생년월일</span>
                <input name="birthDate" type="date" value="${formValue(student, "birthDate")}" />
              </label>
              <label>
                <span>연락처</span>
                <input name="phone" type="tel" value="${formValue(student, "phone")}" />
              </label>
              <label>
                <span>거주지역</span>
                <input name="address" type="text" value="${formValue(student, "address")}" />
              </label>
              <label>
                <span>학력</span>
                <input name="education" type="text" value="${formValue(student, "education")}" />
              </label>
              <label>
                <span>과정</span>
                <input name="course" type="text" value="${formValue(student, "course")}" />
              </label>
              <label>
                <span>기수</span>
                <input name="cohort" type="text" value="${formValue(student, "cohort")}" />
              </label>
            </div>
          </section>

          <section class="edit-form-section">
            <div class="edit-section-head">
              <h4>관리 분류</h4>
              <p>이탈 학생은 통계에는 남기고 기본 관리 대상 집계에서는 제외합니다.</p>
            </div>
            <div class="edit-form-grid">
              <label>
                <span>학생 상태</span>
                <select name="managementStatus">
                  ${Object.entries(App.MANAGEMENT_STATUS_META)
                    .map(
                      ([status, meta]) => `
                        <option value="${App.escapeHtml(status)}" ${student.managementStatus === status ? "selected" : ""}>
                          ${App.escapeHtml(meta.label)}
                        </option>
                      `
                    )
                    .join("")}
                </select>
              </label>
              <label>
                <span>취업처</span>
                <input name="employmentCompany" type="text" value="${App.escapeHtml(manual.employmentCompany || "")}" />
              </label>
              <label>
                <span>직무/역할</span>
                <input name="employmentRole" type="text" value="${App.escapeHtml(manual.employmentRole || "")}" />
              </label>
              <label>
                <span>취업일</span>
                <input name="employmentDate" type="date" value="${App.escapeHtml(manual.employmentDate || "")}" />
              </label>
              <label>
                <span>이탈일</span>
                <input name="dropoutDate" type="date" value="${App.escapeHtml(manual.dropoutDate || "")}" />
              </label>
              <label>
                <span>이탈 사유</span>
                <input name="dropoutReason" type="text" value="${App.escapeHtml(manual.dropoutReason || "")}" />
              </label>
            </div>
          </section>

          <section class="edit-form-section">
            <div class="edit-section-head">
              <h4>운영 메모</h4>
              <p>관리자가 수기로 남기는 참고 정보입니다.</p>
            </div>
            <label class="wide-field">
              <span>특이사항</span>
              <textarea name="specialNote" rows="3">${formValue(student, "specialNote")}</textarea>
            </label>
            <label class="wide-field">
              <span>관리 메모</span>
              <textarea name="managementMemo" rows="5">${App.escapeHtml(manual.managementMemo || "")}</textarea>
            </label>
          </section>

          <div class="form-actions">
            <button type="submit" class="primary-action">저장</button>
            <button type="button" class="secondary-action" data-reset-edit>원본으로 되돌리기</button>
          </div>
        </form>
      </section>

      <section class="snapshot-grid">
        ${App.metricCard("관리 상태", student.managementStatus || "일반", App.MANAGEMENT_STATUS_META[student.managementStatus]?.description || "관리 분류", App.statusTone(student.managementStatus))}
        ${App.metricCard("취업 정보", manual.employmentCompany || "-", manual.employmentRole || "입력된 직무 정보 없음", "violet")}
        ${App.metricCard("이탈 정보", manual.dropoutDate || "-", manual.dropoutReason || "입력된 이탈 사유 없음", "neutral")}
      </section>
    `;
  }

  function renderCriterionModal() {
    if (!state.activeCriterion) return "";
    const criterion = App.PROFILE_CRITERIA[state.activeCriterion];
    if (!criterion) return "";
    const label = App.PROFILE_LABELS[state.activeCriterion] || "평가 준거";
    return `
      <div class="modal-backdrop" data-close-modal>
        <section class="criteria-modal" role="dialog" aria-modal="true" aria-label="${App.escapeHtml(label)} 판단기준">
          <div class="modal-head">
            <div>
              <span class="panel-kicker">Evaluation Criteria</span>
              <h3>${App.escapeHtml(label)}</h3>
            </div>
            <button type="button" class="icon-button" data-close-modal aria-label="닫기">×</button>
          </div>
          <div class="criteria-body">
            <p><strong>핵심 질문</strong>${App.escapeHtml(criterion.question)}</p>
            <p><strong>주요 데이터</strong>${App.escapeHtml(criterion.evidence)}</p>
            <p><strong>루브릭 평가</strong>${App.escapeHtml(criterion.rubric)}</p>
            <p><strong>평정 척도</strong>${App.escapeHtml(criterion.rating)}</p>
            <p><strong>판정 유의</strong>${App.escapeHtml(criterion.caution)}</p>
            <p><strong>점수 해석</strong>1점은 관찰과 지원이 시급한 수준, 2점은 형성 중인 수준, 3점은 기대 수행에 도달한 수준, 4점은 전이와 확장이 가능한 수준으로 봅니다.</p>
          </div>
        </section>
      </div>
    `;
  }

  function renderDetailEventItem(event) {
    const summary = valueOrEmpty(event.summary) || "요약 없음";
    const fullText = valueOrEmpty(event.detail) || valueOrEmpty(event.content) || summary;
    const hasFullText = fullText && fullText !== summary;
    return `
      <article class="detail-event-item">
        <div class="event-head">
          <strong>${App.escapeHtml(event.title)}</strong>
          <span class="event-meta">${App.escapeHtml(App.formatDate(event.date))}</span>
        </div>
        <p>${App.escapeHtml(summary)}</p>
        ${
          hasFullText
            ? `
              <details class="event-full-detail">
                <summary>전문 보기</summary>
                <div>${App.escapeHtml(fullText)}</div>
              </details>
            `
            : ""
        }
      </article>
    `;
  }

  function renderMilestoneSummaryCard(milestone, index) {
    const growthDelta = Number(milestone.growthDelta) || 0;
    const profileAverage = Number(milestone.profileAverage) || 0;
    const eventCounts = milestone.eventCounts || {};
    const eventTotal = Object.values(eventCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    return `
      <button type="button" class="milestone-summary-card" data-milestone="${App.escapeHtml(milestone.id)}">
        <span class="milestone-summary-index">M${index + 1}</span>
        <strong>${App.escapeHtml(App.shortMilestoneLabel(milestone.label))}</strong>
        <small>${App.escapeHtml(App.formatRange(milestone.startDate, milestone.endDate))}</small>
        <p>${App.escapeHtml(compactText(milestone.note || App.milestoneStory(milestone), "요약 기록 없음", 120))}</p>
        <span class="milestone-summary-metrics">
          <em>평균 ${App.escapeHtml(profileAverage.toFixed(1))}</em>
          <em>변화 ${growthDelta > 0 ? "+" : ""}${App.escapeHtml(growthDelta.toFixed(1))}</em>
          <em>기록 ${App.escapeHtml(String(eventTotal))}건</em>
        </span>
      </button>
    `;
  }

  function renderMilestoneDetailCard(milestone, index) {
    const growthDelta = Number(milestone.growthDelta) || 0;
    const profileAverage = Number(milestone.profileAverage) || 0;
    return `
      <article class="detail-milestone-card">
        <div class="detail-milestone-head">
          <div>
            <span class="milestone-index">M${index + 1}</span>
            <h4>${App.escapeHtml(App.shortMilestoneLabel(milestone.label))}</h4>
            <p class="milestone-period">${App.escapeHtml(App.formatRange(milestone.startDate, milestone.endDate))}</p>
          </div>
          <div class="detail-milestone-side">
            <span class="score-chip tone-brand">${App.escapeHtml(profileAverage.toFixed(2))}</span>
          </div>
        </div>

        <div class="detail-milestone-grid">
          ${
            milestone.dropoutDuringMilestone
              ? `
                <div class="detail-block">
                  <span class="mini-label">이탈 시점</span>
                  <p>${App.escapeHtml(App.formatDate(milestone.dropoutDate))}</p>
                </div>
              `
              : ""
          }
          <div class="detail-block">
            <span class="mini-label">핵심 해석</span>
            <p>${App.escapeHtml(milestone.note)}</p>
          </div>
          <div class="detail-block">
            <span class="mini-label">변화량</span>
            <p>${growthDelta > 0 ? "+" : ""}${App.escapeHtml(growthDelta.toFixed(2))}</p>
          </div>
          <div class="detail-block">
            <span class="mini-label">이벤트 수</span>
            <p>
              출결 기록 ${App.escapeHtml(String(milestone.eventCounts.attendance))}건 / 위험 ${App.escapeHtml(String(milestone.eventCounts.attendanceRisk || 0))}건 / 프로젝트 ${App.escapeHtml(String(milestone.eventCounts.project))}건 /
              면담 ${App.escapeHtml(String(milestone.eventCounts.counseling))}건
            </p>
          </div>
          <div class="detail-block">
            <span class="mini-label">강점과 관찰</span>
            <div class="pill-row">
              ${App.domainPills(milestone.strengthKeys, "강점 없음")}
              ${App.domainPills(milestone.cautionKeys, "관찰 없음")}
            </div>
          </div>
        </div>

        <div class="detail-section-grid">
          <section class="detail-section-card">
            <h5>학생 이벤트 히스토리</h5>
            <div class="detail-event-list">
              ${milestone.events.length
                ? milestone.events
                    .map((event) => renderDetailEventItem(event))
                    .join("")
                : `<div class="empty-state compact">이 구간에 연결된 대표 이벤트가 없습니다.</div>`}
            </div>
          </section>

          <section class="detail-section-card">
            <h5>운영 메모용 요약</h5>
            <p>${App.escapeHtml(App.milestoneStory(milestone))}</p>
            <p>프로젝트 역할 기록: ${App.escapeHtml(milestone.roles.length ? milestone.roles.join(", ") : "없음")}</p>
            <p>진로 문서 라운드: ${App.escapeHtml(String(milestone.careerRoundCount || 0))}회</p>
          </section>
        </div>
      </article>
    `;
  }

  function renderStudentDetail(student) {
    const milestones = (student.milestones || []).filter((milestone) => !milestone.isEstimated && milestone.participated !== false);
    const isOverview = state.detailMilestoneId === "all";
    const visibleMilestones =
      isOverview
        ? milestones
        : milestones.filter((milestone) => milestone.id === state.detailMilestoneId);

    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Detail</span>
            <h3>마일스톤별 상세 정보</h3>
          </div>
          <p class="panel-copy">전체 구간에서는 요약만 보고, 상세 이벤트와 전문은 마일스톤을 선택해 확인합니다.</p>
        </div>
        <div class="chip-filter-row">
          <button type="button" class="filter-chip ${state.detailMilestoneId === "all" ? "is-active" : ""}" data-milestone="all">전체 구간</button>
          ${milestones
            .map(
              (milestone, index) => `
                <button
                  type="button"
                  class="filter-chip ${state.detailMilestoneId === milestone.id ? "is-active" : ""}"
                  data-milestone="${App.escapeHtml(milestone.id)}"
                >
                  ${App.escapeHtml(App.shortMilestoneLabel(milestone.label))}
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      ${
        isOverview
          ? `
            <section class="milestone-summary-grid">
              ${milestones.map((milestone, index) => renderMilestoneSummaryCard(milestone, index)).join("")}
            </section>
          `
          : `
            <div class="detail-milestone-stack">
              ${visibleMilestones.map((milestone) => renderMilestoneDetailCard(milestone, milestones.indexOf(milestone))).join("")}
            </div>
          `
      }
    `;
  }

  function renderStudentPage(student) {
    if (!student) {
      return `<div class="empty-state">학생 데이터를 불러오지 못했습니다.</div>`;
    }

    return `
      ${renderStudentHeader(student)}

      <nav class="student-tabs">
        ${STUDENT_TABS.map(
          (tab) => `<button type="button" class="tab-chip ${state.studentTab === tab.key ? "is-active" : ""}" data-tab="${App.escapeHtml(tab.key)}">${App.escapeHtml(tab.label)}</button>`
        ).join("")}
      </nav>

      ${
        state.studentTab === "management"
          ? renderStudentManagement(student)
          : state.studentTab === "score"
            ? renderScoreTab(student)
            : state.studentTab === "evaluation"
              ? renderEvaluationTab(student)
              : state.studentTab === "records"
                ? renderRecordsTab(student)
                : state.studentTab === "materials"
                  ? renderMaterialsTab(student)
                  : state.studentTab === "basic"
                    ? renderBasicInfoTab(student)
                    : renderStatusTab(student)
      }
      ${renderCriterionModal()}
    `;
  }

  function render() {
    const student = currentStudent();
    document.body.dataset.page = "student";
    document.title = student ? `${student.name} | 학생 분석 대시보드` : "학생 분석 대시보드";
    App.renderQuickSearch(quickSearch, state.query);
    appRoot.innerHTML = renderStudentPage(student);
  }

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("#student-edit-form");
    if (!form) return;
    event.preventDefault();

    const student = currentStudent();
    if (!student) return;

    const formData = new FormData(form);
    const payload = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = String(value || "").trim();
    }

    App.saveStudentEdit(student.id, payload);
    render();
  });

  document.addEventListener("click", (event) => {
    const criterionButton = event.target.closest("[data-criterion]");
    if (criterionButton) {
      state.activeCriterion = criterionButton.getAttribute("data-criterion") || "";
      render();
      return;
    }

    const closeModal = event.target.closest("[data-close-modal]");
    if (closeModal && (event.target === closeModal || event.target.closest(".icon-button"))) {
      state.activeCriterion = "";
      render();
      return;
    }

    const resetButton = event.target.closest("[data-reset-edit]");
    if (resetButton) {
      const student = currentStudent();
      if (!student) return;
      App.clearStudentEdit(student.id);
      render();
      return;
    }

    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      state.studentTab = normalizeStudentTab(tabButton.getAttribute("data-tab"));
      render();
      return;
    }

    const milestoneButton = event.target.closest("[data-milestone]");
    if (milestoneButton) {
      state.detailMilestoneId = milestoneButton.getAttribute("data-milestone") || "all";
      render();
    }
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value || "";
    App.renderQuickSearch(quickSearch, state.query);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const [firstResult] = App.quickSearchResults(state.query);
    if (!firstResult) return;
    window.location.href = App.studentPageHref(firstResult.id);
  });

  themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    App.setTheme(state.theme, themeToggle);
  });

  App.setTheme(state.theme, themeToggle);
  render();
})();
