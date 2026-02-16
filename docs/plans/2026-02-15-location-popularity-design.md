# Location Popularity Ranking Design

**Date:** 2026-02-15
**Status:** Approved
**Author:** User + Claude

## Overview

Modify the place scoring algorithm to prioritize popular locations (e.g., Central Park, Times Square in NYC) over less-known spots while maintaining the existing type-based categorization system.

### Goals

- Popular places (measured by `user_ratings_total`) rank significantly higher
- Type hierarchy remains intact (landmarks > parks > cafes)
- User preferences (`prefer_parks`, `urban_explorer`) can override type hierarchy when enabled
- No frontend changes required (internal scoring change only)

### Success Criteria

- In NYC, Central Park (175k reviews) and Times Square rank in top positions
- When `prefer_parks` is enabled, parks rank above landmarks
- Tourist attractions still rank above cafes by default
- No API contract changes needed

## Algorithm Changes

### Current Formula

```python
# Line 141 in api/suggest-places.py
score = rating * (1 + math.log10(max(user_ratings_total, 1)) / 10)
```

**Problem:** Logarithmic scaling provides minimal differentiation. A place with 100,000 reviews gets only 1.5x multiplier vs 1.2x for 100 reviews.

### New Formula: Tiered Popularity Multipliers

```python
# Determine popularity tier based on user_ratings_total
if user_ratings_total >= 10000:
    popularity_multiplier = 5.0      # Mega-popular (Central Park, Times Square)
elif user_ratings_total >= 2000:
    popularity_multiplier = 3.0      # Very popular
elif user_ratings_total >= 500:
    popularity_multiplier = 2.0      # Popular
elif user_ratings_total >= 100:
    popularity_multiplier = 1.3      # Moderate
else:
    popularity_multiplier = 1.0      # Niche

# Base score from rating and popularity
score = rating * popularity_multiplier
```

Then existing type bonuses and distance penalties multiply this base score.

### Updated Preference Multipliers

**Change from 1.5x to 3.5x** to ensure preferences can override type hierarchy:

- `prefer_parks`: 3.5x multiplier (up from 1.5x)
- `urban_explorer`: 3.5x multiplier (up from 1.5x)

### Example Calculations

#### Without preferences:

**Central Park** (park, 175k reviews, 4.8★):
- Base: 4.8 × 5.0 = 24.0
- Type: 24.0 × 1.2 (park) = **28.8**

**Times Square** (tourist_attraction, 100k reviews, 4.5★):
- Base: 4.5 × 5.0 = 22.5
- Type: 22.5 × 3.0 (landmark) = **67.5** ← wins

#### With `prefer_parks` enabled:

**Central Park**:
- Base: 4.8 × 5.0 = 24.0
- Type: 24.0 × 1.2 = 28.8
- Preference: 28.8 × 3.5 = **100.8** ← wins

**Times Square**:
- Base: 4.5 × 5.0 = 22.5
- Type: 22.5 × 3.0 = **67.5**

## Implementation Details

### File to Modify

`api/suggest-places.py` - specifically the `calculate_score()` function (lines 134-167)

### Changes Required

1. **Line 141:** Replace popularity calculation
   - Remove: `score = rating * (1 + math.log10(max(user_ratings_total, 1)) / 10)`
   - Add: Tiered popularity multiplier logic

2. **Lines 154-157:** Update preference multipliers
   - Change `prefer_parks` from `score *= 1.5` to `score *= 3.5`
   - Change `urban_explorer` from `score *= 1.5` to `score *= 3.5`

3. **Keep unchanged:**
   - Type bonuses (lines 144-151)
   - Distance penalty (lines 159-165)
   - Sorting logic (line 98)
   - Top 15 selection (line 99)

### Files NOT Modified

- Frontend code (`src/*`) - no changes needed
- `api/generate-route.py` - no changes needed
- Type definitions (`src/types.ts`) - no changes needed

## Data Flow

No changes to the request/response flow:

