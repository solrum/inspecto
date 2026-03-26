import { db } from '../config/database.js';
import type { NodeInfo, AnchorMeta } from '@inspecto/shared';

/**
 * Fuzzy similarity score between a comment's anchor_meta and a candidate node.
 * Returns 0–100. Threshold for auto-matching: >= 60.
 */
function similarityScore(meta: AnchorMeta, candidate: NodeInfo): number {
  let score = 0;

  // Same type is a hard signal (most reliable — designers rarely change element type)
  if (candidate.type === meta.type) score += 35;

  // Same name (case-insensitive)
  if (
    meta.name !== null &&
    candidate.name !== null &&
    candidate.name.toLowerCase() === meta.name.toLowerCase()
  ) {
    score += 35;
  }

  // Same parent (structural similarity)
  if (candidate.parentId === meta.parentId) score += 15;

  // Bbox proximity — centre point within 50px threshold
  const { bbox } = meta;
  if (
    bbox.x !== null &&
    bbox.y !== null &&
    bbox.w !== null &&
    bbox.h !== null &&
    candidate.x !== null &&
    candidate.y !== null &&
    candidate.width !== null &&
    candidate.height !== null
  ) {
    const oldCx = bbox.x + bbox.w / 2;
    const oldCy = bbox.y + bbox.h / 2;
    const newCx = candidate.x + candidate.width / 2;
    const newCy = candidate.y + candidate.height / 2;
    const dist = Math.sqrt((newCx - oldCx) ** 2 + (newCy - oldCy) ** 2);

    if (dist <= 20) score += 15;
    else if (dist <= 50) score += 10;
    else if (dist <= 150) score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Called after a new version is uploaded.
 * Updates anchor_status on all node-anchored comments for this file based on
 * the new version's node lookup map.
 *
 * anchor_status transitions:
 *   active       — node_id found in new version (may have moved → pin_x_ratio/pin_y_ratio updated)
 *   moved        — node found but its bbox changed significantly
 *   fuzzy_matched — node_id gone, but a similar node found (score >= 60)
 *   orphaned     — node_id gone, no good match found
 */
export async function carryForwardComments(
  fileId: string,
  newVersionId: string,
  nodeLookup: Map<string, NodeInfo>,
  frameIndex: Array<{ id: string; width: number | null; height: number | null }>,
): Promise<void> {
  // Only process node-anchored comments (frame-level comments have no node_id)
  const comments = await db('comments')
    .where({ file_id: fileId })
    .whereNotNull('node_id')
    .select('id', 'node_id', 'frame_id', 'anchor_meta', 'pin_x_ratio', 'pin_y_ratio');

  if (comments.length === 0) return;

  // Build frame dimension map for ratio recalculation
  const frameDims = new Map(
    frameIndex.map((f) => [f.id, { w: f.width ?? 0, h: f.height ?? 0 }]),
  );

  for (const comment of comments) {
    const nodeId = comment.node_id as string;
    const meta = comment.anchor_meta as AnchorMeta | null;

    const foundNode = nodeLookup.get(nodeId);

    if (foundNode) {
      // Node still exists — check if it moved significantly
      let newStatus: 'active' | 'moved' = 'active';
      const updates: Record<string, unknown> = { anchor_status: 'active' };

      if (meta && foundNode.x !== null && foundNode.y !== null) {
        const { bbox } = meta;
        if (bbox.x !== null && bbox.y !== null) {
          const dist = Math.sqrt(
            (foundNode.x - bbox.x) ** 2 + (foundNode.y - bbox.y) ** 2,
          );
          if (dist > 20) {
            newStatus = 'moved';
            // Recalculate pin ratio based on new node centre within its frame
            const dims = frameDims.get(foundNode.frameId);
            if (dims && dims.w > 0 && dims.h > 0 && foundNode.width !== null && foundNode.height !== null) {
              updates.pin_x_ratio = (foundNode.x + foundNode.width / 2) / dims.w;
              updates.pin_y_ratio = (foundNode.y + foundNode.height / 2) / dims.h;
              updates.frame_id = foundNode.frameId;
            }
          }
        }
      }

      updates.anchor_status = newStatus;
      await db('comments').where('id', comment.id).update(updates);
      continue;
    }

    // Node not found — try fuzzy match within same frame
    if (!meta) {
      await db('comments').where('id', comment.id).update({ anchor_status: 'orphaned' });
      continue;
    }

    const frameId = comment.frame_id as string | null;
    const candidates = frameId
      ? [...nodeLookup.values()].filter((n) => n.frameId === frameId)
      : [...nodeLookup.values()];

    let bestScore = 0;
    let bestMatch: NodeInfo | null = null;

    for (const candidate of candidates) {
      const score = similarityScore(meta, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestScore >= 60 && bestMatch) {
      // Fuzzy match found — update node_id and recalculate pin position
      const dims = frameDims.get(bestMatch.frameId);
      const pinUpdates: Record<string, unknown> = {
        anchor_status: 'fuzzy_matched',
        node_id: bestMatch.id,
        frame_id: bestMatch.frameId,
      };

      if (dims && dims.w > 0 && dims.h > 0 && bestMatch.x !== null && bestMatch.y !== null && bestMatch.width !== null && bestMatch.height !== null) {
        pinUpdates.pin_x_ratio = (bestMatch.x + bestMatch.width / 2) / dims.w;
        pinUpdates.pin_y_ratio = (bestMatch.y + bestMatch.height / 2) / dims.h;
      }

      await db('comments').where('id', comment.id).update(pinUpdates);
    } else {
      // No good match — mark orphaned but keep last known pin position
      await db('comments').where('id', comment.id).update({ anchor_status: 'orphaned' });
    }
  }
}
