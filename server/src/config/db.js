import mongoose from "mongoose";


export async function connectDatabase(mongoUri) {

  await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 20000,
  minPoolSize: 0,
  maxPoolSize: 1,
  autoSelectFamily: false,
  tls: true,
  tlsAllowInvalidCertificates: false,
  secureProtocol: "TLSv1_2_method",
});

  console.log("Connected to MongoDB");
}

export function getDatabaseState() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}