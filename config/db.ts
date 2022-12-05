import mongoose from "mongoose";

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, {    
        });
    } catch (error) {
        if (error instanceof Error) {
            // TypeScript knows error is Error
            console.log("Connection Error", error.message);
        } else {
            console.log('Unexpected error', error);
        }          
    }

    const connection = mongoose.connection;
    if (connection.readyState >= 1) {
        console.log('connected to database');
        return;
    }
    connection.on("error",
        () => console.log("connection failed")
        
    );
};

export default connectDB;