1. Frontend calls `/api/suggest-places` with location, distance, preferences
2. Backend fetches places from Google Places API (unchanged)
3. Backend scores each place using **new popularity tiers** (changed)
4. Backend sorts by score and returns top 15 (unchanged)
5. Frontend displays places (unchanged)

**Key point:** The response format is identical. The `score` field is calculated differently but the API contract remains the same.

## Testing Strategy

### Manual Testing

1. **Popular places rise to top:**
   - Test NYC (Times Square area): verify Central Park, Times Square, Brooklyn Bridge in top results
   - Test San Francisco (Union Square): verify Golden Gate Park, Fisherman's Wharf highly ranked

2. **Type hierarchy maintained:**
   - Without preferences, verify landmarks rank above cafes
   - Verify popular landmark beats mega-popular cafe

3. **`prefer_parks` preference:**
   - Enable preference, verify parks beat landmarks
   - Disable preference, verify landmarks return to top

4. **`urban_explorer` preference:**
   - Enable preference, verify museums/galleries rank higher

5. **Different cities:**
   - Test London, Paris, Tokyo to verify tier thresholds work globally

### Verification Criteria

- Popular places (>10k reviews) consistently in top 5
- Preferences override type bonuses as expected
- No errors or crashes with new scoring logic

### What We're NOT Testing

- No unit tests (prototype/MVP phase)
- No performance testing (scoring is trivial computation)
- No edge case stress testing (Google API handles data quality)

## Edge Cases & Error Handling

### Handled Edge Cases

1. **Missing `user_ratings_total`:**
   - Already handled: `user_ratings_total = place.get('user_ratings_total', 0)` (line 86)
   - Places with 0 reviews get 1.0x multiplier (niche tier)

2. **Missing `rating`:**
   - Already handled: `rating = place.get('rating', 3.0)` (line 136)
   - Defaults to 3.0

3. **Very new places (few reviews):**
   - Will rank lower initially - expected behavior
   - Will rise through tiers as they gain reviews

4. **Popular but low-rated places:**
   - Example: 50k reviews but 2.5★ rating
   - Base: 2.5 × 5.0 = 12.5
   - A 4.5★ place with 2k reviews: 4.5 × 3.0 = 13.5
   - Rating still matters - quality isn't ignored

5. **Regional differences in review counts:**
   - NYC has more reviews than small towns
   - Intentional - app targets travelers in major cities
   - Tier system calibrated for urban areas

### Error Handling

No new error handling needed:
- Google Places API handles malformed data
- Existing try/catch blocks (lines 54-68) handle API failures
- Score calculation is pure math - cannot throw exceptions

## Alternatives Considered

### Approach 2: Square Root Scaling

Replace logarithmic with power scaling: `rating * (user_ratings_total ** 0.25)`

**Pros:** Smooth, continuous function
**Cons:** Less intuitive, harder to tune, might not create enough separation

### Approach 3: Multi-Key Sort

Sort by (type_category, popularity_tier, rating, distance) instead of single score.

**Pros:** Very predictable
**Cons:** Too rigid, less flexible than scoring system

**Decision:** Chose tiered multipliers for strong separation, ease of tuning, and clear behavior.

## Deployment

This is a backend-only change:
1. Modify `api/suggest-places.py`
2. Deploy to Vercel (automatic on push to main)
3. No frontend build required
4. No database migrations
5. No environment variable changes

## Rollback Plan

If the new scoring produces poor results:
1. Revert the commit
2. Redeploy (automatic)
3. No data loss risk (stateless API)

## Future Considerations

- Could make popularity tier thresholds configurable via environment variables
- Could add analytics to track which tier each selected place falls into
- Could adjust tier boundaries based on real-world usage data
- Could add A/B testing to compare old vs new scoring

## Related Documents

- Original design: `docs/plans/2026-01-18-running-maps-design.md`
- Initial prototype: `docs/plans/2026-01-18-initial-prototype.md`
