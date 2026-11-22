import mongoose from "mongoose";

/**
 * Connect to MongoDB using the MONGODB_URI environment variable.
 * If no URI is configured yet (local setup stage), the server still
 * starts so public/health routes can be tested; API routes that need
 * the database are added only after the connection is configured.
 */
export async function connectDB(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      "MONGODB_URI is not set - starting without a database connection."
    );
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
    return mongoose;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

export default connectDB;
