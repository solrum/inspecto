// ─── Auth & Users ───

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OrgRole = 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMember {
  orgId: string;
  userId: string;
  role: OrgRole;
  joinedAt: Date;
}

// ─── Teams (sub-groups within orgs) ───

export interface Team {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  joinedAt: Date;
}

// ─── Projects & Files ───

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  archived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PenFile {
  id: string;
  projectId: string;
  name: string;
  originalFilename: string | null;
  currentVersionId: string | null;
  uploadedBy: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeSummary {
  id: string;
  name: string | null;
  type: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  s3Key: string;
  fileSizeBytes: number;
  thumbnailS3Key: string | null;
  nodeSummary: NodeSummary[] | null;
  frameIndex: import('../pen-format/types.js').FrameIndexEntry[] | null;
  commitMessage: string | null;
  uploadedBy: string;
  createdAt: Date;
}

// ─── Version Diffing ───

export interface NodeChange {
  nodeId: string;
  nodeName: string | null;
  nodeType: string;
}

export interface PropertyChange {
  nodeId: string;
  nodeName: string | null;
  changes: { property: string; oldValue: unknown; newValue: unknown }[];
}

export interface PenDiff {
  nodesAdded: NodeChange[];
  nodesRemoved: NodeChange[];
  nodesMoved: { nodeId: string; fromParent: string; toParent: string }[];
  propertiesChanged: PropertyChange[];
  variablesChanged: { name: string; oldValue: unknown; newValue: unknown }[];
  summary: string;
}

export interface VersionDiff {
  id: string;
  fileId: string;
  fromVersionId: string;
  toVersionId: string;
  diffData: PenDiff;
  summary: string | null;
  computedAt: Date;
}

// ─── Comments ───

export type AnchorStatus = 'active' | 'moved' | 'orphaned' | 'fuzzy_matched';

export interface AnchorMeta {
  name: string | null;
  type: string;
  parentId: string | null;
  bbox: { x: number | null; y: number | null; w: number | null; h: number | null };
}

export interface Comment {
  id: string;
  fileId: string;
  versionId: string | null;
  parentCommentId: string | null;
  authorId: string;
  body: string;
  // Frame-level anchor (always set for node comments)
  frameId: string | null;
  pinXRatio: number | null;   // x / frame_width  (0.0–1.0)
  pinYRatio: number | null;   // y / frame_height (0.0–1.0)
  // Node-level anchor (null = frame-level pin only)
  nodeId: string | null;
  anchorMeta: AnchorMeta | null;
  anchorStatus: AnchorStatus;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sharing ───

export type SharePermission = 'view' | 'download' | 'comment';

export interface ShareLink {
  id: string;
  fileId: string;
  token: string;
  permission: SharePermission;
  createdBy: string;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}
