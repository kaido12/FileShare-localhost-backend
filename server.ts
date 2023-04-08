import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from "./config/db";
import fileRoute from "./routes/files";
import {v2 as cloudinary} from "cloudinary";


const app = express();
dotenv.config();

cloudinary.config({
     cloud_name: process.env.CLOUDINARY_API_CLOUD,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET,
   });

connectDB();

app.use(cors());
app.use(express.json());
app.use(
     express.urlencoded({
          extended: true
     })
);

app.use((req, res, next)=> {
     res.header("Access-Control-Allow-Origin", "*");
     res.header("Access-Control-Allow-Headers","*");
     if(req.method === "OPTIONS") {
          res.header("Access-Control-Allow-Methods", "PUT, POST, DELETE, GET");
          return res.status(200).json({});
     }
})

app.use("/api/files", fileRoute)

const PORT = process.env.PORT;



app.listen(PORT,
     () => console.log(`Server is working on PORT ${PORT}`)
);