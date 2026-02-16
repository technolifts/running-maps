# Location Popularity Ranking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prioritize popular locations (Central Park, Times Square) in place suggestions using tiered popularity multipliers.

**Architecture:** Modify the `calculate_score()` function in `api/suggest-places.py` to use a 5-tier popularity system based on `user_ratings_total`. Strengthen user preference multipliers to allow preferences to override type hierarchy.

**Tech Stack:** Python 3.11, Google Places API, existing scoring system

---

## Task 1: Implement Tiered Popularity Multipliers

**Files:**
- Modify: `api/suggest-places.py:134-167` (calculate_score function)

**Step 1: Read current implementation**

Run: Read `api/suggest-places.py` lines 134-167 to understand current scoring logic

**Step 2: Replace popularity calculation**

Find this line (approximately line 141):
```python
score = rating * (1 + math.log10(max(user_ratings_total, 1)) / 10)
```

Replace with tiered popularity system:
```python
# Determine popularity tier based on review count
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

**Step 3: Verify syntax**

Run: `python3 -m py_compile api/suggest-places.py`
Expected: No output (successful compilation)

**Step 4: Commit popularity tier change**

```bash
git add api/suggest-places.py
git commit -m "feat: add tiered popularity multipliers to place scoring

Replace logarithmic popularity scaling with 5-tier system:
- Mega-popular (≥10k reviews): 5.0x
- Very popular (2k-10k): 3.0x
- Popular (500-2k): 2.0x
- Moderate (100-500): 1.3x
- Niche (<100): 1.0x

This creates strong separation between iconic places (Central Park)
and lesser-known spots while maintaining type hierarchy.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Strengthen User Preference Multipliers

**Files:**
- Modify: `api/suggest-places.py:154-157` (user preference section in calculate_score)

**Step 1: Read current preference logic**

Run: Read `api/suggest-places.py` lines 154-157 to locate preference multipliers

Current code should look like:
```python
# Apply user preferences
if preferences.get('prefer_parks') and 'park' in types:
    score *= 1.5
if preferences.get('urban_explorer') and any(t in types for t in ['museum', 'art_gallery', 'historical']):
    score *= 1.5
```

**Step 2: Update prefer_parks multiplier**

Change line with `prefer_parks`:
```python
# Apply user preferences
if preferences.get('prefer_parks') and 'park' in types:
    score *= 3.5  # Increased from 1.5 to allow parks to beat landmarks
```

**Step 3: Update urban_explorer multiplier**

Change line with `urban_explorer`:
```python
if preferences.get('urban_explorer') and any(t in types for t in ['museum', 'art_gallery', 'historical']):
    score *= 3.5  # Increased from 1.5 for consistency with prefer_parks
```

**Step 4: Verify syntax**

Run: `python3 -m py_compile api/suggest-places.py`
Expected: No output (successful compilation)

**Step 5: Commit preference changes**

