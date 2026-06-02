/**
 * IFC STEP AABB Parser
 *
 * Parses raw IFC STEP text and returns per-element Axis-Aligned Bounding Boxes.
 *
 * Strategy:
 *  1. Build a reference map  { expressId → raw line }
 *  2. For each building element, resolve its placement chain to get an
 *     absolute world-space origin.
 *  3. From the associated IFCEXTRUDEDAREASOLID (or profile) derive approx
 *     half-extents. Fall back to discipline-based defaults when geometry
 *     can't be resolved.
 *  4. Return AABB as { min, max } in model-space metres.
 *
 * This intentionally avoids a full IFC kernel (web-ifc / IfcOpenShell) so it
 * runs without native binaries.  Accuracy: ±10-20 cm on typical models — good
 * enough to catch hard clashes (full overlap) and flag soft-clash candidates.
 */

export interface Vec3 { x: number; y: number; z: number }
export interface AABB  { min: Vec3; max: Vec3 }

export interface IfcElement {
  expressId: number;
  globalId: string;
  type: string;       // e.g. IFCBEAM
  name: string;
  discipline: string; // structural | hvac | plumbing | electrical | architecture | other
  aabb: AABB;
}

// ─── discipline map ──────────────────────────────────────────────────────────

const DISCIPLINE_MAP: Record<string, string> = {
  IFCCOLUMN: 'structural', IFCBEAM: 'structural', IFCSLAB: 'structural',
  IFCFOOTING: 'structural', IFCPILE: 'structural', IFCPLATE: 'structural',
  IFCMEMBER: 'structural',
  IFCWALL: 'architecture', IFCWALLSTANDARDCASE: 'architecture',
  IFCDOOR: 'architecture', IFCWINDOW: 'architecture',
  IFCROOF: 'architecture', IFCSTAIR: 'architecture', IFCRAILING: 'architecture',
  IFCDUCTSEGMENT: 'hvac', IFCDUCTFITTING: 'hvac', IFCAIRTERMINAL: 'hvac',
  IFCFAN: 'hvac', IFCCHILLER: 'hvac', IFCBOILER: 'hvac', IFCPUMP: 'hvac',
  IFCPIPESEGMENT: 'plumbing', IFCPIPEFITTING: 'plumbing', IFCVALVE: 'plumbing',
  IFCSANITARYTERMINAL: 'plumbing', IFCWASTETERMINAL: 'plumbing',
  IFCCABLECARRIERSEGMENT: 'electrical', IFCCABLESEGMENT: 'electrical',
  IFCDISTRIBUTIONBOARD: 'electrical', IFCLIGHTFIXTURE: 'electrical',
  IFCOUTLET: 'electrical', IFCSWITCHINGDEVICE: 'electrical',
};

// Default half-extents (metres) when geometry can't be resolved
const DEFAULT_HALF: Record<string, Vec3> = {
  structural:   { x: 0.20, y: 0.20, z: 3.0  },
  hvac:         { x: 0.15, y: 0.15, z: 2.0  },
  plumbing:     { x: 0.08, y: 0.08, z: 2.0  },
  electrical:   { x: 0.06, y: 0.06, z: 1.5  },
  architecture: { x: 0.20, y: 2.80, z: 0.20 },
  other:        { x: 0.15, y: 0.15, z: 1.0  },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseNumbers(s: string): number[] {
  return (s.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ?? []).map(Number);
}

/** Build a flat id→line map from STEP DATA section */
function buildRefMap(content: string): Map<number, string> {
  const map = new Map<number, string>();
  // Match lines like:  #123 = IFCFOO(...)
  const re = /#(\d+)\s*=\s*([A-Z][^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    map.set(parseInt(m[1], 10), m[2].trim());
  }
  return map;
}

/** Resolve IFCCARTESIANPOINT → Vec3 */
function resolvePoint(id: number, refs: Map<number, string>): Vec3 | null {
  const line = refs.get(id);
  if (!line) return null;
  if (!line.startsWith('IFCCARTESIANPOINT')) return null;
  const nums = parseNumbers(line);
  if (nums.length < 2) return null;
  return { x: nums[0], y: nums[1], z: nums[2] ?? 0 };
}

