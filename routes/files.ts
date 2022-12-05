import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import File from "../models/File";
import https from 'https';
import nodemailer from "nodemailer";
import createEmailTemplate from "../utils/createEmailTemplate";

const router = express.Router();

const storage = multer.diskStorage({});

let upload = multer({
    storage,
});

router.post("/upload", upload.single("myFile"), async (request, response) => {
    try {
        if (!request.file)
            return response.status(400).json({message: "Please upload file!!"});
        console.log(request.file);

        let uploadedFile: any;
        try {
            uploadedFile = await cloudinary.uploader.upload(request.file.path, {
                folder: "Fileshare",
                resource_type: "auto",
            }
            );
            var { secure_url, bytes, format } = uploadedFile;
            
        } catch (error) {
            if (error instanceof Error) {
                console.log(error.message);                
                return response.status(400).json({message: "Cloudinary Error"});
            }
        }
        const { originalname } = request.file;
        console.log(secure_url, format, bytes)

        const file = await File.create({
            filename: originalname,
            sizeInBytes: bytes,
            secure_url,
            format,
        });

        response.status(200).json({
            id:file._id,
            downloadPageLink: `${process.env.API_BASE_ENDPOINT_CLIENT}download/${file._id}`,
        });

    } catch (error) {
        if (error instanceof Error) {
            //  TypeScript knows error is Error
            console.log("Connection Error", error.message);
            response.status(500).json({message: "Server Error: "});
        } else {
            console.log('Unexpected error', error);
        } 
    }
})

router.get("/:id", async(request, response) => {
    try {
        const id: any = request.params.id;
        const file: any = await File.findById(id);
        if(!file) {
            return response.status(404).json({message: "File does not exist"});
        }
        const {filename, format, sizeInBytes} = file;
        return response.status(200).json({
            name: filename,
            sizeInBytes,
            format,
            id
        })
    } catch (error) {
        return response.status(500).json({message: "Server Error "})
    }
})

router.get("/:id/download", async(request, response) => {
    try {
        const id = request.params.id;
        const file = await File.findById(id);
        if(!file) {
            return response.status(404).json({message: "File does not exist"});
        }
        console.log(file)
        https.get(file.secure_url, (fileStream) => fileStream.pipe(response));
        
    } catch (error) {
        return response.status(500).json({message: "Server Error "})
    }
})

router.post("/email", async(request, response) => {
    
    // 1. Validate request
    const { id, emailFrom, emailTo } = request.body;
    if (!id || !emailFrom || !emailTo )
        return response.status(400).json({message: "all fields are required"});
    
    // 2. Check if the file exists
    const file = await File.findById(id);
    if (!file) {
        return response.status(404).json({ message: "File doesn't exist"});
    }

    // 3. Create transporter
    let transporter = nodemailer.createTransport({
        // @ts-ignore
        host: 'smtp-relay.sendinblue.com',
        port: process.env.SENDINBLUE_SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SENDINBLUE_SMTP_USER, // generated ethereal user
          pass: process.env.SENDINBLUE_SMTP_PASSWORD, // generated ethereal password
        },
      });
   

    // 4. Prepare the e-mail data
    const { filename, sizeInBytes } = file;

    const fileSize = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
    const downloadPageLink = `${process.env.API_BASE_ENDPOINT_CLIENT}download/${id}`;
    
    const mailOptions = {
        from: emailFrom, // sender address
        to: emailTo, // list of receivers
        subject: "File Shared", // Subject line
        text: `${emailFrom} sent a file, Check it`, // plain text body
        html: createEmailTemplate(emailFrom, downloadPageLink, filename, fileSize), // html body
      }
    
    // 5. Send mail using the transporter
    transporter.sendMail(mailOptions, async(error, info) => {
        if (error) {
            console.log(error)
            return response.status(500).json({
                message: "Server Error", 
            })
        }

        file.sender = emailFrom;
        file.receiver = emailTo;

        // 6. save the data and send the response

        await file.save();
        return response.status(200).json({
            message: "Email Sent",
        })

    })
})

export default router;