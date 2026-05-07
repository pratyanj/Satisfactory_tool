# Code Review Issues Checklist

Generated: May 6, 2026  
Status: Ready for Action

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### Issue #1: Truncated Strings in App.tsx
**Severity:** CRITICAL  
**File:** `src/App.tsx`  
**Lines:** 94, 176, 182, 175  
**Description:** Multiple lines have truncated strings with "..." preventing code from working

```typescript
// Line 94 - TRUNCATED
if (decoded.i && items[decoded.i] && typeof decoded.r === 'number' && decoded.m && machines[decoded.m] && decoded.b && belts[decoded.b] && (decoded.l === 'aggregated' || decoded.l === 'exp[...]

// Line 176 - TRUNCATED
className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${layoutMode === 'aggregated' ? 'bg-[#2a2d33] text-white shadow-sm' : 'text-[#8E9299] hover:te[...]

// Lines 182, 175 - SIMILAR TRUNCATION
```

**Impact:** Code is malformed and will not compile  
**Estimated Fix Time:** 5 minutes  
**Priority:** 🔴 CRITICAL - BLOCKS ALL OTHER WORK

---

### Issue #2: Missing Calculation Trigger on URL Parse
**Severity:** CRITICAL  
**File:** `src/App.tsx`  
**Lines:** 87-102  
**Description:** When URL hash is parsed with plan data, `setLastInput()` is called but `calculatePlan()` is never triggered

```typescript
useEffect(() => {
  try {
    if (window.location.hash.startsWith('#plan=')) {
      const encoded = window.location.hash.replace('#plan=', '');
      const decoded = JSON.parse(atob(decodeURIComponent(encoded)));
      
      if (decoded.i && items[decoded.i] && typeof decoded.r === 'number' && decoded.m && machines[decoded.m] && decoded.b && belts[decoded.b] && (decoded.l === 'aggregated' || decoded.l === 'expanded')) {
         setLastInput({ itemId: decoded.i, rate: decoded.r, minerId: decoded.m, beltId: decoded.b });
         // ❌ MISSING: calculatePlan() call - graph never renders!
         setLayoutMode(decoded.l);
      }
    }
  } catch (err) {
    console.warn("Failed to parse plan from URL", err);
  }
}, []);
```

**Current Behavior:** Shared links show no graph visualization  
**Expected Behavior:** Graph should render immediately when URL is loaded  
**Impact:** Feature completely broken for URL sharing  
**Estimated Fix Time:** 15 minutes  
**Priority:** 🔴 CRITICAL - USER-FACING FEATURE BROKEN

---

### Issue #3: Race Condition in Layout Recalculation
**Severity:** CRITICAL  
**File:** `src/App.tsx`  
**Lines:** 148-156  
**Description:** `layoutMode` effect is missing critical dependencies causing stale closures

```typescript
useEffect(() => {
  setIsRecalculating(true);
  requestAnimationFrame(() => {
    calculatePlan(lastInput.itemId, lastInput.rate, lastInput.minerId, lastInput.beltId, layoutMode);
    setIsRecalculating(false);
  });
  // ❌ BUG: Missing dependencies - will use stale lastInput values!
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [layoutMode]);
```

**Current Behavior:** Switching layout modes may not recalculate with correct input values  
**Expected Behavior:** Should always use current `lastInput` state  
**Impact:** Layout switching gives inconsistent results  
**Estimated Fix Time:** 15 minutes  
**Priority:** 🔴 CRITICAL - LOGIC BUG

---

---

## 🟠 HIGH PRIORITY ISSUES

### Issue #4: Unbounded Recursion & No Cycle Detection in Solver
**Severity:** HIGH  
**File:** `src/engine/solver.ts`  
**Lines:** 16-58  
**Description:** Recursive solver has no depth limit or cycle detection. Could crash on malformed recipe data

```typescript
export function solve(itemId: ItemId, requiredRate: number, minerId: MachineId = "miner_mk1"): SolverNode {
  const recipe = getRecipeForItem(itemId);
  
  if (!recipe) {
    throw new Error(`No recipe found for item: ${items[itemId]?.name || itemId}`);
  }

  // ... calculations ...

  for (const input of recipe.inputs) {
    const requiredInputRate = input.rate * machineCount;
    result.inputs.push(solve(input.itemId, requiredInputRate, minerId)); // ❌ UNBOUNDED RECURSION
  }

  return result;
}
```

