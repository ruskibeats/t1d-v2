"""Food service - minimal stub."""
from dataclasses import dataclass

@dataclass
class ParsedFood:
    item: str
    quantity: float = 1.0
    unit: str = None
    search_terms: list = None

class FoodService:
    """Minimal stub - full implementation in parent app/."""
    def __init__(self, session=None):
        pass
    
    async def search_food_candidates(self, food: ParsedFood):
        """Return empty list for standalone."""
        return []

import random
def calculate_food_evidence(food: ParsedFood, candidates):
    from dataclasses import dataclass
    @dataclass
    class Evidence:
        parsed: dict
        selected_match: dict
        computed: dict
        confidence: str
        warnings: list
        carb_range_g: tuple = (0.0, 0.0)
    return Evidence(
        parsed={"item": food.item, "quantity": food.quantity},
        selected_match=None,
        computed=None,
        confidence="low",
        warnings=["Database unavailable"],
    )
