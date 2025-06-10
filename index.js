const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
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
		// GET: All Assignments
		app.get("/assignments", async (req, res) => {
			const result = await assignmentsCollection.find().toArray();
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