**Issues:**
- No maximum recursion depth check
- No cycle detection for circular recipe dependencies
- No memoization (same items calculated multiple times)
- Stack overflow risk

**Estimated Fix Time:** 30 minutes  
**Priority:** 🟠 HIGH - CAN CRASH APP

---

### Issue #5: Weak Type Safety in CustomSelect Component
**Severity:** HIGH  
**File:** `src/components/CustomSelect.tsx`  
**Lines:** 15-30  
**Description:** Component doesn't handle empty options array, will crash on line 29

```typescript
export function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ... event listeners ...

  const selectedOption = options.find(o => o.value === value) || options[0];
  // ❌ If options is empty, options[0] is undefined, causes crash!

  return (
    <div className="relative" ref={containerRef}>
      <button ...>
        <span className="truncate font-medium">{selectedOption?.label}</span>
        {/* ❌ Will crash here if selectedOption is undefined */}
      </button>
      // ...
    </div>
  );
}
```

**Current Behavior:** Throws error if component mounted with empty options  
**Expected Behavior:** Should validate options and provide fallback or throw meaningful error  
**Impact:** Can crash component tree  
**Estimated Fix Time:** 10 minutes  
**Priority:** 🟠 HIGH - CAN CRASH

---

### Issue #6: Unsafe Type Casting in graphMapper.ts
**Severity:** HIGH  
**File:** `src/engine/graphMapper.ts`  
**Lines:** 36-64  
**Description:** Recipe and machine lookups don't check for undefined values

```typescript
function buildNodeData(node: SolverNode, machineCount: number, rate: number, label: string) {
  const recipe = recipes.find(r => r.outputItemId === node.itemId);
  const machineInfo = machines[node.machineId];
  const itemInfo = items[node.itemId];

  return {
    label,
    item: itemInfo?.name || node.itemId,
    machines: machineCount,
    rate,
    machineId: node.machineId,
    itemId: node.itemId,
    itemImageUrl: itemInfo?.imageUrl,
    outputRatePerMachine: recipe?.outputRate || 0, // ❌ recipe could be undefined
    inputDetails: (recipe?.inputs || []).map(inp => ({
      // ... uses recipe without validation
    })),
    // ...
  };
}
```

**Issues:**
- `recipe` might be undefined but used without null checks
- `machineInfo` might be undefined
- Silent fallbacks hide data corruption

**Estimated Fix Time:** 20 minutes  
**Priority:** 🟠 HIGH - DATA INTEGRITY ISSUE

---

### Issue #7: Hardcoded Magic Numbers Throughout Codebase
**Severity:** HIGH  
**Files:** Multiple  
**Description:** Magic numbers repeated across files, breaks DRY principle

**Locations:**
- `src/App.tsx:196` - Belt capacity hardcoded in FactoryGraph
- `src/engine/solver.ts:30-32` - Miner output rates hardcoded
- `src/components/Graph/FactoryGraph.tsx:196` - Belt tier mapping repeated
- `src/engine/graphMapper.ts:157-158` - Node dimensions repeated

```typescript
// src/App.tsx:196
const beltCapacity = beltId === 'mk1' ? 60 : beltId === 'mk2' ? 120 : beltId === 'mk3' ? 270 : beltId === 'mk4' ? 480 : 780;

// src/engine/solver.ts:30-32
if (minerId === "miner_mk2") outputRate = 120;
else if (minerId === "miner_mk3") outputRate = 240;
else outputRate = 60;

// src/engine/graphMapper.ts:157-158
const NODE_W = 320;
const NODE_H = 160;
```

**Issues:**
- When game balance changes, must update in multiple places
- Inconsistency risk if values diverge
- Hard to maintain

**Estimated Fix Time:** 20 minutes  
**Priority:** 🟠 HIGH - MAINTAINABILITY ISSUE

---

### Issue #8: Incomplete Error Handling in App.tsx
**Severity:** HIGH  
**File:** `src/App.tsx`  
**Lines:** 122-141  
**Description:** Error state exists but no recovery mechanism or detailed messages

```typescript
const calculatePlan = (itemId: string, rate: number, minerId: MachineId, beltId: BeltId, mode: LayoutMode) => {
  setLastInput({ itemId, rate, minerId, beltId });
  try {
    setError(null);
    const solvedRoot = solve(itemId, rate, minerId);
    const newSummary = calculateSummary(solvedRoot);
    const { nodes: newNodes, edges: newEdges } = mapSolverResultToGraph(solvedRoot, mode, beltId);

    setRootNode(solvedRoot);
    setSummary(newSummary);
    setNodes(newNodes);
    setEdges(newEdges);
  } catch (err: any) {
    setError(err.message || 'An error occurred during calculation.'); // ❌ Generic error display
    // ❌ No retry mechanism
    // ❌ No error logging
    // ❌ No recovery options
    setRootNode(null);
    setSummary(null);
    setNodes([]);
    setEdges([]);
  }
};
```

