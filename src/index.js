import {app} from "./app.js"
import dotenv from "dotenv"
import connectDB from "./db/index.js"


dotenv.config({
    path: './env'
})

connectDB()
.then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`server is running at port : ${process.env.PORT}`);
    
  })
  app.on("error", (error) => {
    console.log("error", error);
    throw error
    

  })
})
.catch((err) => {
console.log("mongoDB connection failed !!!", err);

})




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
