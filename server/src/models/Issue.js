import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
      minlength: 5,
      maxlength: 100,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Roads & Potholes",
        "Garbage & Sanitation",
        "Streetlights",
        "Drainage & Water",
        "Public Safety",
        "Other",
      ],
    },
    locality: {
      type: String,
      required: [true, "Locality is required"],
      trim: true,
      maxlength: 100,
    },
    city: {
      type: String,
      default: "Indore",
      immutable: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    imageReference: {
      type: String,
      trim: true,
      default: null,
    },
    latitude: {
      type: Number,
      required: [true, "Latitude is required"],
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: [true, "Longitude is required"],
      min: -180,
      max: 180,
    },
    reporterLatitude: {
      type: Number,
      required: [true, "Reporter latitude is required"],
      min: -90,
      max: 90,
    },
    reporterLongitude: {
      type: Number,
      required: [true, "Reporter longitude is required"],
      min: -180,
      max: 180,
    },
    problemLatitude: {
      type: Number,
      required: [true, "Problem latitude is required"],
      min: -90,
      max: 90,
    },
    problemLongitude: {
      type: Number,
      required: [true, "Problem longitude is required"],
      min: -180,
      max: 180,
    },
    status: {
      type: String,
      enum: ["Reported", "Under Review", "In Progress", "Resolved"],
      default: "Reported",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: {
      type: String,
      enum: ["Suspicious", "Potential duplicate", null],
      default: null,
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    flaggedAt: {
      type: Date,
      default: null,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Reported", "Under Review", "In Progress", "Resolved"],
          required: true,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        resolutionNotes: {
          type: String,
          trim: true,
          maxlength: 500,
          default: null,
        },
      },
    ],
  },
  { timestamps: true },
);

issueSchema.index({ city: 1, status: 1, category: 1, createdAt: -1 });
issueSchema.index({ creator: 1, locality: 1, createdAt: -1 });

export const Issue = mongoose.model("Issue", issueSchema);
