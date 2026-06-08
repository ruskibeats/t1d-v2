import Foundation

struct APIClient {
    var baseURL: URL
    var session: URLSession = .shared

    func fetchLatestCGM() async throws -> CGMSnapshot {
        // TODO: Replace with backend endpoint once the mobile API contract is final.
        // Expected shape should include glucoseMGDL, trend, measuredAt, and dataSource.
        CGMSnapshot.demo
    }

    func predictMeal(_ draft: MealDraft) async throws -> PredictionResult {
        // TODO: POST to backend prediction endpoint.
        // Keep provenance required: evidenceBasis + confidenceComponents.
        var result = PredictionResult.demo
        result.mealText = draft.freeText.isEmpty ? "Meal draft" : draft.freeText
        return result
    }

    // MARK: - Food History (retrospective aggregation)

    /// Fetch historical CGM trace for a food item.
    /// Uses demo data for now. Later, calls the backend aggregation endpoint.
    func fetchFoodHistory(foodName: String, timeRange: String = "all") async throws -> FoodHistory {
        // Demo path: return mock data
        // Production path: GET /api/foods/{foodName}/history?range={timeRange}
        // Response serialized from Python FoodHistoryResult JSON
        FoodHistory.demo
    }
}