const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5100;

// Middlewares
app.use(express.json());
app.use(cors());

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
