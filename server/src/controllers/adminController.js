import { Issue } from "../models/Issue.js";
import { Vote } from "../models/Vote.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPagination } from "../utils/pagination.js";

const statuses = ["Reported", "Under Review", "In Progress", "Resolved"];
const priorities = ["Low", "Medium", "High"];
const flagReasons = ["Suspicious", "Potential duplicate"];
const categories = [
  "Roads & Potholes",
  "Garbage & Sanitation",
  "Streetlights",
  "Drainage & Water",
  "Public Safety",
  "Other",
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function issueLookup(id) {
  const lookup = [{ reportId: id }];
  if (/^[0-9a-fA-F]{24}$/.test(id)) lookup.push({ _id: id });
  return { $or: lookup, city: "Indore" };
}

function issueFilters(query) {
  const filters = { city: "Indore" };
  if (query.status) filters.status = query.status;
  if (query.category) filters.category = query.category;
  if (query.priority) filters.priority = query.priority;
  if (query.flagged === "true") filters.isFlagged = true;
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [
      { reportId: search },
      { title: search },
      { locality: search },
      { description: search },
    ];
  }

  return filters;
}

async function decorateIssue(issue) {
  const [voteCount] = await Promise.all([
    Vote.countDocuments({ issue: issue._id }),
  ]);
  const value = issue.toObject ? issue.toObject() : issue;
  return { ...value, voteCount };
}

export const listAdminIssues = asyncHandler(async (req, res) => {
  const { limit, page, skip } = getPagination(req.query);
  const filters = issueFilters(req.query);
  const [issues, total] = await Promise.all([
    Issue.find(filters)
      .populate("creator", "name email")
      .populate("flaggedBy", "name email")
        .populate("statusHistory.changedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Issue.countDocuments(filters),
  ]);

  res.json({
    data: { issues: await Promise.all(issues.map(decorateIssue)) },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getAdminStats = asyncHandler(async (_req, res) => {
  const [summary, categoryDistribution] = await Promise.all([
    Issue.aggregate([
      { $match: { city: "Indore" } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unresolved: {
            $sum: { $cond: [{ $ne: ["$status", "Resolved"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
        },
      },
    ]),
    Issue.aggregate([
      { $match: { city: "Indore" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
  ]);

  res.json({
    data: {
      summary: summary[0] || { total: 0, unresolved: 0, inProgress: 0, resolved: 0 },
      categories: categoryDistribution.map((item) => ({
        category: item._id,
        count: item.count,
      })),
    },
  });
});

export const updateAdminIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const issue = await Issue.findOne(issueLookup(id));
  if (!issue) throw new ApiError(404, "Issue report not found");

  const { status, priority, resolutionNotes } = req.body;
  if (status && !statuses.includes(status)) throw new ApiError(400, "Invalid issue status");
  if (priority && !priorities.includes(priority)) throw new ApiError(400, "Invalid issue priority");
  if (resolutionNotes !== undefined && typeof resolutionNotes !== "string") {
    throw new ApiError(400, "Resolution notes must be text");
  }

  const statusChanged = status && status !== issue.status;
  if (status) issue.status = status;
  if (priority) issue.priority = priority;
  if (resolutionNotes !== undefined) issue.resolutionNotes = resolutionNotes || null;
  if (statusChanged) {
    issue.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
      resolutionNotes: resolutionNotes || issue.resolutionNotes || null,
    });
  }
  await issue.save();

  const populated = await issue.populate([
    { path: "creator", select: "name email" },
    { path: "flaggedBy", select: "name email" },
    { path: "statusHistory.changedBy", select: "name email" },
  ]);
  res.json({ data: { issue: await decorateIssue(populated) } });
});

export const flagAdminIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findOne(issueLookup(req.params.id));
  if (!issue) throw new ApiError(404, "Issue report not found");
  const { flagged, reason } = req.body;
  if (typeof flagged !== "boolean") throw new ApiError(400, "Flagged must be true or false");
  if (flagged && !flagReasons.includes(reason)) throw new ApiError(400, "Invalid flag reason");

  issue.isFlagged = flagged;
  issue.flagReason = flagged ? reason : null;
  issue.flaggedBy = flagged ? req.user._id : null;
  issue.flaggedAt = flagged ? new Date() : null;
  await issue.save();
  const populated = await issue.populate("flaggedBy", "name email");
  res.json({ data: { issue: await decorateIssue(populated) } });
});

export const deleteAdminIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findOne(issueLookup(req.params.id)).select("_id reportId");
  if (!issue) throw new ApiError(404, "Issue report not found");

  await Promise.all([
    Vote.deleteMany({ issue: issue._id }),
    Issue.deleteOne({ _id: issue._id }),
  ]);

  res.json({
    data: {
      deleted: true,
      reportId: issue.reportId,
    },
  });
});

export { categories, flagReasons, priorities, statuses };