```bash
git add api/suggest-places.py
git commit -m "feat: strengthen user preference multipliers

Increase prefer_parks and urban_explorer from 1.5x to 3.5x.

This allows user preferences to override type hierarchy:
- With prefer_parks enabled, parks now beat landmarks
- With urban_explorer enabled, museums beat landmarks

Example: Central Park with prefer_parks enabled (100.8) now
ranks above Times Square (67.5) for users who prefer nature.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Test with NYC Popular Locations

**Files:**
- None (manual testing via browser/curl)

**Step 1: Start local development server**

Run: `vercel dev`
Expected: Server starts on http://localhost:3000

**Step 2: Test NYC Times Square area**

Open browser to: http://localhost:3000
- Enter location: "Times Square, New York, NY"
- Set distance: 3 miles
- Click "Find Places"

**Step 3: Verify popular places rank highly**

Expected results in top 5:
- Central Park (175k+ reviews)
- Times Square (100k+ reviews)
- Bryant Park (50k+ reviews)
- Rockefeller Center (100k+ reviews)
- Brooklyn Bridge (may appear if within radius)

Verify mega-popular places (≥10k reviews) dominate the top results.

**Step 4: Check scores in browser console (optional)**

If needed, inspect the API response in browser DevTools:
- Network tab → `suggest-places` request → Response
- Verify `score` values for top places are much higher than bottom places
- Example: Central Park score ≈ 28-100 vs small park score ≈ 5-10

**Step 5: Document test results**

Note: If popular places aren't appearing in top 5, debug by:
1. Checking API response for `user_ratings_total` values
2. Verifying tiered multipliers are applied correctly
3. Checking console for errors

---

## Task 4: Test prefer_parks Preference

**Files:**
- None (manual testing via browser)

**Step 1: Enable prefer_parks preference**

In the browser:
- Use the same NYC Times Square location from Task 3
- Enable the "Prefer parks" checkbox/toggle in the UI
- Click "Find Places" again

**Step 2: Verify parks rank above landmarks**

Expected behavior:
- Central Park should now rank #1 or #2 (was previously lower)
- Prospect Park should rank higher if within radius
- Tourist attractions like Empire State Building should rank lower than before

**Step 3: Disable prefer_parks and verify reversion**

- Uncheck "Prefer parks"
- Click "Find Places" again
- Verify landmarks return to top positions

**Step 4: Calculate expected scores manually (verification)**

With prefer_parks enabled, Central Park:
- Base: 4.8 (rating) × 5.0 (mega-popular) = 24.0
- Type: 24.0 × 1.2 (park) = 28.8
- Preference: 28.8 × 3.5 (prefer_parks) = 100.8

Times Square without preference:
- Base: 4.5 × 5.0 = 22.5
- Type: 22.5 × 3.0 (landmark) = 67.5

Central Park (100.8) should beat Times Square (67.5).

**Step 5: Document test results**

Note: If parks aren't ranking higher with preference enabled:
1. Check that preference is being sent in API request
2. Verify the 3.5x multiplier is applied in calculate_score
3. Check browser console for errors

---

## Task 5: Test urban_explorer Preference

**Files:**
- None (manual testing via browser)

**Step 1: Enable urban_explorer preference**

In the browser:
- Use NYC Times Square location
- Disable "Prefer parks" if enabled
- Enable "Urban explorer" checkbox/toggle
- Click "Find Places"

**Step 2: Verify museums and galleries rank higher**

Expected behavior:
- Metropolitan Museum of Art should rank highly
- MoMA (Museum of Modern Art) should rank highly
- Art galleries should appear in top results
- Regular tourist attractions should rank lower than without preference

**Step 3: Disable preference and verify reversion**

- Uncheck "Urban explorer"
- Click "Find Places"
- Verify mixed results return (landmarks + museums)

**Step 4: Test in different city (optional)**

Try Paris or London to verify urban_explorer works globally:
- Paris: Louvre, Musée d'Orsay should rank high
- London: British Museum, Tate Modern should rank high

**Step 5: Document test results**

Note: If museums aren't ranking higher:
1. Verify urban_explorer preference is sent in API request
2. Check that museums have 'museum', 'art_gallery', or 'historical' types
3. Verify 3.5x multiplier is applied

---

## Task 6: Test with Different Cities

**Files:**
- None (manual testing via browser)

**Step 1: Test San Francisco**

Location: "Union Square, San Francisco, CA"
Distance: 3 miles

Expected top results:
- Golden Gate Park (mega-popular)
- Fisherman's Wharf (mega-popular)
- Alcatraz (if within radius)
- Cable Car stops (very popular)

**Step 2: Test London (optional)**

Location: "Trafalgar Square, London, UK"
Distance: 5 km

Expected top results:
- Big Ben / Houses of Parliament
- London Eye
- Tower Bridge
- British Museum

**Step 3: Test Tokyo (optional)**

Location: "Shibuya, Tokyo, Japan"
Distance: 5 km

Expected top results:
- Shibuya Crossing
- Meiji Shrine
- Yoyogi Park
- Tokyo Tower (if within radius)

**Step 4: Verify tier thresholds work globally**

Check that:
- 10k+ review places dominate top results in all cities
- Popular landmarks rank above cafes and restaurants
- Type hierarchy is maintained across different regions

**Step 5: Document any issues**

Note: If tier thresholds seem off for certain regions:
1. Check actual `user_ratings_total` values in API responses
2. Consider if tier cutoffs need regional adjustment (future work)
3. Document findings for potential future iteration

---

## Task 7: Final Verification and Documentation

**Files:**
- Modify: `README.md:268-272` (update algorithm documentation)

**Step 1: Read current algorithm documentation**

Run: Read `README.md` lines 266-273 to locate algorithm description

Current text (approximately):
```markdown
**Algorithm:**
The endpoint searches for places within a radius of 50% of the running distance, queries multiple place types (landmarks, parks, museums, etc.), deduplicates results, and scores each place based on:
- Google rating and popularity (user_ratings_total)
- Place type bonuses (landmarks weighted higher than cafes)
- User preferences (parks boosted if prefer_parks is true)
- Distance from start (closer places weighted slightly higher)
```

**Step 2: Update algorithm description**

Replace with:
```markdown
**Algorithm:**
The endpoint searches for places within a radius of 50% of the running distance, queries multiple place types (landmarks, parks, museums, etc.), deduplicates results, and scores each place based on:
- **Popularity tiers** (mega-popular ≥10k reviews: 5x, very popular 2-10k: 3x, popular 500-2k: 2x, moderate 100-500: 1.3x, niche <100: 1x)
- Google rating (combined with popularity tier for base score)
- Place type bonuses (landmarks 3x, parks 1.2x, cafes 0.5x)
- User preferences (parks/museums boosted 3.5x if prefer_parks/urban_explorer enabled - can override type hierarchy)
- Distance from start (closer places weighted slightly higher)

