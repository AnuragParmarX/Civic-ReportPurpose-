import { randomUUID } from "node:crypto";

import { Issue } from "../models/Issue.js";
import { Vote } from "../models/Vote.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPagination } from "../utils/pagination.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFilters(query) {
  const filters = { city: "Indore" };
  if (query.status) filters.status = query.status;
  if (query.category) filters.category = query.category;
  if (query.locality) filters.locality = new RegExp(escapeRegex(query.locality), "i");
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [{ title: search }, { locality: search }, { description: search }];
  }

  return filters;
}

async function serializeIssue(issue, userId) {
  const [voteCount, userVote] = await Promise.all([
    Vote.countDocuments({ issue: issue._id }),
    userId ? Vote.exists({ issue: issue._id, user: userId }) : null,
  ]);

  const serialized = issue.toObject ? issue.toObject() : issue;
  return { ...serialized, voteCount, hasVoted: Boolean(userVote) };
}

function buildIssueLookup(id) {
  const lookup = [{ reportId: id }];
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    lookup.push({ _id: id });
  }
  return { $or: lookup, city: "Indore" };
}

export const createIssue = asyncHandler(async (req, res) => {
  const latitude = Number(req.body.problemLatitude ?? req.body.latitude);
  const longitude = Number(req.body.problemLongitude ?? req.body.longitude);
  const reporterLatitude = Number(req.body.reporterLatitude);
  const reporterLongitude = Number(req.body.reporterLongitude);
  if (
    !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
    || !Number.isFinite(reporterLatitude)
    || reporterLatitude < -90
    || reporterLatitude > 90
    || !Number.isFinite(reporterLongitude)
    || reporterLongitude < -180
    || reporterLongitude > 180
  ) {
    throw new ApiError(400, "Valid reporter and problem coordinates are required");
  }

  const issue = await Issue.create({
    title: req.body.title,
    category: req.body.category,
    locality: req.body.locality,
    description: req.body.description,
    imageReference: req.body.imageReference,
    latitude,
    longitude,
    reporterLatitude,
    reporterLongitude,
    problemLatitude: latitude,
    problemLongitude: longitude,
    priority: req.body.priority,
    reportId: `IND-${randomUUID().slice(0, 8).toUpperCase()}`,
    creator: req.user._id,
  });

  const populatedIssue = await issue.populate("creator", "name email");
  res.status(201).json({
    data: { issue: await serializeIssue(populatedIssue, req.user._id) },
  });
});

export const listIssues = asyncHandler(async (req, res) => {
  const { limit, page, skip } = getPagination(req.query);
  const filters = buildFilters(req.query);
  const [issues, total] = await Promise.all([
    Issue.find(filters)
      .populate("creator", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Issue.countDocuments(filters),
  ]);

  res.json({
    data: {
      issues: await Promise.all(
        issues.map((issue) => serializeIssue(issue, req.user?._id)),
      ),
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findOne({
    ...buildIssueLookup(req.params.id),
  })
    .populate("creator", "name email");

  if (!issue) throw new ApiError(404, "Issue report not found");
  res.json({
    data: { issue: await serializeIssue(issue, req.user?._id) },
  });
});

export const updateIssue = asyncHandler(async (req, res) => {
  const allowedUpdates = ["title", "category", "locality", "description", "priority", "imageReference"];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowedUpdates.includes(key)),
  );

  const issue = await Issue.findOneAndUpdate(
    buildIssueLookup(req.params.id),
    updates,
    { new: true, runValidators: true },
  ).populate("creator", "name email");

  if (!issue) throw new ApiError(404, "Issue report not found");
  res.json({ data: { issue: await serializeIssue(issue) } });
});

export const updateIssueStatus = asyncHandler(async (req, res) => {
  const { resolutionNotes, status } = req.body;
  const issue = await Issue.findOne(buildIssueLookup(req.params.id));

  if (!issue) throw new ApiError(404, "Issue report not found");
  const previousStatus = issue.status;
  issue.status = status;
  issue.resolutionNotes = status === "Resolved" ? resolutionNotes || null : null;
  if (previousStatus !== status) {
    issue.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
      resolutionNotes: issue.resolutionNotes,
    });
  }
  await issue.save();
  await issue.populate("creator", "name email");
  res.json({ data: { issue: await serializeIssue(issue) } });
});

export const voteForIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findOne({
    ...buildIssueLookup(req.params.id),
  }).select("_id");
  if (!issue) throw new ApiError(404, "Issue report not found");

  try {
    await Vote.create({ issue: issue._id, user: req.user._id });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "You have already voted for this issue");
    }
    throw error;
  }

  res.json({
    data: {
      voteCount: await Vote.countDocuments({ issue: issue._id }),
      hasVoted: true,
    },
  });
});

export const removeVoteForIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findOne(buildIssueLookup(req.params.id)).select("_id");
  if (!issue) throw new ApiError(404, "Issue report not found");

  await Vote.deleteOne({ issue: issue._id, user: req.user._id });
  res.json({
    data: {
      voteCount: await Vote.countDocuments({ issue: issue._id }),
      hasVoted: false,
    },
  });
});
