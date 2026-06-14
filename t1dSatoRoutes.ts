
// ============================================================================
// Phase B: Sato Page Data Aggregate Endpoint
// ============================================================================

/**
 * GET /api/t1d/sato/page-data
 *
 * Composite endpoint that builds Sato page data from multiple backend services.
 * Educational content only, no dosing/treatment guidance.
 *
 * Response includes:
 * - page: title, subtitle, tone
 * - hero: message, mood, calm narrative
 * - graphSummary: AGE status, vertices, edges, sync status
 * - foodGraph: query, answer, facts, sources, meta
 * - companionCards: template + demo card
 * - recipeParser: template + recommended demo
 * - audit: provenance, uncertainty, safety note
 * - actions: sync, query, parse, generate buttons
 */
router.get('/page-data', async (req, res, next) => {
  try {
    const pageData = await getSatoPageData(req.userId);

    res.status(200).json({
      message: 'Sato page data retrieved successfully',
      page: pageData.page,
      hero: pageData.hero,
      graphSummary: pageData.graphSummary,
      foodGraph: pageData.foodGraph,
      companionCards: pageData.companionCards,
      recipeParser: pageData.recipeParser,
      audit: pageData.audit,
      actions: pageData.actions,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