Popular places like Central Park and Times Square now rank significantly higher than lesser-known locations.
```

**Step 3: Verify complete feature works end-to-end**

Final smoke test:
1. Start server: `vercel dev`
2. Search NYC Times Square, 3 miles
3. Verify Central Park in top 3
4. Enable prefer_parks
5. Verify Central Park ranks #1 or #2
6. Disable prefer_parks
7. Verify landmarks return to top

**Step 4: Commit documentation update**

```bash
git add README.md
git commit -m "docs: update algorithm description for popularity tiers

Update API documentation to reflect new tiered popularity system
and strengthened user preference multipliers.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 5: Review all commits**

Run: `git log --oneline -5`

Should see 3 commits:
1. "feat: add tiered popularity multipliers to place scoring"
2. "feat: strengthen user preference multipliers"
3. "docs: update algorithm description for popularity tiers"

---

## Completion Checklist

- [ ] Tiered popularity multipliers implemented (5 tiers)
- [ ] User preference multipliers increased to 3.5x
- [ ] NYC popular places (Central Park, Times Square) rank in top 5
- [ ] prefer_parks preference makes parks beat landmarks
- [ ] urban_explorer preference makes museums beat landmarks
- [ ] Different cities tested (SF, optionally London/Tokyo)
- [ ] README algorithm documentation updated
- [ ] All commits pushed to repository
- [ ] No syntax errors or runtime exceptions

## Expected Outcomes

**Before changes:**
- Central Park might rank #8-12 depending on distance
- Small neighborhood parks could rank above famous landmarks
- user_ratings_total had minimal impact

**After changes:**
- Central Park consistently ranks in top 3
- Times Square, Brooklyn Bridge, Rockefeller Center in top 5
- Small parks rank much lower unless within a few blocks
- User preferences can promote parks/museums to #1 position

## Rollback Plan

If results are unsatisfactory:
```bash
git revert HEAD~2  # Revert last 2 commits (or all 3 if needed)
git push origin main
```

Vercel will automatically redeploy the previous version.

## Future Improvements

- Make tier thresholds configurable via environment variables
- Add analytics to track popularity tier distribution of selected places
- A/B test tier boundaries with real users
- Consider regional adjustments (NYC vs small cities)
- Add admin dashboard to visualize scoring for debugging

---

**Related Design:** `docs/plans/2026-02-15-location-popularity-design.md`
