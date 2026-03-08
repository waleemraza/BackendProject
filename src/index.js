
import dotenv from "dotenv"
import connectDB from "./db/index.js"
dotenv.config({
    path: './env'
})

connectDB()




/*
( async () => {
    try{
      await mongoose.connect(`${process.env.DATABASE_URI}/${DB_NAME}`)
      app.on("Error", (error) => {
        console.log("Error", error)
        throw error
      })
      app.listen(process.env.PORT, () => {
        console.log(`app is listening on PORT ${process.env.PORT}`);
        
      })
    }
    catch(error){
     console.error("Error:", error)
     throw error
    }
})()
*/
