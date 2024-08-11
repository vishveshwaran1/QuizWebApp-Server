import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";

const app = express();
const port = 5505;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://vishveshwaran-quizapp.vercel.app/index.html'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true }
));
app.use(bodyParser.json());

const uri = 'mongodb+srv://Vichu:Vichu@quizwebapp.re8ld.mongodb.net/?retryWrites=true&w=majority&appName=QuizWebApp';
const client = new MongoClient(uri);
 
mongoose.connect(uri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

// Define User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Define Quiz schema
const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    time: { type: Number, required: true },
    questions: [
        {
            question: { type: String, required: true },
            options: [{ type: String, required: true }],
            correct: { type: Number, required: true }
        }
    ],
    uniqueCode: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false } // Optional
});

const Quiz = mongoose.model('Quiz', quizSchema);

// Define Result schema
const resultSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    username: { type: String, required: true },
    score: { type: Number, required: true },
    answers: [{ type: String }],
});

const Result = mongoose.model("Result", resultSchema);

// Function to add default quizzes
const addDefaultQuizzes = async () => {
    const defaultQuizzes = [
        {
            title: "JavaScript Basics",
            time: 5,
            questions: [
                {
                    question: "What is the correct way to declare a JavaScript variable?",
                    options: ["var myVariable;", "myVariable var;", "v myVariable;", "variable myVariable;"],
                    correct: 0
                },
                {
                    question: "Which of the following is a JavaScript data type?",
                    options: ["String", "Boolean", "Number", "All of the above"],
                    correct: 3
                },
                {
                    question: "How do you write a comment in JavaScript?",
                    options: ["<!-- This is a comment -->", "/* This is a comment */", "// This is a comment", "# This is a comment"],
                    correct: 2
                }
            ],
            createdBy: null // Placeholder; could be updated with a system user ID if needed
        },
        {
            title: "CSS Fundamentals",
            time: 5,
            questions: [
                {
                    question: "Which property is used to change the background color of an element?",
                    options: ["color", "background-color", "bgcolor", "background"],
                    correct: 1
                },
                {
                    question: "How do you add a comment in CSS?",
                    options: ["// This is a comment", "<!-- This is a comment -->", "/* This is a comment */", "# This is a comment"],
                    correct: 2
                },
                {
                    question: "Which property is used to change the text color of an element?",
                    options: ["font-color", "text-color", "color", "font"],
                    correct: 2
                }
            ],
            createdBy: null
        },
        {
            title: "HTML Basics",
            time: 5,
            questions: [
                {
                    question: "What does HTML stand for?",
                    options: ["Hyper Text Markup Language", "Hyperlinks and Text Markup Language", "Home Tool Markup Language", "Hyper Tool Markup Language"],
                    correct: 0
                },
                {
                    question: "Who is making the Web standards?",
                    options: ["Mozilla", "Microsoft", "Apple", "The World Wide Web Consortium"],
                    correct: 3
                },
                {
                    question: "Choose the correct HTML element for the largest heading:",
                    options: ["<heading>", "<h6>", "<head>", "<h1>"],
                    correct: 3
                }
            ],
            createdBy: null
        }
    ];

    // Add default quizzes if they don't exist
    for (const quiz of defaultQuizzes) {
        const existingQuiz = await Quiz.findOne({ title: quiz.title });
        if (!existingQuiz) {
            const newQuiz = new Quiz(quiz);
            await newQuiz.save();
            console.log(`Default quiz "${quiz.title}" added.`);
        }
    }
};

// Routes
// Sign-Up Route
app.post('/sign-up', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = new User({ username, email, password });
        await newUser.save();

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error during sign-up', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Sign-In Route
app.post('/sign-in', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        res.status(200).json({ username: user.username });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Create Quiz Route
app.post('/create-quiz', async (req, res) => {
    const { title, time, questions,uniqueCode, username } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const newQuiz = new Quiz({
            title,
            time,
            questions,
            uniqueCode,
            createdBy: user._id
        });
        await newQuiz.save();

        res.status(201).json({ message: 'Quiz created successfully' });
    } catch (error) {
        console.error('Error creating quiz', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
////
app.get('/get-quizzes/:uniqueCode', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const quiz = await Quiz.findOne({
            uniqueCode: uniqueCode
        });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        res.json(quiz);
    } catch (error) {
        console.error('Error fetching quiz by code:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get All Quizzes Route
app.get('/get-quizzes', async (req, res) => {
    const username = req.query.username;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const quizzes = await Quiz.find({
            $or: [
                { createdBy: user._id },
                { createdBy: null }
            ]
        });

        res.status(200).json(quizzes);
    } catch (error) {
        console.error('Error fetching quizzes', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get a Specific Quiz by ID
app.get('/get-quiz/:id', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await Quiz.findById(quizId).populate('createdBy', 'username');
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        res.status(200).json(quiz);
    } catch (error) {
        console.error('Error fetching quiz', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Submit Quiz Route
app.post("/submit-quiz/:id", async (req, res) => {
    const quizId = req.params.id;
    const { username, answers } = req.body;

    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        let score = 0;
        quiz.questions.forEach((question, index) => {
            if (answers[index] === question.options[question.correct]) {
                score++;
            }
        });

        const result = new Result({
            quizId,
            username,
            score,
            answers,
        });

        await result.save();

        res.status(200).json({ score });
    } catch (error) {
        console.error("Error submitting quiz", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Start Server and Add Default Quizzes
app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    await addDefaultQuizzes();
});
