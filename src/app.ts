import express from "express";
const app = express();

app.get("/", (req, res) => {
    res.status(200).send("Hello World! I am a CI/CD Pipeline");
});

app.get("/user", (req, res) => {
    res.status(200).send("Hí ộ Hí ộ Hí ộ Hí ộ");
});

export default app;