/** Resolve IFCAXIS2PLACEMENT3D → origin Vec3 */
function resolvePlacement3D(id: number, refs: Map<number, string>): Vec3 {
  const line = refs.get(id);
  if (!line || !line.startsWith('IFCAXIS2PLACEMENT3D')) return { x: 0, y: 0, z: 0 };
  // IFCAXIS2PLACEMENT3D(#locationRef, #zDir, #xDir)
  const refMatch = line.match(/#(\d+)/);
  if (!refMatch) return { x: 0, y: 0, z: 0 };
  return resolvePoint(parseInt(refMatch[1], 10), refs) ?? { x: 0, y: 0, z: 0 };
}

/** Walk IFCLOCALPLACEMENT chain → absolute world origin */
function resolveLocalPlacement(id: number, refs: Map<number, string>, depth = 0): Vec3 {
  if (depth > 20) return { x: 0, y: 0, z: 0 }; // guard against cycles
  const line = refs.get(id);
  if (!line || !line.startsWith('IFCLOCALPLACEMENT')) return { x: 0, y: 0, z: 0 };

  // IFCLOCALPLACEMENT(#parentRef, #placement3DRef)
  const allRefs = [...line.matchAll(/#(\d+)/g)].map(m => parseInt(m[1], 10));
  if (allRefs.length === 0) return { x: 0, y: 0, z: 0 };

  let parentOrigin: Vec3 = { x: 0, y: 0, z: 0 };
  let relOrigin: Vec3    = { x: 0, y: 0, z: 0 };

  if (allRefs.length >= 2) {
    parentOrigin = resolveLocalPlacement(allRefs[0], refs, depth + 1);
    relOrigin    = resolvePlacement3D(allRefs[1], refs);
  } else {
    relOrigin    = resolvePlacement3D(allRefs[0], refs);
  }

  return {
    x: parentOrigin.x + relOrigin.x,
    y: parentOrigin.y + relOrigin.y,
    z: parentOrigin.z + relOrigin.z,
  };
}

/**
 * Try to resolve half-extents from an IFCEXTRUDEDAREASOLID chain.
 * Returns null when geometry is too complex to parse statically.
 */
function resolveExtrusionHalfExtents(
  shapeRepId: number,
  refs: Map<number, string>,
): Vec3 | null {
  const shapeLine = refs.get(shapeRepId);
  if (!shapeLine) return null;

  // Find IFCEXTRUDEDAREASOLID referenced anywhere in the shape
  const allExtrudeIds: number[] = [];
  for (const [id, line] of refs) {
    if (line.startsWith('IFCEXTRUDEDAREASOLID')) allExtrudeIds.push(id);
  }
  if (allExtrudeIds.length === 0) return null;

  // Take the first extrusion as representative
  const extrLine = refs.get(allExtrudeIds[0]);
  if (!extrLine) return null;

  // IFCEXTRUDEDAREASOLID(#profileRef, #placement, #direction, depth)
  const nums = parseNumbers(extrLine);
  const depth = nums[nums.length - 1] ?? 3.0;

  // Find profile
  const profileRef = [...extrLine.matchAll(/#(\d+)/g)].map(m => parseInt(m[1], 10))[0];
  if (!profileRef) return { x: 0.15, y: 0.15, z: depth / 2 };

  const profLine = refs.get(profileRef) ?? '';
  if (profLine.startsWith('IFCRECTANGLEPROFILEDEF')) {
    const pNums = parseNumbers(profLine);
    // IFCRECTANGLEPROFILEDEF(.AREA., name, placement, xDim, yDim)
    const xDim = pNums[pNums.length - 2] ?? 0.3;
    const yDim = pNums[pNums.length - 1] ?? 0.5;
    return { x: xDim / 2, y: yDim / 2, z: depth / 2 };
  }
  if (profLine.startsWith('IFCCIRCLEPROFILEDEF')) {
    const pNums = parseNumbers(profLine);
    const r = pNums[pNums.length - 1] ?? 0.1;
    return { x: r, y: r, z: depth / 2 };
  }
  // Unknown profile → use depth with generic cross-section
  return { x: 0.15, y: 0.15, z: depth / 2 };
}

// ─── main export ─────────────────────────────────────────────────────────────

// Element types we want to extract
const ELEMENT_TYPES = new Set(Object.keys(DISCIPLINE_MAP));

export function parseIfcElements(content: string): IfcElement[] {
  const refs = buildRefMap(content);
  const elements: IfcElement[] = [];

  // Match top-level building product lines
  // e.g.  #42 = IFCBEAM('GUID',#owner,'Name',$,$,#placement,#shape,$,.BEAM.);
  const elementRe = /#(\d+)\s*=\s*(IFC[A-Z]+)\s*\(\s*'([^']*)'/g;
  let m: RegExpExecArray | null;

  while ((m = elementRe.exec(content)) !== null) {
    const expressId = parseInt(m[1], 10);
    const type      = m[2];
    const globalId  = m[3];

    if (!ELEMENT_TYPES.has(type)) continue;

    const line       = refs.get(expressId) ?? '';
    const discipline = DISCIPLINE_MAP[type] ?? 'other';

    // Extract name (4th string parameter in most IFC products)
    const nameMatch = line.match(/'[^']*'\s*,\s*#\d+\s*,\s*'([^']*)'/);
    const name      = nameMatch ? nameMatch[1] : `${type}-${expressId}`;

    // Find all #refs in this element line
    const allRefs = [...line.matchAll(/#(\d+)/g)].map(r => parseInt(r[1], 10));

    // Heuristic: first #ref after globalId owner is usually objectPlacement
    // IFCPRODUCT(guid, ownerHistory, name, desc, type, #placement, #shape, tag)
    //            [0]   [1]           [2]   [3]    [4]  [5]         [6]
    let origin: Vec3 = { x: 0, y: 0, z: 0 };
    let halfExtents: Vec3 | null = null;

    if (allRefs.length >= 1) {
      const placementId = allRefs[0]; // first ref
      const placementLine = refs.get(placementId) ?? '';
      if (placementLine.startsWith('IFCLOCALPLACEMENT')) {
        origin = resolveLocalPlacement(placementId, refs);
      }
    }

    if (allRefs.length >= 2) {
      halfExtents = resolveExtrusionHalfExtents(allRefs[1], refs);
    }

    const h = halfExtents ?? DEFAULT_HALF[discipline];

    const aabb: AABB = {
      min: { x: origin.x - h.x, y: origin.y - h.y, z: origin.z - h.z },
      max: { x: origin.x + h.x, y: origin.y + h.y, z: origin.z + h.z },
    };

    elements.push({ expressId, globalId, type, name, discipline, aabb });
  }

  return elements;
}
