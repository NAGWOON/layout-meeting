/* ============================================
   PROGRESS MANAGER — ProgressManager
   Progress/completion calculations
   ============================================ */

const ProgressManager = (function () {
  'use strict';

  function getSpaceProgress(spaceId) {
    const space = AppState.getSpaceData(spaceId);
    if (!space) return { answered: 0, total: 0 };
    let total = 0, answered = 0;
    space.sections.forEach(sec => {
      sec.questions.forEach(q => {
        if (q.required) {
          total++;
          if (AppState.hasAnswer(q.id)) answered++;
        }
      });
    });
    return { answered, total };
  }

  function isSpaceComplete(spaceId) {
    const { answered, total } = getSpaceProgress(spaceId);
    return total > 0 && answered >= total;
  }

  function getSectionAnswerCount(section) {
    return section.questions.filter(q => AppState.hasAnswer(q.id)).length;
  }

  function getTotalAnswered() {
    let count = 0;
    AppState.getAllSpaces().forEach(sp =>
      sp.sections.forEach(sec =>
        sec.questions.forEach(q => { if (AppState.hasAnswer(q.id)) count++; })
      )
    );
    return count;
  }

  return {
    getSpaceProgress,
    isSpaceComplete,
    getSectionAnswerCount,
    getTotalAnswered
  };
})();
