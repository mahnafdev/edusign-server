const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv").config;
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5100;
dotenv();

// Middlewares
app.use(express.json());
app.use(cors());

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
		await db_client.connect();
		// Define Database
		const database = db_client.db("edusign");
		// Define Collections
		const assignmentsCollection = database.collection("assignments");
		// GET: All Assignments or Filtered Assignments or Searched Assignments
		app.get("/assignments", async (req, res) => {
			const { difficulty, subject, search } = req.query;
			// Get All
			const query = {};
			// Filter
			difficulty ? (query.difficulty = difficulty) : query;
			subject ? (query.subject = subject) : query;
			// Search
			if (search) {
				query.$or = [
					{ title: { $regex: search, $options: "i" } },
					{ description: { $regex: search, $options: "i" } },
				];
			}
			const result = await assignmentsCollection.find(query).toArray();
			res.send(result);
		});
		// POST: Create A New Assignment
		app.post("/assignments", async (req, res) => {
			const newAssignment = req.body;
			const result = await assignmentsCollection.insertOne(newAssignment);
			res.send(result);
		});
		// GET: A Single Assignment
		app.get("/assignments/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await assignmentsCollection.findOne(query);
			res.send(result);
		});
		// PUT: An Assignment
		app.put("/assignments/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const options = { upsert: true };
			const updatedAssignment = req.body;
			const updatedDoc = {
				$set: updatedAssignment,
			};
			const result = await assignmentsCollection.updateOne(query, updatedDoc, options);
			res.send(result);
		});
		// DELETE: An Assignment
		app.delete("/assignments/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await assignmentsCollection.deleteOne(query);
			res.send(result);
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
