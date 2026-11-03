import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

voteSchema.index({ issue: 1, user: 1 }, { unique: true });

export const Vote = mongoose.model("Vote", voteSchema);