**Issues:**
- Error display is minimal (just text)
- No retry button
- No error categorization
- No logging for debugging

**Estimated Fix Time:** 25 minutes  
**Priority:** 🟠 HIGH - UX ISSUE

---

---

## 🟡 MEDIUM PRIORITY ISSUES

### Issue #9: Missing React Key in Tab Navigation
**Severity:** MEDIUM  
**File:** `src/App.tsx`  
**Lines:** 272-281  
**Description:** Tab buttons use map without keys (though less critical since array is static)

```typescript
{TAB_CONFIG.map((tab) => (
  <button
    key={tab.id}  // ✓ Has key, but good to verify
    onClick={() => setMainTab(tab.id as MainTab)}
    className={`tab-bar-btn ${mainTab === tab.id ? 'tab-bar-btn--active' : ''}`}
  >
    {tab.icon}
    <span>{tab.label}</span>
  </button>
))}
```

**Note:** Actually OK, but worth double-checking for consistency  
**Estimated Fix Time:** 5 minutes  
**Priority:** 🟡 MEDIUM - CODE QUALITY

---

### Issue #10: No Accessibility Labels on Export Buttons
**Severity:** MEDIUM  
**File:** `src/components/Graph/FactoryGraph.tsx`  
**Lines:** 168-171  
**Description:** Export buttons lack ARIA labels, making them inaccessible to screen readers

```typescript
<button disabled={isExporting} className="flex items-center gap-1.5 bg-[#4B2F83]...">
  {/* ❌ No aria-label, no role defined */}
  <Download size={16} />
</button>
```

**Issues:**
- No `aria-label` for icon-only buttons
- No `aria-disabled` state
- Keyboard navigation unclear

**Estimated Fix Time:** 15 minutes  
**Priority:** 🟡 MEDIUM - ACCESSIBILITY

---

### Issue #11: No Keyboard Navigation for CustomSelect
**Severity:** MEDIUM  
**File:** `src/components/CustomSelect.tsx`  
**Description:** Dropdown doesn't support arrow key navigation or Enter key selection

```typescript
export function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  // ❌ No keyboard event handlers
  
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        // ❌ No onKeyDown handler
      >
        {/* ... */}
      </button>
      {/* ... dropdown ... */}
    </div>
  );
}
```

**Expected Keyboard Shortcuts:**
- ArrowDown: Next option
- ArrowUp: Previous option
- Enter: Select
- Escape: Close

**Estimated Fix Time:** 20 minutes  
**Priority:** 🟡 MEDIUM - ACCESSIBILITY/UX

---

### Issue #12: Missing Virtual Rendering for Large Lists
**Severity:** MEDIUM  
**Files:** `src/components/ItemsTab.tsx`, `src/components/TreeList.tsx`  
**Description:** Renders all items at once without virtualization. Will lag with 100+ items

```typescript
// Assumed structure - need to verify
export function ItemsTab({ summary }: { summary?: SummaryData }) {
  return (
    <div>
      {/* ❌ All items rendered even if off-screen */}
      {Object.entries(summary?.allItemRates || {}).map(([itemId, rate]) => (
        <ItemRow key={itemId} itemId={itemId} rate={rate} />
      ))}
    </div>
  );
}
```

**Performance Impact:** FPS drops with large datasets  
**Solution:** Use `react-window` or `react-virtual`  
**Estimated Fix Time:** 45 minutes  
**Priority:** 🟡 MEDIUM - PERFORMANCE

---

### Issue #13: Inefficient Chunk Connection Algorithm in graphMapper.ts
**Severity:** MEDIUM  
**File:** `src/engine/graphMapper.ts`  
**Lines:** 118-145  
**Description:** O(n²) complexity for edge connections becomes slow with large graphs

```typescript
// Inside traverseExpanded function
for (let i = 0; i < maxLen; i++) {
  const ci = Math.min(Math.floor(i * childChunks.length / maxLen), childChunks.length - 1);
  const pi = Math.min(Math.floor(i * myChunks.length / maxLen), myChunks.length - 1);
  const key = `${ci}-${pi}`;
  if (connected.has(key)) continue;
  connected.add(key);
  // Creates edges - O(n) for each edge, so total O(n²)
}
```

