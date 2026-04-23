import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup inactive rooms",
  { hours: 2 },
  internal.rooms.cleanupInactiveRooms,
  {}
);

export default crons;
