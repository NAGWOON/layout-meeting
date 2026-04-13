/* ============================================
   PROGRESS MANAGER — ProgressManager
   Progress/completion calculations.
   Respects:
   - showIf conditions (branch engine)
   - spaceActivation (excluded spaces)
   ============================================ */

const ProgressManager = (function () {
  'use strict';

  // Required questions in a space that are currently visible
  function getSpaceProgress(spaceId) {
    const space = AppState.getSpaceData(spaceId);
    if (!space) return { answered: 0, total: 0 };
    let total = 0, answered = 0;
    space.sections.forEach(sec => {
      AppState.getVisibleQuestions(sec).forEach(q => {
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

  // Count all answered questions in a section (visible only)
  function getSectionAnswerCount(section) {
    return AppState.getVisibleQuestions(section)
      .filter(q => AppState.hasAnswer(q.id)).length;
  }

  // Total answered across all active spaces (visible questions only)
  function getTotalAnswered() {
    let count = 0;
    AppState.getActiveSpaces().forEach(sp =>
      sp.sections.forEach(sec =>
        AppState.getVisibleQuestions(sec).forEach(q => {
          if (AppState.hasAnswer(q.id)) count++;
        })
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