**Impact:** Slow graph rendering for large production chains (50+ items)  
**Estimated Fix Time:** 30 minutes  
**Priority:** 🟡 MEDIUM - PERFORMANCE

---

### Issue #14: No Suspense/Error Boundary for Code Splitting
**Severity:** MEDIUM  
**File:** `src/App.tsx`  
**Description:** Large components should be code-split but no Suspense boundary

```typescript
// Missing:
import { Suspense, lazy } from 'react';

const FactoryGraph = lazy(() => import('./components/Graph/FactoryGraph'));
const MapTab = lazy(() => import('./components/Map/MapTab'));

// Should be wrapped:
<Suspense fallback={<LoadingSpinner />}>
  <FactoryGraph {...props} />
</Suspense>
```

**Impact:** Bundle size larger than necessary  
**Estimated Fix Time:** 25 minutes  
**Priority:** 🟡 MEDIUM - BUNDLE SIZE

---

### Issue #15: No Memoization for Heavy Components
**Severity:** MEDIUM  
**File:** `src/components/Graph/FactoryGraph.tsx`  
**Description:** `handleExpandNode` callback recreated on every render

```typescript
const handleExpandNode = useCallback((targetNodeId: string) => {
  // 100+ lines of complex logic
}, [getNodes, getEdges, setNodes, setEdges, beltCapacity]);
```

**Issue:** Large dependency array causes unnecessary recreations  
**Estimated Fix Time:** 30 minutes  
**Priority:** 🟡 MEDIUM - PERFORMANCE

---

---

## 🟢 LOW PRIORITY ISSUES

### Issue #16: Missing Unit Tests
**Severity:** LOW  
**Files:** `src/engine/solver.ts`, `src/engine/graphMapper.ts`  
**Description:** No test coverage for core calculation logic

**Recommendation:** Add tests for:
- Solver recursion with various inputs
- Graph mapping for aggregated/expanded modes
- Edge case handling

**Estimated Fix Time:** 60+ minutes  
**Priority:** 🟢 LOW - NICE TO HAVE

---

### Issue #17: Missing Documentation Comments
**Severity:** LOW  
**Files:** Multiple  
**Description:** Complex functions lack JSDoc comments

```typescript
// MISSING: JSDoc comment explaining this complex function
function traverseExpanded(node: SolverNode): { id: string; rate: number }[] {
  // Complex logic...
}

// Should be:
/**
 * Traverse solver tree in expanded mode, creating individual machine nodes grouped by chunks
 * @param node - Current solver node
 * @returns Array of chunk IDs and their output rates
 */
function traverseExpanded(node: SolverNode): { id: string; rate: number }[] {
  // Complex logic...
}
```

**Estimated Fix Time:** 30 minutes  
**Priority:** 🟢 LOW - DOCUMENTATION

---

### Issue #18: No Logging/Monitoring Setup
**Severity:** LOW  
**Description:** No way to debug issues in production

**Recommendation:** Add:
- Console logging in development
- Error tracking (Sentry/LogRocket)
- Performance monitoring

**Estimated Fix Time:** 45 minutes  
**Priority:** 🟢 LOW - OPS

---

---

## 📊 SUMMARY

| Severity | Count | Est. Total Time |
|----------|-------|-----------------|
| 🔴 CRITICAL | 3 | 35 min |
| 🟠 HIGH | 6 | 2h 10m |
| 🟡 MEDIUM | 8 | 3h 00m |
| 🟢 LOW | 3 | 2h 15m |
| **TOTAL** | **20** | **~7h 40m** |

---

## ✅ ACTION PLAN

### Phase 1: Critical Fixes (35 minutes)
1. Fix truncated strings in App.tsx
2. Add calculatePlan trigger on URL parse
3. Fix layout recalculation race condition

### Phase 2: High Priority (2h 10m)
4. Add recursion depth limit & cycle detection to solver
5. Improve CustomSelect type safety
6. Add safe type checking in graphMapper
7. Extract magic numbers to constants
8. Improve error handling

### Phase 3: Medium Priority (3h 00m)
9-15. Performance optimizations, accessibility, and testing

### Phase 4: Low Priority (2h 15m)
16-18. Documentation, logging, monitoring

---

**Generated:** May 6, 2026  
**Last Updated:** May 6, 2026  
**Status:** 🔴 20 Issues Pending
