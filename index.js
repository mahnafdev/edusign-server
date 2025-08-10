// Import SDKs
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
// const firebaseAdmin = require("firebase-admin");
const dotenv = require("dotenv").config;
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5100;
dotenv();

// Middlewares
app.use(express.json());
app.use(
	cors({
		origin: ["http://localhost:5173", "https://edusign-e1494.web.app"],
		credentials: true,
	}),
);
app.use(cookieParser());

// Verify JWT Token
const verifyToken = (req, res, next) => {
	const token = req?.cookies?.token;
	// Unauthorized
	if (!token) {
		return res.status(401).send({ message: "No Access because User is Unauthorized." });
	}
	// Verify or Forbidden
	jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
		if (error)
			return res.status(401).send({ message: "No Access because User is Unauthorized." });
		req.decoded = decoded;
		next();
	});
};

// MongoDB URI
const db_uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@professorcluster.rlegbqz.mongodb.net/?retryWrites=true&w=majority&appName=ProfessorCluster`;

// MongoClient
const db_client = new MongoClient(db_uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

// MongoDB run function
async function run_db() {
	try {
		// Client connection with server (turn off in deployment)
		// await db_client.connect();
		// Define Database
		const database = db_client.db("edusign");
		// Define Collections
		const usersCollection = database.collection("users");
		const assignmentsCollection = database.collection("assignments");
		const submissionsCollection = database.collection("submissions");
		// JWT: POST: Create & Sets Token
		app.post("/jwt", async (req, res) => {
			// Create Token
			const userData = req.body;
			const token = jwt.sign(userData, process.env.JWT_SECRET, {
				expiresIn: "1h",
			});
			// Set Token
			res.cookie("token", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production" ? true : false,
				sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
			});
			res.send({ success: true });
		});
		// GET: All Submissions or Filtered Submissions
		app.get("/submissions", verifyToken, async (req, res) => {
			const { user_email, status } = req.query;
			if (user_email && user_email !== req?.decoded?.email)
				return res.status(403).send({ message: "User Access is Forbidden." });
			// Get All
			const query = {};
			// Filter
			user_email ? (query.user_email = user_email) : query;
			status ? (query.status = status) : query;
			const result = await submissionsCollection.find(query).toArray();
			res.send(result);
		});
		// POST: A Submission
		app.post("/submissions", verifyToken, async (req, res) => {
			const newSubmission = req.body;
			const result = await submissionsCollection.insertOne(newSubmission);
			res.status(201).send(result);
		});
		// GET: A Submission
		app.get("/submissions/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await submissionsCollection.findOne(query);
			res.send(result);
		});
		// PUT: A Submission
		app.put("/submissions/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const options = { upsert: true };
			const updatedSubmission = req.body;
			const updatedDoc = {
				$set: {
					obtained_marks: updatedSubmission.obtained_marks,
					examiner_feedback: updatedSubmission.feedback,
					status: "Completed",
				},
			};
			const result = await submissionsCollection.updateOne(query, updatedDoc, options);
			res.status(200).send(result);
		});
		// GET: All Users or Filtered Users
		app.get("/users", verifyToken, async (req, res) => {
			const { email } = req.query;
			// Get All
			const query = {};
			// Filter
			email ? (query.email = email) : query;
			const result = await usersCollection.find(query).toArray();
			res.send(result);
		});
		// Logout User
		app.post("/users/logout", async (req, res) => {
			// Clear Token
			res.clearCookie("token", {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production" ? true : false,
				sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
			});
			res.send({ message: "Logged out user." });
		});
		// POST: An User
		app.post("/users", async (req, res) => {
			const newUser = req.body;
			const result = await usersCollection.insertOne(newUser);
			res.status(201).send(result);
		});
		// POST: An User with Google
		app.post("/users/google", async (req, res) => {
			const newUser = req.body;
			const isUserExists = await usersCollection.findOne({
				email: newUser.email,
			});
			if (isUserExists) {
				res.status(400).send({ message: "Signed in user" });
			} else {
				const result = await usersCollection.insertOne(newUser);
				res.status(201).send(result);
			}
		});
		// GET: All Assignments or Filtered Assignments or Searched Assignments
		app.get("/assignments", async (req, res) => {
			const { difficulty, subject, search, sort } = req.query;
			// Get All
			const query = {};
			// Filter
			difficulty ? (query.difficulty = difficulty) : query;
			subject ? (query.subject = subject) : query;
			// Sorting query
			const sortQuery = {};
			sort ? (sortQuery.total_marks = sort === "asc" ? 1 : -1) : sortQuery;
			// Search
			if (search) {
				query.$or = [
					{ title: { $regex: search, $options: "i" } },
					{ description: { $regex: search, $options: "i" } },
				];
			}
			const result = await assignmentsCollection.find(query).sort(sortQuery).toArray();
			res.send(result);
		});
		// POST: An Assignment
		app.post("/assignments", verifyToken, async (req, res) => {
			const newAssignment = req.body;
			const result = await assignmentsCollection.insertOne(newAssignment);
			res.status(201).send(result);
		});
		// GET: A Single Assignment
		app.get("/assignments/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await assignmentsCollection.findOne(query);
			res.send(result);
		});
		// PUT: An Assignment
		app.put("/assignments/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const options = { upsert: true };
			const updatedAssignment = req.body;
			const updatedDoc = {
				$set: updatedAssignment,
			};
			const result = await assignmentsCollection.updateOne(query, updatedDoc, options);
			res.status(200).send(result);
		});
		// DELETE: An Assignment
		app.delete("/assignments/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await assignmentsCollection.deleteOne(query);
			await submissionsCollection.deleteMany({ assignment_id: id });
			res.status(204).send(result);
		});
		// Ping for successful connection confirmation
		await db_client.db("admin").command({ ping: 1 });
		console.log("Pinged. Successfully connected to MongoDB!");
	} finally {
		// Don't close client connection with server
		// await client.close();
	}
}
run_db().catch(console.dir);

// Home route response
app.get("/", (req, res) => {
	res.send(
		'<h1 style="text-align: center; font-family: sans-serif;">EduSign Server is running brilliantly!</h1>',
	);
});

// Log the port where the server is running
app.listen(port, () => {
	console.log(`EduSign Server is running on Port ${port}`);
});
